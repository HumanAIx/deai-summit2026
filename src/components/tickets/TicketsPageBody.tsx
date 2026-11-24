import { getLocale } from "@/lib/tickets/i18n-server";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { TicketLinkInvalid } from "@/components/tickets/TicketLinkInvalid";
import { TicketTypeList } from "@/components/tickets/TicketTypeList";
import { EpApiError } from "@/lib/tickets/ep-client";
import { localePrefixFor } from "@/lib/tickets/localized-href";
import { fetchLinkType, fetchPublicTypes } from "@/lib/tickets/api";
import { forwardedClientIp } from "@/lib/tickets/client-ip";
import { ticketsLocaleCtx } from "@/lib/tickets/locale-ctx";
import { linkTokenSchema, sourceFilterIdSchema, type PublicTypes } from "@/lib/tickets/schemas";

const NOT_ON_SALE: PublicTypes = { types: [], checkout: { salesOpen: false, testMode: false, feePayer: "buyer" } };

/**
 * The checkout page body, shared by `/tickets` (`?schedule=` / `?event=` / legacy `?link=`) and the private-link
 * route `/tickets/l/{token}` — the path ep-api's `linkPath` and the dashboard's "Copy private link" use.
 * One ep-api call per render: `GET /tickets/types` (optionally narrowed to one source) or, for a private link,
 * `GET /tickets/types/link/:token`. A site that never set tickets up answers 409 `tickets.siteNotConfigured`:
 * that is "not on sale here", not an error page. A wrong private link is the themed "not valid" state. The
 * interactive checkout runs in the browser against our own `/api/tickets/*` handlers: 0 further calls on load.
 */
export async function TicketsPageBody({
  rawLink,
  rawSchedule,
  rawEvent,
  rawType,
  intro,
  allowedTypeIds = null,
  pickedNames = {},
}: {
  rawLink?: string | undefined;
  rawSchedule?: string | undefined;
  rawEvent?: string | undefined;
  /** DeAI: `?type={ticketTypeId}` preselects one ticket of that type. */
  rawType?: string | undefined;
  /** DeAI: the CMS heading shown instead of the plain "Tickets" title. */
  intro?: ReactNode;
  /**
   * DeAI: only these ticket types are offered (the tickets picked for sale in the CMS, in that order; `[]` = none);
   * `null` = every public type. A private link is never narrowed: it names its one hidden type itself.
   */
  allowedTypeIds?: readonly string[] | null;
  /** DeAI: the CMS card title per picked ticket type, so a picked ticket ep-api does not list still shows as unavailable. */
  pickedNames?: Readonly<Record<string, string>>;
}) {
  const [locale, requestHeaders, ctx] = await Promise.all([getLocale(), headers(), ticketsLocaleCtx()]);
  const localePrefix = localePrefixFor(ctx);
  const ip = forwardedClientIp({ headers: requestHeaders });

  const link = rawLink ? linkTokenSchema.safeParse(rawLink) : null;
  const schedule = rawSchedule ? sourceFilterIdSchema.safeParse(rawSchedule) : null;
  const event = rawEvent && !rawSchedule ? sourceFilterIdSchema.safeParse(rawEvent) : null;
  const ticketsHref = `${localePrefix}/tickets`;

  if (rawLink && !link?.success) return <TicketLinkInvalid ticketsHref={ticketsHref} />;
  // A filter that is not a valid id can match nothing.
  if (!rawLink && (schedule?.success === false || event?.success === false)) {
    return <TicketTypeList data={NOT_ON_SALE} locale={locale} localePrefix={localePrefix} />;
  }

  let data: PublicTypes;
  try {
    data = link?.success
      ? await fetchLinkType({ token: link.data, locale, ip })
      : await fetchPublicTypes({ locale, ip, scheduleId: schedule?.success ? schedule.data : undefined, eventId: event?.success ? event.data : undefined });
  } catch (error) {
    if (link?.success && error instanceof EpApiError && (error.status === 404 || error.status === 400)) return <TicketLinkInvalid ticketsHref={ticketsHref} />;
    if (error instanceof EpApiError && (error.status === 409 || error.status === 404)) data = NOT_ON_SALE;
    else throw error;
  }
  const narrowed = Boolean(allowedTypeIds) && !link?.success;
  if (narrowed && allowedTypeIds) data = onlyTypes({ data, ids: allowedTypeIds });
  const type = rawType ? sourceFilterIdSchema.safeParse(rawType) : null;
  return (
    <TicketTypeList
      data={data}
      locale={locale}
      localePrefix={localePrefix}
      linkToken={link?.success ? link.data : undefined}
      intro={intro}
      preselectTypeId={type?.success ? type.data : undefined}
      unlisted={narrowed && allowedTypeIds ? unlistedOf({ data, ids: allowedTypeIds, names: pickedNames }) : []}
    />
  );
}

/**
 * The picked tickets ep-api did not list (hidden behind a private link, removed, another site's): shown as "not
 * available" under their CMS card title, so the buyer sees every ticket the page offers. One without a title is left
 * out (there is no name to show, and the ticket's own name must not leak from a private link).
 */
function unlistedOf({ data, ids, names }: { data: PublicTypes; ids: readonly string[]; names: Readonly<Record<string, string>> }): { id: string; name: string }[] {
  const listed = new Set(data.types.map((type) => type.id));
  return ids.filter((id) => !listed.has(id)).flatMap((id) => {
    const name = names[id]?.trim() ?? "";
    return name ? [{ id, name }] : [];
  });
}

/** The catalogue narrowed to `ids`, in that order (the CMS card order); ids the catalogue does not hold are skipped. */
function onlyTypes({ data, ids }: { data: PublicTypes; ids: readonly string[] }): PublicTypes {
  const byId = new Map(data.types.map((type) => [type.id, type] as const));
  return { ...data, types: ids.flatMap((id) => byId.get(id) ?? []) };
}

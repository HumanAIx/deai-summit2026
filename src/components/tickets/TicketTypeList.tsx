import { getFormatter, getTranslations } from "@/lib/tickets/i18n-server";
import { configOf } from "@/lib/tickets/checkout-config";
import type { ReactNode } from "react";
import type { PublicTypes } from "@/lib/tickets/schemas";
import { isBuyable } from "@/lib/tickets/checkout-cart";
import type { Translator } from "@/lib/tickets/i18n-core";
import { TicketCheckout } from "./checkout/TicketCheckout";
import { STATUS_KEYS, type UnlistedType } from "./checkout/types";
import { TicketsShell } from "./TicketsShell";

/** A live waitlist offer (`/tickets/w/{token}`): the token the checkout sends, how many tickets are held, and until when. */
export interface TicketOffer {
  token: string;
  quantity: number;
  /** ISO time the offer ends. */
  expiresAt: string;
  /** The event's IANA time zone: the end of the offer is shown in it, like every other ticket date. */
  timeZone: string;
}

/**
 * The `/tickets` page body: themed "not on sale here" when there are no ticket types, else the heading, the
 * "Test mode" banner and "Sales are closed" notice (both from ep-api's `checkout` block), and the checkout
 * (a client island: cart, steps, Stripe). With sales closed the cards are shown without any way to buy.
 */
export async function TicketTypeList({
  data,
  locale,
  localePrefix,
  linkToken,
  offer,
  intro,
  preselectTypeId,
  unlisted = [],
}: {
  data: PublicTypes;
  locale: string;
  localePrefix: string;
  linkToken?: string | undefined;
  offer?: TicketOffer | undefined;
  /** DeAI: the page heading from the CMS `tickets` page (eyebrow, accented title, meta). Must hold the page's `<h1>`. */
  intro?: ReactNode;
  /** DeAI: `/tickets?type={id}` (a CMS Tickets card's Buy button) starts the cart with one ticket of that type. */
  preselectTypeId?: string | undefined;
  /** DeAI: picked tickets ep-api does not list (hidden, removed): shown as "not available" rows, never sold. */
  unlisted?: readonly UnlistedType[];
}) {
  const t = await getTranslations("tickets.list");
  const types = Array.isArray(data.types) ? data.types : [];

  if (types.length === 0 && unlisted.length === 0) {
    return (
      <TicketsShell>
        <section aria-labelledby="tickets-empty-heading" className="flex flex-col items-start gap-3">
          <h1 id="tickets-empty-heading" className="font-heading text-2xl font-semibold">
            {t("emptyHeading")}
          </h1>
          <p className="max-w-prose text-muted">{t("emptyBody")}</p>
        </section>
      </TicketsShell>
    );
  }

  // `dateStyle` / `timeStyle` cannot be combined with `timeZoneName` (Intl throws), so the zone is named in the text.
  const tOffer = await getTranslations("tickets.offer");
  const heldUntil = offer ? await heldUntilOf({ offer }) : null;
  const pickNotice = pickNoticeOf({ types, unlisted, preselectTypeId, salesOpen: data.checkout.salesOpen, t });

  return (
    <TicketsShell size="checkout">
      {intro ?? <h1 className="font-heading text-2xl font-semibold sm:text-3xl">{t("heading")}</h1>}
      {offer && heldUntil ? (
        <p role="status" className="mt-4 font-medium">
          {tOffer("heldUntil", { date: heldUntil, zone: offer.timeZone })}
        </p>
      ) : null}
      {data.checkout.testMode ? (
        <p role="status" className="mt-4 inline-block rounded-(--radius) border border-warning-emphasis bg-surface px-3 py-1 text-sm font-medium text-text">
          {t("testBanner")}
        </p>
      ) : null}
      {pickNotice ? (
        <p role="status" className="mt-4 font-medium text-(--tk-warn)">
          {pickNotice}
        </p>
      ) : null}
      {!data.checkout.salesOpen ? (
        <p role="status" className="mt-4 font-medium text-muted">
          {t("salesClosed")}
        </p>
      ) : null}
      <TicketCheckout types={types} config={configOf({ checkout: data.checkout })} linkToken={linkToken} offerToken={offer?.token} initialQuantity={offer?.quantity} initialCart={initialCartOf({ types, preselectTypeId })} unlisted={unlisted} locale={locale} localePrefix={localePrefix} />
    </TicketsShell>
  );
}

/**
 * The buyer came from a tile or card's Buy button for a ticket that can't be bought now (sold out, paused, sales
 * ended…): say so above the list, so the empty cart is not a mystery. `null` = nothing to say.
 */
function pickNoticeOf({ types, unlisted, preselectTypeId, salesOpen, t }: { types: PublicTypes["types"]; unlisted: readonly UnlistedType[]; preselectTypeId: string | undefined; salesOpen: boolean; t: Translator }): string | null {
  if (!preselectTypeId) return null;
  const type = types.find((candidate) => candidate.id === preselectTypeId);
  if (type) {
    if (isBuyable({ type, salesOpen })) return null;
    // Sales closed is already said by its own notice.
    if (!salesOpen) return null;
    const key = type.status === "on_sale" ? "soldOut" : (STATUS_KEYS[type.status] ?? "unknown");
    return t("pickUnavailable", { name: type.name, status: t(`status.${key}`) });
  }
  const hidden = unlisted.find((candidate) => candidate.id === preselectTypeId);
  return hidden ? t("pickUnavailable", { name: hidden.name, status: t("status.unknown") }) : null;
}

async function heldUntilOf({ offer }: { offer: TicketOffer }): Promise<string | null> {
  const ends = new Date(offer.expiresAt);
  if (Number.isNaN(ends.getTime())) return null;
  const format = await getFormatter();
  return format.dateTime(ends, { dateStyle: "full", timeStyle: "short", timeZone: offer.timeZone });
}

/** One ticket of the preselected type, only when that type is listed and on sale (anything else starts empty). */
function initialCartOf({ types, preselectTypeId }: { types: PublicTypes["types"]; preselectTypeId: string | undefined }): Record<string, number> | undefined {
  const type = preselectTypeId ? types.find((candidate) => candidate.id === preselectTypeId) : undefined;
  return type?.status === "on_sale" ? { [type.id]: 1 } : undefined;
}

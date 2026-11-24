import { getLocale } from "@/lib/tickets/i18n-server";
import { headers } from "next/headers";
import { TicketOfferEnded } from "@/components/tickets/TicketOfferEnded";
import { TicketTypeList } from "@/components/tickets/TicketTypeList";
import { localePrefixFor } from "@/lib/tickets/localized-href";
import { fetchWaitlistOffer } from "@/lib/tickets/api";
import { forwardedClientIp } from "@/lib/tickets/client-ip";
import { ticketsLocaleCtx } from "@/lib/tickets/locale-ctx";
import { offerTokenSchema, type PublicTypes } from "@/lib/tickets/schemas";

/**
 * The body of `/tickets/w/{token}` — a waitlist offer. One ep-api call per render (`GET /tickets/waitlist/offers/:token`,
 * `no-store`). A live offer opens the normal checkout limited to the ONE offered type, with the offered quantity
 * pre-selected as the most the buyer can pick; the token travels in the request BODY of the quote and the order
 * (never a URL, never analytics: `/tickets/w/**` loads none). An unknown, ended or used offer, or a token that is not
 * even well-formed, is the themed "This offer has ended" state; an outage or a rate limit throws to the error page.
 *
 * ep-api holds the offered tickets for the holder, so the public type reads "sold out" while the offer is live: the
 * checkout is handed the type as on sale with exactly the held quantity (also capped by the per-order maximum).
 * ep-api re-checks everything at quote and order time, so this is presentation, not authorization.
 */
export async function TicketOfferBody({ rawToken }: { rawToken: string }) {
  const [locale, requestHeaders, ctx] = await Promise.all([getLocale(), headers(), ticketsLocaleCtx()]);
  const localePrefix = localePrefixFor(ctx);
  const ticketsHref = `${localePrefix}/tickets`;

  const token = offerTokenSchema.safeParse(rawToken);
  if (!token.success) return <TicketOfferEnded ticketsHref={ticketsHref} />;

  const read = await fetchWaitlistOffer({ token: token.data, locale, ip: forwardedClientIp({ headers: requestHeaders }) });
  if (read.state === "invalid") return <TicketOfferEnded ticketsHref={ticketsHref} />;

  const { type, checkout, quantity, offerExpiresAt } = read.data;
  const held = Math.max(1, Math.min(quantity, type.maxPerOrder));
  const data: PublicTypes = { types: [{ ...type, status: "on_sale", left: held, maxPerOrder: held }], checkout };
  return (
    <TicketTypeList
      data={data}
      locale={locale}
      localePrefix={localePrefix}
      offer={{ token: token.data, quantity: held, expiresAt: offerExpiresAt, timeZone: type.source.timeZone ?? "UTC" }}
    />
  );
}

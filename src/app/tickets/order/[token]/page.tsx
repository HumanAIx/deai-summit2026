import type { Metadata } from "next";
import { getLocale, getTranslations } from "@/lib/tickets/i18n-server";
import { headers } from "next/headers";
import { InvalidLinkState } from "@/components/tickets/InvalidLinkState";
import { OrderConfirming } from "@/components/tickets/OrderConfirming";
import { OrderView } from "@/components/tickets/OrderView";
import { TicketsShell } from "@/components/tickets/TicketsShell";
import { localizeHref } from "@/lib/tickets/localized-href";
import { fetchMyOrder, fetchMyTicket } from "@/lib/tickets/api";
import { forwardedClientIp } from "@/lib/tickets/client-ip";
import { ticketsLocaleCtx } from "@/lib/tickets/locale-ctx";
import { orderIdSchema, ticketTokenSchema } from "@/lib/tickets/schemas";

/** Private, per-visitor data: never cached, never indexed. */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tickets.order");
  return { title: t("metaTitle"), robots: { index: false, follow: false }, referrer: "no-referrer" };
}

/**
 * `/tickets/order/[token]` — My order (buyer link). One ep-api call: `GET /tickets/my/order`
 * (`x-order-token`). A 404 WITH `?o={orderId}` is "payment still being confirmed" (the checkout's return
 * URL, also the 3-D Secure return): a client component polls our status handler and refreshes this page.
 * A 404 without `?o`, a malformed token or any other miss is the opaque "not valid" state (rule 28).
 */
export default async function MyOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ o?: string | string[] }>;
}) {
  const [{ token: rawToken }, { o }] = await Promise.all([params, searchParams]);
  const ctx = await ticketsLocaleCtx();
  const lostLinkHref = localizeHref({ href: "/tickets/lost", ctx });

  const token = ticketTokenSchema.safeParse(rawToken);
  if (!token.success) return <InvalidLinkState lostLinkHref={lostLinkHref} />;

  const [locale, requestHeaders] = await Promise.all([getLocale(), headers()]);
  const result = await fetchMyOrder({ token: token.data, locale, ip: forwardedClientIp({ headers: requestHeaders }) });
  if (result.state === "ok") {
    // The buyer's own ticket ("(you)") links straight to its ticket page (ep-api sends that token only for it).
    const ticketHrefs = Object.fromEntries(
      (Array.isArray(result.data.holders) ? result.data.holders : []).flatMap((holder) => (holder.ticketToken ? [[holder.ticketCode, localizeHref({ href: `/tickets/t/${encodeURIComponent(holder.ticketToken)}`, ctx })]] : [])),
    );
    // The event line of the subtitle (name, dates, venue): ep-api's order answer has no event, the buyer's own ticket
    // does. One extra no-store read, only when the buyer holds a ticket; any failure just leaves the line out.
    const ownTicketToken = (Array.isArray(result.data.holders) ? result.data.holders : []).find((holder) => holder.ticketToken)?.ticketToken;
    const ownTicket = ownTicketToken
      ? await fetchMyTicket({ token: ownTicketToken, locale, ip: forwardedClientIp({ headers: requestHeaders }) }).catch(() => null)
      : null;
    const eventSource = ownTicket?.state === "ok" ? ownTicket.data.source : null;
    return <OrderView order={result.data} token={token.data} ticketHrefs={ticketHrefs} eventSource={eventSource} />;
  }

  const orderId = orderIdSchema.safeParse(Array.isArray(o) ? o[0] : o);
  if (!orderId.success) return <InvalidLinkState lostLinkHref={lostLinkHref} />;
  return (
    <TicketsShell>
      <OrderConfirming orderId={orderId.data} token={token.data} ticketsHref={localizeHref({ href: "/tickets", ctx })} lostLinkHref={lostLinkHref} />
    </TicketsShell>
  );
}

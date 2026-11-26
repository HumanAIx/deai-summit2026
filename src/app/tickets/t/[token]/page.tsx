import type { Metadata } from "next";
import { getLocale, getTranslations } from "@/lib/tickets/i18n-server";
import { headers } from "next/headers";
import { InvalidLinkState } from "@/components/tickets/InvalidLinkState";
import { TicketView } from "@/components/tickets/TicketView";
import { localizeHref } from "@/lib/tickets/localized-href";
import { fetchMyTicket } from "@/lib/tickets/api";
import { forwardedClientIp } from "@/lib/tickets/client-ip";
import { ticketsLocaleCtx } from "@/lib/tickets/locale-ctx";
import { ticketTokenSchema } from "@/lib/tickets/schemas";

/** Private, per-visitor data: never cached, never indexed. */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tickets.ticket");
  // The token is in the URL: no indexing, and no Referer to anything this page loads or links to.
  return { title: t("metaTitle"), robots: { index: false, follow: false }, referrer: "no-referrer" };
}

/**
 * `/tickets/t/[token]` — My ticket (holder link). One ep-api call: `GET /tickets/my/ticket`
 * (`x-ticket-token`). A malformed token makes no call at all; a wrong, foreign or expired one is the same
 * opaque "This link is not valid" state (rule 28).
 */
export default async function MyTicketPage({ params }: { params: Promise<{ token: string }> }) {
  const { token: rawToken } = await params;
  const ctx = await ticketsLocaleCtx();
  const lostLinkHref = localizeHref({ href: "/tickets/lost", ctx });

  const token = ticketTokenSchema.safeParse(rawToken);
  if (!token.success) return <InvalidLinkState lostLinkHref={lostLinkHref} />;

  const [locale, requestHeaders] = await Promise.all([getLocale(), headers()]);
  const result = await fetchMyTicket({ token: token.data, locale, ip: forwardedClientIp({ headers: requestHeaders }) });
  if (result.state === "invalid") return <InvalidLinkState lostLinkHref={lostLinkHref} />;

  // The holder bought this order (ep-api sends its buyer link only then): "View my order".
  const orderHref = result.data.orderToken ? localizeHref({ href: `/tickets/order/${encodeURIComponent(result.data.orderToken)}`, ctx }) : null;
  return <TicketView ticket={result.data} calendarHref={`/tickets/t/${encodeURIComponent(token.data)}/calendar.ics`} pdfHref={`/tickets/t/${encodeURIComponent(token.data)}/ticket.pdf`} token={token.data} orderHref={orderHref} />;
}

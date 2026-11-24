import type { Metadata } from "next";
import { getLocale, getTranslations } from "@/lib/tickets/i18n-server";
import { headers } from "next/headers";
import { InvalidLinkState } from "@/components/tickets/InvalidLinkState";
import { MyTicketsView } from "@/components/tickets/MyTicketsView";
import { localizeHref } from "@/lib/tickets/localized-href";
import { fetchMyOverview } from "@/lib/tickets/api";
import { forwardedClientIp } from "@/lib/tickets/client-ip";
import { ticketsLocaleCtx } from "@/lib/tickets/locale-ctx";
import { ticketTokenSchema } from "@/lib/tickets/schemas";

/** Private, per-visitor data: never cached, never indexed. */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tickets.me");
  // The token is in the URL: no indexing, and no Referer to anything this page loads or links to.
  return { title: t("metaTitle"), robots: { index: false, follow: false }, referrer: "no-referrer" };
}

/**
 * `/tickets/me/[token]` — "My tickets": every order the address bought and every valid ticket it holds on this site, behind
 * the list link the lost-link email sends (ep-api `GET /tickets/my/overview`, `x-list-token`). A malformed token makes no
 * call; an unknown, expired or other-site one is the same opaque "This link is not valid" state (rule 28). Each item opens
 * its own ticket or order page; a buyer without a ticket of their own simply sees their orders.
 */
export default async function MyTicketsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token: rawToken } = await params;
  const ctx = await ticketsLocaleCtx();
  const lostLinkHref = localizeHref({ href: "/tickets/lost", ctx });

  const token = ticketTokenSchema.safeParse(rawToken);
  if (!token.success) return <InvalidLinkState lostLinkHref={lostLinkHref} />;

  const [locale, requestHeaders] = await Promise.all([getLocale(), headers()]);
  const result = await fetchMyOverview({ token: token.data, locale, ip: forwardedClientIp({ headers: requestHeaders }) });
  if (result.state === "invalid") return <InvalidLinkState lostLinkHref={lostLinkHref} />;

  const overview = result.data;
  const ticketHrefs = Object.fromEntries(overview.tickets.map((item) => [item.token, localizeHref({ href: `/tickets/t/${encodeURIComponent(item.token)}`, ctx })]));
  const orderHrefs = Object.fromEntries(overview.orders.map((item) => [item.token, localizeHref({ href: `/tickets/order/${encodeURIComponent(item.token)}`, ctx })]));
  return <MyTicketsView overview={overview} ticketHrefs={ticketHrefs} orderHrefs={orderHrefs} lostLinkHref={lostLinkHref} />;
}

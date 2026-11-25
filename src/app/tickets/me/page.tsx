import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { MyTicketsView } from "@/components/tickets/MyTicketsView";
import { SignInRequired } from "@/components/tickets/SignInRequired";
import { fetchMySession } from "@/lib/tickets/api";
import { forwardedClientIp } from "@/lib/tickets/client-ip";
import { getLocale, getTranslations } from "@/lib/tickets/i18n-server";
import { localizeHref } from "@/lib/tickets/localized-href";
import { ticketsLocaleCtx } from "@/lib/tickets/locale-ctx";
import { SESSION_COOKIE } from "@/lib/tickets/session-cookie";

/** Private, per-visitor data: never cached, never indexed. */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tickets.me");
  return { title: t("metaTitle"), robots: { index: false, follow: false }, referrer: "no-referrer" };
}

/**
 * `/tickets/me` — "My tickets" for a signed-in visitor (ep-api API-266). The session token is read from the httpOnly
 * cookie on the server only and goes to ep-api as `x-session-token`. No cookie: the sign-in form (no ep-api call). A
 * session ep-api no longer knows (401): the dead cookie is cleared through `/api/tickets/session` (a page cannot
 * delete a cookie) and the visitor lands on the same form with an "ended" note. `/tickets/me/[token]` keeps serving
 * the older list links.
 */
export default async function MyTicketsSessionPage({ searchParams }: { searchParams?: Promise<{ ended?: string }> }) {
  const [ctx, cookieStore] = await Promise.all([ticketsLocaleCtx(), cookies()]);
  const ticketsHref = localizeHref({ href: "/tickets", ctx });
  const lostLinkHref = localizeHref({ href: "/tickets/lost", ctx });

  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionToken) {
    const ended = (await searchParams)?.ended === "1";
    return <SignInRequired ticketsHref={ticketsHref} ended={ended} />;
  }

  const [locale, requestHeaders] = await Promise.all([getLocale(), headers()]);
  const result = await fetchMySession({ sessionToken, locale, ip: forwardedClientIp({ headers: requestHeaders }) });
  if (result.state === "invalid") redirect("/api/tickets/session");

  const overview = result.data;
  const ticketHrefs = Object.fromEntries(overview.tickets.map((item) => [item.token, localizeHref({ href: `/tickets/t/${encodeURIComponent(item.token)}`, ctx })]));
  const orderHrefs = Object.fromEntries(overview.orders.map((item) => [item.token, localizeHref({ href: `/tickets/order/${encodeURIComponent(item.token)}`, ctx })]));
  return <MyTicketsView overview={overview} ticketHrefs={ticketHrefs} orderHrefs={orderHrefs} lostLinkHref={lostLinkHref} signOutAction="/api/tickets/sign-out" />;
}

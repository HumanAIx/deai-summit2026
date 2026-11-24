import type { Metadata } from "next";
import { getTranslations } from "@/lib/tickets/i18n-server";
import { TicketOfferBody } from "@/components/tickets/TicketOfferBody";

/** The offer must be live on every request (no ISR, no fetch cache): it ends, and it can be used up. */
export const dynamic = "force-dynamic";

/** The URL carries a secret: never indexed, never sent on as a referrer. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tickets.offer");
  return { title: t("metaTitle"), robots: { index: false, follow: false }, referrer: "no-referrer" };
}

/**
 * `/tickets/w/{token}` — a place that freed up for someone on a waitlist. This is the path ep-api puts in the
 * `waitlist_offer` email (`{site}/tickets/w/{token}`). A private ticket path: `proxy.ts` rewrites a locale-prefixed
 * request to this route (`src/lib/site/tickets-route.ts`), analytics never load here (`isPrivateTicketPath`).
 */
export default async function TicketOfferPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <TicketOfferBody rawToken={token} />;
}

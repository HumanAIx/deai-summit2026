import type { Metadata } from "next";
import { getTranslations } from "@/lib/tickets/i18n-server";
import { TicketsPageBody } from "@/components/tickets/TicketsPageBody";

/** Stock and prices must be live on every request (no ISR, no fetch cache). */
export const dynamic = "force-dynamic";

/** The private link carries a secret in its URL: never indexed, never sent on as a referrer. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tickets.list");
  return { title: t("metaTitle"), robots: { index: false, follow: false }, referrer: "no-referrer" };
}

/**
 * `/tickets/l/{token}` — a hidden ticket type sold only through its private link. This is the path ep-api builds
 * (`linkPath`) and the dashboard copies ("Copy private link"); same body as `/tickets?link=`.
 */
export default async function TicketLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <TicketsPageBody rawLink={token} />;
}

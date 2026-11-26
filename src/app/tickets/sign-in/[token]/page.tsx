import type { Metadata } from "next";
import { InvalidLinkState } from "@/components/tickets/InvalidLinkState";
import { SignInContinue } from "@/components/tickets/SignInContinue";
import { localizeHref } from "@/lib/tickets/localized-href";
import { ticketsLocaleCtx } from "@/lib/tickets/locale-ctx";
import { ticketTokenSchema } from "@/lib/tickets/schemas";
import { getTranslations } from "@/lib/tickets/i18n-server";

/** Private: the token is in the URL. Never cached, never indexed, no Referer. */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tickets.signIn");
  return { title: t("metaTitle"), robots: { index: false, follow: false }, referrer: "no-referrer" };
}

/**
 * `/tickets/sign-in/[token]` — the page the "Find your tickets" email links to. It makes NO ep-api call and does NOT
 * use the token: mail scanners and link previewers open links, and a one-time token must survive that. Only the
 * visitor's Continue press (a POST to `/api/tickets/sign-in`) exchanges it for a session. A malformed token shows the
 * same opaque "not valid" state as every other bad link.
 */
export default async function SignInPage({ params }: { params: Promise<{ token: string }> }) {
  const { token: rawToken } = await params;
  const ctx = await ticketsLocaleCtx();
  const token = ticketTokenSchema.safeParse(rawToken);
  if (!token.success) return <InvalidLinkState lostLinkHref={localizeHref({ href: "/tickets/lost", ctx })} />;
  return <SignInContinue token={token.data} />;
}

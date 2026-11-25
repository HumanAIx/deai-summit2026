import type { Metadata } from "next";
import { getTranslations } from "@/lib/tickets/i18n-server";
import { LostLinkForm } from "@/components/tickets/LostLinkForm";
import { MT_CARD, MT_KICKER, MT_KICKER_RULE } from "@/components/tickets/my-ticket-classes";
import { TicketsShell } from "@/components/tickets/TicketsShell";
import { localizeHref } from "@/lib/tickets/localized-href";
import { ticketsLocaleCtx } from "@/lib/tickets/locale-ctx";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tickets.lost");
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

/** `/tickets/lost` — ask for a sign-in link and ticket links. No ep-api call on render; the form posts to our own handler. */
export default async function LostLinkPage({ searchParams }: { searchParams?: Promise<{ notice?: string }> } = {}) {
  const [t, ctx, query] = await Promise.all([getTranslations("tickets.lost"), ticketsLocaleCtx(), searchParams ?? Promise.resolve(undefined)]);
  // Where the sign-in and sign-out handlers send the visitor: an expired / used sign-in link, or "you're signed out".
  const notice = query?.notice === "expired" ? "noticeExpired" : query?.notice === "signedOut" ? "noticeSignedOut" : null;
  return (
    <TicketsShell size="narrow">
      <section aria-labelledby="lost-heading" className={`${MT_CARD} flex flex-col gap-4 rounded-2xl p-[clamp(22px,5vw,36px)]`}>
        <p className={MT_KICKER}>
          <span aria-hidden className={MT_KICKER_RULE} />
          {t("kicker")}
        </p>
        <h1 id="lost-heading" className="font-heading text-[clamp(28px,5vw,36px)] leading-tight font-medium tracking-[-0.01em]">
          {t("heading")}
        </h1>
        {notice ? (
          <p role={notice === "noticeExpired" ? "alert" : "status"} className={`text-[15px] leading-relaxed [text-wrap:pretty] ${notice === "noticeExpired" ? "text-danger" : "text-success"}`}>
            {t(notice)}
          </p>
        ) : null}
        <p className="text-[15px] leading-relaxed text-muted [text-wrap:pretty]">{t("introList")}</p>
        <LostLinkForm ticketsHref={localizeHref({ href: "/tickets", ctx })} />
      </section>
    </TicketsShell>
  );
}

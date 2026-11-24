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

/** `/tickets/lost` — ask for ticket links again. No ep-api call on render; the form posts to our own handler. */
export default async function LostLinkPage() {
  const [t, ctx] = await Promise.all([getTranslations("tickets.lost"), ticketsLocaleCtx()]);
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
        <p className="text-[15px] leading-relaxed text-muted [text-wrap:pretty]">{t("introList")}</p>
        <LostLinkForm ticketsHref={localizeHref({ href: "/tickets", ctx })} />
      </section>
    </TicketsShell>
  );
}

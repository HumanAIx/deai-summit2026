import { getTranslations } from "@/lib/tickets/i18n-server";
import { LostLinkForm } from "./LostLinkForm";
import { MT_CARD, MT_KICKER, MT_KICKER_RULE } from "./my-ticket-classes";
import { TicketsShell } from "./TicketsShell";

/** "Sign in to see your tickets": no (or an ended) session on `/tickets/me`. The same email form as "Find your tickets". */
export async function SignInRequired({ ticketsHref, ended = false }: { ticketsHref: string; ended?: boolean }) {
  const t = await getTranslations("tickets.me.signIn");
  return (
    <TicketsShell size="narrow">
      <section aria-labelledby="me-sign-in-heading" className={`${MT_CARD} flex flex-col gap-4 rounded-2xl p-[clamp(22px,5vw,36px)]`}>
        <p className={MT_KICKER}>
          <span aria-hidden className={MT_KICKER_RULE} />
          {t("metaTitle")}
        </p>
        <h1 id="me-sign-in-heading" className="font-heading text-[clamp(28px,5vw,36px)] leading-tight font-medium tracking-[-0.01em]">
          {t("heading")}
        </h1>
        <p role={ended ? "status" : undefined} className="text-[15px] leading-relaxed text-muted [text-wrap:pretty]">
          {ended ? t("ended") : t("body")}
        </p>
        <LostLinkForm ticketsHref={ticketsHref} />
      </section>
    </TicketsShell>
  );
}

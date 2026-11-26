import { getTranslations } from "@/lib/tickets/i18n-server";
import { MT_BUTTON_LG, MT_CARD, MT_KICKER, MT_KICKER_RULE } from "./my-ticket-classes";
import { TicketsShell } from "./TicketsShell";

/**
 * The "Continue" step of an emailed sign-in link. A plain `<form method="post">` (works without JavaScript): the token
 * goes in the POST body, never in a URL the browser or a proxy logs. Rendering it consumes nothing.
 */
export async function SignInContinue({ token }: { token: string }) {
  const t = await getTranslations("tickets.signIn");
  return (
    <TicketsShell size="narrow">
      <section aria-labelledby="sign-in-heading" className={`${MT_CARD} flex flex-col gap-4 rounded-2xl p-[clamp(22px,5vw,36px)]`}>
        <p className={MT_KICKER}>
          <span aria-hidden className={MT_KICKER_RULE} />
          {t("kicker")}
        </p>
        <h1 id="sign-in-heading" className="font-heading text-[clamp(28px,5vw,36px)] leading-tight font-medium tracking-[-0.01em]">
          {t("heading")}
        </h1>
        <p className="text-[15px] leading-relaxed text-muted [text-wrap:pretty]">{t("body")}</p>
        <form method="post" action="/api/tickets/sign-in" className="flex">
          <input type="hidden" name="token" value={token} />
          <button type="submit" className={MT_BUTTON_LG}>
            {t("cta")}
          </button>
        </form>
      </section>
    </TicketsShell>
  );
}

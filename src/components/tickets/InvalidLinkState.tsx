import { getTranslations } from "@/lib/tickets/i18n-server";
import Link from "next/link";
import { TICKETS_BUTTON, TicketsShell } from "./TicketsShell";

/**
 * The ONE state every bad token renders (rule 28): unknown, foreign-site, expired and malformed links are
 * indistinguishable, so nothing tells a prober which part was wrong. Themed through the root layout.
 */
export async function InvalidLinkState({ lostLinkHref }: { lostLinkHref: string }) {
  const t = await getTranslations("tickets.invalid");
  return (
    <TicketsShell>
      <section aria-labelledby="tickets-invalid-heading" className="flex flex-col items-start gap-4">
        <h1 id="tickets-invalid-heading" className="font-heading text-2xl font-semibold">
          {t("heading")}
        </h1>
        <p className="max-w-prose text-muted">{t("body")}</p>
        <Link href={lostLinkHref} className={TICKETS_BUTTON}>
          {t("lostLinkCta")}
        </Link>
      </section>
    </TicketsShell>
  );
}

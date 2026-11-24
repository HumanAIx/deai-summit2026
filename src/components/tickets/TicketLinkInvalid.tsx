import Link from "next/link";
import { getTranslations } from "@/lib/tickets/i18n-server";
import { TICKETS_BUTTON_OUTLINE } from "./tickets-classes";
import { TicketsShell } from "./TicketsShell";

/** A private ticket link (`/tickets?link=…`) that is wrong, withdrawn or malformed: one opaque answer (rule 28). */
export async function TicketLinkInvalid({ ticketsHref }: { ticketsHref: string }) {
  const t = await getTranslations("tickets.checkout.linkInvalid");
  return (
    <TicketsShell>
      <section aria-labelledby="ticket-link-invalid-heading" className="flex flex-col items-start gap-3">
        <h1 id="ticket-link-invalid-heading" className="font-heading text-2xl font-semibold">
          {t("heading")}
        </h1>
        <p className="max-w-prose text-muted">{t("body")}</p>
        <Link href={ticketsHref} className={TICKETS_BUTTON_OUTLINE}>
          {t("cta")}
        </Link>
      </section>
    </TicketsShell>
  );
}

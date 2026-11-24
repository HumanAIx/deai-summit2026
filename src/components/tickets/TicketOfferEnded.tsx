import Link from "next/link";
import { getTranslations } from "@/lib/tickets/i18n-server";
import { TICKETS_BUTTON_OUTLINE } from "./tickets-classes";
import { TicketsShell } from "./TicketsShell";

/**
 * A waitlist offer (`/tickets/w/{token}`) that is unknown, ended, expired or already used: ONE opaque answer
 * (rule 28), so the page never says which. It explains what happens next and links to the public ticket page.
 */
export async function TicketOfferEnded({ ticketsHref }: { ticketsHref: string }) {
  const t = await getTranslations("tickets.offer");
  return (
    <TicketsShell>
      <section aria-labelledby="ticket-offer-ended-heading" className="flex flex-col items-start gap-3">
        <h1 id="ticket-offer-ended-heading" className="font-heading text-2xl font-semibold">
          {t("endedHeading")}
        </h1>
        <p className="max-w-prose text-muted">{t("endedBody")}</p>
        <Link href={ticketsHref} className={TICKETS_BUTTON_OUTLINE}>
          {t("endedCta")}
        </Link>
      </section>
    </TicketsShell>
  );
}

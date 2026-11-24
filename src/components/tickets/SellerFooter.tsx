import { getTranslations } from "@/lib/tickets/i18n-server";
import type { TicketSeller } from "@/lib/tickets/schemas";

/** The seller block ep-api gives (legal name, VAT number, reply-to). Renders nothing when it has none. */
export async function SellerFooter({ seller }: { seller: TicketSeller }) {
  if (!seller.name && !seller.vatNumber && !seller.replyTo) return null;
  const t = await getTranslations("tickets.seller");
  return (
    <footer className="mt-10 border-t border-(--color-border) pt-4 text-sm text-muted">
      {seller.name ? <p>{t("soldBy", { name: seller.name })}</p> : null}
      {seller.vatNumber ? <p>{t("vatNumber", { vat: seller.vatNumber })}</p> : null}
      {seller.replyTo ? (
        <p>
          {t("contact")}{" "}
          <a href={`mailto:${seller.replyTo}`} className="text-primary-text underline">
            {seller.replyTo}
          </a>
        </p>
      ) : null}
    </footer>
  );
}

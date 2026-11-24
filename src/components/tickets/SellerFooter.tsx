import { getTranslations } from "@/lib/tickets/i18n-server";
import type { TicketSeller } from "@/lib/tickets/schemas";
import { TP_FOCUS } from "./ticket-page-classes";

/**
 * The seller block ep-api gives (legal name, VAT number, reply-to), as the designs' page footer: "Sold by … · VAT no. …" on
 * the left, the contact on the right (stacked on a phone). Renders nothing when it has none.
 */
export async function SellerFooter({ seller }: { seller: TicketSeller }) {
  if (!seller.name && !seller.vatNumber && !seller.replyTo) return null;
  const t = await getTranslations("tickets.seller");
  const legal = [seller.name ? t("soldBy", { name: seller.name }) : null, seller.vatNumber ? t("vatNumber", { vat: seller.vatNumber }) : null].filter((part): part is string => Boolean(part));
  return (
    <footer className="mt-4 flex flex-wrap justify-between gap-x-6 gap-y-2 border-t border-(--mt-hair) pt-6 text-[13px] leading-relaxed text-(--mt-dim) print:hidden">
      {legal.length > 0 ? (
        <p className="flex flex-wrap gap-x-1.5">
          {legal.map((part, index) => (
            <span key={part}>
              {index > 0 ? <span aria-hidden>· </span> : null}
              <span>{part}</span>
            </span>
          ))}
        </p>
      ) : null}
      {seller.replyTo ? (
        <p className="[overflow-wrap:anywhere]">
          {t("contact")}{" "}
          <a href={`mailto:${seller.replyTo}`} className={`rounded-sm text-(--mt-mut) underline underline-offset-2 hover:text-white ${TP_FOCUS}`}>
            {seller.replyTo}
          </a>
        </p>
      ) : null}
    </footer>
  );
}

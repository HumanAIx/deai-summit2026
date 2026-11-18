import { useFormatter, useTranslations } from "@/lib/tickets/i18n";
import { formatMoney } from "@/lib/tickets/format";
import type { PricedCart } from "@/lib/tickets/schemas";
import { TICKETS_CARD } from "../tickets-classes";
import type { PublicType } from "./types";

/**
 * The totals box. Every number is ep-api's integer cents from the QUOTE (or the order answer) run through the
 * locale formatter — nothing is added, multiplied or rounded in the browser. `busy` dims it while a new quote loads.
 */
export function OrderSummary({ totals, currency, types, busy }: { totals: PricedCart | null; currency: string; types: readonly PublicType[]; busy: boolean }) {
  const t = useTranslations("tickets.checkout.summary");
  const format = useFormatter();
  const money = (cents: number) => formatMoney({ format, cents, currency });
  const lines = Array.isArray(totals?.lines) ? totals.lines : [];
  const nameOf = (id: string) => types.find((type) => type.id === id)?.name ?? "";

  return (
    <section aria-labelledby="checkout-summary-heading" aria-busy={busy} className={`${TICKETS_CARD} ${busy ? "opacity-60" : ""}`}>
      <h3 id="checkout-summary-heading" className="font-heading text-lg font-semibold">
        {t("heading")}
      </h3>
      {totals === null ? (
        <p className="mt-2 text-sm text-muted">{t("empty")}</p>
      ) : (
        <>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            {lines.map((line) => (
              <li key={line.ticketTypeId} className="flex justify-between gap-4">
                <span className="[overflow-wrap:anywhere]">{t("line", { quantity: line.quantity, name: nameOf(line.ticketTypeId) })}</span>
                <span className="shrink-0 tabular-nums text-muted">{line.unitCents === 0 ? t("free") : t("each", { price: money(line.unitCents) })}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 flex flex-col gap-1.5 border-t border-(--color-border) pt-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt>{t("subtotal")}</dt>
              <dd className="tabular-nums">{money(totals.subtotalCents)}</dd>
            </div>
            {totals.discountCents > 0 ? (
              <div className="flex justify-between gap-4">
                <dt>{t("discount")}</dt>
                <dd className="tabular-nums">−{money(totals.discountCents)}</dd>
              </div>
            ) : null}
            {totals.feeCents > 0 ? (
              <div className="flex justify-between gap-4">
                <dt>{t("fee")}</dt>
                <dd className="tabular-nums">{money(totals.feeCents)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 text-muted">
              <dt>{t("vat")}</dt>
              <dd className="tabular-nums">{money(totals.vatCents)}</dd>
            </div>
            <div className="flex justify-between gap-4 text-base font-semibold">
              <dt>{t("total")}</dt>
              <dd className="tabular-nums">{totals.totalCents === 0 ? t("free") : money(totals.totalCents)}</dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}

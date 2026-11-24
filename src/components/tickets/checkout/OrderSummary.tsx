import type { ReactNode } from "react";
import { useFormatter, useTranslations } from "@/lib/tickets/i18n";
import { formatMoney } from "@/lib/tickets/format";
import type { PricedCart } from "@/lib/tickets/schemas";
import { TK_KICKER, TK_SUMMARY } from "../tickets-classes";
import type { PublicType } from "./types";

/**
 * "Your order" (the design's highlighted box on the right of the cart and the payment step). Every number is ep-api's
 * integer cents from the QUOTE (or the order answer) run through the locale formatter: nothing is added, multiplied or
 * rounded in the browser. `busy` dims the numbers while a new quote loads. `extras` sits under the lines (the discount
 * code), `children` under the total (the step's button and notes).
 */
export function OrderSummary({
  totals,
  currency,
  types,
  busy,
  extras,
  children,
  sticky = false,
}: {
  totals: PricedCart | null;
  currency: string;
  types: readonly PublicType[];
  busy: boolean;
  extras?: ReactNode;
  children?: ReactNode;
  /** Next to the form on a wide screen: stays in view while the buyer scrolls the form. */
  sticky?: boolean;
}) {
  const t = useTranslations("tickets.checkout.summary");
  const format = useFormatter();
  const money = (cents: number) => formatMoney({ format, cents, currency });
  const lines = Array.isArray(totals?.lines) ? totals.lines : [];
  const nameOf = (id: string) => types.find((type) => type.id === id)?.name ?? "";

  return (
    <section aria-labelledby="checkout-summary-heading" aria-busy={busy} className={`${TK_SUMMARY} ${sticky ? "lg:sticky lg:top-28" : ""}`}>
      <h3 id="checkout-summary-heading" className={`${TK_KICKER} m-0 font-normal`}>
        {t("heading")}
      </h3>
      <div className={`flex flex-col gap-3.5 transition-opacity ${busy ? "opacity-60" : ""}`}>
        {totals === null || lines.length === 0 ? (
          <p className="m-0 text-sm text-(--tk-mut)">{t("empty")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[15px]">
            {lines.map((line) => (
              <li key={line.ticketTypeId} className="flex justify-between gap-2.5">
                <span className="min-w-0 [overflow-wrap:anywhere]">{t("line", { quantity: line.quantity, name: nameOf(line.ticketTypeId) })}</span>
                <span className="shrink-0 font-mono text-sm tabular-nums text-(--tk-soft)">{line.unitCents === 0 ? t("free") : line.quantity === 1 ? money(line.unitCents) : t("each", { price: money(line.unitCents) })}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {extras}
      {totals !== null ? (
        <dl className={`m-0 flex flex-col gap-2 text-[15px] transition-opacity ${busy ? "opacity-60" : ""}`}>
          {totals.discountCents > 0 ? (
            <div className="flex justify-between gap-2.5 text-(--tk-accent)">
              <dt>{t("discount")}</dt>
              <dd className="m-0 font-mono text-sm tabular-nums">−{money(totals.discountCents)}</dd>
            </div>
          ) : null}
          {totals.feeCents > 0 ? (
            <div className="flex justify-between gap-2.5">
              <dt className="min-w-0">
                {t("fee")}
                <span className="block text-[12.5px] text-(--tk-mut)">{t("feeNote")}</span>
              </dt>
              <dd className="m-0 font-mono text-sm tabular-nums">{money(totals.feeCents)}</dd>
            </div>
          ) : null}
          <div aria-hidden="true" className="h-px bg-(--tk-line)" />
          <div className="flex items-baseline justify-between gap-2.5">
            <dt className="text-base">{t("total")}</dt>
            <dd className="m-0 text-[34px] leading-tight font-semibold tracking-[-0.02em] tabular-nums">{totals.totalCents === 0 ? t("free") : money(totals.totalCents)}</dd>
          </div>
          {totals.vatCents > 0 ? (
            <div className="-mt-2 flex text-[13px] text-(--tk-mut)">
              <dt className="sr-only">{t("vatLabel")}</dt>
              <dd className="m-0">{t("vat", { amount: money(totals.vatCents) })}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      {children}
    </section>
  );
}

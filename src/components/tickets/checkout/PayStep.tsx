import { useTranslations } from "@/lib/tickets/i18n";
import { lazy, Suspense } from "react";
import { TICKETS_BUTTON_OUTLINE, TICKETS_CARD, TICKETS_STRIPE_DANGER, TICKETS_STRIPE_MUTED, TICKETS_STRIPE_PANEL } from "../tickets-classes";
import { HoldTimer } from "./HoldTimer";
import { OrderSummary } from "./OrderSummary";
import type { OrderState, PublicType } from "./types";

// Stripe's SDK is fetched only when the buyer reaches this step (bundle budget): no other chunk imports it.
const StripePayment = lazy(() => import("./StripePayment"));

/** Step 04: hold timer (warning + Extend near the end), the price summary, then Stripe's Payment Element and Express Checkout. Money (`payLabel`) is the order answer's total. */
export function PayStep({
  order,
  locale,
  returnUrl,
  onExpire,
  testMode,
  payLabel,
  beforePay,
  onSucceeded,
  onBack,
  types,
  onExtend,
}: {
  order: OrderState;
  /** For the line names of the price summary. */
  types: readonly PublicType[];
  /** "Extend" near the end of the hold; `true` when ep-api granted more time. */
  onExtend: () => Promise<boolean>;
  locale: string;
  returnUrl: string;
  /** The hold reached zero: the parent sends the buyer back to step 01. */
  onExpire: () => void;
  testMode: boolean;
  payLabel: string;
  beforePay: () => Promise<boolean>;
  onSucceeded: () => void;
  onBack: () => void;
}) {
  const t = useTranslations("tickets.checkout.pay");
  const te = useTranslations("tickets.errors");
  const ready = order.clientSecret !== null && order.publishableKey !== null;
  // Below ep-api's ceiling only: once the hold reached `holdMaxAt`, asking again would just be refused.
  const canExtend = !order.holdMaxAt || new Date(order.holdExpiresAt).getTime() < new Date(order.holdMaxAt).getTime();

  return (
    <div className="flex flex-col gap-5">
      <div className={`${TICKETS_CARD} flex flex-col gap-2`}>
        <HoldTimer key={order.holdExpiresAt} until={order.holdExpiresAt} onExpire={onExpire} canExtend={canExtend} onExtend={onExtend} />
        {testMode ? <p className="text-sm font-medium text-warning-emphasis">{t("testNotice")}</p> : null}
      </div>
      {/* What the buyer pays, from the order answer (never only "Pay €…"): lines, discounts, booking fee, VAT, total. */}
      <OrderSummary totals={order.totals} currency={order.currency} types={types} busy={false} />
      <div className={TICKETS_STRIPE_PANEL}>
        {ready ? (
          <Suspense
            fallback={
              <p role="status" className={`text-sm ${TICKETS_STRIPE_MUTED}`}>
                {t("loading")}
              </p>
            }
          >
            <StripePayment
              publishableKey={order.publishableKey ?? ""}
              clientSecret={order.clientSecret ?? ""}
              locale={locale}
              returnUrl={returnUrl}
              beforePay={beforePay}
              onSucceeded={onSucceeded}
              payLabel={payLabel}
            />
          </Suspense>
        ) : (
          <p role="alert" className={`text-sm ${TICKETS_STRIPE_DANGER}`}>
            {te("paymentUnavailable")}
          </p>
        )}
      </div>
      <button type="button" className={`${TICKETS_BUTTON_OUTLINE} self-start`} onClick={onBack}>
        {t("back")}
      </button>
    </div>
  );
}

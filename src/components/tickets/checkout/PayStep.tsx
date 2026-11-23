import { useTranslations } from "@/lib/tickets/i18n";
import { lazy, Suspense, type ReactNode } from "react";
import { TICKETS_STRIPE_DANGER, TICKETS_STRIPE_MUTED, TICKETS_STRIPE_PANEL, TK_BUTTON_TEXT } from "../tickets-classes";
import { HoldTimer } from "./HoldTimer";
import { OrderSummary } from "./OrderSummary";
import type { OrderState, PublicType } from "./types";
import { Icon } from "./ui";

// Stripe's SDK is fetched only when the buyer reaches this step (bundle budget): no other chunk imports it.
const StripePayment = lazy(() => import("./StripePayment"));

/**
 * Step 2 of the design, "Payment": the hold timer (amber in the last 2 minutes, with Extend), Stripe's Express Checkout
 * and Payment Element on Stripe's own white panel, and "Your order" on the right. Money (`payLabel`, the summary) is the
 * order answer's, never the browser's.
 */
export function PayStep({
  header,
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
  /** The step bar and title (shared with the cart step). */
  header: ReactNode;
  order: OrderState;
  /** For the line names of the price summary. */
  types: readonly PublicType[];
  /** "Extend" near the end of the hold; `true` when ep-api granted more time. */
  onExtend: () => Promise<boolean>;
  locale: string;
  returnUrl: string;
  /** The hold reached zero: the parent sends the buyer back to step 1. */
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
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
      <div className="flex min-w-0 flex-col gap-[22px]">
        {header}
        <HoldTimer key={order.holdExpiresAt} until={order.holdExpiresAt} onExpire={onExpire} canExtend={canExtend} onExtend={onExtend} />
        {testMode ? (
          <p className="m-0 rounded-xl border border-[color-mix(in_srgb,var(--tk-warn)_45%,transparent)] px-3.5 py-2.5 text-sm font-medium text-(--tk-warn)">{t("testNotice")}</p>
        ) : null}
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
        <p className="m-0 flex items-center gap-2 text-[12.5px] text-(--tk-mut)">
          <Icon name="shield" size={14} />
          {t("secure")}
        </p>
      </div>
      {/* What the buyer pays, from the order answer (never only "Pay €…"): lines, discounts, booking fee, VAT, total. */}
      <OrderSummary sticky totals={order.totals} currency={order.currency} types={types} busy={false}>
        <button type="button" className={`${TK_BUTTON_TEXT} self-center`} onClick={onBack}>
          <Icon name="arrowLeft" size={15} />
          {t("back")}
        </button>
      </OrderSummary>
    </div>
  );
}

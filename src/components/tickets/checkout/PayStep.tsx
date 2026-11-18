import { useTranslations } from "@/lib/tickets/i18n";
import { lazy, Suspense } from "react";
import { TICKETS_BUTTON_OUTLINE, TICKETS_CARD } from "../tickets-classes";
import { HoldTimer } from "./HoldTimer";
import type { OrderState } from "./types";

// Stripe's SDK is fetched only when the buyer reaches this step (bundle budget): no other chunk imports it.
const StripePayment = lazy(() => import("./StripePayment"));

/** Step 04: hold timer + Stripe's Payment Element and Express Checkout. Money (`payLabel`) is the order answer's total. */
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
}: {
  order: OrderState;
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

  return (
    <div className="flex flex-col gap-5">
      <div className={`${TICKETS_CARD} flex flex-col gap-2`}>
        <HoldTimer key={order.holdExpiresAt} until={order.holdExpiresAt} onExpire={onExpire} />
        {testMode ? <p className="text-sm font-medium text-warning-emphasis">{t("testNotice")}</p> : null}
      </div>
      <div className={TICKETS_CARD}>
        {ready ? (
          <Suspense
            fallback={
              <p role="status" className="text-sm text-muted">
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
          <p role="alert" className="text-sm text-danger">
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

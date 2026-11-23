"use client";

// Interactive: mounts Stripe's Payment Element + Express Checkout Element and confirms the payment. This module
// is only ever reached through a dynamic import() from `PayStep`, so Stripe's SDK is not part of any other chunk.

import { ExpressCheckoutElement, Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe, type StripeElementLocale } from "@stripe/stripe-js";
import { useTranslations } from "@/lib/tickets/i18n";
import { useMemo, useRef, useState } from "react";
import { TICKETS_BUTTON, TICKETS_STRIPE_DANGER, TICKETS_STRIPE_MUTED } from "../tickets-classes";

export interface StripePaymentProps {
  /** From the ORDER answer of ep-api (never env). Public by design. */
  publishableKey: string;
  clientSecret: string;
  locale: string;
  /** `${origin}${localePrefix}/tickets/order/${buyerToken}?o=${orderId}` — where 3-D Secure / a wallet returns to. */
  returnUrl: string;
  /** Runs right before confirming (extends the hold). `false` = do not pay (the parent already explains why). */
  beforePay: () => Promise<boolean>;
  /** Payment went through without a redirect (or is processing): the parent navigates to the order page. */
  onSucceeded: () => void;
  payLabel: string;
}

/** Languages Stripe's Elements are translated into; anything else follows the browser (`auto`). */
const STRIPE_LOCALES: ReadonlySet<string> = new Set(
  "ar bg cs da de el en es et fi fil fr he hr hu id it ja ko lt lv ms mt nb nl pl pt ro ru sk sl sv th tr vi zh".split(" "),
);

function stripeLocale({ locale }: { locale: string }): StripeElementLocale {
  const base = locale.toLowerCase().split("-")[0] ?? "";
  return STRIPE_LOCALES.has(base) ? (base as StripeElementLocale) : "auto";
}

function PayForm({ returnUrl, beforePay, onSucceeded, payLabel }: Omit<StripePaymentProps, "publishableKey" | "locale" | "clientSecret">) {
  const t = useTranslations("tickets.checkout");
  const stripe = useStripe();
  const elements = useElements();
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [expressShown, setExpressShown] = useState(false);

  /** One path for the card form and the wallet buttons. Returns the Stripe error text, or null on success. */
  async function confirm(): Promise<string | null> {
    if (!stripe || !elements) return t("pay.notReady");
    const allowed = await beforePay();
    if (!allowed) return "";
    // Elements was created WITH the client secret (`options.clientSecret` below), so the secret must NOT be passed
    // again: that selects Stripe's deferred-intent flow, which requires `elements.submit()` first and otherwise throws
    // an IntegrationError on every attempt.
    const { error } = await stripe.confirmPayment({ elements, confirmParams: { return_url: returnUrl }, redirect: "if_required" });
    // Stripe's own text (already in the buyer's language): a decline, a bad card number, an expired card...
    if (error) return error.message ?? t("pay.declined");
    return null;
  }

  async function run(): Promise<boolean> {
    if (inFlight.current) return false; // a double click must not confirm twice
    inFlight.current = true;
    setBusy(true);
    setMessage(null);
    let failure: string | null;
    try {
      failure = await confirm();
    } catch (error) {
      // Not a decline (Stripe returns those as `error`): an integration or network fault. Name only, never the
      // message (it can echo the client secret).
      console.error("[tickets] confirmPayment threw", error instanceof Error ? error.name : "unknown");
      failure = t("pay.declined");
    }
    inFlight.current = false;
    setBusy(false);
    if (failure === null) {
      onSucceeded();
      return true;
    }
    if (failure) setMessage(failure);
    return false;
  }

  return (
    <div className="flex flex-col gap-4">
      <ExpressCheckoutElement
        options={{ buttonHeight: 44 }}
        onReady={(event) => setExpressShown(Boolean(event.availablePaymentMethods))}
        onConfirm={async (event) => {
          const ok = await run();
          if (!ok) event.paymentFailed?.({ reason: "fail" });
        }}
      />
      {expressShown ? (
        <p className={`text-center text-sm ${TICKETS_STRIPE_MUTED}`} aria-hidden="true">
          {t("pay.orCard")}
        </p>
      ) : null}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void run();
        }}
        className="flex flex-col gap-4"
        noValidate
      >
        <PaymentElement options={{ layout: "tabs" }} />
        <div role="alert" className={`text-sm ${TICKETS_STRIPE_DANGER}`}>
          {message}
        </div>
        <button type="submit" disabled={!stripe || !elements || busy} aria-busy={busy} className={`${TICKETS_BUTTON} disabled:opacity-50`}>
          {busy ? t("pay.processing") : payLabel}
        </button>
      </form>
    </div>
  );
}

/**
 * Stripe's own default look and loader (no `appearance`): Stripe keeps its Elements current, legible and familiar to
 * buyers, so the site does not restyle them. PayStep sets them on a white panel, which the default theme is made for.
 */
export default function StripePayment({ publishableKey, locale, ...rest }: StripePaymentProps) {
  // Stripe.js is requested once per key; `loadStripe` loads js.stripe.com on first call only.
  const stripePromise = useMemo<Promise<Stripe | null>>(() => loadStripe(publishableKey, { locale: stripeLocale({ locale }) }), [publishableKey, locale]);
  const options = useMemo(() => ({ clientSecret: rest.clientSecret }), [rest.clientSecret]);
  return (
    <Elements stripe={stripePromise} options={options}>
      <PayForm {...rest} />
    </Elements>
  );
}

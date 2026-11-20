"use client";

// Interactive: the whole checkout is client state — a cart with a live quote, three form steps, a hold timer and
// Stripe's payment elements. Server pages hand it plain, already-parsed data; it talks only to our own handlers.

import { useFormatter, useTranslations } from "@/lib/tickets/i18n";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  cartLines,
  clampCart,
  holderSlots,
  isBuyable,
  newIdempotencyKey,
  replaceCart,
  setQuantity,
  ticketCount,
  type Cart,
} from "@/lib/tickets/checkout-cart";
import { requestCreateOrder, requestExtendHold } from "@/lib/tickets/checkout-client";
import { formatMoney } from "@/lib/tickets/format";
import { openPrivateTicketPage } from "@/lib/tickets/private-navigation";
import type { CreateOrderBody } from "@/lib/tickets/schemas";
import { TICKETS_CARD } from "../tickets-classes";
import { DetailsStep } from "./DetailsStep";
import { EMPTY_DETAILS, EMPTY_HOLDER, normalizeVat, type DetailsValues, type HolderValues } from "./forms";
import { HoldersStep } from "./HoldersStep";
import { useCheckoutCaptcha, useCheckoutQuote } from "./hooks";
import { PayStep } from "./PayStep";
import { StepTickets, type SourceConflict } from "./StepTickets";
import { TicketCards } from "./TicketCards";
import { useKeepCartOnNavigation } from "./useKeepCartOnNavigation";
import type { CheckoutConfig, CheckoutDone, EmbeddedCheckout, OrderState, PublicType, Step } from "./types";

/** What a holder answered, for the questions the site asks only (empty answers are left out; ep-api refuses the rest). */
function answersOf({ holder, questions }: { holder: HolderValues; questions: CheckoutConfig["extraQuestions"] }): { answers?: NonNullable<CreateOrderBody["holders"][number]["answers"]> } {
  const company = holder.company.trim();
  const jobTitle = holder.jobTitle.trim();
  const dietaryOther = holder.dietaryOther.trim();
  const answers = {
    ...(questions.companyJob && company ? { company } : {}),
    ...(questions.companyJob && jobTitle ? { jobTitle } : {}),
    ...(questions.dietary && holder.dietary ? { dietary: holder.dietary } : {}),
    ...(questions.dietary && holder.dietary === "other" && dietaryOther ? { dietaryOther } : {}),
    ...(questions.tshirt && holder.tshirt ? { tshirt: holder.tshirt } : {}),
  } as NonNullable<CreateOrderBody["holders"][number]["answers"]>;
  return Object.keys(answers).length > 0 ? { answers } : {};
}

function heardFromOf({ details, questions }: { details: DetailsValues; questions: CheckoutConfig["extraQuestions"] }): { heardFrom?: NonNullable<CreateOrderBody["heardFrom"]> } {
  if (!questions.heardFrom || !details.heardFrom) return {};
  const text = details.heardFromText.trim();
  return { heardFrom: { value: details.heardFrom, ...(details.heardFrom === "other" && text ? { text } : {}) } as NonNullable<CreateOrderBody["heardFrom"]> };
}

const STEP_KEYS = ["tickets", "details", "holders", "pay"] as const;
const CODE_ERRORS = new Set(["codeInvalid", "codeNotValidNow", "codeNotApplicable", "codeUsedUp", "codeOnce"]);
const CARD_ERRORS = new Set(["soldOut", "notOnSale", "priceChanged", "overMax", "offerOverQuantity"]);
const HOLD_GONE = new Set(["holdEnded", "orderClosed", "notFound", "orderNotFound"]);

export interface TicketCheckoutProps {
  types: PublicType[];
  config: CheckoutConfig;
  /** The private-link token of `/tickets?link=…` (types behind a link are sold with it), when there is one. */
  linkToken?: string | undefined;
  /** A waitlist offer (`/tickets/w/{token}`): sent with the quote and the order; `initialQuantity` pre-selects the offered tickets. */
  offerToken?: string | undefined;
  initialQuantity?: number | undefined;
  /** Tickets in the cart when it opens (the Tickets block's pop-up pre-selects the clicked type at 1). */
  initialCart?: Cart | undefined;
  /** Offer only these types (the pop-up: the block's cards of one event). Absent = every type, as on `/tickets`. */
  allowedTypeIds?: readonly string[] | undefined;
  /** Inside the Tickets block's pop-up (see `EmbeddedCheckout`). Absent = the `/tickets` page, unchanged. */
  embedded?: EmbeddedCheckout | undefined;
  locale: string;
  /** `""` on the default locale, `"/de"` otherwise — so the order link stays in the buyer's language. */
  localePrefix: string;
}

export function TicketCheckout({ types: allTypes, config, linkToken, offerToken, initialQuantity, initialCart, allowedTypeIds, embedded, locale, localePrefix }: TicketCheckoutProps) {
  const t = useTranslations("tickets.checkout");
  const te = useTranslations("tickets.errors");
  const format = useFormatter();
  const router = useRouter();
  const types = useMemo(() => (allowedTypeIds ? allTypes.filter((type) => allowedTypeIds.includes(type.id)) : allTypes), [allTypes, allowedTypeIds]);
  // The pop-up re-reads stock itself; the page asks the router. One place, so no path can forget which one applies.
  const embeddedRef = useRef(embedded);
  useEffect(() => {
    embeddedRef.current = embedded;
  });
  const refreshStock = useCallback(() => {
    if (embeddedRef.current) embeddedRef.current.onRefresh();
    else router.refresh();
  }, [router]);

  const [step, setStep] = useState<Step>(1);
  const [pickedCart, setCart] = useState<Cart>(() => {
    const first = types[0];
    if (offerToken && initialQuantity && first) return { [first.id]: initialQuantity };
    return initialCart ?? {};
  });
  const [flagged, setFlagged] = useState<Record<string, string>>({});
  const [conflict, setConflict] = useState<SourceConflict | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [newsletter, setNewsletter] = useState(false);
  const [details, setDetails] = useState<DetailsValues>(EMPTY_DETAILS);
  const [holders, setHolders] = useState<HolderValues[]>([]);
  const [order, setOrder] = useState<OrderState | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Set when the buyer is sent to the order page (full page load): the checkout is over, links go back to normal.
  const [finished, setFinished] = useState(false);
  // The captcha of the order (only when the site has one): asked once step 03 is reached; the token is single-use.
  // Asked from the details step, so the answer is in before the holders step's Place order (the widget itself still only
  // mounts on the holders step).
  const captchaConfig = useCheckoutCaptcha({ active: step >= 2 });
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaBroken, setCaptchaBroken] = useState(false);
  const [captchaKey, setCaptchaKey] = useState(0);
  const handleCaptchaUnavailable = useCallback(() => setCaptchaBroken(true), []);
  const captchaOn = captchaConfig.status === "on" && !captchaBroken;
  const resetCaptcha = useCallback(() => {
    setCaptchaToken(null);
    setCaptchaKey((key) => key + 1);
  }, []);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const expiredRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  const placing = useRef(false);
  const idempotency = useRef<{ fingerprint: string; key: string } | null>(null);

  // Fresh availability (after a refresh) is applied by derivation: what can no longer be bought drops out of the
  // cart, what exceeds the new stock is lowered. No effect, so no extra render.
  const cart = useMemo(() => clampCart({ cart: pickedCart, types, salesOpen: config.salesOpen }), [pickedCart, types, config.salesOpen]);
  const lines = useMemo(() => cartLines({ cart, types }), [cart, types]);
  const quote = useCheckoutQuote({
    lines,
    code: appliedCode,
    newsletter,
    linkToken,
    offerToken,
    onRejected: ({ ticketTypeId, code }) => {
      if (ticketTypeId) setFlagged((previous) => ({ ...previous, [ticketTypeId]: code }));
    },
  });
  const quoted = quote.status === "ready" ? quote.result : null;
  const effectiveCode = appliedCode !== null && quoted?.codeStatus === "valid" ? appliedCode : null;
  const slots = useMemo(() => holderSlots({ lines, types }), [lines, types]);
  // A cart in progress: any ticket chosen, past step 1, or an order created. Every link leaving the page then opens in a new tab.
  useKeepCartOnNavigation({ active: !finished && (ticketCount({ cart }) > 0 || step > 1 || order !== null) });

  // The pop-up's shell needs the step (no backdrop close while paying) and the hold (the leave guard).
  const holdEndsAt = order?.holdExpiresAt ?? null;
  // A layout effect: the shell must know the step / hold in the same commit that shows them (a click right after paint must not see the old ones).
  useLayoutEffect(() => {
    embeddedRef.current?.onProgress({ step, holdExpiresAt: holdEndsAt });
  }, [step, holdEndsAt]);

  // Focus follows the step: the new step's heading, so a keyboard / screen reader user lands on it.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const handleExpired = useCallback(() => {
    setExpired(true);
    setOrder(null);
    setBanner(null);
    idempotency.current = null;
    setStep(1);
    refreshStock(); // fresh availability for step 01
  }, [refreshStock]);

  useEffect(() => {
    if (expired) expiredRef.current?.focus();
  }, [expired]);

  function changeQuantity({ type, quantity }: { type: PublicType; quantity: number }) {
    setExpired(false);
    const change = setQuantity({ cart, types, type, quantity });
    if (change.kind === "conflict") {
      setConflict({ type, quantity, fromName: change.from.name });
      return;
    }
    setConflict(null);
    setCart(change.cart);
    setFlagged((previous) => Object.fromEntries(Object.entries(previous).filter(([id]) => id !== type.id)));
  }

  function clearAndAdd() {
    if (!conflict) return;
    setCart(replaceCart({ type: conflict.type, quantity: conflict.quantity }));
    setFlagged({});
    setConflict(null);
  }

  function applyCode() {
    const value = codeInput.trim().toUpperCase();
    setCodeError(null);
    if (!/^[A-Z0-9-]{3,32}$/.test(value)) {
      setAppliedCode(null);
      setCodeError("codeInvalid");
      return;
    }
    setAppliedCode(value);
  }

  function orderBody({ holderValues }: { holderValues: readonly HolderValues[] }): Omit<CreateOrderBody, "idempotencyKey"> {
    const vat = normalizeVat({ value: details.vatNumber });
    return {
      lines,
      buyer: { name: details.name.trim(), email: details.email.trim() },
      holders: slots.map((slot, index) => ({
        ticketTypeId: slot.ticketTypeId,
        name: holderValues[index]?.name.trim() ?? "",
        email: holderValues[index]?.email.trim() ?? "",
        ...answersOf({ holder: holderValues[index] ?? EMPTY_HOLDER, questions: config.extraQuestions }),
      })),
      ...heardFromOf({ details, questions: config.extraQuestions }),
      ...(details.invoice
        ? {
            company: {
              name: details.companyName.trim(),
              ...(vat ? { vatNumber: vat } : {}),
              street: details.street.trim(),
              ...(details.postalCode.trim() ? { postalCode: details.postalCode.trim() } : {}),
              city: details.city.trim(),
              countryCode: details.countryCode,
            },
          }
        : {}),
      ...(effectiveCode ? { discountCode: effectiveCode } : {}),
      newsletter: config.newsletterOffer.on && newsletter,
      acceptTerms: details.acceptTerms || !config.questions.terms,
      ...(linkToken ? { linkToken } : {}),
      ...(offerToken ? { offerToken } : {}),
    };
  }

  /** The pop-up's confirmation data: the first cart line's event, and the holders as entered. */
  function doneOf({ orderId, buyerToken, free, holderValues }: { orderId: string; buyerToken: string; free: boolean; holderValues: readonly HolderValues[] }): CheckoutDone {
    const source = types.find((type) => lines.some((line) => line.ticketTypeId === type.id))?.source ?? types[0]?.source;
    return {
      orderId,
      buyerToken,
      free,
      holders: holderValues.map((holder) => ({ name: holder.name.trim(), email: holder.email.trim() })),
      eventName: source?.name ?? "",
      startDate: source?.startDate ?? null,
      endDate: source?.endDate ?? null,
    };
  }

  async function placeOrder(holderValues: HolderValues[]) {
    setHolders(holderValues);
    const body = orderBody({ holderValues });
    // The token is single-use and never part of "the same request": Back then Continue keeps its pending order.
    const fingerprint = JSON.stringify(body);
    setBanner(null);
    // Same request as the pending order (Back, then Continue again): keep that order, do not create a second one.
    if (order && order.fingerprint === fingerprint) {
      setStep(4);
      return;
    }
    if (placing.current) return; // a double click must not send twice
    placing.current = true;
    setSubmitting(true);
    // One key per distinct request, kept across retries: a lost response or a double click replays the SAME order.
    const key = idempotency.current?.fingerprint === fingerprint ? idempotency.current.key : newIdempotencyKey();
    idempotency.current = { fingerprint, key };

    // `captchaToken` goes out ONLY for a site with a captcha: until ep-api #456 is live it refuses unknown fields.
    const answer = await requestCreateOrder({ body: { ...body, ...(captchaOn && captchaToken ? { captchaToken } : {}), idempotencyKey: key } });
    placing.current = false;
    if (captchaOn) resetCaptcha(); // spent by this attempt, whatever the answer

    if (answer.ok) {
      const created = answer.data;
      const token = created.buyerToken ?? "";
      if (created.free) {
        setFinished(true);
        if (embeddedRef.current) {
          embeddedRef.current.onDone(doneOf({ orderId: created.orderId, buyerToken: token, free: true, holderValues }));
          return;
        }
        openPrivateTicketPage({ path: `${localePrefix}/tickets/order/${token}` });
        return; // stay in the "placing" state until the navigation lands
      }
      setOrder({
        orderId: created.orderId,
        buyerToken: token,
        holdExpiresAt: created.holdExpiresAt,
        holdMaxAt: created.holdMaxAt,
        clientSecret: created.clientSecret,
        publishableKey: created.publishableKey,
        fingerprint,
        totals: created.totals,
        currency: quoted?.currency ?? types[0]?.currency ?? "EUR",
      });
      setSubmitting(false);
      setStep(4);
      return;
    }

    setSubmitting(false);
    // Only a lost / unreachable answer may be retried under the same key; a definite refusal starts a new request.
    if (answer.code !== "unavailable") idempotency.current = null;
    if (HOLD_GONE.has(answer.code)) return handleExpired();
    if (answer.code === "captchaRequired" || answer.code === "captchaFailed") {
      setBanner(answer.code); // the widget was redrawn above: the buyer solves it again
      return;
    }
    if (answer.code === "offerEnded") {
      setBanner(answer.code);
      refreshStock(); // the offer page re-reads it and shows the "offer has ended" state
      return;
    }
    if (CODE_ERRORS.has(answer.code)) {
      setCodeError(answer.code);
      setAppliedCode(null);
      setStep(1);
      return;
    }
    if (CARD_ERRORS.has(answer.code) || answer.code === "oneEventPerOrder") {
      if (answer.ticketTypeId) setFlagged((previous) => ({ ...previous, [answer.ticketTypeId ?? ""]: answer.code }));
      setBanner(answer.code);
      setStep(1);
      refreshStock(); // fresh stock / prices
      return;
    }
    setBanner(answer.code);
  }

  /**
   * Right before paying. `false` = do not confirm. The hold is checked locally (the timer's own clock), and the
   * request for more hold time runs in the BACKGROUND while Stripe confirms.
   * DECISION (develop test 2026-11-12): awaiting the extend first made Pay wait for a full renderer → ep-api round
   * trip — 11.8 s on a cold serverless start. A payment that lands after its hold anyway is handled by ep-api (stock
   * still free → paid; otherwise refunded in full and emailed), so the extend is a courtesy, not a gate.
   */
  // The buyer's own "Extend" near the end of the hold: waits for ep-api (unlike the courtesy extend in `beforePay`).
  async function extendHold(): Promise<boolean> {
    if (!order) return false;
    const answer = await requestExtendHold({ orderId: order.orderId, token: order.buyerToken });
    if (!answer.ok) return false;
    setOrder((current) => (current ? { ...current, holdExpiresAt: answer.data.holdExpiresAt, holdMaxAt: answer.data.holdMaxAt ?? current.holdMaxAt } : current));
    return true;
  }

  async function beforePay(): Promise<boolean> {
    if (!order) return false;
    if (new Date(order.holdExpiresAt).getTime() <= Date.now()) {
      handleExpired();
      return false;
    }
    // The hold cannot go past `holdMaxAt`: once it is there, asking again only earns a refusal.
    if (order.holdMaxAt && new Date(order.holdExpiresAt).getTime() >= new Date(order.holdMaxAt).getTime()) return true;
    void requestExtendHold({ orderId: order.orderId, token: order.buyerToken }).then((answer) => {
      // Only a success changes the screen: a refusal arrives while the card is already being confirmed, and the
      // order page tells the buyer how that payment ended.
      if (answer.ok) setOrder((current) => (current ? { ...current, holdExpiresAt: answer.data.holdExpiresAt, holdMaxAt: answer.data.holdMaxAt ?? current.holdMaxAt } : current));
    });
    return true;
  }

  const orderPath = order ? `${localePrefix}/tickets/order/${order.buyerToken}?o=${order.orderId}` : "";
  const totalIsZero = quoted?.totals.totalCents === 0;
  const quoteError = quote.status === "error" ? quote.code : null;
  const sellable = types.some((type) => isBuyable({ type, salesOpen: config.salesOpen }));
  const stepName = t(`steps.${STEP_KEYS[step - 1] ?? "tickets"}`);

  // Nothing can be bought (sales closed, everything sold out…): show the list as information, with no cart or steps.
  if (!sellable && !order && !expired) {
    return (
      <div className="mt-6">
        <TicketCards types={types} config={config} cart={{}} flagged={{}} onQuantity={() => undefined} />
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      {expired ? (
        <div ref={expiredRef} tabIndex={-1} role="alert" className={`${TICKETS_CARD} border-warning-emphasis focus:outline-none`}>
          <h2 className="font-heading text-lg font-semibold">{t("expired.heading")}</h2>
          <p className="mt-1 text-sm text-muted">{t("expired.body")}</p>
        </div>
      ) : null}

      <ol aria-label={t("stepsLabel")} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {STEP_KEYS.map((key, index) => {
          const number = index + 1;
          const current = number === step;
          return (
            <li key={key} aria-current={current ? "step" : undefined} className={current ? "font-semibold text-text" : "text-muted"}>
              <span className="tabular-nums">{String(number).padStart(2, "0")}</span>
              <span className={current ? "ml-1.5" : "ml-1.5 hidden sm:inline"}>{t(`steps.${key}`)}</span>
            </li>
          );
        })}
      </ol>

      <h2 ref={headingRef} tabIndex={-1} className="font-heading text-xl font-semibold focus:outline-none">
        {stepName}
      </h2>

      {banner ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {te.has(banner) ? te(banner) : te("generic")}
        </p>
      ) : null}

      {step === 1 ? (
        <StepTickets
          types={types}
          config={config}
          cart={cart}
          flagged={flagged}
          onQuantity={changeQuantity}
          conflict={conflict}
          onClearAndAdd={clearAndAdd}
          onKeepCart={() => setConflict(null)}
          codeInput={codeInput}
          onCodeInput={setCodeInput}
          appliedCode={appliedCode}
          codeError={codeError}
          onApplyCode={applyCode}
          onRemoveCode={() => {
            setAppliedCode(null);
            setCodeInput("");
            setCodeError(null);
          }}
          newsletter={newsletter}
          onNewsletter={setNewsletter}
          quote={quote}
          quoteError={quoteError}
          canContinue={ticketCount({ cart }) > 0 && quote.status === "ready" && !conflict}
          onContinue={() => {
            setExpired(false);
            setBanner(null);
            setStep(2);
          }}
        />
      ) : null}

      {step === 2 ? (
        <DetailsStep
          config={config}
          values={details}
          onBack={(values) => {
            setDetails(values);
            setStep(1);
          }}
          onSubmit={(values) => {
            setDetails(values);
            setBanner(null);
            setStep(3);
          }}
        />
      ) : null}

      {step === 3 ? (
        <HoldersStep
          slots={slots}
          questions={config.extraQuestions}
          buyer={{ name: details.name, email: details.email }}
          values={holders}
          submitting={submitting}
          placeLabel={totalIsZero ? t("placeOrder") : t("continueToPayment")}
          captchaPending={captchaConfig.status === "loading"}
          detailsLater={config.detailsLater === true}
          captcha={
            captchaConfig.status === "on" && !captchaBroken
              ? { provider: captchaConfig.provider, resetKey: captchaKey, solved: captchaToken !== null, onToken: setCaptchaToken, onUnavailable: handleCaptchaUnavailable }
              : undefined
          }
          onBack={(values) => {
            setHolders(values);
            setStep(2);
          }}
          onSubmit={(values) => void placeOrder(values)}
        />
      ) : null}

      {step === 4 && order ? (
        <PayStep
          order={order}
          locale={locale}
          returnUrl={`${window.location.origin}${orderPath}`}
          onExpire={handleExpired}
          testMode={config.testMode}
          payLabel={t("pay.payNow", { amount: formatMoney({ format, cents: order.totals.totalCents, currency: order.currency }) })}
          beforePay={beforePay}
          types={types}
          onExtend={extendHold}
          onSucceeded={() => {
            setFinished(true);
            if (embedded) {
              embedded.onDone(doneOf({ orderId: order.orderId, buyerToken: order.buyerToken, free: false, holderValues: holders }));
              return;
            }
            openPrivateTicketPage({ path: orderPath });
          }}
          onBack={() => setStep(3)}
        />
      ) : null}
    </div>
  );
}

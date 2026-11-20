import { useFormatter, useTranslations } from "@/lib/tickets/i18n";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { Cart } from "@/lib/tickets/checkout-cart";
import { TICKETS_BUTTON, TICKETS_BUTTON_OUTLINE, TICKETS_CARD, TICKETS_INPUT } from "../tickets-classes";
import { OrderSummary } from "./OrderSummary";
import { TicketCards } from "./TicketCards";
import type { CheckoutConfig, PublicType, QuoteState } from "./types";

/** True for an IANA zone name the runtime knows. */
function isTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** The zone the code window is shown in: the event of the tickets in the cart, else the first listed type with a valid zone. */
function codeWindowTimeZone({ types, cart }: { types: readonly PublicType[]; cart: Cart }): string | undefined {
  const inCart = types.filter((type) => (cart[type.id] ?? 0) > 0);
  const candidates = inCart.length > 0 ? inCart : types;
  return candidates.map((type) => type.source.timeZone).find((zone) => zone && isTimeZone(zone)) ?? undefined;
}

export interface SourceConflict {
  type: PublicType;
  quantity: number;
  fromName: string;
}

export interface StepTicketsProps {
  types: readonly PublicType[];
  config: CheckoutConfig;
  cart: Cart;
  flagged: Readonly<Record<string, string>>;
  onQuantity: (args: { type: PublicType; quantity: number }) => void;
  conflict: SourceConflict | null;
  onClearAndAdd: () => void;
  onKeepCart: () => void;
  codeInput: string;
  onCodeInput: (value: string) => void;
  appliedCode: string | null;
  codeError: string | null;
  onApplyCode: () => void;
  onRemoveCode: () => void;
  newsletter: boolean;
  onNewsletter: (value: boolean) => void;
  quote: QuoteState;
  /** Error key of a rejected quote (`oneEventPerOrder`, `unavailable`…), shown above the summary. */
  quoteError: string | null;
  canContinue: boolean;
  onContinue: () => void;
}

/** Step 01: pick tickets, optionally a discount code and the newsletter offer; the summary shows ep-api's quote. */
export function StepTickets(props: StepTicketsProps) {
  // Unique per checkout: a page can hold more than one (the site-builder Tickets block).
  const uid = useId();
  const t = useTranslations("tickets.checkout");
  const te = useTranslations("tickets.errors");
  const format = useFormatter();
  // Read once per mount: only tells "starts later" from "already ended" for a code window.
  const [now] = useState(() => Date.now());
  const { quote, conflict, config } = props;
  const conflictRef = useRef<HTMLButtonElement>(null);

  // Focus follows the question: a keyboard / screen reader user lands on the first answer.
  useEffect(() => {
    if (conflict) conflictRef.current?.focus();
  }, [conflict]);

  const result = quote.status === "ready" || quote.status === "loading" || quote.status === "error" ? quote.result : undefined;
  // Code + newsletter never add up: ep-api applies only the bigger one. Say which one won, from the quote itself.
  const stackNote = ((): string | null => {
    if (!props.newsletter || !props.appliedCode || result?.codeStatus !== "valid" || quote.status !== "ready") return null;
    const pct = config.newsletterOffer.pct;
    if ((result.totals?.codeDiscountCents ?? 0) > 0) return t("newsletter.codeWins", { pct });
    if ((result.totals?.newsletterDiscountCents ?? 0) > 0) return t("newsletter.newsletterWins", { pct });
    return null;
  })();
  const codeStatus = result?.codeStatus;
  // One message per reason ep-api gives; the dates of "not valid now" are shown in the event's time zone.
  const rejectedMessage = ((): string | null => {
    if (!props.appliedCode || quote.status !== "ready") return null;
    // One event per order: types may span events, so the zone comes from the cart's tickets first.
    const timeZone = codeWindowTimeZone({ types: props.types, cart: props.cart });
    const when = (value: string | null | undefined) => {
      const date = value ? new Date(value) : null;
      if (!date || Number.isNaN(date.getTime())) return null;
      // `dateStyle`/`timeStyle` cannot be combined with `timeZoneName`, so the zone variant spells the fields out.
      const text = timeZone
        ? format.dateTime(date, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone, timeZoneName: "short" })
        : format.dateTime(date, { dateStyle: "medium", timeStyle: "short" });
      return { date, text };
    };
    switch (codeStatus) {
      case "unknown":
        return te("codeUnknown");
      case "not_applicable":
        return te("codeNotApplicable");
      case "used_up":
        return te("codeUsedUp");
      case "not_valid_now": {
        const from = when(result?.validFrom);
        const until = when(result?.validUntil);
        if (from && from.date.getTime() > now) return te("codeNotValidNowFrom", { date: from.text });
        if (until && until.date.getTime() <= now) return te("codeNotValidNowUntil", { date: until.text });
        return te("codeNotValidNow");
      }
      default:
        return null;
    }
  })();
  // At order create ep-api answers `codeInvalid` only for a code it does not know: say so, not the generic text.
  const orderCodeKey = props.codeError === "codeInvalid" ? "codeUnknown" : props.codeError;
  const codeMessage = orderCodeKey !== null ? (te.has(orderCodeKey) ? te(orderCodeKey) : te("codeInvalid")) : rejectedMessage;
  const codeApplied = props.appliedCode !== null && quote.status === "ready" && codeStatus === "valid";

  function applyCode(event: FormEvent) {
    event.preventDefault();
    props.onApplyCode();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <TicketCards nested types={props.types} config={config} cart={props.cart} flagged={props.flagged} onQuantity={props.onQuantity} />
      </div>

      {conflict ? (
        <div role="alertdialog" aria-labelledby="checkout-conflict-heading" aria-describedby="checkout-conflict-body" className={TICKETS_CARD}>
          <h3 id="checkout-conflict-heading" className="font-heading text-lg font-semibold">
            {t("conflict.heading", { from: conflict.fromName })}
          </h3>
          <p id="checkout-conflict-body" className="mt-1 text-sm text-muted">
            {t("conflict.body", { to: conflict.type.source.name })}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button ref={conflictRef} type="button" className={TICKETS_BUTTON} onClick={props.onClearAndAdd}>
              {t("conflict.clear")}
            </button>
            <button type="button" className={TICKETS_BUTTON_OUTLINE} onClick={props.onKeepCart}>
              {t("conflict.keep")}
            </button>
          </div>
        </div>
      ) : null}

      <form onSubmit={applyCode} className={`${TICKETS_CARD} flex flex-col gap-2`} noValidate>
        <label htmlFor={`${uid}-checkout-code`} className="text-sm font-medium">
          {t("code.label")}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id={`${uid}-checkout-code`}
            value={props.codeInput}
            onChange={(event) => props.onCodeInput(event.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={32}
            aria-invalid={codeMessage ? true : undefined}
            aria-describedby="checkout-code-status"
            className={`${TICKETS_INPUT} sm:flex-1`}
          />
          <button type="submit" className={TICKETS_BUTTON_OUTLINE} disabled={props.codeInput.trim() === ""}>
            {t("code.apply")}
          </button>
          {props.appliedCode ? (
            <button type="button" className={TICKETS_BUTTON_OUTLINE} onClick={props.onRemoveCode}>
              {t("code.remove")}
            </button>
          ) : null}
        </div>
        <p id="checkout-code-status" role="status" className={`text-sm ${codeMessage ? "text-danger" : "text-muted"}`}>
          {codeMessage ?? (codeApplied ? t("code.applied", { code: props.appliedCode ?? "" }) : "")}
        </p>
      </form>

      {config.newsletterOffer.on ? (
        <label htmlFor={`${uid}-checkout-newsletter`} className={`${TICKETS_CARD} flex min-h-11 cursor-pointer items-start gap-3 text-sm`}>
          <input id={`${uid}-checkout-newsletter`} type="checkbox" aria-labelledby={`${uid}-checkout-newsletter-label`} checked={props.newsletter} onChange={(event) => props.onNewsletter(event.target.checked)} className="mt-0.5 size-5 shrink-0 accent-primary" />
          <span className="flex flex-col gap-1">
            <span id={`${uid}-checkout-newsletter-label`}>{t("newsletter.label", { pct: config.newsletterOffer.pct })}</span>
            {stackNote ? (
              <span role="status" className="text-muted">
                {stackNote}
              </span>
            ) : null}
          </span>
        </label>
      ) : null}

      <div aria-live="polite" className="flex flex-col gap-3">
        {props.quoteError ? (
          <p role="alert" className="text-sm font-medium text-danger">
            {te.has(props.quoteError) ? te(props.quoteError) : te("generic")}
          </p>
        ) : null}
        <OrderSummary totals={result?.totals ?? null} currency={result?.currency ?? props.types[0]?.currency ?? "EUR"} types={props.types} busy={quote.status === "loading"} />
      </div>

      <button type="button" className={`${TICKETS_BUTTON} w-full sm:w-auto sm:self-end`} disabled={!props.canContinue} onClick={props.onContinue}>
        {t("continue")}
      </button>
    </div>
  );
}

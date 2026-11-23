import { zodResolver } from "@hookform/resolvers/zod";
import { useFormatter, useLocale, useTranslations } from "@/lib/tickets/i18n";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { CaptchaWidget } from "@/components/tickets/CaptchaWidget";
import type { Cart } from "@/lib/tickets/checkout-cart";
import { safeHttpUrl } from "@/lib/tickets/checkout-cart";
import { countryOptions } from "@/lib/tickets/countries";
import { ANSWER_LIMITS } from "@/lib/tickets/schemas";
import { TK_BUTTON, TK_BUTTON_OUTLINE, TK_BUTTON_TEXT, TK_CHECKBOX, TK_INPUT, TK_LABEL } from "../tickets-classes";
import { buildCartSchema, EMPTY_HOLDER, type CartFormValues } from "./forms";
import type { CaptchaProvider } from "./hooks";
import { HolderQuestions, useOptionLabel } from "./HolderQuestions";
import { OrderSummary } from "./OrderSummary";
import { SelectField } from "./SelectField";
import { TextField } from "./TextField";
import { TicketCards } from "./TicketCards";
import type { CheckoutConfig, PublicType, QuoteState } from "./types";
import { CheckoutSection, Icon } from "./ui";

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

/** The captcha of the order: the widget is shown only when the site has one, and the order button waits for its token. */
export interface CartCaptcha {
  provider: CaptchaProvider;
  /** Changes to draw a fresh widget (a token is single-use: after any attempt, or a refusal, the buyer solves again). */
  resetKey: number;
  solved: boolean;
  onToken: (token: string | null) => void;
  /** The widget could not load: the checkout treats the captcha as off (nothing to solve, no token sent). */
  onUnavailable: () => void;
}

export interface HolderSlot {
  ticketTypeId: string;
  typeName: string;
}

export interface CartStepProps {
  /** The step bar, title and any notice of the page: the top of the left column. */
  header: ReactNode;
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
  /** Error key of a rejected quote (`oneEventPerOrder`, `unavailable`…), shown in the order box. */
  quoteError: string | null;
  /** Tickets chosen, the quote is in, no open question: the order may be placed (once the form is valid). */
  canOrder: boolean;
  slots: readonly HolderSlot[];
  /** What the buyer typed before (Back from the payment step keeps it). */
  values: CartFormValues;
  submitting: boolean;
  placeLabel: string;
  captcha?: CartCaptcha | undefined;
  /** The site's captcha setting is still being read: the button waits so no order goes out without a required token. */
  captchaPending?: boolean;
  onSubmit: (values: CartFormValues) => void;
}

/** One message per reason ep-api gives for a discount code; the dates of "not valid now" in the event's time zone. */
function useCodeMessages({ quote, appliedCode, codeError, newsletter, types, cart, pct }: { quote: QuoteState; appliedCode: string | null; codeError: string | null; newsletter: boolean; types: readonly PublicType[]; cart: Cart; pct: number }) {
  const t = useTranslations("tickets.checkout");
  const te = useTranslations("tickets.errors");
  const format = useFormatter();
  // Read once per mount: only tells "starts later" from "already ended" for a code window.
  const [now] = useState(() => Date.now());
  const result = quote.status === "ready" || quote.status === "loading" || quote.status === "error" ? quote.result : undefined;
  const codeStatus = result?.codeStatus;

  // Code + newsletter never add up: ep-api applies only the bigger one. Say which one won, from the quote itself.
  let stackNote: string | null = null;
  if (newsletter && appliedCode && codeStatus === "valid" && quote.status === "ready") {
    if ((result?.totals?.codeDiscountCents ?? 0) > 0) stackNote = t("newsletter.codeWins", { pct });
    else if ((result?.totals?.newsletterDiscountCents ?? 0) > 0) stackNote = t("newsletter.newsletterWins", { pct });
  }

  let rejected: string | null = null;
  if (appliedCode && quote.status === "ready") {
    // One event per order: types may span events, so the zone comes from the cart's tickets first.
    const timeZone = codeWindowTimeZone({ types, cart });
    const when = (value: string | null | undefined) => {
      const date = value ? new Date(value) : null;
      if (!date || Number.isNaN(date.getTime())) return null;
      // `dateStyle`/`timeStyle` cannot be combined with `timeZoneName`, so the zone variant spells the fields out.
      const text = timeZone
        ? format.dateTime(date, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone, timeZoneName: "short" })
        : format.dateTime(date, { dateStyle: "medium", timeStyle: "short" });
      return { date, text };
    };
    if (codeStatus === "unknown") rejected = te("codeUnknown");
    else if (codeStatus === "not_applicable") rejected = te("codeNotApplicable");
    else if (codeStatus === "used_up") rejected = te("codeUsedUp");
    else if (codeStatus === "not_valid_now") {
      const from = when(result?.validFrom);
      const until = when(result?.validUntil);
      if (from && from.date.getTime() > now) rejected = te("codeNotValidNowFrom", { date: from.text });
      else if (until && until.date.getTime() <= now) rejected = te("codeNotValidNowUntil", { date: until.text });
      else rejected = te("codeNotValidNow");
    }
  }
  // At order create ep-api answers `codeInvalid` only for a code it does not know: say so, not the generic text.
  const orderCodeKey = codeError === "codeInvalid" ? "codeUnknown" : codeError;
  const message = orderCodeKey !== null ? (te.has(orderCodeKey) ? te(orderCodeKey) : te("codeInvalid")) : rejected;
  const applied = appliedCode !== null && quote.status === "ready" && codeStatus === "valid";
  return { message, applied, stackNote, result };
}

/**
 * Step 1 of the design, "Tickets & details", on one page: 01 Tickets (quantity per ticket), 02 Your details (buyer,
 * newsletter offer under the email, terms, company invoice, "how did you hear"), 03 Ticket holders (a name + email per
 * ticket, the first one follows the buyer until edited) and, on the right, "Your order" with the discount code, ep-api's
 * quote and the button that places the order. One form, so every missing field is shown at once.
 */
export function CartStep(props: CartStepProps) {
  const { config, quote, conflict, slots } = props;
  // Unique per checkout: field ids never clash with another form on the page.
  const uid = useId();
  const formId = `${uid}-cart`;
  const t = useTranslations("tickets.checkout");
  const tq = useTranslations("tickets.checkout.questions");
  const te = useTranslations("tickets.errors");
  const locale = useLocale();
  const optionLabel = useOptionLabel();
  const countries = useMemo(() => countryOptions({ locale }), [locale]);
  const schema = useMemo(() => buildCartSchema({ termsRequired: config.questions.terms, questions: config.extraQuestions }), [config.questions.terms, config.extraQuestions]);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors, submitCount },
  } = useForm<CartFormValues>({ resolver: zodResolver(schema), defaultValues: { ...props.values, holders: slots.map((_, index) => props.values.holders[index] ?? EMPTY_HOLDER) } });

  const conflictRef = useRef<HTMLButtonElement>(null);
  // Focus follows the question: a keyboard / screen reader user lands on the first answer.
  useEffect(() => {
    if (conflict) conflictRef.current?.focus();
  }, [conflict]);

  // One holder per ticket: the list grows and shrinks with the cart, keeping what was typed for the tickets that stay.
  // A new row's inputs register before this runs (as `{ name: undefined, … }`), so every answer is filled in, not just the count.
  useEffect(() => {
    const current = getValues("holders") ?? [];
    const complete = (holder: Partial<CartFormValues["holders"][number]> | undefined) => Object.fromEntries(Object.entries(EMPTY_HOLDER).map(([key, empty]) => [key, holder?.[key as keyof typeof holder] ?? empty])) as CartFormValues["holders"][number];
    const next = slots.map((_, index) => complete(current[index]));
    if (current.length === next.length && current.every((holder, index) => JSON.stringify(holder) === JSON.stringify(next[index]))) return;
    setValue("holders", next);
  }, [slots, getValues, setValue]);

  // The first ticket is the buyer's until its name or email is edited (design: "for you, unless changed").
  const first = props.values.holders[0];
  const [follows, setFollows] = useState(() => !first || (first.name === "" && first.email === "") || (first.name === props.values.name && first.email === props.values.email));
  const buyerName = useWatch({ control, name: "name" });
  const buyerEmail = useWatch({ control, name: "email" });
  useEffect(() => {
    if (!follows || slots.length === 0) return;
    setValue("holders.0.name", buyerName ?? "");
    setValue("holders.0.email", buyerEmail ?? "");
  }, [follows, buyerName, buyerEmail, slots.length, setValue]);

  const invoiceChecked = useWatch({ control, name: "invoice" });
  const invoice = config.questions.invoice && invoiceChecked;
  const heardFromOptions = config.extraQuestions.heardFrom;
  const heardFrom = useWatch({ control, name: "heardFrom" });
  const termsUrl = safeHttpUrl({ url: config.termsUrl });
  const privacyUrl = safeHttpUrl({ url: config.privacyUrl });

  // Validation tokens → translated text (WCAG 3.3.1).
  const text = (token: string | undefined): string | null => (token ? (t.has(`validation.${token}`) ? t(`validation.${token}`) : t("validation.required")) : null);
  const message = (field: Exclude<keyof CartFormValues, "holders">): string | null => text(errors[field]?.message);
  const holderMessage = (index: number, field: "name" | "email" | "company" | "jobTitle" | "dietary" | "dietaryOther" | "tshirt"): string | null => text(errors.holders?.[index]?.[field]?.message);
  const termsError = message("acceptTerms");
  const hasErrors = submitCount > 0 && Object.keys(errors).length > 0;

  const code = useCodeMessages({ quote, appliedCode: props.appliedCode, codeError: props.codeError, newsletter: props.newsletter, types: props.types, cart: props.cart, pct: config.newsletterOffer.pct });
  const free = code.result?.totals.totalCents === 0;
  const blocked = props.submitting || props.captchaPending === true || (props.captcha !== undefined && !props.captcha.solved);

  const submit = handleSubmit((submitted) =>
    props.onSubmit({
      ...submitted,
      // An answer to a question the site does not ask (or "other" text without "other") is never kept, so it cannot reach the order.
      invoice: config.questions.invoice && submitted.invoice,
      heardFrom: heardFromOptions ? submitted.heardFrom : "",
      heardFromText: heardFromOptions && submitted.heardFrom === "other" ? submitted.heardFromText : "",
      holders: submitted.holders.slice(0, slots.length),
    }),
  );

  const span = { full: "col-span-2 sm:col-span-6", half: "col-span-2 sm:col-span-3", wide: "col-span-2 sm:col-span-4", narrow: "col-span-2 sm:col-span-2", tiny: "col-span-1 sm:col-span-1", small: "col-span-1 sm:col-span-2" };

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
      <div className="flex min-w-0 flex-col gap-[22px]">
        {props.header}

        <CheckoutSection number="01" title={t("cart.sectionTickets")} headingId={`${uid}-tickets`}>
          <TicketCards nested types={props.types} config={config} cart={props.cart} flagged={props.flagged} onQuantity={props.onQuantity} />
          {conflict ? (
            <div role="alertdialog" aria-labelledby="checkout-conflict-heading" aria-describedby="checkout-conflict-body" className="rounded-xl border border-(--tk-ring) bg-(--tk-tint) p-4">
              <h4 id="checkout-conflict-heading" className="m-0 text-base font-semibold">
                {t("conflict.heading", { from: conflict.fromName })}
              </h4>
              <p id="checkout-conflict-body" className="m-0 mt-1 text-sm text-(--tk-soft)">
                {t("conflict.body", { to: conflict.type.source.name })}
              </p>
              <div className="mt-3.5 flex flex-col gap-2 sm:flex-row">
                <button ref={conflictRef} type="button" className={TK_BUTTON_OUTLINE} onClick={props.onClearAndAdd}>
                  {t("conflict.clear")}
                </button>
                <button type="button" className={TK_BUTTON_TEXT} onClick={props.onKeepCart}>
                  {t("conflict.keep")}
                </button>
              </div>
            </div>
          ) : null}
        </CheckoutSection>

        <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-[22px]">
          <CheckoutSection number="02" title={t("cart.sectionDetails")} headingId={`${uid}-details`}>
            <div className="grid grid-cols-2 items-start gap-x-3.5 gap-y-3 sm:grid-cols-6">
              <div className={span.half}>
                <TextField variant="checkout" id={`${uid}-buyer-name`} label={t("details.name")} error={message("name")} registration={register("name")} autoComplete="name" />
              </div>
              <div className={span.half}>
                <TextField variant="checkout" id={`${uid}-buyer-email`} label={t("details.email")} hint={t("details.emailHint")} error={message("email")} registration={register("email")} type="email" autoComplete="email" inputMode="email" />
              </div>
            </div>

            {config.newsletterOffer.on ? (
              <label htmlFor={`${uid}-checkout-newsletter`} className={`flex cursor-pointer items-start gap-2.5 rounded-[10px] border px-3 py-2.5 ${props.newsletter ? "border-(--tk-ring) bg-(--tk-tint)" : "border-(--tk-line)"}`}>
                <input id={`${uid}-checkout-newsletter`} type="checkbox" aria-labelledby={`${uid}-checkout-newsletter-label`} aria-describedby={`${uid}-checkout-newsletter-note`} checked={props.newsletter} onChange={(event) => props.onNewsletter(event.target.checked)} className={`${TK_CHECKBOX} mt-0.5`} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span id={`${uid}-checkout-newsletter-label`} className="text-[13.5px] leading-snug">
                    {t("newsletter.label", { pct: config.newsletterOffer.pct })}
                  </span>
                  <span id={`${uid}-checkout-newsletter-note`} className="text-xs leading-normal text-(--tk-mut)">
                    {t("newsletter.note")}
                  </span>
                  {code.stackNote ? (
                    <span role="status" className="text-xs leading-normal text-(--tk-soft)">
                      {code.stackNote}
                    </span>
                  ) : null}
                </span>
              </label>
            ) : null}

            {config.questions.terms ? (
              <div className="flex flex-col gap-1">
                <label htmlFor={`${uid}-accept-terms`} className="flex min-h-9 cursor-pointer items-start gap-2.5 text-[15px] leading-normal">
                  <input id={`${uid}-accept-terms`} type="checkbox" aria-labelledby={`${uid}-accept-terms-label`} aria-invalid={termsError ? true : undefined} aria-describedby={termsError ? `${uid}-accept-terms-error` : undefined} className={`${TK_CHECKBOX} mt-[3px]`} {...register("acceptTerms")} />
                  <span id={`${uid}-accept-terms-label`}>{t("details.acceptTerms")}</span>
                </label>
                {termsUrl || privacyUrl ? (
                  <p className="m-0 flex flex-wrap gap-x-4 gap-y-1 pl-7 text-sm">
                    {termsUrl ? (
                      <a href={termsUrl} target="_blank" rel="noopener noreferrer" className="text-(--tk-accent) underline underline-offset-2">
                        {t("details.readTerms")}
                        <span className="sr-only"> {t("details.opensNewTab")}</span>
                      </a>
                    ) : null}
                    {privacyUrl ? (
                      <a href={privacyUrl} target="_blank" rel="noopener noreferrer" className="text-(--tk-accent) underline underline-offset-2">
                        {t("details.readPrivacy")}
                        <span className="sr-only"> {t("details.opensNewTab")}</span>
                      </a>
                    ) : null}
                  </p>
                ) : null}
                <p id={`${uid}-accept-terms-error`} role="alert" className="m-0 pl-7 text-[13px] text-(--tk-err) empty:hidden">
                  {termsError}
                </p>
              </div>
            ) : null}

            {config.questions.invoice ? (
              <label htmlFor={`${uid}-buyer-invoice`} className="flex min-h-9 cursor-pointer items-center gap-2.5 text-[15px]">
                <input id={`${uid}-buyer-invoice`} type="checkbox" aria-labelledby={`${uid}-buyer-invoice-label`} className={TK_CHECKBOX} {...register("invoice")} />
                <span id={`${uid}-buyer-invoice-label`}>{t("details.invoiceToggle")}</span>
              </label>
            ) : null}
            {invoice ? (
              <fieldset className="m-0 min-w-0 border-0 p-0">
                <legend className="sr-only">{t("details.invoiceLegend")}</legend>
                <div className="grid grid-cols-2 items-start gap-x-3.5 gap-y-3 sm:grid-cols-6">
                  <div className={span.wide}>
                    <TextField variant="checkout" id={`${uid}-company-name`} label={t("details.companyName")} error={message("companyName")} registration={register("companyName")} autoComplete="organization" />
                  </div>
                  <div className={span.narrow}>
                    <TextField variant="checkout" id={`${uid}-company-vat`} label={t("details.vat")} error={message("vatNumber")} registration={register("vatNumber")} autoCapitalize="characters" spellCheck={false} className={`${TK_INPUT} font-mono`} />
                  </div>
                  <div className={span.half}>
                    <TextField variant="checkout" id={`${uid}-company-street`} label={t("details.street")} error={message("street")} registration={register("street")} autoComplete="address-line1" />
                  </div>
                  <div className={span.tiny}>
                    <TextField variant="checkout" id={`${uid}-company-postal`} label={t("details.postalCode")} error={message("postalCode")} registration={register("postalCode")} autoComplete="postal-code" />
                  </div>
                  <div className={span.small}>
                    <TextField variant="checkout" id={`${uid}-company-city`} label={t("details.city")} error={message("city")} registration={register("city")} autoComplete="address-level2" />
                  </div>
                  <div className={span.half}>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={`${uid}-company-country`} className={TK_LABEL}>
                        {t("details.country")}
                      </label>
                      <select
                        id={`${uid}-company-country`}
                        autoComplete="country"
                        aria-invalid={message("countryCode") ? true : undefined}
                        aria-describedby={message("countryCode") ? `${uid}-company-country-error` : undefined}
                        className={TK_INPUT}
                        {...register("countryCode")}
                      >
                        <option value="">{t("details.countryPlaceholder")}</option>
                        {countries.map((country) => (
                          // The label comes from Intl.DisplayNames, whose ICU data differs between Node and the browser
                          // ("Falkland Islands (Islas Malvinas)" vs "Falkland Islands"); the value (ISO code) is the same.
                          <option key={country.value} value={country.value} suppressHydrationWarning>
                            {country.label}
                          </option>
                        ))}
                      </select>
                      <p id={`${uid}-company-country-error`} role="alert" className="m-0 text-[13px] text-(--tk-err) empty:hidden">
                        {message("countryCode")}
                      </p>
                    </div>
                  </div>
                </div>
              </fieldset>
            ) : null}

            {heardFromOptions ? (
              <div className="grid grid-cols-2 items-start gap-x-3.5 gap-y-3 sm:grid-cols-6">
                <div className={span.half}>
                  <SelectField
                    variant="checkout"
                    id={`${uid}-heard-from`}
                    label={tq("heardFrom")}
                    placeholder={tq("choose")}
                    error={message("heardFrom")}
                    registration={register("heardFrom")}
                    options={heardFromOptions.map((option) => ({ value: option.value, label: optionLabel({ group: "heard", option }) }))}
                  />
                </div>
                {heardFrom === "other" ? (
                  <div className={span.half}>
                    <TextField variant="checkout" id={`${uid}-heard-from-text`} label={tq("heardFromOther")} error={message("heardFromText")} registration={register("heardFromText")} maxLength={ANSWER_LIMITS.other + 1} autoComplete="off" />
                  </div>
                ) : null}
              </div>
            ) : null}
          </CheckoutSection>

          {slots.length > 0 ? (
            <CheckoutSection number="03" title={t("cart.sectionHolders")} headingId={`${uid}-holders`}>
              <p className="m-0 -mt-1 text-sm leading-relaxed text-(--tk-mut)">{t("holders.intro")}</p>
              {config.detailsLater === true ? (
                <p role="note" className="m-0 flex items-start gap-2.5 text-[13.5px] leading-normal text-(--tk-mut)">
                  <Icon name="idCard" className="mt-0.5 text-(--tk-accent)" />
                  <span>{t("holders.detailsLater")}</span>
                </p>
              ) : null}
              <div className="flex flex-col rounded-xl border border-(--tk-line)">
                {slots.map((slot, index) => (
                  <fieldset key={`${slot.ticketTypeId}-${index}`} className={`m-0 min-w-0 border-0 px-3.5 py-3 ${index > 0 ? "border-t border-solid border-(--tk-line)" : ""}`}>
                    <legend className="float-left mb-2.5 flex w-full flex-wrap items-center gap-x-2 gap-y-0.5 p-0 text-sm">
                      <Icon name="ticket" size={15} className="text-(--tk-accent)" />
                      <span className="min-w-0 [overflow-wrap:anywhere]">{t("holders.ticketN", { number: index + 1, type: slot.typeName })}</span>
                      {index === 0 && follows ? <span className="whitespace-nowrap text-xs text-(--tk-mut)">· {t("holders.follows")}</span> : null}
                    </legend>
                    <div className="clear-both flex flex-col gap-3">
                      <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-2 sm:gap-3">
                        <TextField
                          variant="checkout"
                          id={`${uid}-holder-${index}-name`}
                          label={t("holders.name")}
                          error={holderMessage(index, "name")}
                          registration={register(`holders.${index}.name`, index === 0 ? { onChange: () => setFollows(false) } : undefined)}
                          autoComplete="off"
                        />
                        <TextField
                          variant="checkout"
                          id={`${uid}-holder-${index}-email`}
                          label={t("holders.email")}
                          error={holderMessage(index, "email")}
                          registration={register(`holders.${index}.email`, index === 0 ? { onChange: () => setFollows(false) } : undefined)}
                          type="email"
                          inputMode="email"
                          autoComplete="off"
                        />
                      </div>
                      <HolderQuestions index={index} questions={config.extraQuestions} register={register} control={control} message={holderMessage} />
                    </div>
                  </fieldset>
                ))}
              </div>
            </CheckoutSection>
          ) : null}

          {props.captcha?.provider === "recaptcha-v3" ? (
            // Invisible: nothing to solve, the order button waits only for the token it fetches by itself.
            <CaptchaWidget key={props.captcha.resetKey} provider={props.captcha.provider} onToken={props.captcha.onToken} onUnavailable={props.captcha.onUnavailable} />
          ) : props.captcha ? (
            <div className="flex flex-col gap-3 border-t border-(--tk-line) pt-[22px]">
              <CaptchaWidget key={props.captcha.resetKey} provider={props.captcha.provider} onToken={props.captcha.onToken} onUnavailable={props.captcha.onUnavailable} />
              {props.captcha.solved ? null : <p className="m-0 text-sm text-(--tk-mut)">{t("captcha.hint")}</p>}
            </div>
          ) : null}
        </form>
      </div>

      <OrderSummary
        sticky
        totals={code.result?.totals ?? null}
        currency={code.result?.currency ?? props.types[0]?.currency ?? "EUR"}
        types={props.types}
        busy={quote.status === "loading"}
        extras={
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <label htmlFor={`${uid}-checkout-code`} className="sr-only">
                {t("code.label")}
              </label>
              <input
                id={`${uid}-checkout-code`}
                value={props.codeInput}
                onChange={(event) => props.onCodeInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  if (props.codeInput.trim() !== "") props.onApplyCode();
                }}
                placeholder={t("code.label")}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={32}
                aria-invalid={code.message ? true : undefined}
                aria-describedby="checkout-code-status"
                className={`${TK_INPUT} font-mono uppercase placeholder:normal-case`}
              />
              <button type="button" className="min-h-11 shrink-0 rounded-[10px] border border-(--tk-line) bg-transparent px-4 text-sm font-semibold text-(--tk-text) hover:border-(--tk-ring) disabled:cursor-not-allowed disabled:opacity-45" disabled={props.codeInput.trim() === ""} onClick={props.onApplyCode}>
                {t("code.apply")}
              </button>
            </div>
            <div className="flex items-start justify-between gap-2">
              <p id="checkout-code-status" role="status" className={`m-0 text-[13px] empty:hidden ${code.message ? "text-(--tk-err)" : "text-(--tk-accent)"}`}>
                {code.message ?? (code.applied ? t("code.applied", { code: props.appliedCode ?? "" }) : "")}
              </p>
              {props.appliedCode ? (
                <button type="button" className={`${TK_BUTTON_TEXT} -my-3 ml-auto text-[13px]`} onClick={props.onRemoveCode}>
                  {t("code.remove")}
                </button>
              ) : null}
            </div>
          </div>
        }
      >
        <div aria-live="polite" className="empty:hidden">
          {props.quoteError ? (
            <p role="alert" className="m-0 flex items-start gap-2 text-[13px] font-medium text-(--tk-err)">
              <Icon name="alert" size={15} className="mt-px" />
              {te.has(props.quoteError) ? te(props.quoteError) : te("generic")}
            </p>
          ) : null}
        </div>
        {/* Outside the form (it sits in the order box): it runs the form's own submit, so validation and focus work the same. */}
        <button type="button" onClick={(event) => void submit(event)} className={`${TK_BUTTON} w-full`} disabled={!props.canOrder || blocked} aria-busy={props.submitting}>
          {props.submitting ? t("placing") : props.placeLabel}
          {props.submitting ? null : <Icon name="arrowRight" size={17} />}
        </button>
        <p className="m-0 flex items-start gap-2 text-[12.5px] leading-normal text-(--tk-mut)">
          <Icon name="lock" size={14} className="mt-px" />
          {free ? t("cart.nextFree") : config.holdMinutes ? t("cart.nextPay", { minutes: config.holdMinutes }) : t("cart.nextPayNoHold")}
        </p>
        {hasErrors ? (
          <p role="alert" className="m-0 text-[12.5px] text-(--tk-err)">
            {t("cart.fixFields")}
          </p>
        ) : null}
      </OrderSummary>
    </div>
  );
}

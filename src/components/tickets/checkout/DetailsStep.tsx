import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "@/lib/tickets/i18n";
import { useId, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { countryOptions } from "@/lib/tickets/countries";
import { safeHttpUrl } from "@/lib/tickets/checkout-cart";
import { useOptionLabel } from "./HolderQuestions";
import { SelectField } from "./SelectField";
import { ANSWER_LIMITS } from "@/lib/tickets/schemas";
import { TICKETS_BUTTON, TICKETS_BUTTON_OUTLINE, TICKETS_CARD, TICKETS_INPUT } from "../tickets-classes";
import { buildDetailsSchema, type DetailsValues } from "./forms";
import { TextField } from "./TextField";
import type { CheckoutConfig } from "./types";

/** Step 02: who is buying, an optional company invoice, and the terms. Values live in the parent so Back keeps them. */
export function DetailsStep({ config, values, onBack, onSubmit }: { config: CheckoutConfig; values: DetailsValues; onBack: (values: DetailsValues) => void; onSubmit: (values: DetailsValues) => void }) {
  const t = useTranslations("tickets.checkout");
  const locale = useLocale();
  // Unique per checkout: a page can hold more than one (the site-builder Tickets block).
  const uid = useId();
  const schema = useMemo(() => buildDetailsSchema({ termsRequired: config.questions.terms }), [config.questions.terms]);
  const countries = useMemo(() => countryOptions({ locale }), [locale]);
  const {
    register,
    handleSubmit,
    control,
    getValues,
    formState: { errors },
  } = useForm<DetailsValues>({ resolver: zodResolver(schema), defaultValues: values });
  const invoiceChecked = useWatch({ control, name: "invoice" });
  const invoice = config.questions.invoice && invoiceChecked;
  const tq = useTranslations("tickets.checkout.questions");
  const optionLabel = useOptionLabel();
  const heardFromOptions = config.extraQuestions.heardFrom;
  const heardFrom = useWatch({ control, name: "heardFrom" });

  // Validation tokens → translated text (WCAG 3.3.1).
  const message = (field: keyof DetailsValues): string | null => {
    const token = errors[field]?.message;
    return token ? (t.has(`validation.${token}`) ? t(`validation.${token}`) : t("validation.required")) : null;
  };
  const termsUrl = safeHttpUrl({ url: config.termsUrl });
  const privacyUrl = safeHttpUrl({ url: config.privacyUrl });
  const termsError = message("acceptTerms");

  return (
    <form
      onSubmit={handleSubmit((submitted) =>
        // An answer to a question the site does not ask (or "other" text without "other") is never kept, so it cannot reach the order.
        onSubmit({ ...submitted, invoice: config.questions.invoice && submitted.invoice, heardFrom: heardFromOptions ? submitted.heardFrom : "", heardFromText: heardFromOptions && submitted.heardFrom === "other" ? submitted.heardFromText : "" }),
      )} noValidate className="flex flex-col gap-5">
      <div className={`${TICKETS_CARD} flex flex-col gap-4`}>
        <TextField id="buyer-name" label={t("details.name")} error={message("name")} registration={register("name")} autoComplete="name" />
        <TextField id="buyer-email" label={t("details.email")} hint={t("details.emailHint")} error={message("email")} registration={register("email")} type="email" autoComplete="email" inputMode="email" />
      </div>

      {config.questions.invoice ? (
        <div className={`${TICKETS_CARD} flex flex-col gap-4`}>
          <label htmlFor={`${uid}-buyer-invoice`} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
            <input id={`${uid}-buyer-invoice`} type="checkbox" aria-labelledby={`${uid}-buyer-invoice-label`} className="size-5 shrink-0 accent-primary" {...register("invoice")} />
            <span id={`${uid}-buyer-invoice-label`}>{t("details.invoiceToggle")}</span>
          </label>
          {invoice ? (
            <fieldset className="flex flex-col gap-4">
              <legend className="sr-only">{t("details.invoiceLegend")}</legend>
              <TextField id="company-name" label={t("details.companyName")} error={message("companyName")} registration={register("companyName")} autoComplete="organization" />
              <TextField id="company-vat" label={t("details.vat")} error={message("vatNumber")} registration={register("vatNumber")} autoCapitalize="characters" spellCheck={false} />
              <TextField id="company-street" label={t("details.street")} error={message("street")} registration={register("street")} autoComplete="street-address" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField id="company-postal" label={t("details.postalCode")} error={message("postalCode")} registration={register("postalCode")} autoComplete="postal-code" />
                <TextField id="company-city" label={t("details.city")} error={message("city")} registration={register("city")} autoComplete="address-level2" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`${uid}-company-country`} className="text-sm font-medium">
                  {t("details.country")}
                </label>
                <select
                  id={`${uid}-company-country`}
                  autoComplete="country"
                  aria-invalid={message("countryCode") ? true : undefined}
                  aria-describedby={message("countryCode") ? "company-country-error" : undefined}
                  className={TICKETS_INPUT}
                  {...register("countryCode")}
                >
                  <option value="">{t("details.countryPlaceholder")}</option>
                  {countries.map((country) => (
                    <option key={country.value} value={country.value}>
                      {country.label}
                    </option>
                  ))}
                </select>
                <p id="company-country-error" role="alert" className="text-sm text-danger">
                  {message("countryCode")}
                </p>
              </div>
            </fieldset>
          ) : null}
        </div>
      ) : null}

      {heardFromOptions ? (
        <div className={`${TICKETS_CARD} flex flex-col gap-4`}>
          <SelectField
            id={`${uid}-heard-from`}
            label={tq("heardFrom")}
            placeholder={tq("choose")}
            error={message("heardFrom")}
            registration={register("heardFrom")}
            options={heardFromOptions.map((option) => ({ value: option.value, label: optionLabel({ group: "heard", option }) }))}
          />
          {heardFrom === "other" ? (
            <TextField id={`${uid}-heard-from-text`} label={tq("heardFromOther")} error={message("heardFromText")} registration={register("heardFromText")} maxLength={ANSWER_LIMITS.other + 1} autoComplete="off" />
          ) : null}
        </div>
      ) : null}

      {config.questions.terms ? (
        <div className={`${TICKETS_CARD} flex flex-col gap-2`}>
          <label htmlFor={`${uid}-accept-terms`} className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
            <input id={`${uid}-accept-terms`} type="checkbox" aria-labelledby={`${uid}-accept-terms-label`} aria-invalid={termsError ? true : undefined} aria-describedby={termsError ? `${uid}-accept-terms-error` : undefined} className="mt-0.5 size-5 shrink-0 accent-primary" {...register("acceptTerms")} />
            <span id={`${uid}-accept-terms-label`}>{t("details.acceptTerms")}</span>
          </label>
          {termsUrl || privacyUrl ? (
            <p className="flex flex-wrap gap-x-4 gap-y-1 pl-8 text-sm">
              {termsUrl ? (
                <a href={termsUrl} target="_blank" rel="noopener noreferrer" className="underline">
                  {t("details.readTerms")}
                  <span className="sr-only"> {t("details.opensNewTab")}</span>
                </a>
              ) : null}
              {privacyUrl ? (
                <a href={privacyUrl} target="_blank" rel="noopener noreferrer" className="underline">
                  {t("details.readPrivacy")}
                  <span className="sr-only"> {t("details.opensNewTab")}</span>
                </a>
              ) : null}
            </p>
          ) : null}
          <p id={`${uid}-accept-terms-error`} role="alert" className="pl-8 text-sm text-danger">
            {termsError}
          </p>
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <button type="button" className={TICKETS_BUTTON_OUTLINE} onClick={() => onBack(getValues())}>
          {t("back")}
        </button>
        <button type="submit" className={TICKETS_BUTTON}>
          {t("continue")}
        </button>
      </div>
    </form>
  );
}

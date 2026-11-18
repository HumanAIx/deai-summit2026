import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "@/lib/tickets/i18n";
import { useForm } from "react-hook-form";
import { TICKETS_BUTTON, TICKETS_BUTTON_OUTLINE, TICKETS_CARD } from "../tickets-classes";
import { useId, useMemo } from "react";
import { CaptchaWidget } from "@/components/tickets/CaptchaWidget";
import type { ExtraQuestions } from "@/lib/tickets/checkout-questions";
import { buildHoldersSchema, EMPTY_HOLDER, type HolderValues, type HoldersFormValues } from "./forms";
import { HolderQuestions } from "./HolderQuestions";
import { TextField } from "./TextField";

/** The captcha of the order: the widget is shown only when the site has one, and Place order waits for its token. */
export interface HoldersCaptcha {
  provider: "recaptcha" | "hcaptcha";
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

/**
 * Step 03: one name + email per ticket (every ticket has a named holder). "Same as buyer" fills the first ticket.
 * Each ticket is its own fieldset with a numbered legend, so 10+ holders stay navigable by screen reader and phone.
 */
export function HoldersStep({
  slots,
  questions,
  buyer,
  values,
  submitting,
  placeLabel,
  captcha,
  captchaPending = false,
  detailsLater = false,
  onBack,
  onSubmit,
}: {
  slots: readonly HolderSlot[];
  /** The extra questions the site asks of every holder (answered under their name and email). */
  questions: ExtraQuestions;
  buyer: Pick<HolderValues, "name" | "email">;
  values: readonly HolderValues[];
  submitting: boolean;
  placeLabel: string;
  captcha?: HoldersCaptcha | undefined;
  /** The site's captcha setting is still being read: the button waits so no order goes out without a required token. */
  captchaPending?: boolean;
  /** The site asks the holders' details on their ticket page (ep-api T7): one line tells the buyer so. */
  detailsLater?: boolean;
  onBack: (holders: HolderValues[]) => void;
  onSubmit: (holders: HolderValues[]) => void;
}) {
  // Unique per checkout, so two checkouts on one page (the block pop-up and a page checkout) never share field ids.
  const uid = useId();
  const t = useTranslations("tickets.checkout");
  const schema = useMemo(() => buildHoldersSchema({ questions }), [questions]);
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    control,
    formState: { errors },
  } = useForm<HoldersFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { holders: slots.map((_, index) => values[index] ?? EMPTY_HOLDER) },
  });

  const message = (index: number, field: "name" | "email" | "company" | "jobTitle" | "dietary" | "dietaryOther" | "tshirt"): string | null => {
    const token = errors.holders?.[index]?.[field]?.message;
    return token ? (t.has(`validation.${token}`) ? t(`validation.${token}`) : t("validation.required")) : null;
  };

  return (
    <form onSubmit={handleSubmit((submitted) => onSubmit(submitted.holders))} noValidate className="flex flex-col gap-5">
      <p className="text-sm text-muted">{t("holders.intro")}</p>
      {detailsLater ? (
        <p role="note" className="rounded-(--radius) border border-primary/30 bg-primary/8 px-3.5 py-2.5 text-sm text-text">
          {t("holders.detailsLater")}
        </p>
      ) : null}
      {slots.map((slot, index) => (
        <fieldset key={`${slot.ticketTypeId}-${index}`} className={`${TICKETS_CARD} flex flex-col gap-4`}>
          <legend className="px-1 font-medium [overflow-wrap:anywhere]">{t("holders.ticketN", { number: index + 1, type: slot.typeName })}</legend>
          {index === 0 ? (
            <button
              type="button"
              className={`${TICKETS_BUTTON_OUTLINE} self-start`}
              onClick={() => {
                setValue("holders.0.name", buyer.name, { shouldValidate: true });
                setValue("holders.0.email", buyer.email, { shouldValidate: true });
              }}
            >
              {t("holders.sameAsBuyer")}
            </button>
          ) : null}
          <TextField id={`${uid}-holder-${index}-name`} label={t("holders.name")} error={message(index, "name")} registration={register(`holders.${index}.name`)} autoComplete="off" />
          <TextField id={`${uid}-holder-${index}-email`} label={t("holders.email")} error={message(index, "email")} registration={register(`holders.${index}.email`)} type="email" inputMode="email" autoComplete="off" />
          <HolderQuestions index={index} questions={questions} register={register} control={control} message={message} />
        </fieldset>
      ))}
      {captcha ? (
        <div className={`${TICKETS_CARD} flex flex-col gap-3`}>
          <CaptchaWidget key={captcha.resetKey} provider={captcha.provider} onToken={captcha.onToken} onUnavailable={captcha.onUnavailable} />
          {captcha.solved ? null : <p className="text-sm text-muted">{t("captcha.hint")}</p>}
        </div>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <button type="button" className={TICKETS_BUTTON_OUTLINE} onClick={() => onBack(getValues().holders)} disabled={submitting}>
          {t("back")}
        </button>
        <button type="submit" className={`${TICKETS_BUTTON} disabled:opacity-50`} disabled={submitting || captchaPending || (captcha !== undefined && !captcha.solved)} aria-busy={submitting}>
          {submitting ? t("placing") : placeLabel}
        </button>
      </div>
    </form>
  );
}

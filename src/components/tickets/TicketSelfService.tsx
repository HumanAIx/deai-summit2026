"use client";

// Interactive: two react-hook-form forms (rule 37) that post to our own route handlers. Pass-on is the "My Ticket" card: a
// "Pass on" button opens the name / email form with the can't-undo warning beside the submit button (prototype), then the
// confirm question before the irreversible post; a router refresh then shows the "passed on" state. The name form is shown only where the ticket page has no "Your details" form.

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "@/lib/tickets/i18n";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { requestNameCorrection, requestPassOn, requestPassOnCheck } from "@/lib/tickets/self-service-client";
import { TextField } from "./checkout/TextField";
import { nameFormSchema, passOnFormSchema, type NameFormValues, type PassOnFormValues } from "./self-service-forms";
import { TP_BUTTON, TP_BUTTON_OUTLINE, TP_BUTTON_TEXT, TP_CARD, TP_CARD_PAD, TP_INPUT, TP_INPUT_ERROR, TP_INPUT_OK } from "./ticket-page-classes";

type Failure = { code: string } | null;

function errorText({ t, code }: { t: ReturnType<typeof useTranslations>; code: string }): string {
  return t.has(`errors.${code}`) ? t(`errors.${code}`) : t("errors.generic");
}

/** The form schemas' message tokens (`required`, `max`, `email`) become translated text (WCAG 3.3.1). */
function fieldMessage({ t, issue }: { t: ReturnType<typeof useTranslations>; issue: string | undefined }): string | null {
  if (!issue) return null;
  return t.has(`selfService.validation.${issue}`) ? t(`selfService.validation.${issue}`) : t("selfService.validation.required");
}

function CorrectNameForm({ token, currentName, onDone }: { token: string; currentName: string; onDone: () => void }) {
  const t = useTranslations("tickets");
  const [failure, setFailure] = useState<Failure>(null);
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NameFormValues>({ resolver: zodResolver(nameFormSchema), defaultValues: { name: currentName } });

  async function onSubmit(values: NameFormValues) {
    setFailure(null);
    setSaved(false);
    const result = await requestNameCorrection({ token, body: values });
    if (!result.ok) {
      setFailure({ code: result.code });
      return;
    }
    setSaved(true);
    onDone();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate aria-labelledby="correct-name-heading" className={`${TP_CARD} ${TP_CARD_PAD} flex flex-col gap-4`}>
      <h2 id="correct-name-heading" className="text-[19px] font-semibold tracking-[-0.01em]">
        {t("selfService.correctName.heading")}
      </h2>
      <p className="text-[15px] leading-normal text-(--mt-body)">{t("selfService.correctName.intro")}</p>
      <TextField
        id="correct-name-input"
        label={t("selfService.nameLabel")}
        autoComplete="name"
        variant="page"
        error={fieldMessage({ t, issue: errors.name?.message })}
        registration={register("name")}
      />
      <div role="alert">{failure ? <p className="text-sm text-(--mt-err)">{errorText({ t, code: failure.code })}</p> : null}</div>
      <div role="status">{saved ? <p className="text-sm font-medium">{t("selfService.correctName.saved")}</p> : null}</div>
      <button type="submit" disabled={isSubmitting} className={`${TP_BUTTON} self-start max-[480px]:w-full`}>
        {isSubmitting ? t("selfService.saving") : t("selfService.correctName.submit")}
      </button>
    </form>
  );
}

function PassOnForm({ token, onDone }: { token: string; onDone: () => void }) {
  const t = useTranslations("tickets");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<PassOnFormValues | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<Failure>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  const confirmHeading = useRef<HTMLHeadingElement>(null);
  const firstField = useRef<HTMLInputElement | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<PassOnFormValues>({ resolver: zodResolver(passOnFormSchema), defaultValues: { name: "", email: "" } });
  const filled = passOnFormSchema.safeParse(useWatch({ control })).success;

  // Opening the form moves focus into it; the confirm step moves it to its question; closing returns it to "Pass on".
  useEffect(() => {
    if (pending) confirmHeading.current?.focus();
    else if (open) firstField.current?.focus();
  }, [open, pending]);

  function close() {
    setOpen(false);
    setFailure(null);
    reset({ name: "", email: "" });
    queueMicrotask(() => openButton.current?.focus());
  }

  // Before the "cannot be undone" question: ep-api's pre-check, so a pass-on it would refuse (the same email, transfers
  // off, changes closed, an open refund request) is shown on the form and never reaches the confirm step.
  async function check(values: PassOnFormValues) {
    setSubmitting(true);
    setFailure(null);
    const result = await requestPassOnCheck({ token, body: { email: values.email } });
    setSubmitting(false);
    if (!result.ok) {
      setFailure({ code: result.code });
      return;
    }
    setPending(values);
  }

  // The irreversible step: only after the confirm question.
  async function confirm() {
    if (!pending) return;
    setSubmitting(true);
    setFailure(null);
    const result = await requestPassOn({ token, body: pending });
    setSubmitting(false);
    if (!result.ok) {
      setFailure({ code: result.code });
      setPending(null);
      return;
    }
    onDone();
  }

  const nameField = register("name");
  return (
    <section aria-labelledby="pass-on-heading" className={`${TP_CARD} ${TP_CARD_PAD} flex flex-col gap-4`}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-0.5">
          <h2 id="pass-on-heading" className="text-[19px] font-semibold tracking-[-0.01em]">
            {t("selfService.passOn.heading")}
          </h2>
          <p className="text-sm leading-normal text-(--mt-body)">{t("selfService.passOn.introCard")}</p>
        </div>
        {open ? null : (
          <button ref={openButton} type="button" onClick={() => setOpen(true)} className={TP_BUTTON_OUTLINE}>
            {t("selfService.passOn.open")}
          </button>
        )}
      </div>
      {pending ? (
        <div role="group" aria-labelledby="pass-on-confirm-heading" className="flex flex-col gap-3 border-t border-(--mt-hair) pt-4">
          <h3 id="pass-on-confirm-heading" ref={confirmHeading} tabIndex={-1} className="text-[17px] font-semibold focus:outline-none">
            {t("selfService.passOn.confirmHeading", { name: pending.name })}
          </h3>
          <p className="text-sm [overflow-wrap:anywhere]">{t("selfService.passOn.confirmTo", { name: pending.name, email: pending.email })}</p>
          <p className="text-sm font-medium text-(--mt-err)">{t("selfService.passOn.confirmWarning")}</p>
          <div className="flex flex-wrap items-center gap-2.5">
            <button type="button" onClick={() => void confirm()} disabled={submitting} className={TP_BUTTON}>
              {submitting ? t("selfService.saving") : t("selfService.passOn.confirm")}
            </button>
            <button type="button" onClick={() => setPending(null)} disabled={submitting} className={TP_BUTTON_TEXT}>
              {t("selfService.passOn.back")}
            </button>
          </div>
        </div>
      ) : open ? (
        <form onSubmit={handleSubmit(check)} noValidate aria-labelledby="pass-on-heading" className="flex flex-col gap-2.5">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-3">
            <div className="flex flex-col gap-1">
              <input
                id="pass-on-name"
                autoComplete="off"
                placeholder={t("selfService.passOn.namePlaceholder")}
                aria-label={t("selfService.passOn.nameLabel")}
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? "pass-on-name-error" : undefined}
                className={`${TP_INPUT} ${errors.name ? TP_INPUT_ERROR : TP_INPUT_OK}`}
                {...nameField}
                ref={(element) => {
                  nameField.ref(element);
                  firstField.current = element;
                }}
              />
              {errors.name ? (
                <p id="pass-on-name-error" role="alert" className="text-[13px] text-(--mt-err)">
                  {fieldMessage({ t, issue: errors.name.message })}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1">
              <input
                id="pass-on-email"
                type="email"
                inputMode="email"
                autoComplete="off"
                placeholder={t("selfService.passOn.emailPlaceholder")}
                aria-label={t("selfService.passOn.emailLabel")}
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? "pass-on-email-error" : undefined}
                className={`${TP_INPUT} ${errors.email ? TP_INPUT_ERROR : TP_INPUT_OK}`}
                {...register("email")}
              />
              {errors.email ? (
                <p id="pass-on-email-error" role="alert" className="text-[13px] text-(--mt-err)">
                  {fieldMessage({ t, issue: errors.email.message })}
                </p>
              ) : null}
            </div>
          </div>
          <div role="alert">{failure ? <p className="text-sm text-(--mt-err)">{errorText({ t, code: failure.code })}</p> : null}</div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button type="submit" disabled={!filled} className={TP_BUTTON}>
              {t("selfService.passOn.submitNow")}
            </button>
            <button type="button" onClick={close} className={TP_BUTTON_TEXT}>
              {t("selfService.cancel")}
            </button>
            <p className="text-[13px] text-(--mt-mut)">{t("selfService.passOn.warning")}</p>
          </div>
        </form>
      ) : null}
    </section>
  );
}

/**
 * The holder's own actions on `/tickets/t/{token}`: correct the name, pass the ticket on. Each form is rendered only when
 * ep-api says it is allowed (`canCorrectName` / `canPassOn`: the organiser's switch AND an open change window). After a
 * success the server-rendered page is refreshed: a name change shows the new name; a pass-on shows the "passed on to {name}"
 * state (ep-api answers the old token with the passed-on ticket).
 */
export function TicketSelfService({ token, holderName, canCorrectName, canPassOn }: { token: string; holderName: string | null; canCorrectName: boolean; canPassOn: boolean }) {
  const router = useRouter();
  const refresh = () => router.refresh();
  if (!canCorrectName && !canPassOn) return null;
  return (
    <div className="flex flex-col gap-4 print:hidden">
      {canCorrectName ? <CorrectNameForm token={token} currentName={holderName ?? ""} onDone={refresh} /> : null}
      {canPassOn ? <PassOnForm token={token} onDone={refresh} /> : null}
    </div>
  );
}

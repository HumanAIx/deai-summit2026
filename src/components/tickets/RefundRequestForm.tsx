"use client";

// Interactive: a refund-request form (tickets to pick, a reason, a message) with react-hook-form + zod (rule 37) that
// posts to our own handler and refreshes the server-rendered order page when it succeeds. The "Ask for a refund" button
// lives in the Refunds card and the form opens as a full-width panel above the order ("DeAI Manage Order" design), so the
// two share their open state through a small context.

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "@/lib/tickets/i18n";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { useForm, useWatch } from "react-hook-form";
import { requestRefund } from "@/lib/tickets/self-service-client";
import { REFUND_REASONS, type RefundReason } from "@/lib/tickets/schemas";
import { prefersReducedMotion } from "./details-focus";
import { refundFormSchema, type RefundFormValues } from "./self-service-forms";
import { CheckIcon, CloseIcon } from "./ticket-page-icons";
import { TP_BUTTON, TP_BUTTON_OUTLINE, TP_BUTTON_TEXT, TP_FOCUS, TP_ICON_BUTTON, TP_INPUT, TP_INPUT_ERROR, TP_INPUT_OK, TP_LABEL, TP_SECTION_LABEL } from "./ticket-page-classes";

export interface RefundableTicket {
  id: string;
  label: string;
  code: string;
  /** A second line under the name (the pass, when the order has a single ticket type). */
  detail?: string | undefined;
}

type Stage = "idle" | "form" | "sent";

interface RefundState {
  stage: Stage;
  setStage: (stage: Stage) => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}

const RefundContext = createContext<RefundState | null>(null);

function useRefund(): RefundState {
  const value = useContext(RefundContext);
  if (!value) throw new Error("RefundRequestTrigger / RefundRequestPanel must be inside a RefundRequestProvider");
  return value;
}

/** Holds whether the refund form is open, for the Refunds card's button and the panel above the order. */
export function RefundRequestProvider({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<Stage>("idle");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const value = useMemo(() => ({ stage, setStage, triggerRef }), [stage]);
  return <RefundContext.Provider value={value}>{children}</RefundContext.Provider>;
}

/** The Refunds card's part: the intro and "Ask for a refund"; "Fill in your request above" while the form is open; the sent note. */
export function RefundRequestTrigger() {
  const t = useTranslations("tickets");
  const { stage, setStage, triggerRef } = useRefund();

  if (stage === "sent") {
    return (
      <div role="status" className="flex flex-col gap-1.5 rounded-[14px] border border-(--mt-warn)/35 bg-(--mt-warn)/7 p-4">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-(--mt-warn)">
          <span aria-hidden className="size-2 rounded-full bg-current" />
          {t("selfService.refund.sentHeading")}
        </h3>
        <p className="text-sm leading-[1.55] text-(--mt-warn-soft)">{t("selfService.refund.sentBody")}</p>
      </div>
    );
  }

  if (stage === "form") {
    return <p className="text-[15px] leading-[1.55] text-(--tk-accent)">{t("selfService.refund.fillAbove")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] leading-[1.55] text-(--mt-body) [text-wrap:pretty]">{t("selfService.refund.cardIntro")}</p>
      <button ref={triggerRef} type="button" onClick={() => setStage("form")} className={`${TP_BUTTON_OUTLINE} min-h-[46px] w-full`}>
        {t("selfService.refund.open")}
      </button>
    </div>
  );
}

/**
 * "Request a refund": the buyer picks the tickets, says why and may add a message. This only ASKS the organiser; nothing is
 * refunded until they approve, and the tickets keep working meanwhile (said on the form). One open request per order: ep-api
 * refuses a second (`refundRequestOpen`); the order page then shows the request's status instead of this form. Opening it
 * scrolls the panel into view and focuses its heading; Cancel, × and Escape close it and return the focus to the button.
 */
export function RefundRequestPanel({ token, tickets }: { token: string; tickets: readonly RefundableTicket[] }) {
  const t = useTranslations("tickets");
  const router = useRouter();
  const { stage, setStage, triggerRef } = useRefund();
  const [code, setCode] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const panel = useRef<HTMLElement>(null);
  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RefundFormValues>({
    resolver: zodResolver(refundFormSchema),
    // A single-ticket order needs no choosing.
    defaultValues: { ticketIds: tickets.length === 1 ? tickets.map((ticket) => ticket.id) : [], reason: undefined as unknown as RefundReason, message: "" },
  });

  const open = stage === "form";
  useEffect(() => {
    if (!open) return;
    panel.current?.scrollIntoView?.({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    heading.current?.focus({ preventScroll: true });
  }, [open]);

  const selected = useWatch({ control, name: "ticketIds" });
  const reason = useWatch({ control, name: "reason" });
  // A controlled checkbox group: the list of chosen ids lives in the form state, so one ticket and many behave the same.
  const toggle = ({ id, checked }: { id: string; checked: boolean }) =>
    setValue("ticketIds", checked ? [...selected.filter((value) => value !== id), id] : selected.filter((value) => value !== id), { shouldValidate: errors.ticketIds !== undefined });
  const allSelected = selected.length === tickets.length;

  // Bounded choices as a data array of { value, label } (rule 39); labels are translated here.
  const reasons: Array<{ value: RefundReason; label: string }> = REFUND_REASONS.map((value) => ({ value, label: t(`selfService.refund.reasons.${value}`) }));
  const reasonLabel = reasons.find((item) => item.value === reason)?.label ?? "—";
  const token_ = (issue: string | undefined): string | null => (issue ? (t.has(`selfService.validation.${issue}`) ? t(`selfService.validation.${issue}`) : t("selfService.validation.required")) : null);

  function close() {
    setStage("idle");
    setCode(null);
    reset();
    queueMicrotask(() => triggerRef.current?.focus());
  }

  async function onSubmit(values: RefundFormValues) {
    setCode(null);
    const result = await requestRefund({ token, body: { ticketIds: values.ticketIds, reason: values.reason, ...(values.message ? { message: values.message } : {}) } });
    if (!result.ok) {
      setCode(result.code);
      return;
    }
    setStage("sent");
    router.refresh();
  }

  if (!open) return null;

  const ticketsError = token_(errors.ticketIds?.message);
  const reasonError = token_(errors.reason?.message);
  const messageError = token_(errors.message?.message);

  return (
    <section
      ref={panel}
      id="refund-request-panel"
      aria-labelledby="refund-request-heading"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !isSubmitting) {
          event.stopPropagation();
          close();
        }
      }}
      className="flex scroll-mt-28 flex-col overflow-hidden rounded-[24px] border border-(--tk-accent)/35 bg-[linear-gradient(160deg,rgba(30,107,240,0.12),rgba(10,20,50,0.7)_50%)]"
    >
      <div className="flex items-start justify-between gap-5 border-b border-(--mt-hair) px-[clamp(18px,4.5vw,30px)] py-[clamp(20px,4vw,26px)]">
        <div className="flex max-w-[620px] min-w-0 flex-col gap-2">
          <h2 id="refund-request-heading" ref={heading} tabIndex={-1} className="text-2xl font-semibold tracking-[-0.02em] focus:outline-none">
            {t("selfService.refund.heading")}
          </h2>
          <p className="text-[15px] leading-[1.55] text-(--mt-body) [text-wrap:pretty]">{t("selfService.refund.intro")}</p>
        </div>
        <button type="button" onClick={close} disabled={isSubmitting} aria-label={t("selfService.refund.close")} className={TP_ICON_BUTTON}>
          <CloseIcon />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate aria-labelledby="refund-request-heading" className="flex flex-wrap">
        <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-[22px] px-[clamp(18px,4.5vw,30px)] py-[clamp(22px,4vw,28px)]">
          <div className="relative">
          <fieldset className="flex min-w-0 flex-col gap-3" aria-describedby={ticketsError ? "refund-tickets-error" : undefined}>
            <legend className={`${TP_SECTION_LABEL} mb-3 ${tickets.length > 1 ? "pr-28" : ""}`}>
              <span aria-hidden>01 · </span>
              {t("selfService.refund.ticketsLegend")}
            </legend>
            {tickets.map((ticket) => {
              const checked = selected.includes(ticket.id);
              return (
                <label
                  key={ticket.id}
                  htmlFor={`refund-ticket-${ticket.id}`}
                  className={`flex cursor-pointer items-center gap-4 rounded-2xl border px-4.5 py-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--tk-accent) ${checked ? "border-(--tk-accent) bg-(--tk-accent)/8" : "border-white/12 bg-(--mt-well) hover:border-white/25"}`}
                >
                  <input
                    id={`refund-ticket-${ticket.id}`}
                    type="checkbox"
                    aria-labelledby={`refund-ticket-${ticket.id}-label`}
                    checked={checked}
                    onChange={(event) => toggle({ id: ticket.id, checked: event.target.checked })}
                    className="peer sr-only"
                  />
                  <span aria-hidden className={`grid size-[22px] shrink-0 place-items-center rounded-[7px] border-[1.5px] ${checked ? "border-(--tk-accent) bg-(--tk-accent)" : "border-white/30"}`}>
                    <CheckIcon size={13} stroke="var(--mt-ink)" className={checked ? "opacity-100" : "opacity-0"} />
                  </span>
                  <span id={`refund-ticket-${ticket.id}-label`} className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-base font-semibold [overflow-wrap:anywhere]">{ticket.label}</span>
                    <span className="flex flex-wrap items-center gap-2 text-[13px] text-(--mt-mut)">
                      {ticket.detail ? <span>{ticket.detail}</span> : null}
                      <span className="font-mono">{ticket.code}</span>
                    </span>
                  </span>
                </label>
              );
            })}
            <p id="refund-tickets-error" role="alert" className="text-sm text-(--mt-err) empty:hidden">
              {ticketsError}
            </p>
          </fieldset>
          {tickets.length > 1 ? (
            <button
              type="button"
              onClick={() => setValue("ticketIds", allSelected ? [] : tickets.map((ticket) => ticket.id), { shouldValidate: errors.ticketIds !== undefined })}
              className={`absolute -top-[13px] right-0 min-h-11 rounded-full px-2 text-[13px] font-medium text-(--tk-accent) hover:text-white ${TP_FOCUS}`}
            >
              {allSelected ? t("selfService.refund.clearAll") : t("selfService.refund.selectAll")}
            </button>
          ) : null}
          </div>

          <fieldset className="flex min-w-0 flex-col gap-3" aria-describedby={reasonError ? "refund-reason-error" : undefined}>
            <legend className={`${TP_SECTION_LABEL} mb-3`}>
              <span aria-hidden>02 · </span>
              {t("selfService.refund.reasonLabel")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {reasons.map((item) => {
                const on = reason === item.value;
                return (
                  <label
                    key={item.value}
                    className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--tk-accent) ${on ? "border-(--tk-accent) bg-(--tk-accent)/14 text-white" : `${reasonError ? "border-(--mt-err)/60" : "border-(--mt-chip)"} text-(--mt-soft) hover:border-(--tk-accent)`}`}
                  >
                    <input type="radio" value={item.value} aria-describedby={reasonError ? "refund-reason-error" : undefined} className="sr-only" {...register("reason")} />
                    {item.label}
                  </label>
                );
              })}
            </div>
            <p id="refund-reason-error" role="alert" className="text-sm text-(--mt-err) empty:hidden">
              {reasonError}
            </p>
          </fieldset>

          <div className="flex flex-col gap-2.5">
            <label htmlFor="refund-message" className="flex flex-wrap items-baseline gap-2.5">
              <span className={TP_SECTION_LABEL}>
                <span aria-hidden>03 · </span>
                {t("selfService.refund.messageHeading")}
              </span>
              <span className="text-[13px] text-(--mt-dim)">{t("selfService.refund.optional")}</span>
            </label>
            <textarea
              id="refund-message"
              rows={3}
              maxLength={1000}
              placeholder={t("selfService.refund.messagePlaceholder")}
              aria-invalid={messageError ? true : undefined}
              aria-describedby={messageError ? "refund-message-error" : undefined}
              className={`${TP_INPUT} min-h-[96px] resize-y py-3.5 leading-normal ${messageError ? TP_INPUT_ERROR : TP_INPUT_OK}`}
              {...register("message")}
            />
            <p id="refund-message-error" role="alert" className="text-sm text-(--mt-err) empty:hidden">
              {messageError}
            </p>
          </div>
        </div>

        <aside aria-label={t("selfService.refund.summaryHeading")} className="flex min-w-0 flex-[1_1_300px] flex-col gap-4.5 border-(--mt-hair) bg-(--mt-well) px-[clamp(18px,4.5vw,30px)] py-[clamp(22px,4vw,28px)] max-[719px]:border-t min-[720px]:max-w-[360px] min-[720px]:border-l">
          <p className={`${TP_LABEL} text-xs text-(--mt-body)`}>{t("selfService.refund.summaryHeading")}</p>
          <dl className="flex flex-col gap-2.5 text-[15px] text-(--mt-soft)">
            <div className="flex justify-between gap-3">
              <dt>{t("selfService.refund.summaryTickets")}</dt>
              <dd className="tabular-nums">{t("selfService.refund.summaryCount", { selected: selected.length, total: tickets.length })}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>{t("selfService.refund.reasonLabel")}</dt>
              <dd className="text-right">{reasonLabel}</dd>
            </div>
          </dl>
          <p className="border-t border-(--mt-hair) pt-4 text-[13px] leading-normal text-(--mt-dim)">{t("selfService.refund.summaryNote")}</p>
          <div role="alert" className="empty:hidden">
            {code ? <p className="text-center text-sm text-(--mt-err)">{t.has(`errors.${code}`) ? t(`errors.${code}`) : t("errors.generic")}</p> : null}
          </div>
          <div className="mt-auto flex flex-col gap-1.5">
            <button type="submit" disabled={isSubmitting} className={`${TP_BUTTON} min-h-[52px] w-full`}>
              {isSubmitting ? t("selfService.saving") : t("selfService.refund.submit")}
            </button>
            <button type="button" onClick={close} disabled={isSubmitting} className={`${TP_BUTTON_TEXT} self-center`}>
              {t("selfService.cancel")}
            </button>
          </div>
        </aside>
      </form>
    </section>
  );
}

/** The trigger and the form together, in one place (a simple layout and the component tests). */
export function RefundRequestForm({ token, tickets }: { token: string; tickets: readonly RefundableTicket[] }) {
  return (
    <RefundRequestProvider>
      <RefundRequestPanel token={token} tickets={tickets} />
      <RefundRequestTrigger />
    </RefundRequestProvider>
  );
}

"use client";

// Interactive: a refund-request form (tickets to pick, a reason, a message) with react-hook-form + zod (rule 37) that
// posts to our own handler and refreshes the server-rendered order page when it succeeds.

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "@/lib/tickets/i18n";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { requestRefund } from "@/lib/tickets/self-service-client";
import { REFUND_REASONS, type RefundReason } from "@/lib/tickets/schemas";
import { refundFormSchema, type RefundFormValues } from "./self-service-forms";
import { MT_BUTTON, MT_BUTTON_GHOST, MT_BUTTON_OUTLINE } from "./my-ticket-classes";
import { TICKETS_INPUT } from "./tickets-classes";

export interface RefundableTicket {
  id: string;
  label: string;
  code: string;
}

/**
 * "Request a refund": the buyer picks the tickets, says why and may add a message. This only ASKS the organiser; nothing is
 * refunded until they approve, and the tickets keep working meanwhile (said on the form). One open request per order: ep-api
 * refuses a second (`refundRequestOpen`); the order page then shows the request's status instead of this form.
 */
export function RefundRequestForm({ token, tickets }: { token: string; tickets: readonly RefundableTicket[] }) {
  const t = useTranslations("tickets");
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  // "My Ticket" design: the refund card shows the intro and "Ask for a refund"; the form opens below it.
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RefundFormValues>({
    resolver: zodResolver(refundFormSchema),
    // A single-ticket order needs no choosing.
    defaultValues: { ticketIds: tickets.length === 1 ? tickets.map((ticket) => ticket.id) : [], reason: undefined as unknown as RefundReason, message: "" },
  });

  const selected = useWatch({ control, name: "ticketIds" });
  // A controlled checkbox group: the list of chosen ids lives in the form state, so one ticket and many behave the same.
  const toggle = ({ id, checked }: { id: string; checked: boolean }) =>
    setValue("ticketIds", checked ? [...selected.filter((value) => value !== id), id] : selected.filter((value) => value !== id), { shouldValidate: true });

  // Bounded choices as a data array of { value, label } (rule 39); labels are translated here.
  const reasons: Array<{ value: RefundReason; label: string }> = REFUND_REASONS.map((value) => ({ value, label: t(`selfService.refund.reasons.${value}`) }));
  const token_ = (issue: string | undefined): string | null => (issue ? (t.has(`selfService.validation.${issue}`) ? t(`selfService.validation.${issue}`) : t("selfService.validation.required")) : null);

  async function onSubmit(values: RefundFormValues) {
    setCode(null);
    const result = await requestRefund({ token, body: { ticketIds: values.ticketIds, reason: values.reason, ...(values.message ? { message: values.message } : {}) } });
    if (!result.ok) {
      setCode(result.code);
      return;
    }
    setSent(true);
    router.refresh();
  }

  if (sent) {
    return (
      <div role="status">
        <h3 className="text-[15px] font-semibold text-success">{t("selfService.refund.sentHeading")}</h3>
        <p className="mt-1 text-[13.5px] leading-normal text-muted">{t("selfService.refund.sentBody")}</p>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[13.5px] leading-normal text-muted">{t("selfService.refund.intro")}</p>
        <button type="button" onClick={() => setOpen(true)} className={`${MT_BUTTON_OUTLINE} self-start`}>
          {t("selfService.refund.open")}
        </button>
      </div>
    );
  }

  const ticketsError = token_(errors.ticketIds?.message);
  const reasonError = token_(errors.reason?.message);
  const messageError = token_(errors.message?.message);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate aria-labelledby="refund-request-heading" className="flex flex-col gap-4">
      <div>
        <h3 id="refund-request-heading" className="text-[15px] font-semibold">
          {t("selfService.refund.heading")}
        </h3>
        <p className="mt-1 text-[13.5px] text-muted">{t("selfService.refund.intro")}</p>
      </div>

      <fieldset className="flex flex-col gap-2" aria-describedby={ticketsError ? "refund-tickets-error" : undefined}>
        <legend className="text-sm font-medium">{t("selfService.refund.ticketsLegend")}</legend>
        {tickets.map((ticket) => (
          <label key={ticket.id} htmlFor={`refund-ticket-${ticket.id}`} className="flex min-h-11 items-center gap-3 text-sm">
            <input id={`refund-ticket-${ticket.id}`} type="checkbox" aria-labelledby={`refund-ticket-${ticket.id}-label`} checked={selected.includes(ticket.id)} onChange={(event) => toggle({ id: ticket.id, checked: event.target.checked })} className="size-5" />
            <span id={`refund-ticket-${ticket.id}-label`} className="min-w-0 [overflow-wrap:anywhere]">
              {ticket.label} <span className="font-mono text-muted">{ticket.code}</span>
            </span>
          </label>
        ))}
        <p id="refund-tickets-error" role="alert" className="text-sm text-danger">
          {ticketsError}
        </p>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="refund-reason" className="text-sm font-medium">
          {t("selfService.refund.reasonLabel")}
        </label>
        <select id="refund-reason" defaultValue="" aria-invalid={reasonError ? true : undefined} aria-describedby={reasonError ? "refund-reason-error" : undefined} className={TICKETS_INPUT} {...register("reason")}>
          <option value="" disabled>
            {t("selfService.refund.reasonPlaceholder")}
          </option>
          {reasons.map((reason) => (
            <option key={reason.value} value={reason.value}>
              {reason.label}
            </option>
          ))}
        </select>
        <p id="refund-reason-error" role="alert" className="text-sm text-danger">
          {reasonError}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="refund-message" className="text-sm font-medium">
          {t("selfService.refund.messageLabel")}
        </label>
        <textarea
          id="refund-message"
          rows={4}
          maxLength={1000}
          aria-invalid={messageError ? true : undefined}
          aria-describedby={messageError ? "refund-message-error" : undefined}
          className={`${TICKETS_INPUT} min-h-28`}
          {...register("message")}
        />
        <p id="refund-message-error" role="alert" className="text-sm text-danger">
          {messageError}
        </p>
      </div>

      <div role="alert">{code ? <p className="text-sm text-danger">{t.has(`errors.${code}`) ? t(`errors.${code}`) : t("errors.generic")}</p> : null}</div>

      <div className="flex flex-wrap items-center gap-2.5">
        <button type="submit" disabled={isSubmitting} className={MT_BUTTON}>
          {isSubmitting ? t("selfService.saving") : t("selfService.refund.submit")}
        </button>
        <button type="button" onClick={() => setOpen(false)} disabled={isSubmitting} className={MT_BUTTON_GHOST}>
          {t("selfService.cancel")}
        </button>
      </div>
    </form>
  );
}

"use client";

// Interactive: a button that opens a modal form (react-hook-form + zod, rule 37) and posts it to our own route
// handler with a plain same-origin fetch (no react-query/axios in the public bundle).

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "@/lib/tickets/i18n";
import { useId, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { DialogShell } from "@/components/tickets/ui/DialogShell";
import { TICKETS_BUTTON, TICKETS_BUTTON_OUTLINE, TICKETS_INPUT } from "../tickets-classes";

// Message tokens, not prose: mapped to translated text below (WCAG 3.3.1 / 3.3.3).
function formSchema({ max }: { max: number }) {
  return z.object({
    name: z.string().trim().min(1, "nameRequired").max(200, "nameRequired"),
    email: z.string().trim().min(1, "emailRequired").max(254, "emailInvalid").pipe(z.email("emailInvalid")),
    quantity: z.number({ error: "quantityInvalid" }).int("quantityInvalid").min(1, "quantityInvalid").max(Math.max(1, max), "quantityInvalid"),
  });
}
type Values = z.infer<ReturnType<typeof formSchema>>;

type Status = { kind: "idle" } | { kind: "joined" } | { kind: "error"; code: string };

/**
 * "Join the waitlist" of a sold-out type: a button that opens a small dialog (name, email, quantity up to the
 * per-order maximum). The success text is the same whether or not the email was already listed: nothing here can
 * tell a visitor who is on the list. Errors are opaque codes the visitor's language translates (`tickets.errors`).
 */
export function WaitlistJoin({
  ticketTypeId,
  typeName,
  maxPerOrder,
  triggerClassName = `${TICKETS_BUTTON} mt-1 self-start`,
}: {
  ticketTypeId: string;
  typeName: string;
  maxPerOrder: number;
  /** Classes of the opening button (the Tickets block styles it as its card button). */
  triggerClassName?: string;
}) {
  const t = useTranslations("tickets.waitlist");
  const te = useTranslations("tickets.errors");
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const headingId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const schema = useMemo(() => formSchema({ max: maxPerOrder }), [maxPerOrder]);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: "", email: "", quantity: 1 } });
  const nameField = register("name");

  async function onSubmit(values: Values) {
    setStatus({ kind: "idle" });
    try {
      const response = await fetch("/api/tickets/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketTypeId, name: values.name, email: values.email, quantity: values.quantity }),
      });
      if (response.ok) {
        setStatus({ kind: "joined" });
        return;
      }
      const body = (await response.json().catch(() => null)) as { code?: unknown } | null;
      setStatus({ kind: "error", code: typeof body?.code === "string" ? body.code : "generic" });
    } catch {
      setStatus({ kind: "error", code: "unavailable" });
    }
  }

  const fieldError = (key: keyof Values) => {
    const token = errors[key]?.message;
    return token && t.has(`validation.${token}`) ? t(`validation.${token}`) : null;
  };
  const nameError = fieldError("name");
  const emailError = fieldError("email");
  const quantityError = fieldError("quantity");
  const serverError = status.kind === "error" ? (te.has(status.code) ? te(status.code) : te("generic")) : null;

  return (
    <>
      <button type="button" className={triggerClassName} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {t("join")}
        <span className="sr-only"> — {typeName}</span>
      </button>
      {open ? (
        <DialogShell
          labelledBy={headingId}
          onClose={() => setOpen(false)}
          initialFocusRef={status.kind === "joined" ? closeRef : nameRef}
          backdropClassName="deai-tickets fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-scrim/50 p-4 sm:items-center sm:p-6"
          className="w-full max-w-md rounded-(--radius) border border-(--color-border) bg-background p-5 shadow-(--shadow) sm:p-6"
        >
          <h2 id={headingId} className="font-heading text-xl font-semibold [overflow-wrap:anywhere]">
            {t("heading", { name: typeName })}
          </h2>
          {status.kind === "joined" ? (
            <div role="status" className="mt-3 flex flex-col items-start gap-4">
              <p className="text-muted">{t("successBody")}</p>
              <button ref={closeRef} type="button" className={TICKETS_BUTTON_OUTLINE} onClick={() => setOpen(false)}>
                {t("close")}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-3 flex flex-col gap-4">
              <p className="text-sm text-muted">{t("intro")}</p>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`${headingId}-name`} className="text-sm font-medium">
                  {t("nameLabel")}
                </label>
                <input
                  id={`${headingId}-name`}
                  type="text"
                  autoComplete="name"
                  aria-invalid={nameError ? true : undefined}
                  aria-describedby={nameError ? `${headingId}-name-error` : undefined}
                  className={TICKETS_INPUT}
                  {...nameField}
                  ref={(element) => {
                    nameField.ref(element);
                    nameRef.current = element;
                  }}
                />
                <p id={`${headingId}-name-error`} role="alert" className="text-sm text-danger">
                  {nameError}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`${headingId}-email`} className="text-sm font-medium">
                  {t("emailLabel")}
                </label>
                <input
                  id={`${headingId}-email`}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  aria-invalid={emailError ? true : undefined}
                  aria-describedby={emailError ? `${headingId}-email-error` : undefined}
                  className={TICKETS_INPUT}
                  {...register("email")}
                />
                <p id={`${headingId}-email-error`} role="alert" className="text-sm text-danger">
                  {emailError}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`${headingId}-quantity`} className="text-sm font-medium">
                  {t("quantityLabel", { max: maxPerOrder })}
                </label>
                <input
                  id={`${headingId}-quantity`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={maxPerOrder}
                  step={1}
                  aria-invalid={quantityError ? true : undefined}
                  aria-describedby={quantityError ? `${headingId}-quantity-error` : undefined}
                  className={TICKETS_INPUT}
                  {...register("quantity", { valueAsNumber: true })}
                />
                <p id={`${headingId}-quantity-error`} role="alert" className="text-sm text-danger">
                  {quantityError}
                </p>
              </div>
              <div role="alert">{serverError ? <p className="text-sm text-danger">{serverError}</p> : null}</div>
              <div className="flex flex-wrap gap-3">
                <button type="submit" disabled={isSubmitting} className={`${TICKETS_BUTTON} disabled:opacity-50`}>
                  {isSubmitting ? t("submitting") : t("submit")}
                </button>
                <button type="button" className={TICKETS_BUTTON_OUTLINE} onClick={() => setOpen(false)}>
                  {t("cancel")}
                </button>
              </div>
            </form>
          )}
        </DialogShell>
      ) : null}
    </>
  );
}

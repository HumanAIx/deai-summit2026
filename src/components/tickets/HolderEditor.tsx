"use client";

// Interactive: an inline edit form per holder of the order (react-hook-form + zod, rule 37), posting to our own handler.

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "@/lib/tickets/i18n";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { requestHolderEdit } from "@/lib/tickets/self-service-client";
import { TextField } from "./checkout/TextField";
import { holderFormSchema, type HolderFormValues } from "./self-service-forms";
import { TP_BUTTON, TP_BUTTON_OUTLINE, TP_BUTTON_TEXT } from "./ticket-page-classes";

/**
 * "Edit" on one holder of the buyer's order. Only the fields ep-api allows are shown: the name when the organiser allows
 * name changes, the email when it allows transfers (a new email moves the ticket to that person: the old QR code and link
 * stop working and the new address gets the ticket). Only what actually changed is sent. After a success the server page
 * is refreshed.
 */
export function HolderEditor({
  token,
  ticketId,
  holderName,
  holderEmail,
  canEditName,
  canEditEmail,
  label,
  assign = false,
}: {
  token: string;
  ticketId: string;
  holderName: string | null;
  holderEmail: string | null;
  canEditName: boolean;
  canEditEmail: boolean;
  /** The holder's display name or ticket code, so each button has a distinct accessible name. */
  label: string;
  /** The ticket has no name yet: the button reads "Assign" (order page in the "My Ticket" design). */
  assign?: boolean;
}) {
  const t = useTranslations("tickets");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const editButton = useRef<HTMLButtonElement>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HolderFormValues>({ resolver: zodResolver(holderFormSchema), defaultValues: { name: holderName ?? "", email: holderEmail ?? "" } });

  const message = (issue: string | undefined): string | null => (issue ? (t.has(`selfService.validation.${issue}`) ? t(`selfService.validation.${issue}`) : t("selfService.validation.required")) : null);

  function close() {
    setOpen(false);
    setCode(null);
    reset({ name: holderName ?? "", email: holderEmail ?? "" });
    // Return focus to the button that opened the form.
    queueMicrotask(() => editButton.current?.focus());
  }

  async function onSubmit(values: HolderFormValues) {
    setCode(null);
    const body: { name?: string; email?: string } = {};
    if (canEditName && values.name !== "" && values.name !== (holderName ?? "")) body.name = values.name;
    if (canEditEmail && values.email !== "" && values.email !== (holderEmail ?? "").toLowerCase()) body.email = values.email;
    if (body.name === undefined && body.email === undefined) {
      setCode("unchanged");
      return;
    }
    const result = await requestHolderEdit({ token, ticketId, body });
    if (!result.ok) {
      setCode(result.code);
      return;
    }
    setOpen(false);
    setDone(true);
    router.refresh();
  }

  if (!open) {
    return (
      <div className="flex flex-col gap-2">
        {done ? (
          <p role="status" className="text-sm font-medium text-(--mt-ok)">
            {t("selfService.holder.saved")}
          </p>
        ) : null}
        <button ref={editButton} type="button" onClick={() => { setDone(false); setOpen(true); }} aria-label={t(assign ? "selfService.holder.assignFor" : "selfService.holder.editFor", { label })} className={`${TP_BUTTON_OUTLINE} self-start px-4.5 text-sm`}>
          {t(assign ? "selfService.holder.assign" : "selfService.holder.edit")}
        </button>
      </div>
    );
  }

  const errorText = code ? (code === "unchanged" ? t("selfService.holder.unchanged") : t.has(`errors.${code}`) ? t(`errors.${code}`) : t("errors.generic")) : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate aria-label={t("selfService.holder.editFor", { label })} className="flex flex-col gap-4 rounded-2xl border border-(--mt-hair) bg-(--mt-well) p-4">
      {canEditName ? <TextField id={`holder-name-${ticketId}`} variant="page" label={t("selfService.nameLabel")} autoComplete="off" error={message(errors.name?.message)} registration={register("name")} /> : null}
      {canEditEmail ? (
        <TextField
          id={`holder-email-${ticketId}`}
          variant="page"
          type="email"
          inputMode="email"
          label={t("selfService.holder.emailLabel")}
          hint={t("selfService.holder.emailHint")}
          autoComplete="off"
          error={message(errors.email?.message)}
          registration={register("email")}
        />
      ) : null}
      <div role="alert">{errorText ? <p className="text-sm text-(--mt-err)">{errorText}</p> : null}</div>
      <div className="flex flex-wrap items-center gap-2.5">
        <button type="submit" disabled={isSubmitting} className={`${TP_BUTTON} min-h-11 max-[480px]:flex-1`}>
          {isSubmitting ? t("selfService.saving") : t("selfService.holder.save")}
        </button>
        <button type="button" onClick={close} disabled={isSubmitting} className={TP_BUTTON_TEXT}>
          {t("selfService.cancel")}
        </button>
      </div>
    </form>
  );
}

"use client";

// Interactive: a confirm dialog (focus-managed by DialogShell) and a post to our own route handler.

import { useTranslations } from "@/lib/tickets/i18n";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { DialogShell } from "@/components/tickets/ui/DialogShell";
import { requestCancelTicket } from "@/lib/tickets/self-service-client";
import { MT_BUTTON, MT_BUTTON_GHOST, MT_BUTTON_OUTLINE, MT_CARD } from "./my-ticket-classes";

/**
 * "Cancel my ticket" for a ticket of a free order. Rendered by the ticket page only when ep-api says `canCancel`. A confirm
 * dialog comes before the irreversible post; on success the card says so (the place is free again) and offers to reload the
 * page, which then shows the ticket as void. Errors are the opaque `tickets.errors.<code>` texts.
 */
export function CancelTicket({ token }: { token: string }) {
  const t = useTranslations("tickets");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  const keepButton = useRef<HTMLButtonElement>(null);

  function close() {
    setOpen(false);
    queueMicrotask(() => openButton.current?.focus());
  }

  async function confirm() {
    setSubmitting(true);
    setFailure(null);
    const result = await requestCancelTicket({ token });
    setSubmitting(false);
    setOpen(false);
    if (!result.ok) {
      setFailure(result.code);
      queueMicrotask(() => openButton.current?.focus());
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <section aria-labelledby="cancel-ticket-done" className={`${MT_CARD} flex flex-col gap-3 p-[clamp(18px,4vw,24px)] print:hidden`}>
        <p id="cancel-ticket-done" role="status" className="text-[15px] font-medium">
          {t("selfService.cancelTicket.done")}
        </p>
        <button type="button" onClick={() => router.refresh()} className={`${MT_BUTTON_OUTLINE} self-start`}>
          {t("selfService.cancelTicket.reload")}
        </button>
      </section>
    );
  }

  return (
    <section aria-labelledby="cancel-ticket-heading" className={`${MT_CARD} flex flex-col gap-3 p-[clamp(18px,4vw,24px)] print:hidden`}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-0.5">
          <h2 id="cancel-ticket-heading" className="text-[15px] font-normal">
            {t("selfService.cancelTicket.heading")}
          </h2>
          <p className="text-[13px] text-muted">{t("selfService.cancelTicket.intro")}</p>
        </div>
        <button ref={openButton} type="button" onClick={() => setOpen(true)} className={MT_BUTTON_OUTLINE}>
          {t("selfService.cancelTicket.open")}
        </button>
      </div>
      <div role="alert">{failure ? <p className="text-sm text-danger">{t.has(`errors.${failure}`) ? t(`errors.${failure}`) : t("errors.generic")}</p> : null}</div>
      {open ? (
        <DialogShell labelledBy="cancel-ticket-confirm-heading" onClose={close} initialFocusRef={keepButton} backdropClassName="deai-tickets fixed inset-0 z-[60] flex items-center justify-center bg-scrim/50 p-4" className={`${MT_CARD} flex w-full max-w-md flex-col gap-3 p-6`}>
          <h3 id="cancel-ticket-confirm-heading" className="text-lg font-semibold">
            {t("selfService.cancelTicket.confirmHeading")}
          </h3>
          <p className="text-sm font-medium text-danger">{t("selfService.cancelTicket.confirmWarning")}</p>
          <div className="flex flex-wrap items-center gap-2.5">
            <button type="button" onClick={() => void confirm()} disabled={submitting} className={MT_BUTTON}>
              {submitting ? t("selfService.saving") : t("selfService.cancelTicket.confirm")}
            </button>
            <button ref={keepButton} type="button" onClick={close} disabled={submitting} className={MT_BUTTON_GHOST}>
              {t("selfService.cancelTicket.keep")}
            </button>
          </div>
        </DialogShell>
      ) : null}
    </section>
  );
}

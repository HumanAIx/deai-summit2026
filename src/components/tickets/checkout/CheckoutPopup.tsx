"use client";

// Interactive: a modal dialog that keeps the checkout mounted while hidden, owns a history entry (phone back button)
// and the leave guard — focus, keyboard, history and portal are all browser-only.

import { useTranslations } from "@/lib/tickets/i18n";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { createPortal } from "react-dom";
import { plexMono } from "../ticket-fonts";
import { useDialogA11y } from "@/components/tickets/ui/useDialogA11y";
import { TICKETS_BUTTON, TICKETS_BUTTON_OUTLINE } from "../tickets-classes";
import { PopupConfirmation } from "./PopupConfirmation";
import { TicketCheckout } from "./TicketCheckout";
import type { CheckoutConfig, CheckoutDone, EmbeddedCheckout, PublicType, Step } from "./types";

/** The state marker of the history entry the pop-up pushes: nothing else (no token, no order id, no query). */
export const POPUP_HISTORY_MARKER = "epTicketsPopup";

/** Minutes left on a hold, rounded up, at least 1 (the leave guard says how long the tickets stay held). */
function minutesLeft({ until }: { until: string }): number {
  return Math.max(1, Math.ceil((new Date(until).getTime() - Date.now()) / 60_000));
}

function subscribeNever(): () => void {
  return () => undefined;
}

/** Mounted only while the dialog is open: mounting IS opening for `useDialogA11y` (focus trap, Esc, inert, scroll lock). */
function DialogBehavior({ containerRef, initialFocusRef, onClose }: { containerRef: RefObject<HTMLElement | null>; initialFocusRef: RefObject<HTMLElement | null>; onClose: () => void }) {
  useDialogA11y({ containerRef, initialFocusRef, onClose });
  return null;
}

export interface CheckoutPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Reports whether closing and reopening should resume this checkout (a step past 01, or a held order) or start over. */
  onResumable: (resumable: boolean) => void;
  /** The ticket type pre-selected at 1 when the checkout starts. */
  startTypeId: string;
  types: PublicType[];
  allowedTypeIds: readonly string[];
  config: CheckoutConfig;
  locale: string;
  localePrefix: string;
  /** Re-read stock and prices in place (never `router.refresh()`). */
  onRefresh: () => void;
}

/**
 * The Tickets block's checkout pop-up: our four checkout steps and a confirmation inside one dialog (960 px on desktop,
 * full screen on a phone, scrolls inside). Closing never loses the cart: the dialog is hidden, not unmounted, so reopening
 * resumes where the buyer was; while hidden the scroll lock, inert page and focus trap are all released.
 *
 * - Esc and the close button ask first once an order holds tickets ("Leave checkout?"); the backdrop never closes during
 *   payment.
 * - Opening pushes a history entry with the SAME URL and a state marker; the phone back button pops it (and closes);
 *   closing any other way pops it so the history stays clean. With a held order, back asks first (the entry is pushed
 *   again while the question is open).
 * - The order's token lives in React state only.
 */
export function CheckoutPopup({ open, onOpenChange, onResumable, startTypeId, types, allowedTypeIds, config, locale, localePrefix, onRefresh }: CheckoutPopupProps) {
  const t = useTranslations("block.ticketsBlock.popup");
  const titleId = useId();
  const leaveId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const stayRef = useRef<HTMLButtonElement>(null);
  // The portal target (`document.body`) exists only in the browser: false on the server, true from the first client render.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  const [progress, setProgress] = useState<{ step: Step; holdExpiresAt: string | null }>({ step: 1, holdExpiresAt: null });
  const [done, setDone] = useState<CheckoutDone | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const id = useId();

  const shown = open && mounted; // after the first mount pass (React's dev double effect included): history is touched only for a real opening
  const paying = !done && progress.step === 4;
  const holdEndsAt = done ? null : progress.holdExpiresAt;
  const holding = holdEndsAt !== null; // an ended hold clears itself: the checkout reports `null` when the timer runs out

  useEffect(() => {
    onResumable(!done && (progress.step > 1 || progress.holdExpiresAt !== null));
  }, [done, progress, onResumable]);

  // Latest values for the long-lived popstate listener.
  const live = useRef({ holding, onOpenChange });
  useEffect(() => {
    live.current = { holding, onOpenChange };
  });
  const pushed = useRef(false);

  // Unmounting (the page went away) must not pop history: declared BEFORE the open effect so its cleanup runs first.
  useEffect(
    () => () => {
      pushed.current = false;
    },
    [],
  );
  useEffect(() => {
    if (!shown) return;
    const state = { [POPUP_HISTORY_MARKER]: id };
    window.history.pushState(state, "", window.location.href); // the SAME URL: no token, no order id, no query
    pushed.current = true;
    function onPopState(event: PopStateEvent) {
      if (!pushed.current) return;
      if ((event.state as Record<string, unknown> | null)?.[POPUP_HISTORY_MARKER] === id) return;
      if (live.current.holding) {
        // Back with tickets held: ask first, and put our entry back so the question has a page to stay on.
        window.history.pushState(state, "", window.location.href);
        setConfirmLeave(true);
        return;
      }
      pushed.current = false;
      live.current.onOpenChange(false);
    }
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      if (pushed.current) {
        pushed.current = false;
        window.history.back(); // closed by the close button / Esc / Back to the site: pop our entry
      }
    };
  }, [shown, id]);

  const guardOpen = confirmLeave && shown;
  const requestClose = useCallback(() => {
    if (confirmLeave) {
      setConfirmLeave(false);
      return;
    }
    if (holding) setConfirmLeave(true);
    else onOpenChange(false);
  }, [confirmLeave, holding, onOpenChange]);

  useEffect(() => {
    if (confirmLeave) stayRef.current?.focus();
  }, [confirmLeave]);

  const embedded: EmbeddedCheckout = {
    onRefresh,
    onProgress: setProgress,
    onDone: (result) => setDone(result),
  };

  if (!mounted) return null;

  return createPortal(
    <div
      hidden={!shown}
      role="presentation"
      className={shown ? `deai-tickets ${plexMono.variable} fixed inset-0 z-[60] flex items-stretch justify-center overflow-y-auto bg-scrim/50 font-body text-text sm:items-center sm:p-6` : "hidden"}
      onClick={(event) => {
        // The backdrop only; never while paying (a stray click must not interrupt the card form).
        if (event.target === event.currentTarget && !paying) requestClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex h-dvh w-full flex-col overflow-hidden bg-background text-text sm:h-auto sm:max-h-[calc(100dvh-3rem)] sm:max-w-[960px] sm:rounded-(--radius) sm:border sm:border-(--color-border) sm:shadow-(--shadow)"
      >
        <div inert={guardOpen} className="flex items-center justify-between gap-3 border-b border-(--color-border) px-4 py-3 sm:px-6">
          <h2 id={titleId} ref={titleRef} tabIndex={-1} className="font-heading text-lg font-semibold focus:outline-none">
            {t("label")}
          </h2>
          <button type="button" aria-label={t("close")} className={`${TICKETS_BUTTON_OUTLINE} !min-w-11 !px-3`} onClick={requestClose}>
            <svg aria-hidden viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div inert={guardOpen} className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
          {done ? (
            <div className="mt-6">
              <PopupConfirmation done={done} orderHref={`${localePrefix}/tickets/order/${done.buyerToken}`} onClose={() => onOpenChange(false)} />
            </div>
          ) : (
            <TicketCheckout types={types} config={config} allowedTypeIds={allowedTypeIds} initialCart={{ [startTypeId]: 1 }} embedded={embedded} locale={locale} localePrefix={localePrefix} />
          )}
        </div>

        {guardOpen ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-scrim/50 p-4">
            <div role="alertdialog" aria-modal="true" aria-labelledby={`${leaveId}-h`} aria-describedby={`${leaveId}-b`} className="w-full max-w-sm rounded-(--radius) border border-(--color-border) bg-background p-5 shadow-(--shadow)">
              <h3 id={`${leaveId}-h`} className="font-heading text-lg font-semibold">
                {t("leaveHeading")}
              </h3>
              <p id={`${leaveId}-b`} className="mt-2 text-sm text-muted">
                {t("leaveBody", { minutes: holdEndsAt ? minutesLeft({ until: holdEndsAt }) : 1 })}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button ref={stayRef} type="button" className={TICKETS_BUTTON} onClick={() => setConfirmLeave(false)}>
                  {t("leaveStay")}
                </button>
                <button
                  type="button"
                  className={TICKETS_BUTTON_OUTLINE}
                  onClick={() => {
                    setConfirmLeave(false);
                    onOpenChange(false);
                  }}
                >
                  {t("leaveConfirm")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      {shown ? <DialogBehavior containerRef={panelRef} initialFocusRef={titleRef} onClose={requestClose} /> : null}
    </div>,
    document.body,
  );
}

"use client";

// Interactive: the shared modal shell needs refs, focus management and key/pointer handlers (rule 14).

import { useDialogA11y } from "@/components/tickets/ui/useDialogA11y";
import { useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

/**
 * The one accessible modal every public dialog renders inside (gallery viewer,
 * gated-download gate, form-opening CTA): backdrop + `role="dialog"` panel with
 * focus-in, Tab trap, Esc, inert background, scroll lock and focus return from
 * `useDialogA11y`. Mount it only while open. The backdrop closes on `click`
 * when BOTH the press and the release landed on it, so a drag that starts
 * inside the panel (selecting text) or on the backdrop can be aborted
 * (WCAG 2.5.2 pointer cancellation).
 *
 * Rendered into `<body>` (a portal), never where it is mounted: a faded, sticky or transformed ancestor (a sold-out
 * ticket row at 80 % opacity, the sticky order box) would otherwise fade the dialog with it and trap its z-index
 * below its neighbours. Ticket dialogs put `deai-tickets` on their backdrop so the ticket tokens still apply there.
 */
export function DialogShell({
  label,
  labelledBy,
  onClose,
  initialFocusRef,
  backdropClassName,
  className,
  panelFillsBackdrop = false,
  children,
}: {
  /** Accessible name; use `labelledBy` instead when a visible heading exists. */
  label?: string | undefined;
  labelledBy?: string | undefined;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null> | undefined;
  /** Classes for the full-viewport backdrop (position, z-index, scrim). */
  backdropClassName: string;
  /** Classes for the dialog panel; omit when the children carry their own layout. */
  className?: string | undefined;
  /** The panel covers the whole backdrop (a lightbox): its empty area counts as backdrop. */
  panelFillsBackdrop?: boolean;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const pressedOnBackdrop = useRef(false);
  const isBackdrop = (target: EventTarget, backdrop: EventTarget) =>
    target === backdrop || (panelFillsBackdrop && target === panelRef.current);
  useDialogA11y({ containerRef: panelRef, onClose, ...(initialFocusRef ? { initialFocusRef } : {}) });

  const dialog = (
    <div
      role="presentation"
      className={backdropClassName}
      onPointerDown={(event) => {
        pressedOnBackdrop.current = isBackdrop(event.target, event.currentTarget);
      }}
      onClick={(event) => {
        if (pressedOnBackdrop.current && isBackdrop(event.target, event.currentTarget)) onClose();
        pressedOnBackdrop.current = false;
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        {...(label ? { "aria-label": label } : {})}
        {...(labelledBy ? { "aria-labelledby": labelledBy } : {})}
        className={className}
      >
        {children}
      </div>
    </div>
  );
  // Mounted only while open, which is always after a click in the browser; the inline fallback is for a server render.
  return typeof document === "undefined" ? dialog : createPortal(dialog, document.body);
}

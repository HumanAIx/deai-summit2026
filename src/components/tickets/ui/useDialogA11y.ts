"use client";

// Client hook: focus, keyboard and DOM-attribute management for a modal dialog only exists in the browser.

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "video[controls]",
  "summary",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/** Tabbable descendants of `root` in DOM order (skips `hidden` / inert subtrees). */
export function getFocusable({ root }: { root: HTMLElement }): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.closest("[hidden], [inert]") && el.getAttribute("aria-hidden") !== "true",
  );
}

/**
 * Makes every element outside `container` inert (so neither Tab, the pointer
 * nor a screen reader can reach the page behind a modal dialog): walks from the
 * container up to `<body>` and marks each ancestor's other children. Works for
 * both an inline dialog and one portalled to `<body>`. Returns the restore
 * function — elements that were already inert stay as they were.
 */
export function inertOutside({ container }: { container: HTMLElement }): () => void {
  const marked: HTMLElement[] = [];
  let node: HTMLElement = container;
  while (node.parentElement && node !== document.body) {
    const parent: HTMLElement = node.parentElement;
    for (const sibling of Array.from(parent.children)) {
      if (sibling === node || !(sibling instanceof HTMLElement)) continue;
      if (sibling.tagName === "SCRIPT" || sibling.hasAttribute("inert")) continue;
      sibling.setAttribute("inert", "");
      marked.push(sibling);
    }
    node = parent;
  }
  return () => {
    for (const el of marked) el.removeAttribute("inert");
  };
}

/** Open dialogs, oldest first: only the top one reacts to Esc / Tab. */
const openDialogs: symbol[] = [];

/** Reference-counted body scroll lock: the first dialog saves and sets, the last restores. */
let scrollLocks = 0;
let savedOverflow = "";
function lockScroll_() {
  if (scrollLocks === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  scrollLocks += 1;
}
function unlockScroll_() {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks === 0) document.body.style.overflow = savedOverflow;
}

/**
 * Accessible modal behaviour shared by every public dialog (WCAG 2.1.2, 2.4.3,
 * 4.1.2): on mount focus moves in (`initialFocusRef`, else the first tabbable,
 * else the container), Tab / Shift+Tab are trapped, Esc calls `onClose` (topmost dialog only when stacked), the
 * page behind is made `inert`, scrolling is locked, and on unmount focus
 * returns to whatever had it when the dialog opened.
 * Mount the dialog only while it is open — mounting IS opening.
 */
export function useDialogA11y({
  containerRef,
  onClose,
  initialFocusRef,
  lockScroll = true,
}: {
  containerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
  lockScroll?: boolean;
}): void {
  // Latest `onClose` without re-running the setup effect (which would steal
  // focus back to the first control on every parent render).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const self = Symbol("dialog");
    openDialogs.push(self);
    if (lockScroll) lockScroll_();
    const restoreInert = inertOutside({ container });

    const target = initialFocusRef?.current ?? getFocusable({ root: container })[0];
    if (target) target.focus();
    else {
      if (!container.hasAttribute("tabindex")) container.setAttribute("tabindex", "-1");
      container.focus();
    }

    const onKeyDown = (event: KeyboardEvent) => {
      // Stacked dialogs: only the topmost one handles the key.
      if (openDialogs[openDialogs.length - 1] !== self) return;
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable({ root: container });
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = focusable[0] as HTMLElement;
      const last = focusable[focusable.length - 1] as HTMLElement;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !container.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !container.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      restoreInert();
      const at = openDialogs.indexOf(self);
      if (at !== -1) openDialogs.splice(at, 1);
      if (lockScroll) unlockScroll_();
      if (opener?.isConnected) opener.focus();
    };
    // Mount-only by design: the dialog's lifetime is the effect's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

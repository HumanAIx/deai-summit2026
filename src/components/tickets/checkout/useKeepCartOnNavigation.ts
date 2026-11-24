"use client";

// Interactive: a document-level click listener (browser-only) that lives exactly as long as the checkout is in progress.

import { useEffect } from "react";

/**
 * Whether a click on `anchor` must be moved to a new tab. Pure on purpose (the hook below only wires the event).
 * Left alone: links that already choose their own behaviour (`target`, `download`), anything that is not http(s)
 * (`mailto:`, `tel:`, `javascript:`), and links that do not leave the page (a hash on the current page, the current URL).
 */
export function shouldOpenInNewTab({ anchor, current }: { anchor: HTMLAnchorElement; current: Location }): boolean {
  if (anchor.getAttribute("target")?.trim() || anchor.hasAttribute("download")) return false;
  const href = anchor.getAttribute("href");
  if (!href) return false;
  let url: URL;
  try {
    url = new URL(href, current.href);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  // Same document (with or without a hash): the skip link, in-page anchors, a link back to this very URL.
  if (url.origin === current.origin && url.pathname === current.pathname && url.search === current.search) return false;
  return true;
}

/**
 * While `active` (a cart is in progress), every plain left click on a link that would leave the page opens in a new tab
 * instead, so the cart is never lost. Middle / ctrl / meta / shift / alt clicks already open elsewhere natively and are
 * untouched.
 *
 * DECISION: the link is given `target="_blank" rel="noopener noreferrer"` for this one click and the browser follows it
 * natively, instead of `preventDefault()` + `window.open()`. A native link click is never caught by a popup blocker, and
 * Next's `<Link>` already leaves a link with a non-`_self` target to the browser (`isModifiedEvent`), so no client-side
 * transition starts. The attributes are put back right after the click. `noreferrer`: the new tab sends no Referer,
 * matching the private ticket pages' policy. The click is also stopped before any page handler sees it, so a link with
 * its own click handler (DeAI's navbar navigates with `router.push`) cannot pull the buyer away from the cart.
 */
export function useKeepCartOnNavigation({ active }: { active: boolean }): void {
  useEffect(() => {
    if (!active) return;
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!shouldOpenInNewTab({ anchor, current: window.location })) return;
      const rel = anchor.getAttribute("rel");
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");
      // DeAI: the site's own navbar handles its clicks itself (`preventDefault()` + `router.push`), which would ignore
      // the target and leave the checkout in this tab. Stopping the click here (capture phase on the document, before
      // React's handlers on the root) leaves only the browser's native action: open the link in the new tab.
      event.stopPropagation();
      // After the default action (the new tab) has run: restore the link as the page rendered it.
      window.setTimeout(() => {
        anchor.removeAttribute("target");
        if (rel === null) anchor.removeAttribute("rel");
        else anchor.setAttribute("rel", rel);
      }, 0);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [active]);
}

/** The id of the "Your details" section: the banner button, the ticket email and the reminder link to `#details`. */
export const DETAILS_ID = "details";

/** Space kept above the section when it is scrolled to (prototype: section top minus 16 px). */
const GAP_PX = 16;

/** Height of the site header when it stays on screen while scrolling (sticky / fixed); 0 otherwise. */
function stickyHeaderHeight(): number {
  const header = document.querySelector("header");
  if (!header) return 0;
  const position = window.getComputedStyle(header).position;
  return position === "sticky" || position === "fixed" ? header.getBoundingClientRect().height : 0;
}

export function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Takes the visitor to "Your details": scrolls the section under any sticky header (smooth, or a jump with reduced motion),
 * then focuses the first required field that is still empty (`data-missing`), else the first field — so keyboard and
 * screen-reader users land where the work is. Does nothing when the section is not on the page.
 */
export function goToDetails(): void {
  const section = document.getElementById(DETAILS_ID);
  if (!section) return;
  const top = section.getBoundingClientRect().top + window.scrollY - GAP_PX - stickyHeaderHeight();
  window.scrollTo({ top: Math.max(0, top), behavior: prefersReducedMotion() ? "auto" : "smooth" });
  const target = section.querySelector<HTMLElement>('[data-missing="true"]:not(:disabled)') ?? section.querySelector<HTMLElement>("input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled)");
  target?.focus({ preventScroll: true });
}

/** Scrolls to and focuses one field by id (a validation error after Save). */
export function goToField({ id }: { id: string }): void {
  const field = document.getElementById(id);
  if (!field) return;
  const top = field.getBoundingClientRect().top + window.scrollY - GAP_PX * 4 - stickyHeaderHeight();
  window.scrollTo({ top: Math.max(0, top), behavior: prefersReducedMotion() ? "auto" : "smooth" });
  field.focus({ preventScroll: true });
}

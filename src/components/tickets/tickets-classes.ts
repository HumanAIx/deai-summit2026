/**
 * Shared class strings of the ticket pages (tokens only, rule 10) in a plain module so CLIENT components
 * can use them without importing a server component file. The card / button patterns are the ones of
 * `PublicFormImpl`; every control has a 44 px minimum tap target.
 */
export const TICKETS_CARD = "rounded-(--radius) border border-(--color-border) bg-surface p-5 sm:p-6";

/**
 * The card around Stripe's Payment Element: white, because Elements keep Stripe's default (light) look. Text inside
 * uses Stripe's default text / secondary / danger colours so it matches the fields around it.
 */
export const TICKETS_STRIPE_PANEL = "rounded-(--radius) bg-white p-5 text-[#30313d] sm:p-6";
export const TICKETS_STRIPE_MUTED = "text-[#6d6e78]";
export const TICKETS_STRIPE_DANGER = "text-[#df1b41]";

/** DeAI: the checkout's primary button is the same gradient pill as the My Ticket pages and the CMS ticket cards. */
export const TICKETS_BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-full shadow-(--shadow) themed-button [background:var(--ticket-btn-bg,var(--color-primary))] hover:brightness-110 px-5 py-2.5 text-sm font-semibold text-on-primary disabled:hover:brightness-100";

export const TICKETS_BUTTON_OUTLINE =
  "inline-flex min-h-11 items-center justify-center rounded-(--radius) border border-(--color-control-border) bg-background px-5 py-2.5 text-sm font-medium text-text hover:bg-surface";

/** Text input / select shared by the checkout forms: 44 px high, 16 px text (no iOS zoom on focus). */
export const TICKETS_INPUT = "min-h-11 w-full rounded-(--radius) border border-(--color-control-border) bg-background px-3 py-2 text-base";

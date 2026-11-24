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

/*
 * The checkout in the look of the 23 Nov design handoff (EP-DASHBOARD design system › TICKETS_BLOCK.md, `CartDemo` /
 * `PayStep` in the kit). Colours are the `--tk-*` tokens of `.deai-tickets` (globals.css), all derived from the site's
 * brand tokens. Controls keep the 44 px minimum tap target.
 */

/** The panel the checkout sits on (the design's pop-up panel, here on the page). */
export const TK_PANEL = "rounded-[20px] border border-(--tk-line) bg-(--tk-panel) text-(--tk-text) shadow-[0_30px_80px_rgba(0,0,0,0.5)]";

/** The highlighted order box on the right: accent gradient fill and accent ring, like the highlighted ticket card. */
export const TK_SUMMARY = "flex flex-col gap-3.5 rounded-2xl border border-(--tk-ring) [background:var(--tk-feat)] p-6";

/** Mono, upper-case label of a field ("FULL NAME"). */
export const TK_LABEL = "font-mono text-[11px] uppercase tracking-[0.16em] text-(--tk-mut)";

/** Mono, upper-case accent kicker ("YOUR ORDER", "01 · TICKETS"). */
export const TK_KICKER = "font-mono text-xs uppercase tracking-[0.2em] text-(--tk-accent)";

/** Text input / select: 44 px, 10 px corners, a faint fill, 16 px text (no iOS zoom on focus). */
export const TK_INPUT =
  "min-h-11 w-full rounded-[10px] border border-(--tk-line) bg-(--tk-field) px-3.5 text-base text-(--tk-text) placeholder:text-(--tk-mut) outline-none focus:border-(--tk-accent) focus:shadow-[0_0_0_3px_var(--tk-ring-soft)] aria-[invalid=true]:border-(--tk-err)";

/** The filled gradient pill (Continue to payment, Pay, Download invoice). */
export const TK_BUTTON =
  "inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-full border-0 px-6 text-base font-semibold text-white [background:var(--tk-grad)] shadow-[0_8px_30px_var(--tk-glow)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100";

/** The outline pill (Back, Add to calendar, Clear my cart…). */
export const TK_BUTTON_OUTLINE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-(--tk-ring) bg-transparent px-5 text-[15px] font-semibold text-(--tk-text) hover:bg-(--tk-tint) disabled:cursor-not-allowed disabled:opacity-45";

/** A quiet text button (Back to tickets, Remove code). */
export const TK_BUTTON_TEXT = "inline-flex min-h-11 items-center justify-center gap-1.5 border-0 bg-transparent px-2 text-sm font-medium text-(--tk-soft) hover:text-(--tk-text) disabled:opacity-45";

/** The round − / + of a ticket's quantity. */
export const TK_STEPPER =
  "inline-grid size-11 place-items-center rounded-full border border-(--tk-line) bg-transparent text-(--tk-text) hover:border-(--tk-ring) disabled:cursor-not-allowed disabled:text-[rgba(255,255,255,0.25)] disabled:hover:border-(--tk-line)";

/** A checkbox in the accent colour. */
export const TK_CHECKBOX = "size-[18px] shrink-0 accent-(--tk-accent)";

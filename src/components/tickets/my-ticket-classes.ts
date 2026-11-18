/**
 * Class strings of the buyer / holder pages in the "My Ticket" design (prototype `My Ticket.dc.html`): pill buttons, 16 / 14 px
 * cards, mono kickers, the primary → accent gradient. Tokens only (rule 10): the prototype's DeAI colours are that site's
 * primary / accent, so every site gets the same layout in its own theme. Plain module so client components can import it.
 * Every control keeps a 44 px minimum tap target.
 */

/** The 3 px brand bar on top of the ticket card, the progress bar and the badge strip. */
export const MT_GRADIENT = "bg-linear-to-r from-primary to-accent";

/** Gradient text (the first word of the ticket type): decorative, always next to the same word in plain text for meaning. */
export const MT_GRADIENT_TEXT = "bg-linear-to-r from-primary to-accent bg-clip-text font-bold text-transparent";

/** Mono kicker above a heading ("TICKET · 2 DAYS", "ORDER #12 · PAID"), with the short rule before it. */
export const MT_KICKER = "flex items-center gap-3 font-mono text-xs tracking-[0.18em] text-primary-text uppercase";
export const MT_KICKER_RULE = "h-px w-7 bg-primary-text";

/** Small mono section label ("WHEN", "ON YOUR BADGE"). */
export const MT_LABEL = "font-mono text-[11.5px] tracking-[0.16em] text-muted uppercase";

/** The main ticket card. */
export const MT_TICKET_CARD = "relative overflow-hidden rounded-2xl border border-primary/35 bg-surface shadow-(--shadow)";

/** A secondary card (details, pass on, holders, invoice, refund). */
export const MT_CARD = "rounded-[14px] border border-(--color-border) bg-surface";
export const MT_CARD_PAD = "p-[clamp(18px,4vw,24px)]";

/** Primary pill button: DeAI's blue → cyan gradient, as in the "My Ticket" prototype (`--ticket-btn-bg`, solid primary as fallback). */
export const MT_BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-full [background:var(--ticket-btn-bg,var(--color-primary))] hover:brightness-110 px-5 text-sm font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100";
export const MT_BUTTON_LG = "inline-flex min-h-12 items-center justify-center rounded-full [background:var(--ticket-btn-bg,var(--color-primary))] hover:brightness-110 px-6.5 text-[15px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100";

/** Outlined pill button (wallet / calendar row, "Pass on", "Change"). */
export const MT_BUTTON_OUTLINE =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-(--color-control-border) bg-transparent px-4.5 text-sm font-medium text-text hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-45";

/** Text-only pill button ("Cancel"). */
export const MT_BUTTON_GHOST = "inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-medium text-muted hover:text-text";

/** Text inputs and selects of the details form: 44 px, 16 px text on phones (no iOS zoom), 10 px radius. */
export const MT_INPUT = "min-h-11 w-full rounded-[10px] border bg-background px-3.5 text-base text-text placeholder:text-muted sm:text-[15px] disabled:cursor-not-allowed disabled:opacity-60";
export const MT_INPUT_OK = "border-(--color-control-border)";
/** A required field that is still empty: the prototype's amber border. */
export const MT_INPUT_MISSING = "border-warning";
export const MT_INPUT_ERROR = "border-danger";

/** Selectable chip (dietary list), pressed state via `aria-pressed`. */
export const MT_CHIP =
  "inline-flex min-h-10 items-center rounded-full border px-3.5 text-sm font-medium border-(--color-control-border) text-text hover:bg-primary/10 aria-pressed:border-primary aria-pressed:bg-primary/15 aria-pressed:font-semibold aria-pressed:text-primary-text";

/** Status pills on the order page. */
export const MT_PILL = "inline-flex items-center rounded-full px-2.5 py-1 text-xs";
export const MT_PILL_OK = "bg-primary/12 text-primary-text";
export const MT_PILL_WAIT = "bg-warning/15 text-warning-emphasis";
export const MT_PILL_OFF = "bg-danger/10 text-danger";

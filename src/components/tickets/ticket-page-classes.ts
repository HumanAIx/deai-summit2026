/**
 * Class strings of the holder's "My Ticket" page and the buyer's "Manage Order" page, in the look of the 24 Nov 2026
 * design exports ("DeAI My Ticket", "DeAI Manage Order"): navy cards with hairline borders, white and gradient pills,
 * mono cyan kickers. Colours are the `--tk-*` / `--mt-*` tokens of `.deai-tickets` (globals.css). Plain module, so client
 * components can import it. Every control keeps a 44 px minimum tap target and a visible keyboard focus ring.
 */

/** The keyboard focus ring every link / button / field of these pages shows. */
export const TP_FOCUS = "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--tk-accent)";

/** Gradient text (the first word of a ticket type): decorative, the same word is the text itself. */
export const TP_GRADIENT_TEXT = "bg-linear-to-r from-(--mt-blue) to-(--tk-accent) bg-clip-text text-transparent";

/** The blue → cyan bar (badge preview, progress). */
export const TP_GRADIENT = "[background:var(--tk-grad)]";

/** Mono kicker with its short rule ("— ORDER #6"). */
export const TP_KICKER = "flex flex-wrap items-center gap-3.5 font-mono text-[13px] font-medium tracking-[0.22em] text-(--tk-accent) uppercase";
export const TP_KICKER_RULE = "h-px w-8 bg-(--tk-accent)";

/** Numbered section label inside a card ("01 · ON YOUR BADGE"). */
export const TP_SECTION_LABEL = "font-mono text-xs font-medium tracking-[0.2em] text-(--tk-accent) uppercase";

/** Small grey mono label ("WHEN", "INCLUDES", "YOUR REQUEST"). */
export const TP_LABEL = "font-mono text-[10px] tracking-[0.18em] text-(--mt-dim) uppercase";

/** A card (details, holders, summary, invoice, refunds). */
export const TP_CARD = "rounded-[22px] border border-(--mt-line) bg-(--mt-card)";
export const TP_CARD_PAD = "px-[clamp(18px,4vw,28px)] py-[clamp(20px,3vw,26px)]";

/** Card heading ("Ticket holders", "Invoice"). */
export const TP_H2 = "text-[19px] font-semibold tracking-[-0.01em]";

/** The ticket itself. */
export const TP_TICKET_CARD = "relative flex flex-col overflow-hidden rounded-[28px] border border-(--mt-line) bg-(--mt-ticket) shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)]";

/** Filled blue → cyan pill (Save details, Send refund request). */
export const TP_BUTTON = `inline-flex min-h-[50px] items-center justify-center gap-2.5 rounded-full [background:var(--tk-grad)] px-7 text-[15px] font-semibold text-white shadow-[0_18px_40px_-18px_rgba(30,107,240,0.8)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:brightness-100 ${TP_FOCUS}`;

/** White pill (Add to calendar, Open my ticket). */
export const TP_BUTTON_WHITE = `inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full bg-white px-5.5 text-[15px] font-semibold text-(--mt-ink) hover:bg-(--mt-hover) ${TP_FOCUS}`;

/** Outlined pill (Save as PDF, Download PDF, Ask for a refund, Pass on, Edit). */
export const TP_BUTTON_OUTLINE = `inline-flex min-h-11 items-center justify-center gap-2.5 rounded-full border border-(--mt-control) bg-transparent px-5 text-[15px] font-medium text-white hover:border-(--tk-accent) hover:bg-(--tk-tint) disabled:cursor-not-allowed disabled:opacity-45 ${TP_FOCUS}`;

/** Quiet text button (Cancel, Withdraw). */
export const TP_BUTTON_TEXT = `inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-medium text-(--mt-body) hover:text-white disabled:opacity-45 ${TP_FOCUS}`;

/** Round icon button (the refund form's close ×). */
export const TP_ICON_BUTTON = `inline-grid size-11 shrink-0 place-items-center rounded-full border border-[rgba(255,255,255,0.14)] text-(--mt-body) hover:border-(--tk-accent) hover:text-white ${TP_FOCUS}`;

/** "‹ Back to your order". */
export const TP_BACK_LINK = `inline-flex min-h-11 items-center gap-2.5 rounded-full text-[15px] font-medium text-(--mt-body) hover:text-white ${TP_FOCUS}`;

/** Field label and the 52 px input of the design (16 px text: no iOS zoom on focus). */
export const TP_FIELD_LABEL = "text-sm font-medium text-(--mt-soft)";
export const TP_INPUT = `min-h-[52px] w-full min-w-0 rounded-xl border bg-(--mt-field) px-4 text-base text-white placeholder:text-[#5C6680] focus:border-(--tk-accent) focus:shadow-[0_0_0_3px_var(--tk-ring-soft)] disabled:cursor-not-allowed disabled:border-(--mt-hair) disabled:bg-white/[0.03] disabled:text-(--mt-soft) outline-none`;
export const TP_INPUT_OK = "border-[rgba(255,255,255,0.14)]";
/** A required field that is still empty: amber border. */
export const TP_INPUT_MISSING = "border-(--mt-warn)";
export const TP_INPUT_ERROR = "border-(--mt-err)";

/** Selectable chip (dietary list, refund reason): pressed / checked state in the accent. */
export const TP_CHIP = `inline-flex min-h-11 items-center gap-1.5 rounded-full border border-(--mt-chip) px-4 text-sm font-medium whitespace-nowrap text-(--mt-soft) hover:border-(--tk-accent) aria-pressed:border-(--tk-accent) aria-pressed:bg-(--tk-accent)/14 aria-pressed:text-white ${TP_FOCUS}`;

/** Status pills: accent (sent, paid), amber (waiting), red (refunded, void), green (saved). */
export const TP_PILL = "inline-flex min-h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium whitespace-nowrap";
export const TP_PILL_OK = "bg-(--tk-accent)/12 text-(--tk-accent)";
export const TP_PILL_WAIT = "bg-(--mt-warn)/12 text-(--mt-warn)";
export const TP_PILL_OFF = "bg-(--mt-err)/12 text-(--mt-err)";
export const TP_PILL_DONE = "bg-(--mt-ok)/10 text-(--mt-ok)";

/** The amber "Test ticket — not a real purchase" pill. */
export const TP_TEST_PILL = "inline-flex min-h-[30px] items-center gap-2 rounded-full border border-(--mt-warn)/45 bg-(--mt-warn)/8 px-3.5 text-[13px] font-medium text-(--mt-warn)";

/** Panel of a modal dialog on these pages. */
export const TP_DIALOG = "flex max-h-[calc(100dvh-32px)] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-[22px] border border-(--mt-line) bg-(--mt-ticket) p-6 text-white shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)]";
export const TP_DIALOG_BACKDROP = "deai-tickets fixed inset-0 z-[60] flex items-end justify-center bg-scrim/60 p-4 sm:items-center";

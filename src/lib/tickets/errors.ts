import { EpApiError } from "@/lib/tickets/ep-client";

/**
 * Opaque, client-safe error codes (rule 28). A route handler answers
 * `{ success: false, error, code }` with one of these; the client maps `code`
 * to `tickets.errors.<code>` in the visitor's language. No ep-api text, status
 * or URL ever reaches the browser.
 *
 * ep-api's `tickets.*` rejections currently carry NO machine `code` in the JSON
 * body (only a localised sentence plus `details`), so the mapping is mostly by
 * HTTP status first; since ep-api #432 every `tickets.*` rejection carries `code: "tickets.<key>"`,
 * honoured through `KNOWN_TICKET_CODES` and the `TICKET_CODE_ALIASES` below (ep-api keys the renderer
 * words differently or folds together).
 */
export const TICKET_ERROR_CODES = [
  "invalid",
  "rateLimited",
  "notFound",
  "forbidden",
  "unavailable",
  "soldOut",
  "notOnSale",
  "priceChanged",
  "codeInvalid",
  "codeNotValidNow",
  "codeNotApplicable",
  "codeUsedUp",
  "codeOnce",
  "oneEventPerOrder",
  "holdersMismatch",
  "idempotencyKeyReused",
  "overMax",
  "tooManyOpenOrders",
  "linkNotFound",
  "orderNotFound",
  "paymentUnavailable",
  "holdEnded",
  "orderClosed",
  "termsRequired",
  "salesClosed",
  // Holder self-service (ep-api DASH-205 F1)
  "nameChangesOff",
  "transfersOff",
  "changesClosed",
  "passOnSameEmail",
  "refundRequestOpen",
  "refundRequestPending",
  "ticketsNotRefundable",
  "orderNotRefundable",
  // Checkout questions (ep-api DASH-205 F2)
  "answerInvalid",
  "answerRequired",
  // Waitlist (ep-api DASH-205 F3)
  "waitlistClosed",
  "offerEnded",
  "offerOverQuantity",
  "offerInUse",
  "waitlistTooMany",
  // Captcha on the order (ep-api DASH-205 F4)
  "captchaRequired",
  "captchaFailed",
  // Ticket page details (ep-api DASH-205 T5)
  "badgeFrozen",
  // Cancel my ticket on a free order (ep-api DASH-205 IM-04)
  "cancelNotAllowed",
  // Buyer phone / address when the site requires them (ep-api API-267)
  "contactRequired",
] as const;
export type TicketErrorCode = (typeof TICKET_ERROR_CODES)[number];

const KNOWN_TICKET_CODES: ReadonlySet<string> = new Set(TICKET_ERROR_CODES);

/** ep-api `tickets.<key>` values that read the same to a buyer as one of our codes. */
const TICKET_CODE_ALIASES: Readonly<Record<string, TicketErrorCode>> = {
  tooManyPending: "tooManyOpenOrders",
  paused: "notOnSale",
  saleEnded: "notOnSale",
  typeUnavailable: "notOnSale",
  vatNotSet: "notOnSale",
  overQuantity: "overMax",
  stripeNotConnected: "paymentUnavailable",
  siteNotConfigured: "salesClosed",
  typeNotFound: "linkNotFound",
  duplicate: "idempotencyKeyReused",
  typeMismatch: "holdersMismatch",
};

export function ticketErrorCode({ error }: { error: unknown }): TicketErrorCode {
  if (error instanceof EpApiError) {
    const named = error.code?.startsWith("tickets.") ? error.code.slice("tickets.".length) : undefined;
    if (named && KNOWN_TICKET_CODES.has(named)) return named as TicketErrorCode;
    const alias = named ? TICKET_CODE_ALIASES[named] : undefined;
    if (alias) return alias;
    if (error.status === 404) return "notFound";
    if (error.status === 429) return "rateLimited";
    if (error.status === 401 || error.status === 403) return "forbidden";
    if (error.status >= 400 && error.status < 500) return "invalid";
  }
  return "unavailable";
}

/** Opaque English text for the `error` field (the client shows its own translation of `code`). */
export const GENERIC_ERROR_TEXT = "Something went wrong. Please try again.";

/** HTTP status a handler answers for a code. */
export function statusForTicketError({ code }: { code: TicketErrorCode }): number {
  switch (code) {
    case "notFound":
    case "linkNotFound":
    case "orderNotFound":
      return 404;
    case "rateLimited":
      return 429;
    case "forbidden":
    case "nameChangesOff":
    case "transfersOff":
      return 403;
    case "unavailable":
    case "paymentUnavailable":
      return 502;
    case "soldOut":
    case "notOnSale":
    case "priceChanged":
    case "codeInvalid":
    case "codeNotValidNow":
    case "codeNotApplicable":
    case "codeUsedUp":
    case "codeOnce":
    case "idempotencyKeyReused":
    case "overMax":
    case "tooManyOpenOrders":
    case "holdEnded":
    case "orderClosed":
    case "salesClosed":
    case "changesClosed":
    case "badgeFrozen":
    case "cancelNotAllowed":
    case "passOnSameEmail":
    case "refundRequestOpen":
    case "refundRequestPending":
    case "ticketsNotRefundable":
    case "orderNotRefundable":
    case "waitlistClosed":
    case "offerEnded":
    case "offerOverQuantity":
    case "offerInUse":
      return 409;
    default:
      return 400;
  }
}

/** The ticket type a rejection is about, as ep-api names it in `details` (a uuid + its status), for the cart to mark. */
export interface TicketErrorDetails {
  ticketTypeId: string;
  status?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Only a well-formed `ticketTypeId` (+ a short status word) is ever passed on: nothing else of `details` reaches the browser. */
export function ticketErrorDetails({ error }: { error: unknown }): TicketErrorDetails | undefined {
  if (!(error instanceof EpApiError)) return undefined;
  const details = error.details;
  const id = details?.ticketTypeId;
  if (typeof id !== "string" || !UUID.test(id)) return undefined;
  const status = details?.status;
  return typeof status === "string" && /^[a-z_]{1,20}$/.test(status) ? { ticketTypeId: id, status } : { ticketTypeId: id };
}

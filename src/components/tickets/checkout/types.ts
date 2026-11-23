import type { ExtraQuestions } from "@/lib/tickets/checkout-questions";
import type { CreateOrderResult, PricedCart, PublicType, QuoteResult } from "@/lib/tickets/schemas";

export type { PublicType };

/** What the cart needs from ep-api's `checkout` block (no secret, no publishable key: the order answer brings that). */
export interface CheckoutConfig {
  salesOpen: boolean;
  testMode: boolean;
  feePayer: string;
  termsUrl: string | null;
  privacyUrl: string | null;
  questions: { invoice: boolean; terms: boolean };
  /** The extra questions of the site (company / job title, dietary needs, T-shirt size, how they heard): step 02 and 03 ask them. */
  extraQuestions: ExtraQuestions;
  newsletterOffer: { on: boolean; pct: number };
  /** Holders give company / job title and dietary needs on their ticket page, not here (ep-api T7): step 03 says so. */
  detailsLater?: boolean;
  /** How long ep-api holds the tickets while the buyer pays (the cart's "held for N minutes" note); absent = not said. */
  holdMinutes?: number | undefined;
}

/** 1 = Tickets & details (one page), 2 = Payment. The confirmation (3) is the order page the buyer is sent to. */
export type Step = 1 | 2;

export type QuoteState =
  | { status: "idle" }
  | { status: "loading"; result?: QuoteResult }
  | { status: "ready"; result: QuoteResult }
  | { status: "error"; code: string; result?: QuoteResult };

/** The pending order the Pay step works on. `fingerprint` is the request it was created from (minus the key). */
export interface OrderState {
  orderId: string;
  buyerToken: string;
  holdExpiresAt: string;
  /** The latest the hold can be extended to (ISO); absent on older ep-api builds = unknown, keep asking. */
  holdMaxAt?: string | undefined;
  clientSecret: string | null;
  publishableKey: string | null;
  fingerprint: string;
  totals: PricedCart;
  currency: string;
}

export type CreatedOrder = CreateOrderResult;

/** What the pop-up's confirmation needs once an order is placed (the buyer token stays in memory: never a URL). */
export interface CheckoutDone {
  orderId: string;
  buyerToken: string;
  free: boolean;
  /** Each ticket holder as entered at checkout (name + the email the ticket is sent to). */
  holders: { name: string; email: string }[];
  eventName: string;
  startDate: string | null;
  endDate: string | null;
}

/**
 * Set by the Tickets block's pop-up: the checkout then never touches the router (`router.refresh()` would re-render the
 * page behind the dialog and lose nothing but time), never navigates away after an order, and reports what the shell needs.
 */
export interface EmbeddedCheckout {
  /** Stock or prices may be stale (a hold ended, a card was refused): re-read them in place. */
  onRefresh: () => void;
  /** The current step and, once an order holds tickets, when that hold ends (null = no hold). */
  onProgress: (progress: { step: Step; holdExpiresAt: string | null }) => void;
  /** An order was placed (free) or paid: show the confirmation instead of leaving the page. */
  onDone: (done: CheckoutDone) => void;
}

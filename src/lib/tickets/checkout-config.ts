import { extraQuestionsOf } from "./checkout-questions";
import type { CheckoutBlock } from "./schemas";
import type { CheckoutConfig } from "@/components/tickets/checkout/types";

/**
 * ep-api's `checkout` block as the cart needs it; a missing optional part falls back to the safe default (ask for
 * everything, no offer). Shared by the `/tickets` page (server) and the Tickets block's checkout pop-up (browser).
 */
export function configOf({ checkout }: { checkout: CheckoutBlock }): CheckoutConfig {
  return {
    salesOpen: checkout.salesOpen,
    testMode: checkout.testMode,
    feePayer: checkout.feePayer,
    termsUrl: checkout.termsUrl ?? null,
    privacyUrl: checkout.privacyUrl ?? null,
    questions: checkout.questions ?? { invoice: true, terms: true },
    extraQuestions: extraQuestionsOf({ questionList: checkout.questionList }),
    newsletterOffer: checkout.newsletterOffer ?? { on: false, pct: 0 },
    detailsLater: checkout.detailsLater === true,
  };
}

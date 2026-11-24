import { describe, expect, it, vi } from "vitest";
import { render, screen } from "../../../test-utils";
import { CartStep, type CartStepProps } from "@/components/tickets/checkout/CartStep";
import { EMPTY_DETAILS } from "@/components/tickets/checkout/forms";
import { NO_EXTRA_QUESTIONS } from "@/lib/tickets/checkout-questions";
import type { CodeStatus } from "@/lib/tickets/schemas";
import { config, typeA } from "../../../helpers/checkout-harness";

const totals = { lines: [], subtotalCents: 0, discountCents: 0, feeCents: 0, totalCents: 0, vatCents: 0 };
const checkoutConfig = { ...config, extraQuestions: NO_EXTRA_QUESTIONS };
const noop = () => undefined;

type StepOptions = { codeStatus: CodeStatus; validFrom?: string | null; validUntil?: string | null; codeError?: string | null; timeZone?: string; types?: CartStepProps["types"]; cart?: CartStepProps["cart"] };

function renderStep({ codeStatus, validFrom, validUntil, codeError = null, timeZone, types, cart = {} }: StepOptions) {
  const props: CartStepProps = {
    types: types ?? [timeZone ? { ...typeA, source: { ...typeA.source, timeZone } } : typeA],
    config: checkoutConfig,
    cart,
    flagged: {},
    onQuantity: noop,
    conflict: null,
    onClearAndAdd: noop,
    onKeepCart: noop,
    codeInput: "VIP10",
    onCodeInput: noop,
    appliedCode: codeError ? null : "VIP10",
    codeError,
    onApplyCode: noop,
    onRemoveCode: noop,
    newsletter: false,
    onNewsletter: vi.fn(),
    quote: { status: "ready", result: { totals, currency: "EUR", codeStatus, validFrom, validUntil } },
    quoteError: null,
    header: null,
    canOrder: false,
    slots: [],
    values: { ...EMPTY_DETAILS, holders: [] },
    submitting: false,
    placeLabel: "Continue to payment",
    onSubmit: noop,
  };
  return render(<CartStep {...props} />);
}

describe("CartStep — the real reason a discount code was rejected (DASH-236 TK-04)", () => {
  it("unknown code", () => {
    renderStep({ codeStatus: "unknown" });
    expect(screen.getByText("We don't recognise that code. Check the spelling.")).toBeInTheDocument();
  });

  it("not for this ticket", () => {
    renderStep({ codeStatus: "not_applicable" });
    expect(screen.getByText("That discount code does not apply to the tickets in your order.")).toBeInTheDocument();
  });

  it("used up", () => {
    renderStep({ codeStatus: "used_up" });
    expect(screen.getByText("That discount code has been used up.")).toBeInTheDocument();
  });

  it("not valid yet names the start date; expired names the end date; no dates falls back to the plain text", () => {
    const future = new Date(Date.now() + 40 * 86_400_000).toISOString();
    const past = new Date(Date.now() - 40 * 86_400_000).toISOString();
    const first = renderStep({ codeStatus: "not_valid_now", validFrom: future, validUntil: null });
    expect(screen.getByRole("status")).toHaveTextContent(/not valid yet\. It starts on .*\d{4}/);
    first.unmount();
    const second = renderStep({ codeStatus: "not_valid_now", validFrom: null, validUntil: past });
    expect(screen.getByRole("status")).toHaveTextContent(/expired on .*\d{4}/);
    second.unmount();
    renderStep({ codeStatus: "not_valid_now" });
    expect(screen.getByText("That discount code is not valid right now.")).toBeInTheDocument();
  });

  it("shows the code window in the event's time zone, with the zone name", () => {
    renderStep({ codeStatus: "not_valid_now", validFrom: "2099-12-01T00:00:00Z", validUntil: null, timeZone: "Asia/Kolkata" });
    const text = screen.getByRole("status").textContent ?? "";
    expect(text).toMatch(/5:30\s?AM/);
    expect(text).toMatch(/GMT\+5:30|IST/);
  });

  it("with types from several events, uses the zone of the event whose tickets are in the cart", () => {
    const malta = { ...typeA, id: "type-malta", source: { ...typeA.source, timeZone: "Europe/Malta" } };
    const newYork = { ...typeA, id: "type-new-york", source: { ...typeA.source, timeZone: "America/New_York" } };
    renderStep({ codeStatus: "not_valid_now", validFrom: "2099-12-01T00:00:00Z", validUntil: null, types: [malta, newYork], cart: { [newYork.id]: 1 } });
    const text = screen.getByRole("status").textContent ?? "";
    expect(text).toMatch(/7:00\s?PM/);
    expect(text).toMatch(/EST|GMT-5/);
  });

  it("with nothing in the cart, falls back to the first listed type with a valid zone", () => {
    const unreadable = { ...typeA, id: "type-bad", source: { ...typeA.source, timeZone: "Not/AZone" } };
    const malta = { ...typeA, id: "type-malta", source: { ...typeA.source, timeZone: "Europe/Malta" } };
    const newYork = { ...typeA, id: "type-new-york", source: { ...typeA.source, timeZone: "America/New_York" } };
    renderStep({ codeStatus: "not_valid_now", validFrom: "2099-12-01T00:00:00Z", validUntil: null, types: [unreadable, malta, newYork] });
    const text = screen.getByRole("status").textContent ?? "";
    expect(text).toMatch(/1:00\s?AM/);
    expect(text).toMatch(/CET|GMT\+1/);
  });

  it("still renders when no event time zone is known, or it is unreadable", () => {
    const first = renderStep({ codeStatus: "not_valid_now", validFrom: "2099-12-01T00:00:00Z", validUntil: null });
    expect(screen.getByRole("status")).toHaveTextContent(/not valid yet\. It starts on .*2099/);
    first.unmount();
    renderStep({ codeStatus: "not_valid_now", validFrom: "2099-12-01T00:00:00Z", validUntil: null, timeZone: "Not/AZone" });
    expect(screen.getByRole("status")).toHaveTextContent(/not valid yet\. It starts on .*2099/);
  });

  it("a valid code shows no error, only the applied line", () => {
    renderStep({ codeStatus: "valid" });
    expect(screen.getByText("Discount code VIP10 applied.")).toBeInTheDocument();
  });

  it.each([
    ["codeInvalid", "We don't recognise that code. Check the spelling."],
    ["codeSomethingNew", "That discount code cannot be used."],
    ["codeNotValidNow", "That discount code is not valid right now."],
    ["codeNotApplicable", "That discount code does not apply to the tickets in your order."],
    ["codeUsedUp", "That discount code has been used up."],
    ["codeOnce", "That discount code can only be used once per email address."],
  ])("an order-create refusal %s shows its own message", (code, text) => {
    renderStep({ codeStatus: "none", codeError: code });
    expect(screen.getByText(text)).toBeInTheDocument();
  });
});

describe("CartStep — which discount won (stackNote)", () => {
  const CODE_WINS = "Your discount code gives more than the newsletter's 5%, so only the code applies.";
  const NEWSLETTER_WINS = "The newsletter's 5% gives more than your discount code, so only the newsletter discount applies.";

  function mount({ newsletter = true, appliedCode = "VIP10" as string | null, codeStatus = "valid" as CodeStatus, status = "ready" as "ready" | "loading", amounts = {} as { codeDiscountCents?: number; newsletterDiscountCents?: number } }) {
    const result = { totals: { ...totals, ...amounts }, currency: "EUR", codeStatus };
    const props: CartStepProps = {
      types: [typeA],
      config: checkoutConfig,
      cart: {},
      flagged: {},
      onQuantity: noop,
      conflict: null,
      onClearAndAdd: noop,
      onKeepCart: noop,
      codeInput: "VIP10",
      onCodeInput: noop,
      appliedCode,
      codeError: null,
      onApplyCode: noop,
      onRemoveCode: noop,
      newsletter,
      onNewsletter: noop,
      quote: { status, result },
      quoteError: null,
      header: null,
      canOrder: false,
      slots: [],
      values: { ...EMPTY_DETAILS, holders: [] },
      submitting: false,
      placeLabel: "Continue to payment",
      onSubmit: noop,
    };
    return render(<CartStep {...props} />);
  }

  it("code discount > 0: the code wins", () => {
    mount({ amounts: { codeDiscountCents: 1000, newsletterDiscountCents: 0 } });
    expect(screen.getByText(CODE_WINS)).toBeInTheDocument();
    expect(screen.queryByText(NEWSLETTER_WINS)).not.toBeInTheDocument();
  });

  it("only a newsletter discount > 0: the newsletter wins", () => {
    mount({ amounts: { codeDiscountCents: 0, newsletterDiscountCents: 750 } });
    expect(screen.getByText(NEWSLETTER_WINS)).toBeInTheDocument();
    expect(screen.queryByText(CODE_WINS)).not.toBeInTheDocument();
  });

  it("no note when neither discount is reported", () => {
    mount({ amounts: {} });
    expect(screen.queryByText(CODE_WINS)).not.toBeInTheDocument();
    expect(screen.queryByText(NEWSLETTER_WINS)).not.toBeInTheDocument();
  });

  it("no note when the code is not valid", () => {
    mount({ codeStatus: "unknown", amounts: { codeDiscountCents: 1000 } });
    expect(screen.queryByText(CODE_WINS)).not.toBeInTheDocument();
  });

  it("no note when the newsletter box is off, when no code is applied, or while the quote is loading", () => {
    const { unmount } = mount({ newsletter: false, amounts: { codeDiscountCents: 1000 } });
    expect(screen.queryByText(CODE_WINS)).not.toBeInTheDocument();
    unmount();
    const second = mount({ appliedCode: null, amounts: { codeDiscountCents: 1000 } });
    expect(screen.queryByText(CODE_WINS)).not.toBeInTheDocument();
    second.unmount();
    mount({ status: "loading", amounts: { codeDiscountCents: 1000 } });
    expect(screen.queryByText(CODE_WINS)).not.toBeInTheDocument();
  });
});

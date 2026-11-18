import { describe, expect, it, vi } from "vitest";
import { render, screen } from "../../../test-utils";
import { StepTickets, type StepTicketsProps } from "@/components/tickets/checkout/StepTickets";
import { NO_EXTRA_QUESTIONS } from "@/lib/tickets/checkout-questions";
import type { CodeStatus } from "@/lib/tickets/schemas";
import { config, typeA } from "../../../helpers/checkout-harness";

const totals = { lines: [], subtotalCents: 0, discountCents: 0, feeCents: 0, totalCents: 0, vatCents: 0 };
const checkoutConfig = { ...config, extraQuestions: NO_EXTRA_QUESTIONS };
const noop = () => undefined;

function renderStep({ codeStatus, validFrom, validUntil, codeError = null }: { codeStatus: CodeStatus; validFrom?: string | null; validUntil?: string | null; codeError?: string | null }) {
  const props: StepTicketsProps = {
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
    appliedCode: codeError ? null : "VIP10",
    codeError,
    onApplyCode: noop,
    onRemoveCode: noop,
    newsletter: false,
    onNewsletter: vi.fn(),
    quote: { status: "ready", result: { totals, currency: "EUR", codeStatus, validFrom, validUntil } },
    quoteError: null,
    canContinue: false,
    onContinue: noop,
  };
  return render(<StepTickets {...props} />);
}

describe("StepTickets — the real reason a discount code was rejected (DASH-236 TK-04)", () => {
  it("unknown code", () => {
    renderStep({ codeStatus: "unknown" });
    expect(screen.getByText("That discount code cannot be used.")).toBeInTheDocument();
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

  it("a valid code shows no error, only the applied line", () => {
    renderStep({ codeStatus: "valid" });
    expect(screen.getByText("Discount code VIP10 applied.")).toBeInTheDocument();
  });

  it.each([
    ["codeInvalid", "That discount code cannot be used."],
    ["codeNotValidNow", "That discount code is not valid right now."],
    ["codeNotApplicable", "That discount code does not apply to the tickets in your order."],
    ["codeUsedUp", "That discount code has been used up."],
    ["codeOnce", "That discount code can only be used once per email address."],
  ])("an order-create refusal %s shows its own message", (code, text) => {
    renderStep({ codeStatus: "none", codeError: code });
    expect(screen.getByText(text)).toBeInTheDocument();
  });
});

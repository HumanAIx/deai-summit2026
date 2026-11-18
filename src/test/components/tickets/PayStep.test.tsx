import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { typeA } from "../../helpers/checkout-harness";
import { act, fireEvent, render, screen } from "../../test-utils";

// The lazy Stripe payment is stubbed: the step is asserted by what it renders around it.
vi.mock("@/components/tickets/checkout/StripePayment", () => ({ default: () => <div data-testid="stripe-payment" /> }));
vi.mock("../../../components/tickets/checkout/StripePayment", () => ({ default: () => <div data-testid="stripe-payment" /> }));

const { PayStep } = await import("../../../components/tickets/checkout/PayStep");

const NOW = new Date("2030-01-01T10:00:00Z");
const iso = (ms: number) => new Date(NOW.getTime() + ms).toISOString();

const totals = {
  lines: [{ ticketTypeId: typeA.id, quantity: 2, unitCents: 15000, discountCents: 0, feeCents: 0, grossCents: 1 }],
  subtotalCents: 30000,
  discountCents: 0,
  feeCents: 0,
  totalCents: 23456,
  vatCents: 0,
};

function order(overrides: Record<string, unknown> = {}) {
  return {
    orderId: "o1",
    buyerToken: "t".repeat(43),
    holdExpiresAt: iso(90_000),
    holdMaxAt: iso(30 * 60_000),
    clientSecret: "pi_1_secret_x",
    publishableKey: "pk_test_x",
    fingerprint: "f",
    totals,
    currency: "EUR",
    ...overrides,
  };
}

function mount(props: Record<string, unknown> = {}) {
  const handlers = { onExpire: vi.fn(), beforePay: vi.fn().mockResolvedValue(true), onSucceeded: vi.fn(), onBack: vi.fn(), onExtend: vi.fn().mockResolvedValue(true) };
  render(<PayStep order={order() as never} types={[typeA]} locale="en" returnUrl="https://x.test/return" testMode={false} payLabel="Pay €234.56" {...handlers} {...props} />);
  return handlers;
}

beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ["Date", "setInterval", "clearInterval", "setTimeout", "clearTimeout"] }));
afterEach(() => vi.useRealTimers());

describe("PayStep", () => {
  it("renders the order summary from order.totals (ep-api's numbers) above the payment", async () => {
    mount();
    const summary = screen.getByRole("heading", { name: "Order summary" });
    expect(screen.getByText("2 × Full pass")).toBeInTheDocument();
    expect(screen.getByText("€234.56")).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    const payment = screen.getByTestId("stripe-payment");
    expect(summary.compareDocumentPosition(payment) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("offers Extend in the last 2 minutes while the hold is below holdMaxAt, and the click goes to onExtend", () => {
    const { onExtend } = mount();
    fireEvent.click(screen.getByRole("button", { name: "Extend" }));
    expect(onExtend).toHaveBeenCalledTimes(1);
  });

  it("the hold at its ceiling (holdExpiresAt >= holdMaxAt): no Extend button, the 'any further' text", () => {
    mount({ order: order({ holdExpiresAt: iso(90_000), holdMaxAt: iso(90_000) }) });
    expect(screen.getByRole("alert")).toHaveTextContent("can't be extended any further");
    expect(screen.queryByRole("button", { name: "Extend" })).not.toBeInTheDocument();
  });

  it("an unknown ceiling (no holdMaxAt) keeps offering Extend", () => {
    mount({ order: order({ holdMaxAt: undefined }) });
    expect(screen.getByRole("button", { name: "Extend" })).toBeInTheDocument();
  });

  it("more than 2 minutes left: no warning", () => {
    mount({ order: order({ holdExpiresAt: iso(8 * 60_000) }) });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the test-mode notice and the Back button", () => {
    const { onBack } = mount({ testMode: true });
    expect(screen.getByText(/Test mode/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to ticket holders" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("without a client secret: an alert instead of Stripe", () => {
    mount({ order: order({ clientSecret: null, publishableKey: null }) });
    expect(screen.queryByTestId("stripe-payment")).not.toBeInTheDocument();
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
  });
});

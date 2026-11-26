import { describe, expect, it, vi } from "vitest";
import { axeViolations, describeViolations } from "../../helpers/axe";
import { resolveServerElement } from "../../helpers/resolve-server";
import { render, screen, within } from "../../test-utils";
import type { MyOrder } from "../../../lib/tickets/schemas";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const { OrderView } = await import("../../../components/tickets/OrderView");

const TOKEN = "b".repeat(43);
const CN_ID = "6d2f8b2f-3a5b-4b64-8b4f-1f7a7b5d2c22";
const BASE: MyOrder = {
  orderNo: 7,
  status: "refunded",
  paidAt: "2026-11-12T10:00:00.000Z",
  currency: "EUR",
  lines: [{ name: "Full pass", quantity: 1, unitCents: 18900, discountCents: 0, feeCents: 288, vatRate: 0, grossCents: 19188 }],
  totals: { totalCents: 19188, vatCents: 0, feeCents: 288, refundedCents: 18900, feeRefundedCents: 0 },
  holders: [{ name: "Ada", email: null, status: "refunded", ticketCode: "T-1" }],
  documents: [{ id: CN_ID, kind: "credit_note", number: "CN-1", issueDate: "2026-11-20", grossCents: -18900 }],
  seller: { name: "Acme", vatNumber: null, replyTo: null },
  canRequestRefund: false,
  refunds: [{ createdAt: "2026-11-20T10:00:00.000Z", status: "succeeded", amountCents: 18900, ticketsCents: 18900, feeCents: 0, ticketCount: 1, feeOnly: false, creditNoteNumber: "CN-1" }],
  refundRequest: null,
};
const REQ = { status: "approved", createdAt: "2026-11-18T10:00:00.000Z", ticketCount: 1, reason: "cant_attend", message: "Sick, sorry", decidedAt: "2026-11-20T09:00:00.000Z", reply: null, refundedCents: 18900 };

async function renderOrder(order: MyOrder) {
  const ui = await resolveServerElement(<OrderView order={order} token={TOKEN} />);
  const view = render(<>{ui}</>);
  const header = screen.getByRole("heading", { level: 1 }).closest("header") as HTMLElement;
  const section = screen.getByRole("heading", { name: "Refunds" }).closest("section") as HTMLElement;
  return { view, header, section };
}

describe("buyer order page: refunds (API-269)", () => {
  it("fee kept: header says 189 refunded of 191.88 and what was paid; the section lists tickets, the fee kept, the credit note and the total", async () => {
    const { header, section } = await renderOrder({ ...BASE, refundRequest: REQ });
    expect(within(header).getByText("Refunded")).toBeInTheDocument();
    expect(within(header).getByText("€189 refunded of €191.88")).toBeInTheDocument();
    expect(within(header).getByText("You paid €2.88")).toBeInTheDocument();
    expect(within(section).getByText("Refunds go back to your original payment method, usually within 5–10 business days.")).toBeInTheDocument();
    expect(within(section).getByText("Refund on November 20, 2026")).toBeInTheDocument();
    expect(within(section).getByText("€189")).toBeInTheDocument();
    expect(within(section).getByText("Booking fee €2.88 not refunded")).toBeInTheDocument();
    expect(within(section).getByRole("link", { name: "Credit note CN-1" })).toHaveAttribute("href", `#doc-${CN_ID}`);
    expect(document.getElementById(`doc-${CN_ID}`)).not.toBeNull();
    expect(within(section).getByText("Refunded €189 · You paid €2.88")).toBeInTheDocument();
  });

  it("fee given back: shows the booking fee line, no 'not refunded', and no 'You paid'", async () => {
    const { header, section } = await renderOrder({
      ...BASE,
      totals: { ...BASE.totals, refundedCents: 19188, feeRefundedCents: 288 },
      refunds: [{ ...(BASE.refunds?.[0] as NonNullable<MyOrder["refunds"]>[number]), amountCents: 19188, feeCents: 288 }],
    });
    expect(within(header).getByText("€191.88 refunded of €191.88")).toBeInTheDocument();
    expect(within(header).queryByText(/You paid/)).not.toBeInTheDocument();
    expect(within(section).getByText("Booking fee")).toBeInTheDocument();
    expect(within(section).queryByText(/not refunded/)).not.toBeInTheDocument();
    expect(within(section).getByText("Refunded €191.88")).toBeInTheDocument();
  });

  it("partial: 1 of 2 tickets refunded, the other ticket's fee is not called kept", async () => {
    const { header, section } = await renderOrder({
      ...BASE,
      status: "partial",
      lines: [{ ...(BASE.lines[0] as MyOrder["lines"][number]), quantity: 2 }],
      totals: { totalCents: 38376, vatCents: 0, feeCents: 576, refundedCents: 18900, feeRefundedCents: 0 },
    });
    expect(within(header).getByText("Partly refunded")).toBeInTheDocument();
    expect(within(header).getByText("€189 refunded of €383.76")).toBeInTheDocument();
    expect(within(header).getByText("You paid €194.76")).toBeInTheDocument();
    expect(within(section).getByText("Booking fee €2.88 not refunded")).toBeInTheDocument();
  });

  it("a pending refund is marked Processing", async () => {
    const { section } = await renderOrder({ ...BASE, refunds: [{ ...(BASE.refunds?.[0] as NonNullable<MyOrder["refunds"]>[number]), status: "pending", creditNoteNumber: null }] });
    expect(within(section).getByText("Processing")).toBeInTheDocument();
  });

  it("approved request: the buyer's own words, the decision date, the amount and the organiser's message", async () => {
    const { section } = await renderOrder({ ...BASE, refundRequest: { ...REQ, reply: "Hope to see you next year" } });
    expect(within(section).getByText(/You asked on November 18, 2026: I can't attend — “Sick, sorry”/)).toBeInTheDocument();
    expect(within(section).getByText("Approved on November 20, 2026: €189 refunded")).toBeInTheDocument();
    expect(within(section).getByText("Message from the organiser: Hope to see you next year")).toBeInTheDocument();
  });

  it("declined request: the buyer's message, the reply, and a hint that they can ask again", async () => {
    const { section } = await renderOrder({
      ...BASE,
      status: "paid",
      totals: { totalCents: 19188, vatCents: 0, feeCents: 288, refundedCents: 0, feeRefundedCents: 0 },
      refunds: [],
      canRequestRefund: true,
      holders: [{ id: CN_ID, name: "Ada", email: null, status: "valid", ticketCode: "T-1" }],
      refundRequest: { ...REQ, status: "declined", refundedCents: null, reply: "The sale is final." },
    });
    expect(within(section).getByText(/You asked on November 18, 2026: I can't attend — “Sick, sorry”/)).toBeInTheDocument();
    expect(within(section).getByText("Declined on November 20, 2026")).toBeInTheDocument();
    expect(within(section).getByText("Message from the organiser: The sale is final.")).toBeInTheDocument();
    expect(within(section).getByText("You can ask again below.")).toBeInTheDocument();
    expect(within(section).getByRole("button", { name: "Ask for a refund" })).toBeInTheDocument();
    expect(within(section).queryByText(/Refunds go back/)).not.toBeInTheDocument();
  });

  it("open request: waiting for the organiser, tickets stay valid", async () => {
    const { section } = await renderOrder({
      ...BASE,
      status: "paid",
      totals: { totalCents: 19188, vatCents: 0, feeCents: 288, refundedCents: 0, feeRefundedCents: 0 },
      refunds: [],
      refundRequest: { ...REQ, status: "open", decidedAt: null, refundedCents: null, message: null },
    });
    expect(within(section).getByText("Waiting for the organiser")).toBeInTheDocument();
    expect(within(section).getByText("Your tickets stay valid until then.")).toBeInTheDocument();
    expect(within(section).getByText(/You asked on November 18, 2026: I can't attend/)).toBeInTheDocument();
  });

  it("an old API answer (no new fields) keeps the previous behaviour: total in the header, one-line request status", async () => {
    const old = { ...BASE, totals: { totalCents: 19188, vatCents: 0, feeCents: 288 }, refunds: undefined, refundRequest: { status: "approved", createdAt: "2026-11-13T10:00:00.000Z", ticketCount: 1, reason: "other", reply: null } } as MyOrder;
    const { header, section } = await renderOrder(old);
    expect(within(header).getByText("€191.88")).toBeInTheDocument();
    expect(within(header).queryByText(/refunded of/)).not.toBeInTheDocument();
    expect(within(section).getByText("The refund request of November 13, 2026 was approved.")).toBeInTheDocument();
    expect(within(section).getByText("1 ticket")).toBeInTheDocument();
  });

  it("has no axe violations with refunds and a request", async () => {
    const { view } = await renderOrder({ ...BASE, refundRequest: { ...REQ, reply: "Thanks" } });
    expect(describeViolations(await axeViolations({ container: view.container }))).toEqual([]);
  });
});

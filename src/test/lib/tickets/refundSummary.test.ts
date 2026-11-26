import { describe, expect, it } from "vitest";
import { refundSummary } from "../../../lib/tickets/refundSummary";
import type { MyOrder } from "../../../lib/tickets/schemas";

const refund = (over: Partial<NonNullable<MyOrder["refunds"]>[number]>): NonNullable<MyOrder["refunds"]>[number] => ({
  createdAt: "2026-11-20T10:00:00.000Z",
  status: "succeeded",
  amountCents: 18900,
  ticketsCents: 18900,
  feeCents: 0,
  ticketCount: 1,
  feeOnly: false,
  creditNoteNumber: null,
  ...over,
});
const lines = [{ name: "Pass", quantity: 1, unitCents: 18900, discountCents: 0, feeCents: 288, vatRate: 0, grossCents: 19188 }];
const order = (over: Partial<Pick<MyOrder, "totals" | "lines" | "refunds">> = {}): Pick<MyOrder, "totals" | "lines" | "refunds"> => ({
  totals: { totalCents: 19188, vatCents: 0, feeCents: 288, refundedCents: 18900, feeRefundedCents: 0 },
  lines,
  refunds: [refund({})],
  ...over,
});

describe("refundSummary", () => {
  it("fee kept: refunded 189, kept 2.88, net 2.88", () => {
    const s = refundSummary({ order: order() });
    expect(s).toMatchObject({ refundedCents: 18900, netCents: 288, hasRefunds: true, hasPending: false });
    expect(s.rows[0]?.feeKeptCents).toBe(288);
  });

  it("fee given back: nothing kept, net 0", () => {
    const s = refundSummary({ order: order({ totals: { totalCents: 19188, vatCents: 0, feeCents: 288, refundedCents: 19188, feeRefundedCents: 288 }, refunds: [refund({ amountCents: 19188, feeCents: 288 })] }) });
    expect(s.rows[0]?.feeKeptCents).toBe(0);
    expect(s.netCents).toBe(0);
  });

  it("partial: 1 of 2 tickets keeps that ticket's share of the fee only", () => {
    const two = [{ ...lines[0]!, quantity: 2 }];
    const s = refundSummary({ order: order({ lines: two, totals: { totalCents: 38376, vatCents: 0, feeCents: 576, refundedCents: 18900, feeRefundedCents: 0 } }) });
    expect(s.rows[0]?.feeKeptCents).toBe(288);
    expect(s.netCents).toBe(19476);
  });

  it("never reports more kept than is still not given back", () => {
    const s = refundSummary({ order: order({ totals: { totalCents: 19188, vatCents: 0, feeCents: 288, refundedCents: 18900, feeRefundedCents: 200 } }) });
    expect(s.rows[0]?.feeKeptCents).toBe(88);
  });

  it("a fee-only refund and an order without a fee keep nothing; pending is flagged", () => {
    expect(refundSummary({ order: order({ refunds: [refund({ ticketsCents: 0, feeCents: 288, amountCents: 288, ticketCount: 0, feeOnly: true })] }) }).rows[0]?.feeKeptCents).toBe(0);
    const nofee = refundSummary({ order: order({ totals: { totalCents: 18900, vatCents: 0, feeCents: 0, refundedCents: 0 }, refunds: [refund({ status: "pending" })] }) });
    expect(nofee.rows[0]?.feeKeptCents).toBe(0);
    expect(nofee.hasPending).toBe(true);
  });

  it("an older API (no refunds, no refundedCents) gives an empty summary", () => {
    const s = refundSummary({ order: { totals: { totalCents: 19188, vatCents: 0, feeCents: 288 }, lines } });
    expect(s).toMatchObject({ rows: [], refundedCents: 0, netCents: 19188, hasRefunds: false });
  });
});

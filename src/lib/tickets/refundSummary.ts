import type { MyOrder, OrderRefundView } from "./schemas";

export type RefundRow = OrderRefundView & {
  /** Booking fee this refund did NOT give back (0 when it returned it, or the order had none). */
  feeKeptCents: number;
};

export type RefundSummary = {
  rows: RefundRow[];
  /** Paid back so far, tickets + booking fee. */
  refundedCents: number;
  /** What the buyer still paid (total − refunded), never below 0. */
  netCents: number;
  /** True when the order has any refund to show (the section's intro and total line). */
  hasRefunds: boolean;
  /** At least one refund is still processing at the payment provider. */
  hasPending: boolean;
};

/**
 * The money maths of the buyer's Refunds section, pure identical in ep-website and deai-summit2026.
 *
 * A refund of tickets that did not return the booking fee (`feeCents === 0 && ticketsCents > 0`) on an order that
 * had one "kept" part of it: the fee of just the refunded tickets (order fee / ticket units × ticketCount), never
 * more than what is still not given back (`totals.feeCents − feeRefundedCents`).
 */
export function refundSummary({ order }: { order: Pick<MyOrder, "totals" | "lines" | "refunds"> }): RefundSummary {
  const refunds = Array.isArray(order.refunds) ? order.refunds : [];
  const orderFee = Math.max(order.totals.feeCents, 0);
  const feeLeft = Math.max(orderFee - (order.totals.feeRefundedCents ?? 0), 0);
  const units = (Array.isArray(order.lines) ? order.lines : []).reduce((sum, line) => sum + line.quantity, 0);
  const rows: RefundRow[] = refunds.map((refund) => {
    const kept = refund.feeCents === 0 && refund.ticketsCents > 0 && orderFee > 0;
    const share = kept && units > 0 && refund.ticketCount > 0 ? Math.round((orderFee * refund.ticketCount) / units) : feeLeft;
    return { ...refund, feeKeptCents: kept ? Math.min(share, feeLeft) : 0 };
  });
  const refundedCents = Math.max(order.totals.refundedCents ?? 0, 0);
  return {
    rows,
    refundedCents,
    netCents: Math.max(order.totals.totalCents - refundedCents, 0),
    hasRefunds: rows.length > 0,
    hasPending: rows.some((row) => row.status === "pending"),
  };
}

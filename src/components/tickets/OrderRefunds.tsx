import type { ReactNode } from "react";
import { getFormatter, getTranslations } from "@/lib/tickets/i18n-server";
import { formatMoney, formatPlainDate } from "@/lib/tickets/format";
import { refundSummary } from "@/lib/tickets/refundSummary";
import type { MyOrder } from "@/lib/tickets/schemas";
import { Dot } from "./ticket-page-icons";

const REASONS = ["cant_attend", "charged_twice", "event_changed", "bought_by_mistake", "other"];
const TONE_DONE = "border-(--mt-ok)/35 bg-(--mt-ok)/7 text-(--mt-ok)";
const TONE_OFF = "border-(--mt-err)/35 bg-(--mt-err)/7 text-(--mt-err)";
const TONE_NEUTRAL = "border-(--mt-line) bg-white/4 text-(--mt-soft)";
const TONE_WAIT = "border-(--mt-warn)/35 bg-(--mt-warn)/7 text-(--mt-warn)";
const STATUSES = ["open", "approved", "declined", "cancelled"];

/** The id of the credit-note row in the Invoice card, so a refund can link to its PDF. */
export function documentAnchor({ id }: { id: string }): string {
  return `doc-${id}`;
}

/**
 * The buyer's Refunds section body: each refund (tickets, booking fee given back or kept, processing, credit note),
 * the total, and the buyer's request with its outcome. `children` is the "Ask for a refund" trigger, shown by the
 * caller only when a new request is allowed. Same logic as ep-website; only classes and imports differ.
 */
export async function OrderRefunds({ order, canAsk, children }: { order: MyOrder; canAsk: boolean; children?: ReactNode }) {
  const [t, tReasons, format] = await Promise.all([getTranslations("tickets.order"), getTranslations("tickets.selfService.refund.reasons"), getFormatter()]);
  const money = (cents: number) => formatMoney({ format, cents, currency: order.currency });
  const date = (value: string) => formatPlainDate({ format, value });
  const summary = refundSummary({ order });
  const request = order.refundRequest ?? null;
  const status = request && STATUSES.includes(request.status) ? request.status : "open";
  const tone = status === "approved" ? TONE_DONE : status === "declined" ? TONE_OFF : status === "cancelled" ? TONE_NEUTRAL : TONE_WAIT;
  const documents = Array.isArray(order.documents) ? order.documents : [];
  // An older ep-api sends no decision date: that request keeps the previous one-line wording.
  const legacy = request !== null && request.decidedAt === undefined && status !== "open";
  const legacyOpen = request !== null && request.decidedAt === undefined && request.message === undefined && status === "open";
  const reason = request ? (REASONS.includes(request.reason) ? tReasons(request.reason) : request.reason) : "";

  return (
    <>
      {summary.hasRefunds ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm leading-normal text-(--mt-mut)">{t("refunds.intro")}</p>
          <ul aria-label={t("refunds.listLabel")} className="flex flex-col gap-3">
            {summary.rows.map((refund, index) => {
              const doc = refund.creditNoteNumber ? documents.find((candidate) => candidate.kind === "credit_note" && candidate.number === refund.creditNoteNumber) : undefined;
              return (
                <li key={`${refund.createdAt}-${index}`} className="flex flex-col gap-1.5 rounded-[14px] bg-(--mt-well) p-4 text-sm tabular-nums">
                  <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-semibold">
                    <span>{t("refunds.refundOn", { date: date(refund.createdAt) })}</span>
                    {refund.status === "pending" ? <span className="rounded-full bg-(--mt-warn)/15 px-2.5 py-0.5 font-mono text-[11px] tracking-[0.12em] text-(--mt-warn) uppercase">{t("refunds.processing")}</span> : null}
                  </p>
                  {refund.ticketsCents > 0 ? (
                    <p className="flex justify-between gap-4">
                      <span className="text-(--mt-mut)">{t("refunds.tickets")}</span>
                      <span>{money(refund.ticketsCents)}</span>
                    </p>
                  ) : null}
                  {refund.feeCents > 0 ? (
                    <p className="flex justify-between gap-4">
                      <span className="text-(--mt-mut)">{t("refunds.fee")}</span>
                      <span>{money(refund.feeCents)}</span>
                    </p>
                  ) : null}
                  {refund.feeKeptCents > 0 ? <p className="text-(--mt-mut)">{t("refunds.feeKept", { amount: money(refund.feeKeptCents) })}</p> : null}
                  {refund.creditNoteNumber ? (
                    <p className="text-(--mt-mut)">
                      {doc ? (
                        <a href={`#${documentAnchor({ id: doc.id })}`} className="rounded-sm text-(--tk-accent) underline hover:text-white">
                          {t("refunds.creditNote", { number: refund.creditNoteNumber })}
                        </a>
                      ) : (
                        t("refunds.creditNote", { number: refund.creditNoteNumber })
                      )}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {summary.refundedCents > 0 ? (
            <p className="text-[15px] font-semibold tabular-nums">{summary.netCents > 0 ? t("refunds.totalNet", { refunded: money(summary.refundedCents), net: money(summary.netCents) }) : t("refunds.total", { refunded: money(summary.refundedCents) })}</p>
          ) : null}
        </div>
      ) : null}

      {request ? (
        <div role="status" className={`flex flex-col gap-1.5 rounded-[14px] border p-4 ${tone}`}>
          {legacy ? (
            <>
              <p className="flex items-start gap-2 text-[15px] leading-normal font-semibold">
                <Dot className="mt-2 size-2" />
                {t(`refundStatus.${status}`, { date: date(request.createdAt) })}
              </p>
              <p className="text-sm text-(--mt-soft)">{t("refundRequestSummary", { count: request.ticketCount })}</p>
              {status === "declined" && request.reply ? <p className="text-sm text-(--mt-soft) [overflow-wrap:anywhere]">{t("refundReply", { reply: request.reply })}</p> : null}
            </>
          ) : legacyOpen ? (
            <>
              <p className="flex items-start gap-2 text-[15px] leading-normal font-semibold">
                <Dot className="mt-2 size-2" />
                {t("refundStatus.open", { date: date(request.createdAt) })}
              </p>
              <p className="text-sm text-(--mt-soft)">{t("refundRequestSummary", { count: request.ticketCount })}</p>
            </>
          ) : (
            <>
              <p className="text-sm text-(--mt-soft) [overflow-wrap:anywhere]">
                {request.message ? t("refunds.askedWithMessage", { date: date(request.createdAt), reason, message: request.message }) : t("refunds.asked", { date: date(request.createdAt), reason })}{" "}
                <span className="text-(--mt-mut)">({t("refundRequestSummary", { count: request.ticketCount })})</span>
              </p>
              <p className="flex items-start gap-2 text-[15px] leading-normal font-semibold">
                <Dot className="mt-2 size-2" />
                {status === "approved"
                  ? request.decidedAt && request.refundedCents
                    ? t("refunds.approvedAmount", { date: date(request.decidedAt), amount: money(request.refundedCents) })
                    : t("refunds.approved", { date: date(request.decidedAt ?? request.createdAt) })
                  : status === "declined"
                    ? t("refunds.declined", { date: date(request.decidedAt ?? request.createdAt) })
                    : status === "cancelled"
                      ? t("refundStatus.cancelled", { date: date(request.createdAt) })
                      : t("refunds.waiting")}
              </p>
              {status === "open" ? <p className="text-sm text-(--mt-soft)">{t("refunds.staysValid")}</p> : null}
              {(status === "approved" || status === "declined") && request.reply ? <p className="text-sm text-(--mt-soft) [overflow-wrap:anywhere]">{t("refundReply", { reply: request.reply })}</p> : null}
              {status === "declined" && canAsk ? <p className="text-sm text-(--mt-soft)">{t("refunds.askAgain")}</p> : null}
            </>
          )}
        </div>
      ) : null}
      {children}
    </>
  );
}

import { getFormatter, getTranslations } from "@/lib/tickets/i18n-server";
import { formatEventWhen, formatMoney, formatPlainDate } from "@/lib/tickets/format";
import type { HolderAnswersView, MyOrder, MyTicket } from "@/lib/tickets/schemas";
import { HolderEditor } from "./HolderEditor";
import { MT_BUTTON_OUTLINE, MT_CARD, MT_GRADIENT_TEXT, MT_KICKER, MT_KICKER_RULE, MT_PILL, MT_PILL_OFF, MT_PILL_OK, MT_PILL_WAIT } from "./my-ticket-classes";
import { RefundRequestForm } from "./RefundRequestForm";
import { SellerFooter } from "./SellerFooter";
import { TicketsShell } from "./TicketsShell";

const ORDER_STATUS_KEYS: Record<string, string> = { paid: "paid", partial: "partial", refunded: "refunded", disputed: "disputed" };
const HOLDER_STATUS_KEYS: Record<string, string> = { valid: "valid", checked_in: "checkedIn", refunded: "refunded", void: "void", passed_on: "passedOn" };

type Holder = MyOrder["holders"][number];

/** "3 × VIP Pass" for one line (first word in the brand gradient, like the ticket page); "2 × A · 1 × B" for several. */
function OrderTitle({ lines }: { lines: MyOrder["lines"] }) {
  const list = Array.isArray(lines) ? lines : [];
  const [first] = list;
  if (list.length === 1 && first) {
    const at = first.name.indexOf(" ");
    return (
      <>
        {first.quantity} ×{" "}
        {at < 0 ? (
          <span className={MT_GRADIENT_TEXT}>{first.name}</span>
        ) : (
          <>
            <span className={MT_GRADIENT_TEXT}>{first.name.slice(0, at)}</span>
            {first.name.slice(at)}
          </>
        )}
      </>
    );
  }
  return <>{list.map((line) => `${line.quantity} × ${line.name}`).join(" · ")}</>;
}

/**
 * "My order" for a buyer token, in the "My Ticket" design: the order header (number, status, what was bought, paid amount and
 * date), "Ticket holders" (named count, a pill per ticket, "(you)" with a link to the buyer's own ticket, the holder edit where
 * the organiser allows it, the checkout answers), the invoice and refund cards side by side, then the order summary (lines,
 * booking fee, VAT, total) — every figure ep-api's integer cents in the visitor's locale, no money arithmetic. Documents are
 * downloaded through our own `/tickets/order/{token}/documents/{id}` handler, never ep-api directly. Cards stack on a phone.
 */
/** "MFCC Malta" from the venue: its name, else ep-api's ready label. */
function venueName({ venue }: { venue: MyTicket["source"]["venue"] }): string | null {
  return venue?.name?.trim() || venue?.label?.trim() || null;
}

export async function OrderView({
  order,
  token,
  ticketHrefs = {},
  eventSource = null,
}: {
  order: MyOrder;
  token: string;
  ticketHrefs?: Readonly<Record<string, string>>;
  /** DeAI: the event of the order (read from the buyer's own ticket; ep-api's order answer has none), for the subtitle. */
  eventSource?: MyTicket["source"] | null;
}) {
  const [t, tTicket, tq, format] = await Promise.all([getTranslations("tickets.order"), getTranslations("tickets.ticket"), getTranslations("tickets.checkout.questions"), getFormatter()]);
  const money = (cents: number) => formatMoney({ format, cents, currency: order.currency });
  const orderStatus = ORDER_STATUS_KEYS[order.status] ?? "unknown";
  // `dateStyle` / `timeStyle` cannot be combined with `timeZoneName` (Intl throws, and next-intl then prints the raw
  // Date): the zone is named in the sentence instead, like My ticket.
  const changesClose = order.changesCloseAt
    ? format.dateTime(new Date(order.changesCloseAt), { dateStyle: "full", timeStyle: "short", ...(order.timeZone ? { timeZone: order.timeZone } : {}) })
    : null;
  const eventParts = eventSource
    ? [eventSource.name?.trim() || null, formatEventWhen({ format, source: eventSource }), venueName({ venue: eventSource.venue })].filter((part): part is string => Boolean(part))
    : [];
  const holders = Array.isArray(order.holders) ? order.holders : [];
  const named = holders.filter((holder) => Boolean(holder.name?.trim())).length;
  const refundable = holders.filter((holder) => holder.status === "valid" && holder.id).map((holder) => ({ id: holder.id as string, label: holder.name ?? t("holderUnnamed"), code: holder.ticketCode }));
  const request = order.refundRequest ?? null;
  const requestStatus = request && ["open", "approved", "declined", "cancelled"].includes(request.status) ? request.status : "open";
  const showRefund = Boolean(request) || (order.canRequestRefund === true && refundable.length > 0);
  const documents = Array.isArray(order.documents) ? order.documents : [];
  // A stored choice in the visitor's language; a value this page has no wording for is shown as it is.
  const choice = ({ group, value }: { group: "dietary"; value: string }) => (tq.has(`option.${group}.${value}`) ? tq(`option.${group}.${value}`) : value);
  /** The answers the buyer gave at checkout for one holder, as label / value rows (empty ones left out). */
  const answerRows = ({ answers }: { answers: HolderAnswersView | undefined }): Array<{ key: string; label: string; value: string }> =>
    [
      { key: "company", label: t("answers.company"), value: answers?.company },
      { key: "jobTitle", label: t("answers.jobTitle"), value: answers?.jobTitle },
      {
        key: "dietary",
        label: t("answers.dietary"),
        value: answers?.dietary ? (answers.dietaryOther ? `${choice({ group: "dietary", value: answers.dietary })}: ${answers.dietaryOther}` : choice({ group: "dietary", value: answers.dietary })) : undefined,
      },
      { key: "tshirt", label: t("answers.tshirt"), value: answers?.tshirt },
    ].filter((row): row is { key: string; label: string; value: string } => typeof row.value === "string" && row.value !== "");

  const pill = ({ holder }: { holder: Holder }): { text: string; tone: string } => {
    if (holder.status === "valid") return holder.name?.trim() ? { text: t("pill.sent"), tone: MT_PILL_OK } : { text: t("pill.waiting"), tone: MT_PILL_WAIT };
    const text = tTicket(`status.${HOLDER_STATUS_KEYS[holder.status] ?? "unknown"}`);
    return { text, tone: holder.status === "refunded" || holder.status === "void" ? MT_PILL_OFF : MT_PILL_OK };
  };

  return (
    <TicketsShell size="order">
      <article aria-labelledby="order-heading" className="flex flex-col gap-5">
        <header className="flex flex-col gap-2.5">
          <p className={MT_KICKER}>
            <span aria-hidden className={MT_KICKER_RULE} />
            {t("kicker", { number: order.orderNo, status: t(`status.${orderStatus}`) })}
          </p>
          <h1 id="order-heading" className="font-heading text-[clamp(30px,6vw,42px)] leading-[1.1] font-medium tracking-[-0.02em] [overflow-wrap:anywhere]">
            <span className="sr-only">{`${t("heading")}:`}</span>{" "}
            <OrderTitle lines={order.lines} />
          </h1>
          <p className="text-[15px] text-muted [overflow-wrap:anywhere]">
            {/* As in the prototype: "DeAI Summit 2026 · 25–26 Nov 2026 · MFCC Malta · paid €567 on 23 Oct 2026". */}
            {[
              ...eventParts,
              order.paidAt ? t(eventParts.length > 0 ? "paidAmountOnShort" : "paidAmountOn", { amount: money(order.totals.totalCents), date: formatPlainDate({ format, value: order.paidAt }) }) : t(`status.${orderStatus}`),
            ].join(" · ")}
          </p>
          {order.isTest === true ? (
            <p role="status" className="inline-block self-start rounded-full border border-warning-emphasis bg-surface px-3 py-1 text-sm font-medium text-text">
              {t("testBadge")}
            </p>
          ) : null}
        </header>

        <section aria-labelledby="order-holders-heading" className={`${MT_CARD} overflow-hidden`}>
          <div className="flex flex-wrap items-baseline gap-2 px-[clamp(16px,4vw,24px)] pt-4.5 pb-3">
            <h2 id="order-holders-heading" className="flex-1 text-[17px] font-semibold">
              {t("holdersHeading")}
            </h2>
            <span className="text-[13px] text-muted">{t("namedCount", { named, total: holders.length })}</span>
          </div>
          <ul>
            {holders.map((holder) => {
              const rows = answerRows({ answers: holder.answers });
              const status = pill({ holder });
              const hasName = Boolean(holder.name?.trim());
              const ticketHref = holder.ticketToken ? ticketHrefs[holder.ticketCode] : undefined;
              return (
                <li key={holder.ticketCode} className="flex flex-col gap-2.5 border-t border-(--color-border) px-[clamp(16px,4vw,24px)] py-3.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-0.5">
                      <p className={`text-[15px] [overflow-wrap:anywhere] ${hasName ? "text-text" : "text-warning-emphasis"}`}>
                        {hasName ? holder.name : t("notNamed")}
                        {hasName && holder.isBuyer ? <span className="text-muted"> {t("you")}</span> : null}
                      </p>
                      <p className="text-[13px] text-muted [overflow-wrap:anywhere]">
                        {hasName ? (holder.email ?? "") : t("notNamedHint")}
                        {hasName && holder.email ? " · " : ""}
                        <span className="font-mono">{holder.ticketCode}</span>
                      </p>
                    </div>
                    <span className={`${MT_PILL} ${status.tone}`}>{status.text}</span>
                    {ticketHref ? (
                      <a href={ticketHref} className={`${MT_BUTTON_OUTLINE} min-h-10 px-3.5 text-[13px]`}>
                        {t("openTicket")}
                      </a>
                    ) : null}
                  </div>
                  {rows.length > 0 ? (
                    <dl className="flex flex-col gap-1 text-[13px]">
                      {rows.map((row) => (
                        <div key={row.key} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                          <dt className="shrink-0 text-muted sm:w-36">{row.label}</dt>
                          <dd className="[overflow-wrap:anywhere]">{row.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  {holder.canEdit && holder.id && holder.status === "valid" ? (
                    <HolderEditor
                      token={token}
                      ticketId={holder.id}
                      holderName={holder.name}
                      holderEmail={holder.email}
                      canEditName={holder.canEditName === true}
                      canEditEmail={holder.canEditEmail === true}
                      label={holder.name ?? holder.ticketCode}
                      assign={!hasName}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
          {changesClose && holders.some((holder) => holder.canEdit) ? (
            <p className="border-t border-(--color-border) px-[clamp(16px,4vw,24px)] py-3 text-[13px] text-muted">{t("changesCloseAt", { date: changesClose, zone: order.timeZone ?? "UTC" })}</p>
          ) : null}
        </section>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
          <section aria-labelledby="order-documents-heading" className={`${MT_CARD} flex flex-col gap-3 px-[clamp(16px,4vw,24px)] py-4.5`}>
            <h2 id="order-documents-heading" className="text-[17px] font-semibold">
              {t("invoiceHeading")}
            </h2>
            {documents.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {documents.map((doc) => {
                  const label = t(doc.kind === "invoice" ? "invoice" : doc.kind === "credit_note" ? "creditNote" : "documentOther", { number: doc.number });
                  return (
                    <li key={doc.id} className="flex items-center gap-3">
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="font-mono text-sm [overflow-wrap:anywhere]">{doc.number}</span>
                        <span className="text-[13px] text-muted">
                          {doc.kind === "credit_note" ? `${t("creditNoteShort")} · ` : ""}
                          {doc.issueDate ? `${formatPlainDate({ format, value: doc.issueDate })} · ` : ""}
                          {money(doc.grossCents)}
                        </span>
                      </div>
                      {/* `download` is a hint only; the handler answers `Content-Disposition: attachment`. */}
                      <a href={`/tickets/order/${encodeURIComponent(token)}/documents/${encodeURIComponent(doc.id)}`} download aria-label={t("downloadFor", { label })} className="text-sm text-primary-text hover:underline">
                        {t("download")}
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-[13.5px] text-muted">{t("noDocuments")}</p>
            )}
            {documents.some((doc) => doc.kind === "invoice") && order.seller.replyTo ? (
              <p className="text-[13px] leading-normal text-muted [text-wrap:pretty]">
                {t("invoiceWrong")}{" "}
                <a href={`mailto:${order.seller.replyTo}`} className="text-primary-text underline">
                  {t("invoiceAskUs")}
                </a>{" "}
                {t("invoiceAskUsAfter")}
              </p>
            ) : null}
          </section>

          {showRefund ? (
            <section aria-labelledby="order-refund-heading" className={`${MT_CARD} flex flex-col gap-3 px-[clamp(16px,4vw,24px)] py-4.5`}>
              <h2 id="order-refund-heading" className="text-[17px] font-semibold">
                {t("refundHeading")}
              </h2>
              {request ? (
                <div role="status" className="flex flex-col gap-1">
                  <p className={`text-[13.5px] leading-normal ${requestStatus === "approved" ? "text-success" : "text-text"}`}>{t(`refundStatus.${requestStatus}`, { date: formatPlainDate({ format, value: request.createdAt }) })}</p>
                  <p className="text-[13px] text-muted">{t("refundRequestSummary", { count: request.ticketCount })}</p>
                  {requestStatus === "declined" && request.reply ? <p className="text-[13px] [overflow-wrap:anywhere]">{t("refundReply", { reply: request.reply })}</p> : null}
                </div>
              ) : null}
              {order.canRequestRefund === true && refundable.length > 0 ? <RefundRequestForm token={token} tickets={refundable} /> : null}
            </section>
          ) : null}
        </div>

        <section aria-labelledby="order-lines-heading" className={`${MT_CARD} flex flex-col gap-3 px-[clamp(16px,4vw,24px)] py-4.5`}>
          <h2 id="order-lines-heading" className="text-[17px] font-semibold">
            {t("summaryHeading")}
          </h2>
          <ul className="flex flex-col gap-2.5">
            {(Array.isArray(order.lines) ? order.lines : []).map((line, index) => (
              <li key={`${line.name}-${index}`} className="flex flex-col gap-0.5 text-sm">
                <p className="flex justify-between gap-4">
                  <span className="font-medium [overflow-wrap:anywhere]">{line.name}</span>
                  <span className="font-medium">{money(line.grossCents)}</span>
                </p>
                <p className="text-[13px] text-muted">
                  {t("quantityPrice", { quantity: line.quantity, price: money(line.unitCents) })} · {t("vatIncluded", { rate: format.number(line.vatRate / 100, { style: "percent", maximumFractionDigits: 2 }) })}
                  {line.discountCents > 0 ? ` · ${t("discountEach", { amount: money(line.discountCents) })}` : ""}
                  {line.feeCents > 0 ? ` · ${t("feeEach", { amount: money(line.feeCents) })}` : ""}
                </p>
              </li>
            ))}
          </ul>
          <dl className="flex flex-col gap-1.5 border-t border-(--color-border) pt-3 text-sm">
            {order.totals.feeCents > 0 ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">{t("bookingFee")}</dt>
                <dd>{money(order.totals.feeCents)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{t("vat")}</dt>
              <dd>{money(order.totals.vatCents)}</dd>
            </div>
            <div className="flex justify-between gap-4 text-base font-semibold">
              <dt>{t("total")}</dt>
              <dd>{money(order.totals.totalCents)}</dd>
            </div>
          </dl>
        </section>

        <SellerFooter seller={order.seller} />
      </article>
    </TicketsShell>
  );
}

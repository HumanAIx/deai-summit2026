import { Fragment } from "react";
import { getFormatter, getTranslations } from "@/lib/tickets/i18n-server";
import { formatEventWhen, formatMoney, formatPlainDate } from "@/lib/tickets/format";
import type { HolderAnswersView, MyOrder, MyTicket } from "@/lib/tickets/schemas";
import { HolderEditor } from "./HolderEditor";
import { OrderRefunds, documentAnchor } from "./OrderRefunds";
import { RefundRequestPanel, RefundRequestProvider, RefundRequestTrigger } from "./RefundRequestForm";
import { SellerFooter } from "./SellerFooter";
import { TicketsShell } from "./TicketsShell";
import { ArrowRightIcon, CalendarIcon, CheckIcon, DownloadIcon, Dot, PinIcon } from "./ticket-page-icons";
import { TP_BUTTON_OUTLINE, TP_BUTTON_WHITE, TP_CARD, TP_CARD_PAD, TP_FOCUS, TP_GRADIENT_TEXT, TP_H2, TP_KICKER, TP_KICKER_RULE, TP_PILL, TP_PILL_OFF, TP_PILL_OK, TP_PILL_WAIT, TP_TEST_PILL } from "./ticket-page-classes";

const ORDER_STATUS_KEYS: Record<string, string> = { paid: "paid", partial: "partial", refunded: "refunded", disputed: "disputed" };
const HOLDER_STATUS_KEYS: Record<string, string> = { valid: "valid", checked_in: "checkedIn", refunded: "refunded", void: "void", passed_on: "passedOn" };

type Holder = MyOrder["holders"][number];

/** "VIP Pass" → the first word in the brand gradient, the rest plain (design). One word: all gradient. */
function TypeName({ name }: { name: string }) {
  const at = name.indexOf(" ");
  if (at < 0) return <span className={TP_GRADIENT_TEXT}>{name}</span>;
  return (
    <>
      <span className={TP_GRADIENT_TEXT}>{name.slice(0, at)}</span>
      {name.slice(at)}
    </>
  );
}

/** "1 × Premium Pass + 1 × VIP Pass": the quantity in grey, the type's first word in the gradient, a grey "+" between lines. */
function OrderTitle({ lines }: { lines: MyOrder["lines"] }) {
  const list = Array.isArray(lines) ? lines : [];
  return (
    <>
      {list.map((line, index) => (
        <Fragment key={`${line.name}-${index}`}>
          {index > 0 ? (
            <>
              {" "}
              <span className="font-normal text-[#3A4560]">+</span>{" "}
            </>
          ) : null}
          <span className="whitespace-nowrap max-[480px]:whitespace-normal">
            <span className="font-medium text-(--mt-mut)">{line.quantity} ×</span> <TypeName name={line.name} />
          </span>
        </Fragment>
      ))}
    </>
  );
}

/** "Ada Lovelace" → "AL"; an empty name → "?". */
function initialsOf(name: string | null | undefined): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const letters = words.map((word) => Array.from(word)[0] ?? "").filter(Boolean);
  return (letters.length > 1 ? `${letters[0]}${letters[letters.length - 1]}` : (letters[0] ?? "?")).toUpperCase();
}

/** "MFCC Malta" from the venue: its name, else ep-api's ready label. */
function venueName({ venue }: { venue: MyTicket["source"]["venue"] }): string | null {
  return venue?.name?.trim() || venue?.label?.trim() || null;
}

/**
 * "Manage order" for a buyer token, in the "DeAI Manage Order" design: an optional "payment received" note (fresh from the
 * checkout), the header (order number, test badge, what was bought, dates and venue, status, total and paid date), the
 * refund request as a full-width panel when it is opened, then the ticket holders (avatar, "(you)" with a link to the
 * buyer's own ticket, the holder edit where the organiser allows it, the checkout answers) and the order summary (lines,
 * booking fee, VAT, total) beside the invoice and refunds cards — every figure ep-api's integer cents in the visitor's
 * locale, no money arithmetic. Documents are downloaded through our own `/tickets/order/{token}/documents/{id}` handler,
 * never ep-api directly. Everything stacks on a phone.
 */
export async function OrderView({
  order,
  token,
  ticketHrefs = {},
  eventSource = null,
  justPaid = false,
}: {
  order: MyOrder;
  token: string;
  ticketHrefs?: Readonly<Record<string, string>>;
  /** DeAI: the event of the order (read from the buyer's own ticket; ep-api's order answer has none), for the date and venue. */
  eventSource?: MyTicket["source"] | null;
  /** The visitor just came back from the checkout (`?paid=1`, opened by the payment loader): the "payment received, bookmark this page" note. */
  justPaid?: boolean;
}) {
  const [t, tTicket, tq, format] = await Promise.all([getTranslations("tickets.order"), getTranslations("tickets.ticket"), getTranslations("tickets.checkout.questions"), getFormatter()]);
  const money = (cents: number) => formatMoney({ format, cents, currency: order.currency });
  const orderStatus = ORDER_STATUS_KEYS[order.status] ?? "unknown";
  // `dateStyle` / `timeStyle` cannot be combined with `timeZoneName` (Intl throws, and next-intl then prints the raw
  // Date): the zone is named in the sentence instead, like My ticket.
  const changesClose = order.changesCloseAt
    ? format.dateTime(new Date(order.changesCloseAt), { dateStyle: "full", timeStyle: "short", ...(order.timeZone ? { timeZone: order.timeZone } : {}) })
    : null;
  const eventWhen = eventSource ? formatEventWhen({ format, source: eventSource }) : null;
  const eventVenue = eventSource ? venueName({ venue: eventSource.venue }) : null;
  const lines = Array.isArray(order.lines) ? order.lines : [];
  // One ticket type in the order: every holder has it, so each row can show it as a tag (ep-api sends no type per holder).
  const onlyType = lines.length === 1 ? (lines[0]?.name ?? null) : null;
  const holders = Array.isArray(order.holders) ? order.holders : [];
  const named = holders.filter((holder) => Boolean(holder.name?.trim())).length;
  const refundable = holders
    .filter((holder) => holder.status === "valid" && holder.id)
    .map((holder) => ({ id: holder.id as string, label: `${holder.name ?? t("holderUnnamed")}${holder.isBuyer && holder.name ? ` ${t("you")}` : ""}`, code: holder.ticketCode, detail: onlyType ?? undefined }));
  const request = order.refundRequest ?? null;
  const requestStatus = request && ["open", "approved", "declined", "cancelled"].includes(request.status) ? request.status : "open";
  const canAsk = order.canRequestRefund === true && refundable.length > 0;
  const showRefund = Boolean(request) || canAsk || (Array.isArray(order.refunds) && order.refunds.length > 0);
  const refundedCents = order.totals.refundedCents ?? 0;
  const netCents = Math.max(order.totals.totalCents - refundedCents, 0);
  const documents = Array.isArray(order.documents) ? order.documents : [];
  const statusTone = orderStatus === "paid" ? "border-(--tk-accent)/35 bg-(--tk-accent)/10 text-(--tk-accent)" : orderStatus === "partial" ? "border-(--mt-warn)/35 bg-(--mt-warn)/8 text-(--mt-warn)" : "border-(--mt-err)/35 bg-(--mt-err)/8 text-(--mt-err)";
  const requestTone =
    requestStatus === "approved"
      ? "border-(--mt-ok)/35 bg-(--mt-ok)/7 text-(--mt-ok)"
      : requestStatus === "declined"
        ? "border-(--mt-err)/35 bg-(--mt-err)/7 text-(--mt-err)"
        : requestStatus === "cancelled"
          ? "border-(--mt-line) bg-white/4 text-(--mt-soft)"
          : "border-(--mt-warn)/35 bg-(--mt-warn)/7 text-(--mt-warn)";
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
    if (holder.status === "valid") return holder.name?.trim() ? { text: t("pill.sent"), tone: TP_PILL_OK } : { text: t("pill.waiting"), tone: TP_PILL_WAIT };
    const text = tTicket(`status.${HOLDER_STATUS_KEYS[holder.status] ?? "unknown"}`);
    return { text, tone: holder.status === "refunded" || holder.status === "void" ? TP_PILL_OFF : TP_PILL_OK };
  };

  const content = (
    <article aria-labelledby="order-heading" className="flex flex-col gap-[clamp(28px,5vw,52px)]">
      {justPaid && order.status === "paid" ? (
        <p role="status" className="flex items-center gap-3.5 rounded-2xl border border-(--tk-accent)/35 bg-(--tk-accent)/7 px-5 py-3.5 text-[15px] leading-[1.45] text-(--mt-soft)">
          <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full [background:var(--tk-grad)]">
            <CheckIcon stroke="#fff" />
          </span>
          {t("welcome")}
        </p>
      ) : null}

      <header className="flex flex-wrap items-end justify-between gap-7">
        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-4.5">
          <div className="flex flex-wrap items-center gap-3.5">
            <p className={TP_KICKER}>
              <span aria-hidden className={TP_KICKER_RULE} />
              {t("orderNumber", { number: `#${order.orderNo}` })}
            </p>
            {order.isTest === true ? (
              <span role="status" className={`${TP_TEST_PILL} min-h-[26px] px-3 text-xs`}>
                {t("testBadge")}
              </span>
            ) : null}
          </div>
          <h1 id="order-heading" className="text-[clamp(34px,5.2vw,68px)] leading-[1.02] font-bold tracking-[-0.045em] [overflow-wrap:anywhere]">
            <span className="sr-only">{`${t("heading")}:`}</span>{" "}
            <OrderTitle lines={lines} />
          </h1>
          {eventWhen || eventVenue ? (
            <ul aria-label={t("eventFacts")} className="flex flex-wrap gap-2">
              {eventWhen ? (
                <li className="flex min-h-[34px] items-center gap-2 rounded-full border border-(--mt-line) bg-white/6 px-3.5 text-sm text-(--mt-soft)">
                  <CalendarIcon stroke="var(--tk-accent)" className="size-3.5 shrink-0" />
                  {eventWhen}
                </li>
              ) : null}
              {eventVenue ? (
                <li className="flex min-h-[34px] items-center gap-2 rounded-full border border-(--mt-line) bg-white/6 px-3.5 text-sm text-(--mt-soft)">
                  <PinIcon className="shrink-0" />
                  {eventVenue}
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
        <div className="ml-auto flex flex-col items-end gap-2.5 text-right">
          <div className="flex flex-wrap justify-end gap-2">
            <span className={`inline-flex min-h-8 items-center gap-2 rounded-full border px-3.5 font-mono text-xs font-semibold tracking-[0.18em] uppercase ${statusTone}`}>
              <Dot />
              {t(`status.${orderStatus}`)}
            </span>
            {request && requestStatus === "open" ? (
              <span className={`inline-flex min-h-8 items-center gap-2 rounded-full border px-3.5 font-mono text-xs font-semibold tracking-[0.18em] uppercase ${requestTone}`}>
                <Dot />
                {t("refundRequestedPill")}
              </span>
            ) : null}
          </div>
          {refundedCents > 0 ? (
            <>
              <p className="text-[clamp(22px,3vw,28px)] leading-tight font-semibold tracking-[-0.03em] tabular-nums">{t("refundedOf", { refunded: money(refundedCents), total: money(order.totals.totalCents) })}</p>
              {netCents > 0 ? <p className="text-sm text-(--mt-mut) tabular-nums">{t("netPaid", { amount: money(netCents) })}</p> : null}
            </>
          ) : (
            <p className="text-[clamp(32px,4vw,40px)] leading-none font-semibold tracking-[-0.04em] tabular-nums">{money(order.totals.totalCents)}</p>
          )}
          {order.paidAt ? <p className="text-sm text-(--mt-mut)">{t("paidOn", { date: formatPlainDate({ format, value: order.paidAt }) })}</p> : null}
        </div>
      </header>

      {canAsk ? <RefundRequestPanel token={token} tickets={refundable} /> : null}

      <div className="flex flex-wrap items-start gap-5">
        <div className="flex min-w-0 flex-[5_1_520px] flex-col gap-5">
          <section aria-labelledby="order-holders-heading" className={`${TP_CARD} overflow-hidden`}>
            <div className="flex flex-wrap items-center justify-between gap-3 px-[clamp(18px,4vw,28px)] py-5.5">
              <h2 id="order-holders-heading" className={TP_H2}>
                {t("holdersHeading")}
              </h2>
              <span className="font-mono text-xs tracking-[0.12em] text-(--mt-mut) uppercase">{t("namedCount", { named, total: holders.length })}</span>
            </div>
            <ul>
              {holders.map((holder) => {
                const rows = answerRows({ answers: holder.answers });
                const meta = rows.filter((row) => row.key === "jobTitle" || row.key === "company");
                const metaLine = [holder.answers?.jobTitle, holder.answers?.company].filter((part): part is string => typeof part === "string" && part !== "").join(" · ");
                const extra = rows.filter((row) => row.key !== "jobTitle" && row.key !== "company");
                const status = pill({ holder });
                const hasName = Boolean(holder.name?.trim());
                const you = hasName && holder.isBuyer === true;
                const ticketHref = holder.ticketToken ? ticketHrefs[holder.ticketCode] : undefined;
                return (
                  <li key={holder.ticketCode} className="relative flex flex-col gap-3 border-t border-(--mt-hair) px-[clamp(18px,4vw,28px)] py-5.5">
                    <span aria-hidden className={`absolute top-5.5 bottom-5.5 left-0 w-[3px] rounded-r-[3px] ${you ? "[background:linear-gradient(180deg,#1E6BF0,#08B5C6)]" : "bg-white/12"}`} />
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                      <span aria-hidden className={`grid size-12 shrink-0 place-items-center rounded-full text-base font-bold text-white ${you ? "[background:linear-gradient(135deg,#1E6BF0,#08B5C6)]" : "bg-white/8"}`}>
                        {hasName ? initialsOf(holder.name) : "?"}
                      </span>
                      <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-[5px]">
                        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                          <span className={`text-[17px] font-semibold [overflow-wrap:anywhere] ${hasName ? "" : "text-(--mt-warn)"}`}>{hasName ? holder.name : t("notNamed")}</span>
                          {you ? <span className="text-[15px] text-(--mt-mut)">{t("you")}</span> : null}
                          {onlyType ? <span className="inline-flex min-h-[22px] items-center rounded-full bg-(--tk-accent)/14 px-2.5 font-mono text-[10px] font-semibold tracking-[0.14em] text-(--tk-accent) uppercase">{onlyType}</span> : null}
                        </p>
                        <p className="flex flex-wrap gap-x-2 text-sm text-(--mt-mut)">
                          {hasName ? (holder.email ? <span className="[overflow-wrap:anywhere]">{holder.email}</span> : null) : <span>{t("notNamedHint")}</span>}
                          {(hasName && holder.email) || !hasName ? <span aria-hidden>·</span> : null}
                          <span className="font-mono text-(--mt-body)">{holder.ticketCode}</span>
                        </p>
                        {meta.length > 0 ? <p className="text-sm text-(--mt-soft) [overflow-wrap:anywhere]">{metaLine}</p> : null}
                      </div>
                      <div className="ml-auto flex flex-wrap items-center justify-end gap-3 max-[560px]:ml-0 max-[560px]:w-full max-[560px]:justify-between">
                        <span className={`${TP_PILL} ${status.tone}`}>{status.text}</span>
                        {ticketHref ? (
                          <a href={ticketHref} className={`${TP_BUTTON_WHITE} min-h-11 px-5.5 text-sm`}>
                            {t("openTicket")}
                            <ArrowRightIcon />
                          </a>
                        ) : null}
                      </div>
                    </div>
                    {extra.length > 0 ? (
                      <dl className="flex flex-col gap-1 text-[13px] sm:ml-[72px]">
                        {extra.map((row) => (
                          <div key={row.key} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                            <dt className="shrink-0 text-(--mt-mut) sm:w-32">{row.label}</dt>
                            <dd className="text-(--mt-soft) [overflow-wrap:anywhere]">{row.value}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                    {holder.canEdit && holder.id && holder.status === "valid" ? (
                      <div className="sm:ml-[72px]">
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
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {changesClose && holders.some((holder) => holder.canEdit) ? (
              <p className="border-t border-(--mt-hair) px-[clamp(18px,4vw,28px)] py-4 text-[13px] text-(--mt-mut)">{t("changesCloseAt", { date: changesClose, zone: order.timeZone ?? "UTC" })}</p>
            ) : null}
          </section>

          <section aria-labelledby="order-lines-heading" className={`${TP_CARD} ${TP_CARD_PAD} flex flex-col gap-4.5`}>
            <h2 id="order-lines-heading" className={TP_H2}>
              {t("summaryHeading")}
            </h2>
            <ul className="flex flex-col gap-4">
              {lines.map((line, index) => (
                <li key={`${line.name}-${index}`} className="flex flex-col gap-1.5">
                  <p className="flex justify-between gap-4 text-base font-medium">
                    <span className="[overflow-wrap:anywhere]">{line.name}</span>
                    <span className="tabular-nums">{money(line.grossCents)}</span>
                  </p>
                  <p className="text-sm leading-normal text-(--mt-mut)">
                    {t("quantityPrice", { quantity: line.quantity, price: money(line.unitCents) })} · {t("vatIncluded", { rate: format.number(line.vatRate / 100, { style: "percent", maximumFractionDigits: 2 }) })}
                    {line.discountCents > 0 ? ` · ${t("discountEach", { amount: money(line.discountCents) })}` : ""}
                    {line.feeCents > 0 ? ` · ${t("feeEach", { amount: money(line.feeCents) })}` : ""}
                  </p>
                </li>
              ))}
            </ul>
            <dl className="flex flex-col gap-2.5 border-t border-(--mt-hair) pt-4.5 text-[15px] tabular-nums">
              {order.totals.feeCents > 0 ? (
                <div className="flex justify-between gap-4 text-(--mt-soft)">
                  <dt>{t("bookingFee")}</dt>
                  <dd>{money(order.totals.feeCents)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4 text-(--mt-mut)">
                <dt>{t("vat")}</dt>
                <dd>{money(order.totals.vatCents)}</dd>
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-(--mt-hair) pt-4">
                <dt className="text-[17px] font-semibold">{t("total")}</dt>
                <dd className="text-[28px] font-semibold tracking-[-0.03em]">{money(order.totals.totalCents)}</dd>
              </div>
            </dl>
          </section>
        </div>

        <aside aria-label={t("asideLabel")} className="flex min-w-0 flex-[3_1_300px] flex-col gap-5">
          <section aria-labelledby="order-documents-heading" className={`${TP_CARD} ${TP_CARD_PAD} flex flex-col gap-4.5`}>
            <h2 id="order-documents-heading" className={TP_H2}>
              {t("invoiceHeading")}
            </h2>
            {documents.length > 0 ? (
              <ul className="flex flex-col gap-4">
                {documents.map((doc) => {
                  const label = t(doc.kind === "invoice" ? "invoice" : doc.kind === "credit_note" ? "creditNote" : "documentOther", { number: doc.number });
                  return (
                    <li key={doc.id} id={documentAnchor({ id: doc.id })} className="flex flex-col gap-3 scroll-mt-6">
                      <div className="flex items-center gap-4 rounded-[14px] bg-(--mt-well) p-4">
                        <span aria-hidden className="flex h-12 w-[42px] shrink-0 items-end justify-center rounded-lg border border-(--tk-accent)/40 bg-(--tk-accent)/8 pb-[7px] font-mono text-[10px] font-semibold tracking-[0.08em] text-(--tk-accent)">
                          PDF
                        </span>
                        <div className="flex min-w-0 flex-col gap-1">
                          <span className="font-mono text-[15px] font-medium [overflow-wrap:anywhere]">{doc.number}</span>
                          <span className="text-[13px] text-(--mt-mut)">
                            {doc.kind === "credit_note" ? `${t("creditNoteShort")} · ` : ""}
                            {doc.issueDate ? `${formatPlainDate({ format, value: doc.issueDate })} · ` : ""}
                            <span className="whitespace-nowrap">{money(doc.grossCents)}</span>
                          </span>
                        </div>
                      </div>
                      {/* `download` is a hint only; the handler answers `Content-Disposition: attachment`. */}
                      <a href={`/tickets/order/${encodeURIComponent(token)}/documents/${encodeURIComponent(doc.id)}`} download aria-label={t("downloadFor", { label })} className={`${TP_BUTTON_OUTLINE} min-h-[46px] w-full`}>
                        <DownloadIcon />
                        {t("download")}
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-[15px] leading-[1.55] text-(--mt-mut)">
                {t("noDocuments")} {t("noDocumentsHint")}
              </p>
            )}
            {documents.some((doc) => doc.kind === "invoice") && order.seller.replyTo ? (
              <p className="text-[13px] leading-normal text-(--mt-mut) [text-wrap:pretty]">
                {t("invoiceWrong")}{" "}
                <a href={`mailto:${order.seller.replyTo}`} className={`rounded-sm text-(--tk-accent) underline hover:text-white ${TP_FOCUS}`}>
                  {t("invoiceAskUs")}
                </a>{" "}
                {t("invoiceAskUsAfter")}
              </p>
            ) : null}
          </section>

          {showRefund ? (
            <section aria-labelledby="order-refund-heading" className={`${TP_CARD} ${TP_CARD_PAD} flex flex-col gap-4`}>
              <h2 id="order-refund-heading" className={TP_H2}>
                {t("refundHeading")}
              </h2>
              <OrderRefunds order={order} canAsk={canAsk}>
                {canAsk ? <RefundRequestTrigger /> : null}
              </OrderRefunds>
            </section>
          ) : null}
        </aside>
      </div>

      <SellerFooter seller={order.seller} />
    </article>
  );

  return <TicketsShell size="page">{canAsk ? <RefundRequestProvider>{content}</RefundRequestProvider> : content}</TicketsShell>;
}

import { getFormatter, getTranslations } from "@/lib/tickets/i18n-server";
import Link from "next/link";
import { formatMoney, formatPlainDate } from "@/lib/tickets/format";
import type { MyOverview } from "@/lib/tickets/schemas";
import { MT_BUTTON_OUTLINE, MT_CARD, MT_KICKER, MT_KICKER_RULE, MT_LABEL } from "./my-ticket-classes";
import { TicketsShell } from "./TicketsShell";

const ORDER_STATUS_KEYS: Record<string, string> = { paid: "paid", partial: "partial", refunded: "refunded", disputed: "disputed" };

type Formatter = Awaited<ReturnType<typeof getFormatter>>;

/** "25 November 2026" or "25–26 November 2026" from the source days; null when there are none. */
function sourceDates({ format, source }: { format: Formatter; source: MyOverview["tickets"][number]["source"] }): string | null {
  if (!source.startDate) return null;
  if (source.endDate && source.endDate > source.startDate) {
    try {
      return format.dateTimeRange(new Date(`${source.startDate}T00:00:00Z`), new Date(`${source.endDate}T00:00:00Z`), { dateStyle: "long", timeZone: "UTC" });
    } catch {
      return formatPlainDate({ format, value: source.startDate });
    }
  }
  return formatPlainDate({ format, value: source.startDate });
}

/**
 * "My tickets" (list link): the tickets the address holds, then the orders it bought, each a card that opens its own page.
 * Nothing here is a secret beyond what the two single links already show; the page itself is private (no analytics, no
 * referrer: `isPrivateTicketPath`). The email and the link's expiry are named so the visitor knows whose list this is.
 */
export async function MyTicketsView({
  overview,
  ticketHrefs,
  orderHrefs,
  lostLinkHref,
}: {
  overview: MyOverview;
  ticketHrefs: Readonly<Record<string, string>>;
  orderHrefs: Readonly<Record<string, string>>;
  lostLinkHref: string;
}) {
  const [t, tOrder, format] = await Promise.all([getTranslations("tickets.me"), getTranslations("tickets.order"), getFormatter()]);
  const expires = format.dateTime(new Date(overview.expiresAt), { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" });
  const empty = overview.tickets.length === 0 && overview.orders.length === 0;

  return (
    <TicketsShell size="ticket">
      <article aria-labelledby="me-heading" className="flex flex-col gap-5">
        <header className="flex flex-col gap-2.5">
          <p className={MT_KICKER}>
            <span aria-hidden className={MT_KICKER_RULE} />
            {t("kicker")}
          </p>
          <h1 id="me-heading" className="font-heading text-[clamp(28px,5vw,36px)] leading-tight font-medium tracking-[-0.01em]">
            {t("heading")}
          </h1>
          <p className="text-[15px] text-muted [overflow-wrap:anywhere]">{t("intro", { email: overview.email, date: expires })}</p>
        </header>

        {empty ? (
          <section className={`${MT_CARD} flex flex-col items-start gap-3 p-[clamp(18px,4vw,24px)]`}>
            <p className="text-[15px]">{t("empty")}</p>
            <Link href={lostLinkHref} className={MT_BUTTON_OUTLINE}>
              {t("findAgain")}
            </Link>
          </section>
        ) : null}

        {overview.tickets.length > 0 ? (
          <section aria-labelledby="me-tickets-heading" className="flex flex-col gap-3">
            <h2 id="me-tickets-heading" className={MT_LABEL}>
              {t("ticketsHeading", { count: overview.tickets.length })}
            </h2>
            <ul className="flex flex-col gap-3">
              {overview.tickets.map((item) => {
                const dates = sourceDates({ format, source: item.source });
                return (
                  <li key={item.token} className={`${MT_CARD} flex flex-wrap items-center gap-3 p-[clamp(16px,4vw,20px)]`}>
                    <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-0.5">
                      <p className="text-[17px] font-semibold [overflow-wrap:anywhere]">{item.typeName || t("ticket")}</p>
                      {item.holderName ? <p className="text-sm [overflow-wrap:anywhere]">{item.holderName}</p> : null}
                      <p className="text-[13px] text-muted [overflow-wrap:anywhere]">
                        {[item.source.name, dates].filter(Boolean).join(" · ")}
                        {item.source.name || dates ? " · " : ""}
                        <span className="font-mono">{item.code}</span>
                      </p>
                    </div>
                    <a href={ticketHrefs[item.token]} className={MT_BUTTON_OUTLINE} aria-label={t("openTicketFor", { code: item.code })}>
                      {t("openTicket")}
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {overview.orders.length > 0 ? (
          <section aria-labelledby="me-orders-heading" className="flex flex-col gap-3">
            <h2 id="me-orders-heading" className={MT_LABEL}>
              {t("ordersHeading", { count: overview.orders.length })}
            </h2>
            <ul className="flex flex-col gap-3">
              {overview.orders.map((item) => {
                const status = ORDER_STATUS_KEYS[item.status] ?? "unknown";
                return (
                  <li key={item.token} className={`${MT_CARD} flex flex-wrap items-center gap-3 p-[clamp(16px,4vw,20px)]`}>
                    <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-0.5">
                      <p className="font-mono text-xs tracking-[0.14em] text-primary-text uppercase">{tOrder("kicker", { number: item.orderNo, status: tOrder(`status.${status}`) })}</p>
                      <p className="text-[17px] font-semibold [overflow-wrap:anywhere]">{item.lines.map((line) => `${line.quantity} × ${line.name}`).join(" · ") || item.source.name}</p>
                      <p className="text-[13px] text-muted">
                        {item.source.name ? `${item.source.name} · ` : ""}
                        {item.paidAt
                          ? tOrder("paidAmountOn", { amount: formatMoney({ format, cents: item.totalCents, currency: item.currency }), date: formatPlainDate({ format, value: item.paidAt }) })
                          : tOrder(`status.${status}`)}
                      </p>
                    </div>
                    <a href={orderHrefs[item.token]} className={MT_BUTTON_OUTLINE} aria-label={t("openOrderFor", { number: item.orderNo })}>
                      {t("openOrder")}
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <p className="text-[13px] leading-normal text-muted">{t("note")}</p>
      </article>
    </TicketsShell>
  );
}

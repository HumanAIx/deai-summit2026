import { useFormatter, useTranslations } from "@/lib/tickets/i18n";
import { isBuyable, maxQuantity, type Cart } from "@/lib/tickets/checkout-cart";
import { formatMoney } from "@/lib/tickets/format";
import { TK_STEPPER } from "../tickets-classes";
import { STATUS_KEYS, type CheckoutConfig, type PublicType, type UnlistedType } from "./types";
import { Icon } from "./ui";
import { WaitlistJoin } from "./WaitlistJoin";

/** "Only 4 left" shows from this many down (the design: low stock is worth saying, plenty is not). */
const LOW_STOCK = 20;

/**
 * The ticket rows of "01 · Tickets" (design: a bordered row per ticket, accent ring and tint once it is in the cart,
 * a round − / + on the right). Grouped by source (event / schedule) when more than one is listed. Prices are ep-api's
 * integer cents through the locale formatter. A row ep-api rejected (sold out, price changed…) shows its message in
 * place (`flagged`), tied to the row with `aria-describedby`. Every ticket on offer is listed, also the ones that can't
 * be bought now, each saying why (sold out, paused, not on sale yet, sales ended); an on-sale ticket says when sales
 * end. `unlisted` (picked in the CMS, not listed by ep-api: hidden or removed) come last as "Unavailable".
 */
export function TicketCards({
  types,
  config,
  cart,
  flagged,
  onQuantity,
  nested = false,
  unlisted = [],
}: {
  types: readonly PublicType[];
  config: CheckoutConfig;
  cart: Cart;
  flagged: Readonly<Record<string, string>>;
  onQuantity: (args: { type: PublicType; quantity: number }) => void;
  /** Inside a checkout step (which has its own headings): source titles are `h4`, ticket names `h5`. */
  nested?: boolean;
  unlisted?: readonly UnlistedType[];
}) {
  const t = useTranslations("tickets.list");
  const tc = useTranslations("tickets");
  const format = useFormatter();
  const SourceHeading = nested ? "h4" : "h2";
  const TypeHeading = nested ? "h5" : "h3";

  const groups = new Map<string, { name: string; types: PublicType[] }>();
  for (const type of types) {
    const key = `${type.source.kind}:${type.source.id}`;
    const group = groups.get(key) ?? { name: type.source.name, types: [] };
    group.types.push(type);
    groups.set(key, group);
  }
  // One source (the usual case): its name is already in the step's meta line, so no heading repeats it.
  const showSource = groups.size > 1 || !nested;

  return (
    <div className="flex flex-col gap-6">
      {[...groups.entries()].map(([key, group]) => (
        <section key={key} aria-labelledby={showSource ? `tickets-source-${key}` : undefined} aria-label={showSource ? undefined : group.name}>
          {showSource ? (
            <SourceHeading id={`tickets-source-${key}`} className="mb-3 font-mono text-xs font-normal uppercase tracking-[0.16em] text-(--tk-mut) [overflow-wrap:anywhere]">
              {group.name}
            </SourceHeading>
          ) : null}
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {group.types.map((type) => {
              const price = type.priceCents === 0 ? t("free") : formatMoney({ format, cents: type.priceCents, currency: type.currency });
              const buyable = isBuyable({ type, salesOpen: config.salesOpen });
              const quantity = cart[type.id] ?? 0;
              const max = maxQuantity({ type });
              const flag = flagged[type.id];
              const flagId = `ticket-flag-${type.id}`;
              // Sold out with a waitlist: "Join the waitlist" replaces the dead end. No waitlist keeps the plain "Sold out".
              const waitlist = config.salesOpen && type.status === "sold_out" && type.waitlistEnabled === true;
              const opens = type.status === "not_yet" && type.saleFrom ? new Date(type.saleFrom) : null;
              const closes = buyable && type.closeAt ? new Date(type.closeAt) : null;
              const fee = config.feePayer === "buyer" && type.bookingFeeCents > 0 && type.priceCents > 0 ? ` ${t("feeExtra", { fee: formatMoney({ format, cents: type.bookingFeeCents, currency: type.currency }) })}` : "";
              const parts = [
                `${price}${fee}`,
                type.status === "on_sale" ? null : t(`status.${STATUS_KEYS[type.status] ?? "unknown"}`),
                opens && !Number.isNaN(opens.getTime()) ? tc("checkout.card.opensOn", { date: format.dateTime(opens, { dateStyle: "long" }) }) : null,
                buyable && type.left !== null && type.left <= LOW_STOCK ? t("left", { count: type.left }) : null,
                buyable && type.maxPerOrder > 1 && type.maxPerOrder < 10 ? t("maxPerOrder", { count: type.maxPerOrder }) : null,
                closes && !Number.isNaN(closes.getTime()) ? t("salesEnd", { date: format.dateTime(closes, { dateStyle: "medium", ...(zoneOf(type) ? { timeZone: zoneOf(type) } : {}) }) }) : null,
              ].filter(Boolean);
              return (
                <li
                  key={type.id}
                  className={`flex flex-wrap items-center gap-x-3.5 gap-y-3 rounded-xl border px-4 py-3.5 ${quantity > 0 ? "border-(--tk-ring) bg-(--tk-tint)" : "border-(--tk-line)"} ${buyable ? "" : "opacity-80"}`}
                  aria-describedby={flag ? flagId : undefined}
                >
                  <div className="min-w-0 flex-[1_1_14rem]">
                    <TypeHeading className="m-0 text-base font-medium [overflow-wrap:anywhere]">{type.name}</TypeHeading>
                    {/* Dates come from Intl, whose ICU data differs between Node and the browser. */}
                    <p suppressHydrationWarning className="m-0 mt-0.5 text-[13px] text-(--tk-mut)">
                      {parts.join(" · ")}
                    </p>
                    {type.description ? <p className="m-0 mt-1 whitespace-pre-line text-[13px] text-(--tk-soft) [overflow-wrap:anywhere]">{type.description}</p> : null}
                    {flag ? (
                      <p id={flagId} role="alert" className="m-0 mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-(--tk-err)">
                        <Icon name="alert" size={14} />
                        {tc.has(`errors.${flag}`) ? tc(`errors.${flag}`) : tc("errors.generic")}
                      </p>
                    ) : null}
                  </div>
                  {buyable ? (
                    <div role="group" aria-label={type.name} className="ml-auto inline-flex items-center gap-2">
                      <button type="button" className={TK_STEPPER} disabled={quantity <= 0} aria-label={tc("checkout.card.decrease", { name: type.name })} onClick={() => onQuantity({ type, quantity: quantity - 1 })}>
                        <Icon name="minus" />
                      </button>
                      <span aria-live="polite" className="w-6 text-center font-mono text-base tabular-nums">
                        {quantity}
                      </span>
                      <button type="button" className={TK_STEPPER} disabled={quantity >= max} aria-label={tc("checkout.card.increase", { name: type.name })} onClick={() => onQuantity({ type, quantity: quantity + 1 })}>
                        <Icon name="plus" />
                      </button>
                    </div>
                  ) : null}
                  {waitlist ? (
                    <div className="ml-auto">
                      <WaitlistJoin ticketTypeId={type.id} typeName={type.name} maxPerOrder={type.maxPerOrder} />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {unlisted.length > 0 ? (
        <ul aria-label={t("status.unknown")} className="m-0 flex list-none flex-col gap-2.5 p-0">
          {unlisted.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-center gap-x-3.5 gap-y-3 rounded-xl border border-(--tk-line) px-4 py-3.5 opacity-80">
              <div className="min-w-0 flex-[1_1_14rem]">
                <TypeHeading className="m-0 text-base font-medium [overflow-wrap:anywhere]">{entry.name}</TypeHeading>
                <p className="m-0 mt-0.5 text-[13px] text-(--tk-mut)">{t("status.unknown")}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** The event's IANA zone, when the runtime knows it (sales end is shown in the event's time, like every ticket date). */
function zoneOf(type: PublicType): string | undefined {
  const zone = type.source.timeZone;
  if (!zone) return undefined;
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return zone;
  } catch {
    return undefined;
  }
}

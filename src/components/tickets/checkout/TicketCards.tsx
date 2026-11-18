import { useFormatter, useTranslations } from "@/lib/tickets/i18n";
import { isBuyable, maxQuantity, type Cart } from "@/lib/tickets/checkout-cart";
import { formatMoney } from "@/lib/tickets/format";
import { TICKETS_CARD } from "../tickets-classes";
import type { CheckoutConfig, PublicType } from "./types";
import { WaitlistJoin } from "./WaitlistJoin";

const STATUS_KEYS: Record<string, string> = { on_sale: "onSale", sold_out: "soldOut", paused: "paused", not_yet: "notYet", ended: "ended" };
const STEPPER =
  "inline-flex size-11 items-center justify-center rounded-(--radius) border border-(--color-control-border) bg-background text-lg font-medium text-text hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40";

/**
 * The ticket types grouped by source (event / schedule) with a quantity stepper on each type that can be bought.
 * Prices are ep-api's integer cents through the locale formatter. A card ep-api rejected (sold out, price changed…)
 * shows its message in place (`flagged`), tied to the card with `aria-describedby`.
 */
export function TicketCards({
  types,
  config,
  cart,
  flagged,
  onQuantity,
  nested = false,
}: {
  types: readonly PublicType[];
  config: CheckoutConfig;
  cart: Cart;
  flagged: Readonly<Record<string, string>>;
  onQuantity: (args: { type: PublicType; quantity: number }) => void;
  /** Inside a checkout step (which has its own `h2`): source titles are `h3`, ticket names `h4`. */
  nested?: boolean;
}) {
  const t = useTranslations("tickets.list");
  const tc = useTranslations("tickets");
  const format = useFormatter();
  const SourceHeading = nested ? "h3" : "h2";
  const TypeHeading = nested ? "h4" : "h3";

  const groups = new Map<string, { name: string; types: PublicType[] }>();
  for (const type of types) {
    const key = `${type.source.kind}:${type.source.id}`;
    const group = groups.get(key) ?? { name: type.source.name, types: [] };
    group.types.push(type);
    groups.set(key, group);
  }

  return (
    <>
      {[...groups.entries()].map(([key, group]) => (
        <section key={key} aria-labelledby={`tickets-source-${key}`} className="mt-8 first:mt-0">
          <SourceHeading id={`tickets-source-${key}`} className="font-heading text-xl font-semibold [overflow-wrap:anywhere]">
            {group.name}
          </SourceHeading>
          <ul className="mt-3 flex flex-col gap-3">
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
              return (
                <li key={type.id} className={`${TICKETS_CARD} flex flex-col gap-2`} aria-describedby={flag ? flagId : undefined}>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                    <TypeHeading className="font-medium [overflow-wrap:anywhere]">{type.name}</TypeHeading>
                    <p className="font-medium">
                      {price}
                      {config.feePayer === "buyer" && type.bookingFeeCents > 0 ? (
                        <span className="ml-2 text-sm font-normal text-muted">{t("feeExtra", { fee: formatMoney({ format, cents: type.bookingFeeCents, currency: type.currency }) })}</span>
                      ) : null}
                    </p>
                  </div>
                  {type.description ? <p className="whitespace-pre-line text-sm text-muted [overflow-wrap:anywhere]">{type.description}</p> : null}
                  <p className="text-sm text-muted">
                    {t(`status.${STATUS_KEYS[type.status] ?? "unknown"}`)}
                    {opens && !Number.isNaN(opens.getTime()) ? ` · ${tc("checkout.card.opensOn", { date: format.dateTime(opens, { dateStyle: "long" }) })}` : ""}
                    {type.left !== null ? ` · ${t("left", { count: type.left })}` : ""}
                    {` · ${t("maxPerOrder", { count: type.maxPerOrder })}`}
                  </p>
                  {flag ? (
                    <p id={flagId} role="alert" className="text-sm font-medium text-danger">
                      {tc.has(`errors.${flag}`) ? tc(`errors.${flag}`) : tc("errors.generic")}
                    </p>
                  ) : null}
                  {buyable ? (
                    <div role="group" aria-label={type.name} className="mt-1 flex items-center gap-2">
                      <button type="button" className={STEPPER} disabled={quantity <= 0} aria-label={tc("checkout.card.decrease", { name: type.name })} onClick={() => onQuantity({ type, quantity: quantity - 1 })}>
                        <span aria-hidden="true">−</span>
                      </button>
                      <span aria-live="polite" className="min-w-8 text-center font-medium tabular-nums">
                        {quantity}
                      </span>
                      <button type="button" className={STEPPER} disabled={quantity >= max} aria-label={tc("checkout.card.increase", { name: type.name })} onClick={() => onQuantity({ type, quantity: quantity + 1 })}>
                        <span aria-hidden="true">+</span>
                      </button>
                    </div>
                  ) : null}
                  {waitlist ? <WaitlistJoin ticketTypeId={type.id} typeName={type.name} maxPerOrder={type.maxPerOrder} /> : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}

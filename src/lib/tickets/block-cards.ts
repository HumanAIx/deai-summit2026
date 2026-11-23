import type { TicketCard } from "@/lib/tickets/block-schema";
import { centsToMajor } from "./money";
import type { PublicType } from "./schemas";

/**
 * Pure logic of the site-builder Tickets block (no React, no fetch): which cards show, how they are laid out, what
 * their button says, how the price is split for the big/small-cents look. Money is display only: the numbers are
 * ep-api's integer cents from `/api/tickets/types`; nothing here computes a price.
 */

/** A card paired with the live type it sells. */
export interface ResolvedCard {
  card: TicketCard;
  type: PublicType | null;
}

/**
 * The cards that can be shown. A card with no ticket type picked is always left out. While the live types have not
 * arrived (`types === null`) every picked card stays (its text is server-rendered, its price is a skeleton); once
 * they have, a card whose type is not in the public list (deleted, link-only, moved to another site) is left out.
 *
 * `editor: true` (the /build canvas only) keeps those cards too, with `type: null`, so the author sees every card
 * they made as a placeholder instead of it vanishing. The public site never passes it.
 */
export function resolveCards({ cards, types, editor = false }: { cards: readonly TicketCard[]; types: readonly PublicType[] | null; editor?: boolean }): ResolvedCard[] {
  // DeAI (2026-11-23): only the tickets an organiser picked as cards are on sale on a CMS page. A section with no cards
  // shows nothing; it never falls back to every public type.
  const byId = new Map((types ?? []).map((type) => [type.id, type] as const));
  const resolved: ResolvedCard[] = [];
  for (const card of Array.isArray(cards) ? cards : []) {
    if (card.ticketTypeId === "") {
      if (editor) resolved.push({ card, type: null });
      continue;
    }
    if (types === null) {
      resolved.push({ card, type: null });
      continue;
    }
    const type = byId.get(card.ticketTypeId);
    if (type || editor) resolved.push({ card, type: type ?? null });
  }
  return resolved;
}

/** Columns for `count` cards: 1–3 in one row, 4 as 2 + 2, 5 or more three per row. */
export function columnCount({ count }: { count: number }): number {
  if (count <= 1) return 1;
  if (count <= 3) return count;
  return count === 4 ? 2 : 3;
}

export const MIN_CARD_PX = 260;
export const MAX_CARD_PX = 380;
export const GRID_GAP_PX = 16;

/**
 * Inline grid style: never more than `columnCount` columns, cards never narrower than 260px (fewer columns on
 * tablets, one on phones), and a width cap so one or two cards do not stretch across the page. `min(100%, 260px)`
 * keeps a 320px viewport from overflowing (rule 29).
 */
export function gridStyle({ count }: { count: number }): { gridTemplateColumns: string; maxWidth: string } {
  const cols = columnCount({ count });
  return {
    gridTemplateColumns: `repeat(auto-fit, minmax(max(min(100%, ${MIN_CARD_PX}px), calc((100% - ${(cols - 1) * GRID_GAP_PX}px) / ${cols})), 1fr))`,
    maxWidth: `${cols * MAX_CARD_PX + (cols - 1) * GRID_GAP_PX}px`,
  };
}

/** The index of the one highlighted card: the first `featured` card; any others are ignored. */
export function featuredIndex({ resolved }: { resolved: readonly ResolvedCard[] }): number {
  return resolved.findIndex((entry) => entry.card.featured);
}

/** The title text with the accent word located: the FIRST exact match of `hl`; no match (or empty) = no accent. */
export function splitTitle({ title, hl }: { title: string; hl: string }): { before: string; accent: string; after: string } | null {
  if (hl === "") return null;
  const at = title.indexOf(hl);
  if (at < 0) return null;
  return { before: title.slice(0, at), accent: hl, after: title.slice(at + hl.length) };
}

/** What the card heading says: the card's own title, else the ticket type's name. */
export function cardTitle({ card, type }: { card: TicketCard; type: PublicType | null }): string {
  return card.title !== "" ? card.title : (type?.name ?? "");
}

export type KickerKind =
  | { kind: "plain" }
  | { kind: "days"; count: number }
  | { kind: "sessions"; count: number }
  | { kind: "when"; date: string };

const YMD = /^(\d{4})-(\d{2})-(\d{2})/;

function dayNumber({ value }: { value: string }): number | null {
  const match = YMD.exec(value);
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86_400_000;
}

/**
 * The label above the title when the card has none, from the live type: a schedule's whole pass = its number of
 * days; a day pass = the chosen days; a session pass = the chosen sessions; a single event = its date. Real data
 * only: when the type does not say, it is just "Ticket".
 */
export function autoKicker({ type }: { type: PublicType | null }): KickerKind {
  if (!type) return { kind: "plain" };
  if (type.source.kind === "event") return type.source.startDate ? { kind: "when", date: type.source.startDate } : { kind: "plain" };
  const scope = type.scope;
  if (scope?.mode === "sessions") {
    const count = Array.isArray(scope.sessions) ? scope.sessions.length : 0;
    return count > 0 ? { kind: "sessions", count } : { kind: "plain" };
  }
  if (scope?.mode === "days") {
    const count = Array.isArray(scope.days) ? scope.days.length : 0;
    return count > 0 ? { kind: "days", count } : { kind: "plain" };
  }
  const start = type.source.startDate ? dayNumber({ value: type.source.startDate }) : null;
  const end = type.source.endDate ? dayNumber({ value: type.source.endDate }) : start;
  if (start === null || end === null || end < start) return { kind: "plain" };
  return { kind: "days", count: end - start + 1 };
}

export type ButtonState = "buy" | "notYet" | "closed" | "soldOut" | "salesNotOpen";

/**
 * The button of a card, from ep-api's status. Sales not open on the site (no payments, test keys on production)
 * disables every button first; a sold-out type with a waitlist is shown as "Join the waitlist" by the card itself (the state stays `soldOut`).
 */
export function buttonState({ type, salesOpen }: { type: PublicType; salesOpen: boolean }): ButtonState {
  if (!salesOpen) return "salesNotOpen";
  switch (type.status) {
    case "on_sale":
      return "buy";
    case "not_yet":
      return "notYet";
    case "sold_out":
      return "soldOut";
    default:
      return "closed"; // paused, ended, or a status ep-api adds later: never sellable
  }
}

/** The "+ booking fee" line shows only when the buyer pays it (the same rule as the `/tickets` cards). */
export function showsBookingFee({ type, feePayer }: { type: PublicType; feePayer: string }): boolean {
  return feePayer === "buyer" && type.bookingFeeCents > 0;
}

/** "Only n left": only while on sale and ep-api sent a low-stock count. */
export function lowStock({ type }: { type: PublicType }): number | null {
  return type.status === "on_sale" && typeof type.left === "number" && type.left > 0 ? type.left : null;
}

export interface PricePart {
  text: string;
  /** Drawn small (the decimal separator and the cents). */
  small: boolean;
}

/**
 * The price split for the big-figure / small-cents look, in the visitor's locale and the type's currency. Whole
 * amounts show no decimals (house rule, same as `formatMoney`). The parts stay in the locale's own order, so a
 * trailing currency sign ("99,00 €") still reads right. An unknown currency code degrades to plain text.
 */
export function priceParts({ cents, currency, locale }: { cents: number; currency: string; locale: string }): PricePart[] {
  const major = centsToMajor({ cents, currency });
  try {
    const whole = Number.isInteger(major);
    const formatter = new Intl.NumberFormat(locale, { style: "currency", currency, ...(whole ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {}) });
    return formatter.formatToParts(major).map((part) => ({ text: part.value, small: part.type === "decimal" || part.type === "fraction" }));
  } catch {
    return [{ text: `${major.toFixed(2)} ${currency}`, small: false }];
  }
}

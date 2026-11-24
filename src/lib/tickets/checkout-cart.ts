import type { PublicType } from "./schemas";

/**
 * Pure cart helpers of the `/tickets` checkout (no React, no money maths: prices and totals only ever come from
 * ep-api's quote). A cart is `ticketTypeId → quantity`; ep-api allows ONE source (event or schedule) per order.
 */
export type Cart = Readonly<Record<string, number>>;

export interface CartLine {
  ticketTypeId: string;
  quantity: number;
}

/** Highest quantity the buyer can pick: the type's own per-order cap, and the stock when ep-api shows it. */
export function maxQuantity({ type }: { type: PublicType }): number {
  const cap = Math.max(0, type.maxPerOrder);
  return type.left === null ? cap : Math.min(cap, Math.max(0, type.left));
}

/** A type can be bought only while ep-api says `on_sale` (and the site sells at all). */
export function isBuyable({ type, salesOpen }: { type: PublicType; salesOpen: boolean }): boolean {
  return salesOpen && type.status === "on_sale" && maxQuantity({ type }) > 0;
}

/** `kind:id` of the source (event / schedule) a type belongs to. */
export function sourceKeyOf({ type }: { type: PublicType }): string {
  return `${type.source.kind}:${type.source.id}`;
}

/** The source the cart currently holds tickets of, or `null` when empty. */
export function cartSource({ cart, types }: { cart: Cart; types: readonly PublicType[] }): { key: string; name: string } | null {
  for (const type of types) {
    if ((cart[type.id] ?? 0) > 0) return { key: sourceKeyOf({ type }), name: type.source.name };
  }
  return null;
}

export type QuantityChange = { kind: "ok"; cart: Cart } | { kind: "conflict"; from: { key: string; name: string } };

/**
 * Sets one type's quantity (clamped to its maximum). Choosing a type from ANOTHER source than the cart holds is
 * not applied: it answers a conflict so the page can ask the buyer to clear the cart first.
 */
export function setQuantity({ cart, types, type, quantity }: { cart: Cart; types: readonly PublicType[]; type: PublicType; quantity: number }): QuantityChange {
  const next = Math.min(maxQuantity({ type }), Math.max(0, Math.floor(quantity)));
  const held = cartSource({ cart, types });
  if (next > 0 && held && held.key !== sourceKeyOf({ type })) return { kind: "conflict", from: held };
  const rest = Object.fromEntries(Object.entries(cart).filter(([id]) => id !== type.id));
  return { kind: "ok", cart: next > 0 ? { ...rest, [type.id]: next } : rest };
}

/** The cart with only `type` in it (the "clear the cart" answer to a source conflict). */
export function replaceCart({ type, quantity }: { type: PublicType; quantity: number }): Cart {
  const next = Math.min(maxQuantity({ type }), Math.max(0, Math.floor(quantity)));
  return next > 0 ? { [type.id]: next } : {};
}

/** Cart lines in the catalogue's order (stable, so the request fingerprint does not depend on click order). */
export function cartLines({ cart, types }: { cart: Cart; types: readonly PublicType[] }): CartLine[] {
  return types.filter((type) => (cart[type.id] ?? 0) > 0).map((type) => ({ ticketTypeId: type.id, quantity: cart[type.id] ?? 0 }));
}

/** Total number of tickets in the cart. */
export function ticketCount({ cart }: { cart: Cart }): number {
  return Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
}

/** Drops what is no longer buyable and lowers what exceeds fresh stock (after a refresh of the catalogue). */
export function clampCart({ cart, types, salesOpen }: { cart: Cart; types: readonly PublicType[]; salesOpen: boolean }): Cart {
  const next: Record<string, number> = {};
  for (const type of types) {
    const wanted = cart[type.id] ?? 0;
    if (wanted > 0 && isBuyable({ type, salesOpen })) next[type.id] = Math.min(wanted, maxQuantity({ type }));
  }
  return next;
}

/** One entry per ticket, in line order: the holders step asks for a name + email for each of these. */
export function holderSlots({ lines, types }: { lines: readonly CartLine[]; types: readonly PublicType[] }): { ticketTypeId: string; typeName: string }[] {
  const names = new Map(types.map((type) => [type.id, type.name]));
  return lines.flatMap((line) => Array.from({ length: line.quantity }, () => ({ ticketTypeId: line.ticketTypeId, typeName: names.get(line.ticketTypeId) ?? "" })));
}

/** A client-random idempotency key (>= 32 characters), never derived from the cart or the buyer. */
export function newIdempotencyKey(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") return `${cryptoApi.randomUUID()}${cryptoApi.randomUUID().replaceAll("-", "")}`;
  const bytes = new Uint8Array(32);
  cryptoApi.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** A tenant-supplied link (terms / privacy) is rendered as a link only when it is plain http(s). */
export function safeHttpUrl({ url }: { url: string | null | undefined }): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

/** `mm:ss` of the remaining hold time (never negative). */
export function formatCountdown({ remainingMs }: { remainingMs: number }): string {
  const total = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

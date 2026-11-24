import { describe, expect, it } from "vitest";
import {
  cartLines,
  cartSource,
  clampCart,
  formatCountdown,
  holderSlots,
  isBuyable,
  maxQuantity,
  newIdempotencyKey,
  replaceCart,
  safeHttpUrl,
  setQuantity,
  ticketCount,
} from "../../../lib/tickets/checkout-cart";
import type { PublicType } from "../../../lib/tickets/schemas";

const type = (overrides: Partial<PublicType> = {}): PublicType => ({
  id: "a",
  name: "Full pass",
  description: null,
  priceCents: 15000,
  currency: "EUR",
  bookingFeeCents: 0,
  status: "on_sale",
  left: null,
  maxPerOrder: 4,
  source: { kind: "event", id: "e1", name: "Summit" },
  ...overrides,
});
const A = type();
const B = type({ id: "b", name: "Workshop", source: { kind: "schedule", id: "s1", name: "Workshops" } });
const C = type({ id: "c", name: "Student", source: { kind: "event", id: "e1", name: "Summit" } });
const types = [A, B, C];

describe("maxQuantity / isBuyable", () => {
  it("is the per-order cap, lowered to the stock ep-api shows", () => {
    expect(maxQuantity({ type: A })).toBe(4);
    expect(maxQuantity({ type: type({ left: 2 }) })).toBe(2);
    expect(maxQuantity({ type: type({ left: 9 }) })).toBe(4);
    expect(maxQuantity({ type: type({ left: 0 }) })).toBe(0);
  });
  it("only an on-sale type of a site that sells can be bought", () => {
    expect(isBuyable({ type: A, salesOpen: true })).toBe(true);
    expect(isBuyable({ type: A, salesOpen: false })).toBe(false);
    for (const status of ["sold_out", "paused", "not_yet", "ended", "weird"]) expect(isBuyable({ type: type({ status }), salesOpen: true })).toBe(false);
    expect(isBuyable({ type: type({ left: 0 }), salesOpen: true })).toBe(false);
  });
});

describe("setQuantity — one source per order", () => {
  it("adds, clamps to the maximum and removes at zero", () => {
    const one = setQuantity({ cart: {}, types, type: A, quantity: 2 });
    expect(one).toEqual({ kind: "ok", cart: { a: 2 } });
    expect(setQuantity({ cart: { a: 2 }, types, type: A, quantity: 99 })).toEqual({ kind: "ok", cart: { a: 4 } });
    expect(setQuantity({ cart: { a: 2 }, types, type: A, quantity: 0 })).toEqual({ kind: "ok", cart: {} });
    expect(setQuantity({ cart: { a: 2 }, types, type: A, quantity: -3 })).toEqual({ kind: "ok", cart: {} });
  });
  it("two types of the SAME source mix freely", () => {
    expect(setQuantity({ cart: { a: 1 }, types, type: C, quantity: 1 })).toEqual({ kind: "ok", cart: { a: 1, c: 1 } });
  });
  it("a type of ANOTHER source is not applied: it answers the source the cart holds", () => {
    expect(setQuantity({ cart: { a: 1 }, types, type: B, quantity: 1 })).toEqual({ kind: "conflict", from: { key: "event:e1", name: "Summit" } });
  });
  it("lowering to zero never conflicts, and replaceCart is the 'clear the cart' answer", () => {
    expect(setQuantity({ cart: { a: 1 }, types, type: B, quantity: 0 })).toEqual({ kind: "ok", cart: { a: 1 } });
    expect(replaceCart({ type: B, quantity: 3 })).toEqual({ b: 3 });
    expect(cartSource({ cart: { b: 1 }, types })).toEqual({ key: "schedule:s1", name: "Workshops" });
    expect(cartSource({ cart: {}, types })).toBeNull();
  });
});

describe("cart views", () => {
  it("cartLines follows the catalogue's order, not click order", () => {
    expect(cartLines({ cart: { c: 1, a: 2 }, types })).toEqual([
      { ticketTypeId: "a", quantity: 2 },
      { ticketTypeId: "c", quantity: 1 },
    ]);
    expect(ticketCount({ cart: { a: 2, c: 1 } })).toBe(3);
  });
  it("holderSlots has one slot per ticket, in line order", () => {
    const slots = holderSlots({ lines: [{ ticketTypeId: "a", quantity: 2 }, { ticketTypeId: "c", quantity: 1 }], types });
    expect(slots).toEqual([
      { ticketTypeId: "a", typeName: "Full pass" },
      { ticketTypeId: "a", typeName: "Full pass" },
      { ticketTypeId: "c", typeName: "Student" },
    ]);
  });
  it("clampCart drops what is no longer on sale and lowers what exceeds fresh stock", () => {
    const fresh = [type({ left: 1 }), type({ id: "c", status: "sold_out" })];
    expect(clampCart({ cart: { a: 3, c: 1, zzz: 2 }, types: fresh, salesOpen: true })).toEqual({ a: 1 });
    expect(clampCart({ cart: { a: 3 }, types: fresh, salesOpen: false })).toEqual({});
  });
});

describe("newIdempotencyKey", () => {
  it("is random, at least 32 characters and URL-safe", () => {
    const keys = new Set(Array.from({ length: 50 }, () => newIdempotencyKey()));
    expect(keys.size).toBe(50);
    for (const key of keys) {
      expect(key.length).toBeGreaterThanOrEqual(32);
      expect(key).toMatch(/^[A-Za-z0-9-]+$/);
    }
  });
});

describe("safeHttpUrl", () => {
  it("allows http(s) and refuses every other scheme (a tenant-supplied terms link must not be javascript:)", () => {
    expect(safeHttpUrl({ url: "https://acme.example/terms" })).toBe("https://acme.example/terms");
    expect(safeHttpUrl({ url: "http://acme.example/terms" })).toBe("http://acme.example/terms");
    for (const url of ["javascript:alert(1)", "data:text/html,x", "ftp://x.example", "//x.example", "not a url", "", null, undefined]) expect(safeHttpUrl({ url })).toBeNull();
  });
});

describe("formatCountdown", () => {
  it("is mm:ss, rounds up, and never goes negative", () => {
    expect(formatCountdown({ remainingMs: 600_000 })).toBe("10:00");
    expect(formatCountdown({ remainingMs: 61_001 })).toBe("01:02");
    expect(formatCountdown({ remainingMs: 999 })).toBe("00:01");
    expect(formatCountdown({ remainingMs: -5 })).toBe("00:00");
  });
});

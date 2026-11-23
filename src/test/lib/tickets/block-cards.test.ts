import { describe, expect, it } from "vitest";
import type { TicketCard } from "@/lib/tickets/block-schema";
import { autoKicker, buttonState, cardTitle, columnCount, featuredIndex, gridStyle, lowStock, priceParts, resolveCards, showsBookingFee, splitTitle } from "@/lib/tickets/block-cards";
import type { PublicType } from "@/lib/tickets/schemas";

const A = "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11";
const B = "6d2f8b2f-3a5b-4b64-8b4f-1f7a7b5d2c22";
const card = (over: Partial<TicketCard> = {}): TicketCard => ({ id: "c1", ticketTypeId: A, title: "", hl: "", kicker: "", incl: "", feats: [], btn: "", featured: false, ...over });
const type = (over: Partial<PublicType> = {}): PublicType => ({
  id: A,
  name: "Full pass",
  description: null,
  priceCents: 15000,
  currency: "EUR",
  bookingFeeCents: 0,
  status: "on_sale",
  left: null,
  maxPerOrder: 10,
  source: { kind: "schedule", id: "s1", name: "Summit", startDate: "2026-11-25", endDate: "2026-11-26" },
  ...over,
});

describe("resolveCards with no cards (only picked tickets are sold)", () => {
  const types = [type(), type({ id: B, name: "Student pass", priceCents: 5000 })];

  it("returns no card at all, never every public type", () => {
    expect(resolveCards({ cards: [], types })).toEqual([]);
  });

  it("types still loading (null) gives []", () => {
    expect(resolveCards({ cards: [], types: null })).toEqual([]);
  });

  it("in the editor an empty list stays empty", () => {
    expect(resolveCards({ cards: [], types, editor: true })).toEqual([]);
  });

  it("a non-empty list is not expanded", () => {
    expect(resolveCards({ cards: [card()], types }).map((r) => r.card.id)).toEqual(["c1"]);
  });
});

describe("resolveCards", () => {
  it("leaves out a card with no ticket type, even before the live types arrive", () => {
    expect(resolveCards({ cards: [card({ ticketTypeId: "" })], types: null })).toEqual([]);
  });
  it("keeps every picked card while loading (types = null)", () => {
    expect(resolveCards({ cards: [card(), card({ id: "c2", ticketTypeId: B })], types: null }).map((r) => r.card.id)).toEqual(["c1", "c2"]);
  });
  it("leaves out a card whose type is not in the public list, and pairs the rest with their type", () => {
    const resolved = resolveCards({ cards: [card(), card({ id: "c2", ticketTypeId: B })], types: [type()] });
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.type?.id).toBe(A);
  });
  it("renders both cards when the same type is on two cards", () => {
    expect(resolveCards({ cards: [card(), card({ id: "c2" })], types: [type()] })).toHaveLength(2);
  });
  it("returns nothing for a non-array", () => {
    expect(resolveCards({ cards: "x" as unknown as TicketCard[], types: [] })).toEqual([]);
  });
});

describe("columnCount / gridStyle", () => {
  it("1-3 cards in one row, 4 as 2+2, 5 or more three per row", () => {
    expect([1, 2, 3, 4, 5, 6, 9, 12].map((n) => columnCount({ count: n }))).toEqual([1, 2, 3, 2, 3, 3, 3, 3]);
  });
  it("never lets a card get narrower than 260px, and caps the row so few cards do not stretch", () => {
    const style = gridStyle({ count: 5 });
    expect(style.gridTemplateColumns).toContain("260px");
    expect(style.gridTemplateColumns).toContain("min(100%, 260px)");
    expect(style.gridTemplateColumns).toContain("/ 3");
    expect(style.maxWidth).toBe("1172px");
    expect(gridStyle({ count: 1 }).maxWidth).toBe("380px");
    expect(gridStyle({ count: 4 }).maxWidth).toBe("776px");
  });
  it("a wider card cap when asked (DeAI's /tickets: two ~540px tiles)", () => {
    expect(gridStyle({ count: 2, maxCardPx: 540 }).maxWidth).toBe("1096px");
  });
});

describe("featuredIndex / splitTitle / cardTitle", () => {
  it("highlights only the first featured card", () => {
    const resolved = resolveCards({ cards: [card(), card({ id: "c2", featured: true }), card({ id: "c3", featured: true })], types: null });
    expect(featuredIndex({ resolved })).toBe(1);
    expect(featuredIndex({ resolved: resolveCards({ cards: [card()], types: null }) })).toBe(-1);
  });
  it("accents the first exact match only; no match or empty = no accent", () => {
    expect(splitTitle({ title: "VIP Pass VIP", hl: "VIP" })).toEqual({ before: "", accent: "VIP", after: " Pass VIP" });
    expect(splitTitle({ title: "Student Pass", hl: "VIP" })).toBeNull();
    expect(splitTitle({ title: "VIP Pass", hl: "" })).toBeNull();
    expect(splitTitle({ title: "VIP Pass", hl: "vip" })).toBeNull();
  });
  it("falls back to the type name when the card has no title", () => {
    expect(cardTitle({ card: card(), type: type() })).toBe("Full pass");
    expect(cardTitle({ card: card({ title: "Mine" }), type: type() })).toBe("Mine");
    expect(cardTitle({ card: card(), type: null })).toBe("");
  });
});

describe("autoKicker", () => {
  it("whole schedule = its number of days", () => {
    expect(autoKicker({ type: type({ scope: { mode: "all" } }) })).toEqual({ kind: "days", count: 2 });
  });
  it("a single-day schedule is 1 day", () => {
    expect(autoKicker({ type: type({ source: { kind: "schedule", id: "s", name: "S", startDate: "2026-11-25", endDate: "2026-11-25" } }) })).toEqual({ kind: "days", count: 1 });
  });
  it("day pass = the chosen days; sessions = the chosen sessions", () => {
    expect(autoKicker({ type: type({ scope: { mode: "days", days: ["2026-11-25"] } }) })).toEqual({ kind: "days", count: 1 });
    expect(autoKicker({ type: type({ scope: { mode: "sessions", sessions: ["a", "b", "c"] } }) })).toEqual({ kind: "sessions", count: 3 });
  });
  it("an event shows its date; an unknown shape is just plain", () => {
    expect(autoKicker({ type: type({ source: { kind: "event", id: "e", name: "E", startDate: "2026-12-01" } }) })).toEqual({ kind: "when", date: "2026-12-01" });
    expect(autoKicker({ type: type({ source: { kind: "event", id: "e", name: "E" } }) })).toEqual({ kind: "plain" });
    expect(autoKicker({ type: type({ source: { kind: "schedule", id: "s", name: "S" } }) })).toEqual({ kind: "plain" });
    expect(autoKicker({ type: null })).toEqual({ kind: "plain" });
  });
});

describe("buttonState / showsBookingFee / lowStock", () => {
  it("maps each status to its button", () => {
    expect(buttonState({ type: type(), salesOpen: true })).toBe("buy");
    expect(buttonState({ type: type({ status: "not_yet" }), salesOpen: true })).toBe("notYet");
    expect(buttonState({ type: type({ status: "paused" }), salesOpen: true })).toBe("closed");
    expect(buttonState({ type: type({ status: "ended" }), salesOpen: true })).toBe("closed");
    expect(buttonState({ type: type({ status: "sold_out" }), salesOpen: true })).toBe("soldOut");
    expect(buttonState({ type: type({ status: "something_new" }), salesOpen: true })).toBe("closed");
  });
  it("sales not open disables every status", () => {
    for (const status of ["on_sale", "not_yet", "paused", "sold_out"]) expect(buttonState({ type: type({ status }), salesOpen: false })).toBe("salesNotOpen");
  });
  it("shows the fee only when the buyer pays a positive fee", () => {
    expect(showsBookingFee({ type: type({ bookingFeeCents: 200 }), feePayer: "buyer" })).toBe(true);
    expect(showsBookingFee({ type: type({ bookingFeeCents: 0 }), feePayer: "buyer" })).toBe(false);
    expect(showsBookingFee({ type: type({ bookingFeeCents: 200 }), feePayer: "organizer" })).toBe(false);
  });
  it("shows low stock only while on sale", () => {
    expect(lowStock({ type: type({ left: 3 }) })).toBe(3);
    expect(lowStock({ type: type({ left: null }) })).toBeNull();
    expect(lowStock({ type: type({ left: 0, status: "sold_out" }) })).toBeNull();
  });
});

describe("priceParts", () => {
  it("splits the cents from the whole part, in order", () => {
    const parts = priceParts({ cents: 9950, currency: "EUR", locale: "en" });
    expect(parts.map((p) => p.text).join("")).toBe("€99.50");
    expect(parts.filter((p) => p.small).map((p) => p.text).join("")).toBe(".50");
  });
  it("shows a whole amount without decimals", () => {
    const parts = priceParts({ cents: 9900, currency: "EUR", locale: "en" });
    expect(parts.map((p) => p.text).join("")).toBe("€99");
    expect(parts.some((p) => p.small)).toBe(false);
  });
  it("keeps a trailing currency sign in the locale's own order", () => {
    const parts = priceParts({ cents: 9950, currency: "EUR", locale: "de" });
    expect(parts.map((p) => p.text).join("").replace(/\s/g, " ")).toBe("99,50 €");
    expect(parts.filter((p) => p.small).map((p) => p.text).join("")).toBe(",50");
  });
  it("degrades for an unknown currency instead of throwing", () => {
    expect(priceParts({ cents: 1000, currency: "??", locale: "en" })).toEqual([{ text: "10.00 ??", small: false }]);
  });
});

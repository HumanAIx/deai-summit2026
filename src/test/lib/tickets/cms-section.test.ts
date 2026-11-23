import { describe, expect, it } from "vitest";
import type { CMSBlock } from "../../../lib/api-types";
import { allowedTypeIdsOf, isTicketsSectionBlock, ticketCardsOf } from "../../../lib/tickets/cms-section";

const block = (extra: Record<string, unknown> = {}): CMSBlock => ({ id: "b1", type: "section", ...extra }) as CMSBlock;
const card = (id: string, extra: Record<string, unknown> = {}) => ({ id, ticketTypeId: "", title: `Card ${id}`, ...extra });

describe("isTicketsSectionBlock", () => {
  it("matches the tickets add-on", () => {
    expect(isTicketsSectionBlock(block({ addon: "tickets" }))).toBe(true);
  });

  it("matches a block of type tickets", () => {
    expect(isTicketsSectionBlock(block({ type: "tickets" }))).toBe(true);
  });

  it("does not match other blocks", () => {
    expect(isTicketsSectionBlock(block())).toBe(false);
    expect(isTicketsSectionBlock(block({ addon: "speakers" }))).toBe(false);
    expect(isTicketsSectionBlock(block({ type: "hero" }))).toBe(false);
  });
});

describe("ticketCardsOf", () => {
  it("returns [] (all public types) when the block has no cards", () => {
    expect(ticketCardsOf(block())).toEqual([]);
    expect(ticketCardsOf(block({ ticketCards: null }))).toEqual([]);
    expect(ticketCardsOf(block({ ticketCards: "nope" }))).toEqual([]);
  });

  it("parses valid cards and applies the defaults", () => {
    const [first] = ticketCardsOf(block({ ticketCards: [card("a", { featured: true })] }));
    expect(first).toMatchObject({ id: "a", ticketTypeId: "", title: "Card a", featured: true, feats: [], btn: "" });
  });

  it("skips malformed cards and keeps the good ones in order", () => {
    const cards = ticketCardsOf(
      block({ ticketCards: [card("a"), { id: "bad id!", ticketTypeId: "" }, null, 42, { id: "c", ticketTypeId: "not-a-uuid" }, card("d")] }),
    );
    expect(cards.map((c) => c.id)).toEqual(["a", "d"]);
  });

  it("caps the list at 12 cards", () => {
    const many = Array.from({ length: 20 }, (_, i) => card(`c${i}`));
    const cards = ticketCardsOf(block({ ticketCards: many }));
    expect(cards).toHaveLength(12);
    expect(cards[11]?.id).toBe("c11");
  });
});

describe("allowedTypeIdsOf (which types /tickets offers)", () => {
  const A = "11111111-1111-4111-8111-111111111111";
  const B = "22222222-2222-4222-8222-222222222222";
  const C = "33333333-3333-4333-8333-333333333333";
  const card = (id: string, ticketTypeId: string) => ({ id, ticketTypeId, title: "", hl: "", kicker: "", incl: "", feats: [], btn: "", featured: false });
  const section = (cards: unknown[] | undefined) => ({ id: `s-${Math.random()}`, type: "content", addon: "tickets", ...(cards ? { ticketCards: cards } : {}) }) as unknown as CMSBlock;
  const hero = { id: "h", type: "simple", title: "Choose your pass" } as unknown as CMSBlock;

  it("the types picked as cards, in card order, without repeats, across sections", () => {
    expect(allowedTypeIdsOf([hero, section([card("c1", B), card("c2", A)]), section([card("c3", A), card("c4", C)])])).toEqual([B, A, C]);
  });

  it("null (every public type) with no Tickets section", () => {
    expect(allowedTypeIdsOf([hero])).toBeNull();
    expect(allowedTypeIdsOf([])).toBeNull();
  });

  it("null when a section has no cards (the add-on's 'all public types' rule), even next to a section with cards", () => {
    expect(allowedTypeIdsOf([section(undefined)])).toBeNull();
    expect(allowedTypeIdsOf([section([])])).toBeNull();
    expect(allowedTypeIdsOf([section([card("c1", A)]), section([])])).toBeNull();
  });

  it("null when the cards name no type yet (never an empty checkout)", () => {
    expect(allowedTypeIdsOf([section([card("c1", "")])])).toBeNull();
  });
});

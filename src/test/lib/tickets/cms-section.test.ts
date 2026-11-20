import { describe, expect, it } from "vitest";
import type { CMSBlock } from "../../../lib/api-types";
import { isTicketsSectionBlock, ticketCardsOf } from "../../../lib/tickets/cms-section";

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

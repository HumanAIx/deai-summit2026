import { describe, expect, it } from "vitest";
import type { CMSBlock } from "../../lib/api-types";
import { isHomepageTicketBlock } from "../../lib/home-ticket-passes";

const block = (extra: Record<string, unknown>) => ({ id: "b", type: "simple", ...extra }) as CMSBlock;

describe("isHomepageTicketBlock", () => {
  it("an addon: tickets block is never a duplicate, even with a TICKETS subtitle or a 'pass' title", () => {
    expect(isHomepageTicketBlock(block({ addon: "tickets", subtitle: "TICKETS · 2 DAYS" }))).toBe(false);
    expect(isHomepageTicketBlock(block({ addon: "tickets", title: "Choose your pass", subtitle: "tickets" }))).toBe(false);
    expect(isHomepageTicketBlock(block({ type: "tickets", subtitle: "TICKETS" }))).toBe(false);
  });

  it("the old behaviour is unchanged: a simple block with 'pass' in the title or 'ticket' in the subtitle is a duplicate", () => {
    expect(isHomepageTicketBlock(block({ title: "Full pass" }))).toBe(true);
    expect(isHomepageTicketBlock(block({ subtitle: "TICKETS · 2 DAYS" }))).toBe(true);
    expect(isHomepageTicketBlock(block({ type: "content", subtitle: "Tickets" }))).toBe(true);
  });

  it("other block types and unrelated simple blocks are not duplicates", () => {
    expect(isHomepageTicketBlock(block({ type: "hero", subtitle: "TICKETS" }))).toBe(false);
    expect(isHomepageTicketBlock(block({ title: "About the summit", subtitle: "Why attend" }))).toBe(false);
    expect(isHomepageTicketBlock(block({ title: "Passport control" }))).toBe(false);
  });
});

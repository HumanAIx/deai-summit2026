import { describe, expect, it } from "vitest";
import { lumaHrefOf } from "@/lib/tickets/luma-fallback";
import type { TicketsPageContent } from "@/lib/tickets-page";

const content = (over: Partial<TicketsPageContent> = {}): TicketsPageContent => ({
  eyebrow: "",
  titleLead: "Choose your",
  accentWord: "pass",
  meta: "",
  passes: [],
  notice: "",
  closingTitle: "",
  closingLabel: "",
  closingHref: "#",
  ...over,
});
const pass = (buttonHref: string) => ({ id: buttonHref, eyebrow: "", title: "VIP Pass", priceMajor: "", priceMinor: "", includesLabel: "", includes: [], buttonLabel: "Buy", buttonHref, featured: false });

describe("lumaHrefOf", () => {
  it("prefers the closing banner's Luma link, then the first pass with one", () => {
    expect(lumaHrefOf({ content: content({ closingHref: "https://lu.ma/deai", passes: [pass("https://luma.com/x")] }) })).toBe("https://lu.ma/deai");
    expect(lumaHrefOf({ content: content({ passes: [pass("/tickets"), pass("https://luma.com/x"), pass("https://luma.com/y")] }) })).toBe("https://luma.com/x");
  });

  it("is null without a Luma link: internal paths, '#', other hosts, look-alike hosts, or no CMS page", () => {
    expect(lumaHrefOf({ content: content({ closingHref: "/tickets", passes: [pass("#"), pass("https://eventbrite.com/e/1")] }) })).toBeNull();
    expect(lumaHrefOf({ content: content({ closingHref: "https://notluma.com/x" }) })).toBeNull();
    expect(lumaHrefOf({ content: content({ closingHref: "javascript:alert(1)" }) })).toBeNull();
    expect(lumaHrefOf({ content: null })).toBeNull();
  });

  it("accepts Luma subdomains and www", () => {
    expect(lumaHrefOf({ content: content({ closingHref: "https://www.luma.com/deai" }) })).toBe("https://www.luma.com/deai");
  });
});

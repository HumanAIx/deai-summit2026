import { describe, expect, it } from "vitest";
import { basePathOf, mayBeTicketPage, ticketPageRedirect } from "@/lib/tickets/pages-base";

describe("basePathOf", () => {
  it("is the path of the dashboard address, without a trailing slash", () => {
    expect(basePathOf("https://deaisummit.org/tickets")).toBe("/tickets");
    expect(basePathOf("https://deaisummit.org/buy/")).toBe("/buy");
    expect(basePathOf("https://deaisummit.org/events/2026/tickets")).toBe("/events/2026/tickets");
  });

  it("is '' for the bare domain (pages at the root)", () => {
    expect(basePathOf("https://deaisummit.org")).toBe("");
  });

  it("is null without an address (emails use the GConf.ai pages) or when it cannot be read", () => {
    expect(basePathOf(null)).toBeNull();
    expect(basePathOf(undefined)).toBeNull();
    expect(basePathOf("  ")).toBeNull();
    expect(basePathOf("not a url")).toBeNull();
    expect(basePathOf("ftp://deaisummit.org/x")).toBeNull();
  });
});

describe("mayBeTicketPage", () => {
  it.each(["/buy/t/abc", "/buy/order/abc", "/buy/w/abc", "/buy/l/abc", "/buy/me/abc", "/buy/lost", "/t/abc", "/lost", "/a/b/t/abc/calendar.ics"])("%s may be one", (path) => {
    expect(mayBeTicketPage(path)).toBe(true);
  });

  it.each(["/", "/speakers", "/passes", "/blog/some-post", "/buy/t", "/tickets/t/abc", "/tickets/lost", "/tickets"])("%s is not (or already canonical)", (path) => {
    expect(mayBeTicketPage(path)).toBe(false);
  });
});

describe("ticketPageRedirect", () => {
  it("maps each ticket page under the configured base to /tickets/…", () => {
    expect(ticketPageRedirect({ pathname: "/buy/t/abc", basePath: "/buy" })).toBe("/tickets/t/abc");
    expect(ticketPageRedirect({ pathname: "/buy/order/abc", basePath: "/buy" })).toBe("/tickets/order/abc");
    expect(ticketPageRedirect({ pathname: "/buy/w/abc", basePath: "/buy" })).toBe("/tickets/w/abc");
    expect(ticketPageRedirect({ pathname: "/buy/l/abc", basePath: "/buy" })).toBe("/tickets/l/abc");
    expect(ticketPageRedirect({ pathname: "/buy/me/abc", basePath: "/buy" })).toBe("/tickets/me/abc");
    expect(ticketPageRedirect({ pathname: "/buy/lost", basePath: "/buy" })).toBe("/tickets/lost");
    expect(ticketPageRedirect({ pathname: "/buy/t/abc/calendar.ics", basePath: "/buy" })).toBe("/tickets/t/abc/calendar.ics");
  });

  it("works for a nested base and for the root", () => {
    expect(ticketPageRedirect({ pathname: "/events/2026/tickets/t/abc", basePath: "/events/2026/tickets" })).toBe("/tickets/t/abc");
    expect(ticketPageRedirect({ pathname: "/t/abc", basePath: "" })).toBe("/tickets/t/abc");
    expect(ticketPageRedirect({ pathname: "/lost", basePath: "" })).toBe("/tickets/lost");
  });

  it("is null for other paths, another base, no address, or a base that already is /tickets", () => {
    expect(ticketPageRedirect({ pathname: "/buy/speakers", basePath: "/buy" })).toBeNull();
    expect(ticketPageRedirect({ pathname: "/buy/t", basePath: "/buy" })).toBeNull();
    expect(ticketPageRedirect({ pathname: "/shop/t/abc", basePath: "/buy" })).toBeNull();
    expect(ticketPageRedirect({ pathname: "/buyer/t/abc", basePath: "/buy" })).toBeNull();
    expect(ticketPageRedirect({ pathname: "/buy/t/abc", basePath: null })).toBeNull();
    expect(ticketPageRedirect({ pathname: "/tickets/t/abc", basePath: "/tickets" })).toBeNull();
  });
});

describe("sign-in links (API-266)", () => {
  it("a /sign-in/{token} path under another address is redirected to the canonical page", () => {
    expect(mayBeTicketPage("/buy/sign-in/abc")).toBe(true);
    expect(ticketPageRedirect({ pathname: "/buy/sign-in/abc", basePath: "/buy" })).toBe("/tickets/sign-in/abc");
  });
});

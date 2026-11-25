import { describe, expect, it } from "vitest";
import { isPrivateTicketPath, isTicketsRootPath, legacyPrivateLinkRedirect, PATHNAME_HEADER, TICKETS_PAGE_SLUG } from "../../../lib/tickets/tickets-route";

describe("isPrivateTicketPath", () => {
  it.each(["t", "order", "l", "w", "me", "sign-in"])("is true for /tickets/%s/x", (section) => {
    expect(isPrivateTicketPath({ pathname: `/tickets/${section}/x` })).toBe(true);
    expect(isPrivateTicketPath({ pathname: `/tickets/${section}/x/calendar.ics` })).toBe(true);
  });

  it("is false for the public pages and for a section without a token", () => {
    for (const pathname of ["/tickets", "/tickets/", "/tickets/lost", "/tickets/t", "/tickets/t/", "/tickets/order", "/", "/about", "/tickets/other/x", "/api/tickets/t/x"]) {
      expect(isPrivateTicketPath({ pathname })).toBe(false);
    }
  });

  it("has no locale prefix on DeAI: /de/tickets/t/x is not a ticket path", () => {
    expect(isPrivateTicketPath({ pathname: "/de/tickets/t/x" })).toBe(false);
  });
});

describe("legacyPrivateLinkRedirect", () => {
  const redirect = (pathname: string, query: string) => legacyPrivateLinkRedirect({ pathname, searchParams: new URLSearchParams(query) });

  it("turns /tickets?link=abc into /tickets/l/abc", () => {
    expect(redirect("/tickets", "link=abc")).toBe("/tickets/l/abc");
  });

  it("keeps the other query parameters", () => {
    expect(redirect("/tickets", "link=abc&utm_source=x")).toBe("/tickets/l/abc?utm_source=x");
  });

  it("encodes the token", () => {
    expect(redirect("/tickets", "link=a/b c")).toBe("/tickets/l/a%2Fb%20c");
  });

  it("returns null without a link, with an empty link, or on another path", () => {
    expect(redirect("/tickets", "")).toBeNull();
    expect(redirect("/tickets", "link=")).toBeNull();
    expect(redirect("/tickets", "schedule=s1")).toBeNull();
    expect(redirect("/tickets/lost", "link=abc")).toBeNull();
    expect(redirect("/", "link=abc")).toBeNull();
  });

  it("accepts a trailing slash", () => {
    expect(redirect("/tickets/", "link=abc")).toBe("/tickets/l/abc");
  });
});

describe("isTicketsRootPath and constants", () => {
  it("is true only for exactly /tickets", () => {
    expect(isTicketsRootPath({ pathname: "/tickets" })).toBe(true);
    expect(isTicketsRootPath({ pathname: "/tickets/" })).toBe(true);
    expect(isTicketsRootPath({ pathname: "/tickets/lost" })).toBe(false);
    expect(isTicketsRootPath({ pathname: "/tickets/t/x" })).toBe(false);
    expect(isTicketsRootPath({ pathname: "/" })).toBe(false);
  });

  it("exposes the page slug and the pathname header name", () => {
    expect(TICKETS_PAGE_SLUG).toBe("tickets");
    expect(PATHNAME_HEADER).toBe("x-deai-pathname");
  });
});

import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { middleware } from "../middleware";
import { loadTicketPagesBasePath } from "@/lib/tickets/pages-base-lookup";

vi.mock("@/lib/tickets/pages-base-lookup", () => ({ loadTicketPagesBasePath: vi.fn(async () => null) }));
const lookup = vi.mocked(loadTicketPagesBasePath);

const req = (path: string) => new NextRequest(`https://deaisummit.test${path}`);

afterEach(() => {
  vi.unstubAllEnvs();
  lookup.mockReset();
  lookup.mockResolvedValue(null);
});

describe("middleware with the tickets checkout OFF", () => {
  const off = () => vi.stubEnv("TICKETS_CHECKOUT_ENABLED", "");

  it("rewrites a private ticket page to a 404 path", async () => {
    off();
    const res = await middleware(req("/tickets/t/x"));
    expect(res.headers.get("x-middleware-rewrite")).toBe("https://deaisummit.test/_tickets-off/not-found");
  });

  it.each(["/tickets/order/abc", "/tickets/l/abc", "/tickets/w/abc", "/tickets/me/abc", "/tickets/lost"])("rewrites %s to the 404 path", async (path) => {
    off();
    expect((await middleware(req(path))).headers.get("x-middleware-rewrite")).toContain("/_tickets-off/not-found");
  });

  it("answers the checkout API with 404 JSON code notFound, no-store", async () => {
    off();
    const res = await middleware(req("/api/tickets/types"));
    expect(res.status).toBe(404);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ success: false, error: "Request failed. Please try again.", code: "notFound" });
  });

  it("also closes /api/captcha-site-key", async () => {
    off();
    const res = await middleware(req("/api/captcha-site-key"));
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe("notFound");
  });

  it("lets the plain /tickets page (the Luma page) pass, even with ?link=", async () => {
    off();
    for (const path of ["/tickets", "/tickets?link=abc"]) {
      const res = await middleware(req(path));
      expect(res.status).toBe(200);
      expect(res.headers.get("x-middleware-rewrite")).toBeNull();
      expect(res.headers.get("location")).toBeNull();
    }
  });

  it("treats any value other than `true` as off", async () => {
    vi.stubEnv("TICKETS_CHECKOUT_ENABLED", "1");
    expect((await middleware(req("/tickets/t/x"))).headers.get("x-middleware-rewrite")).toContain("/_tickets-off/not-found");
  });
});

describe("middleware with the tickets checkout ON", () => {
  const on = () => vi.stubEnv("TICKETS_CHECKOUT_ENABLED", "true");

  it("308-redirects the legacy /tickets?link=abc to /tickets/l/abc with Referrer-Policy: no-referrer", async () => {
    on();
    const res = await middleware(req("/tickets?link=abc"));
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("https://deaisummit.test/tickets/l/abc");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("keeps other query parameters on the redirect", async () => {
    on();
    expect((await middleware(req("/tickets?link=abc&utm_source=x"))).headers.get("location")).toBe("https://deaisummit.test/tickets/l/abc?utm_source=x");
  });

  it("passes the token pages and the API through (no 404)", async () => {
    on();
    for (const path of ["/tickets/t/x", "/tickets/order/x", "/api/tickets/types"]) {
      const res = await middleware(req(path));
      expect(res.status).toBe(200);
      expect(res.headers.get("x-middleware-rewrite")).toBeNull();
    }
  });

  it("passes other pages and forwards the pathname in the x-deai-pathname request header", async () => {
    on();
    const res = await middleware(req("/speakers?x=1"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-override-headers")).toContain("x-deai-pathname");
    expect(res.headers.get("x-middleware-request-x-deai-pathname")).toBe("/speakers");
  });

  it("forwards the pathname of a private ticket page too (the layout turns analytics off from it)", async () => {
    on();
    expect((await middleware(req("/tickets/t/secret"))).headers.get("x-middleware-request-x-deai-pathname")).toBe("/tickets/t/secret");
  });
});

describe("middleware regardless of the flag", () => {
  it("sets x-deai-pathname on ordinary pages with the flag off", async () => {
    vi.stubEnv("TICKETS_CHECKOUT_ENABLED", "");
    expect((await middleware(req("/about"))).headers.get("x-middleware-request-x-deai-pathname")).toBe("/about");
  });

  it("keeps the preview bypass: ?preview=secret_preview_mode redirects home and sets the cookie", async () => {
    vi.stubEnv("TICKETS_CHECKOUT_ENABLED", "");
    const res = await middleware(req("/about?preview=secret_preview_mode"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://deaisummit.test/");
    expect(res.cookies.get("preview_mode")?.value).toBe("true");
  });
});

describe("middleware: the dashboard's ticket pages address", () => {
  const on = () => vi.stubEnv("TICKETS_CHECKOUT_ENABLED", "true");

  it("308-redirects a ticket page under the configured path to the canonical /tickets page (query kept, no referrer)", async () => {
    on();
    lookup.mockResolvedValue("/buy");
    const res = await middleware(req("/buy/order/abc?o=5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11"));
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("https://deaisummit.test/tickets/order/abc?o=5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect((await middleware(req("/buy/lost"))).headers.get("location")).toBe("https://deaisummit.test/tickets/lost");
  });

  it("looks the address up only for paths shaped like a ticket page", async () => {
    on();
    for (const path of ["/", "/speakers", "/passes", "/tickets/t/abc", "/tickets"]) await middleware(req(path));
    expect(lookup).not.toHaveBeenCalled();
    await middleware(req("/buy/t/abc"));
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it("passes the request on when the address is /tickets, missing, or another path", async () => {
    on();
    for (const base of ["/tickets", null, "/shop"]) {
      lookup.mockResolvedValue(base);
      const res = await middleware(req("/buy/t/abc"));
      expect(res.headers.get("location")).toBeNull();
      expect(res.headers.get("x-middleware-request-x-deai-pathname")).toBe("/buy/t/abc");
    }
  });

  it("does nothing while the checkout is off", async () => {
    vi.stubEnv("TICKETS_CHECKOUT_ENABLED", "");
    lookup.mockResolvedValue("/buy");
    const res = await middleware(req("/buy/t/abc"));
    expect(res.headers.get("location")).toBeNull();
    expect(lookup).not.toHaveBeenCalled();
  });
});

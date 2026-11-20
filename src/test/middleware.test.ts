import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { middleware } from "../middleware";

const req = (path: string) => new NextRequest(`https://deaisummit.test${path}`);

afterEach(() => vi.unstubAllEnvs());

describe("middleware with the tickets checkout OFF", () => {
  const off = () => vi.stubEnv("TICKETS_CHECKOUT_ENABLED", "");

  it("rewrites a private ticket page to a 404 path", () => {
    off();
    const res = middleware(req("/tickets/t/x"));
    expect(res.headers.get("x-middleware-rewrite")).toBe("https://deaisummit.test/_tickets-off/not-found");
  });

  it.each(["/tickets/order/abc", "/tickets/l/abc", "/tickets/w/abc", "/tickets/me/abc", "/tickets/lost"])("rewrites %s to the 404 path", (path) => {
    off();
    expect(middleware(req(path)).headers.get("x-middleware-rewrite")).toContain("/_tickets-off/not-found");
  });

  it("answers the checkout API with 404 JSON code notFound, no-store", async () => {
    off();
    const res = middleware(req("/api/tickets/types"));
    expect(res.status).toBe(404);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ success: false, error: "Request failed. Please try again.", code: "notFound" });
  });

  it("also closes /api/captcha-site-key", async () => {
    off();
    const res = middleware(req("/api/captcha-site-key"));
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe("notFound");
  });

  it("lets the plain /tickets page (the Luma page) pass, even with ?link=", () => {
    off();
    for (const path of ["/tickets", "/tickets?link=abc"]) {
      const res = middleware(req(path));
      expect(res.status).toBe(200);
      expect(res.headers.get("x-middleware-rewrite")).toBeNull();
      expect(res.headers.get("location")).toBeNull();
    }
  });

  it("treats any value other than `true` as off", () => {
    vi.stubEnv("TICKETS_CHECKOUT_ENABLED", "1");
    expect(middleware(req("/tickets/t/x")).headers.get("x-middleware-rewrite")).toContain("/_tickets-off/not-found");
  });
});

describe("middleware with the tickets checkout ON", () => {
  const on = () => vi.stubEnv("TICKETS_CHECKOUT_ENABLED", "true");

  it("308-redirects the legacy /tickets?link=abc to /tickets/l/abc with Referrer-Policy: no-referrer", () => {
    on();
    const res = middleware(req("/tickets?link=abc"));
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("https://deaisummit.test/tickets/l/abc");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("keeps other query parameters on the redirect", () => {
    on();
    expect(middleware(req("/tickets?link=abc&utm_source=x")).headers.get("location")).toBe("https://deaisummit.test/tickets/l/abc?utm_source=x");
  });

  it("passes the token pages and the API through (no 404)", () => {
    on();
    for (const path of ["/tickets/t/x", "/tickets/order/x", "/api/tickets/types"]) {
      const res = middleware(req(path));
      expect(res.status).toBe(200);
      expect(res.headers.get("x-middleware-rewrite")).toBeNull();
    }
  });

  it("passes other pages and forwards the pathname in the x-deai-pathname request header", () => {
    on();
    const res = middleware(req("/speakers?x=1"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-override-headers")).toContain("x-deai-pathname");
    expect(res.headers.get("x-middleware-request-x-deai-pathname")).toBe("/speakers");
  });

  it("forwards the pathname of a private ticket page too (the layout turns analytics off from it)", () => {
    on();
    expect(middleware(req("/tickets/t/secret")).headers.get("x-middleware-request-x-deai-pathname")).toBe("/tickets/t/secret");
  });
});

describe("middleware regardless of the flag", () => {
  it("sets x-deai-pathname on ordinary pages with the flag off", () => {
    vi.stubEnv("TICKETS_CHECKOUT_ENABLED", "");
    expect(middleware(req("/about")).headers.get("x-middleware-request-x-deai-pathname")).toBe("/about");
  });

  it("keeps the preview bypass: ?preview=secret_preview_mode redirects home and sets the cookie", () => {
    vi.stubEnv("TICKETS_CHECKOUT_ENABLED", "");
    const res = middleware(req("/about?preview=secret_preview_mode"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://deaisummit.test/");
    expect(res.cookies.get("preview_mode")?.value).toBe("true");
  });
});

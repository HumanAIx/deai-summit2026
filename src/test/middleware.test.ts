import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { middleware } from "../middleware";
import { loadTicketPagesBasePath } from "@/lib/tickets/pages-base-lookup";

vi.mock("@/lib/tickets/pages-base-lookup", () => ({ loadTicketPagesBasePath: vi.fn(async () => null) }));
const lookup = vi.mocked(loadTicketPagesBasePath);

const req = (path: string) => new NextRequest(`https://deaisummit.test${path}`);

afterEach(() => {
  lookup.mockReset();
  lookup.mockResolvedValue(null);
});

describe("middleware: private ticket links", () => {

  it("308-redirects the legacy /tickets?link=abc to /tickets/l/abc with Referrer-Policy: no-referrer", async () => {
    const res = await middleware(req("/tickets?link=abc"));
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("https://deaisummit.test/tickets/l/abc");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("keeps other query parameters on the redirect", async () => {
    expect((await middleware(req("/tickets?link=abc&utm_source=x"))).headers.get("location")).toBe("https://deaisummit.test/tickets/l/abc?utm_source=x");
  });

  it("passes the token pages and the API through (no 404)", async () => {
    for (const path of ["/tickets/t/x", "/tickets/order/x", "/api/tickets/types"]) {
      const res = await middleware(req(path));
      expect(res.status).toBe(200);
      expect(res.headers.get("x-middleware-rewrite")).toBeNull();
    }
  });

  it("passes other pages and forwards the pathname in the x-deai-pathname request header", async () => {
    const res = await middleware(req("/speakers?x=1"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-override-headers")).toContain("x-deai-pathname");
    expect(res.headers.get("x-middleware-request-x-deai-pathname")).toBe("/speakers");
  });

  it("forwards the pathname of a private ticket page too (the layout turns analytics off from it)", async () => {
    expect((await middleware(req("/tickets/t/secret"))).headers.get("x-middleware-request-x-deai-pathname")).toBe("/tickets/t/secret");
  });
});

describe("middleware: every page", () => {
  it("sets x-deai-pathname on ordinary pages", async () => {
    expect((await middleware(req("/about"))).headers.get("x-middleware-request-x-deai-pathname")).toBe("/about");
  });

  it("keeps the preview bypass: ?preview=secret_preview_mode redirects home and sets the cookie", async () => {
    const res = await middleware(req("/about?preview=secret_preview_mode"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://deaisummit.test/");
    expect(res.cookies.get("preview_mode")?.value).toBe("true");
  });
});

describe("middleware: the dashboard's ticket pages address", () => {

  it("308-redirects a ticket page under the configured path to the canonical /tickets page (query kept, no referrer)", async () => {
    lookup.mockResolvedValue("/buy");
    const res = await middleware(req("/buy/order/abc?o=5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11"));
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("https://deaisummit.test/tickets/order/abc?o=5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect((await middleware(req("/buy/lost"))).headers.get("location")).toBe("https://deaisummit.test/tickets/lost");
  });

  it("looks the address up only for paths shaped like a ticket page", async () => {
    for (const path of ["/", "/speakers", "/passes", "/tickets/t/abc", "/tickets"]) await middleware(req(path));
    expect(lookup).not.toHaveBeenCalled();
    await middleware(req("/buy/t/abc"));
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it("passes the request on when the address is /tickets, missing, or another path", async () => {
    for (const base of ["/tickets", null, "/shop"]) {
      lookup.mockResolvedValue(base);
      const res = await middleware(req("/buy/t/abc"));
      expect(res.headers.get("location")).toBeNull();
      expect(res.headers.get("x-middleware-request-x-deai-pathname")).toBe("/buy/t/abc");
    }
  });
});

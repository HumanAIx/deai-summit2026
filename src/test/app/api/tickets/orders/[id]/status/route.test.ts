import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { epFetch, FakeEpApiError } = vi.hoisted(() => {
  class FakeEpApiError extends Error {
    constructor(
      readonly status: number,
      readonly path: string,
      message: string,
      readonly code?: string,
    ) {
      super(message);
    }
  }
  return { epFetch: vi.fn(), FakeEpApiError };
});
vi.mock("@/lib/tickets/ep-client", () => ({ epFetch, epFetchRaw: vi.fn(), EpApiError: FakeEpApiError }));

const { GET } = await import("../../../../../../../app/api/tickets/orders/[id]/status/route");

const ORDER_ID = "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11";
const TOKEN = "o".repeat(43);

function get({ token = TOKEN, ip = "203.0.113.1" }: { token?: string | null; ip?: string } = {}) {
  return new NextRequest(`http://localhost:3003/api/tickets/orders/${ORDER_ID}/status`, {
    headers: { host: "acme.example", "x-forwarded-for": ip, ...(token ? { "x-order-token": token } : {}) },
  });
}
const params = (id = ORDER_ID) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  epFetch.mockReset();
  epFetch.mockResolvedValue({ status: "pending", orderNo: 4, paidAt: null, holdExpiresAt: "2026-11-12T10:10:00.000Z" });
});

describe("GET /api/tickets/orders/[id]/status", () => {
  it("forwards the order id in the path and the token ONLY as a header, with the site key and buyer IP", async () => {
    const res = await GET(get({ ip: "198.51.100.7" }), params());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: { status: "pending", orderNo: 4, paidAt: null, holdExpiresAt: "2026-11-12T10:10:00.000Z" } });
    expect(res.headers.get("cache-control")).toBe("no-store");
    const [path, options] = epFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(path).toBe(`/tickets/orders/${ORDER_ID}/status`);
    expect(path).not.toContain(TOKEN);
    expect(options).toMatchObject({ cache: "no-store", headers: { "x-order-token": TOKEN, "x-gconf-client-ip": "198.51.100.7" } });
  });

  it("is the same opaque 404 for a missing token, a malformed token and a malformed id (no ep-api call)", async () => {
    for (const res of [await GET(get({ token: null, ip: "198.51.100.8" }), params()), await GET(get({ token: "short", ip: "198.51.100.8" }), params()), await GET(get({ ip: "198.51.100.8" }), params("nope"))]) {
      expect(res.status).toBe(404);
      expect((await res.json()).code).toBe("notFound");
    }
    expect(epFetch).not.toHaveBeenCalled();
  });

  it("passes through an ep-api 404 as the same opaque 404", async () => {
    epFetch.mockRejectedValue(new FakeEpApiError(404, "/x", "tickets.orderNotFound"));
    const res = await GET(get({ ip: "198.51.100.9" }), params());
    expect(res.status).toBe(404);
    expect(JSON.parse(await res.text())).toEqual({ success: false, error: "Something went wrong. Please try again.", code: "notFound" });
  });


  it("rate-limits per IP at 60 a minute", async () => {
    let last = 200;
    for (let i = 0; i < 61; i += 1) last = (await GET(get({ ip: "198.51.100.77" }), params())).status;
    expect(last).toBe(429);
    expect((await GET(get({ ip: "198.51.100.78" }), params())).status).toBe(200);
  });

  it("maps an outage to an opaque 502", async () => {
    epFetch.mockRejectedValue(new FakeEpApiError(500, "/x", "internal detail"));
    const res = await GET(get({ ip: "198.51.100.13" }), params());
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain("internal detail");
  });
});

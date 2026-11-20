import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { epFetch, FakeEpApiError } = vi.hoisted(() => {
  class FakeEpApiError extends Error {
    constructor(
      readonly status: number,
      readonly path: string,
      message: string,
      readonly code?: string,
      readonly details?: Record<string, unknown>,
    ) {
      super(message);
    }
  }
  return { epFetch: vi.fn(), FakeEpApiError };
});
vi.mock("@/lib/tickets/ep-client", () => ({ epFetch, epFetchRaw: vi.fn(), EpApiError: FakeEpApiError }));

const { POST } = await import("../../../../../../../app/api/tickets/orders/[id]/extend/route");

const ORDER_ID = "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11";
const TOKEN = "b".repeat(43);

function post({ id = ORDER_ID, token = TOKEN, ip = "203.0.113.1", origin, host = "acme.example" }: { id?: string; token?: string | null; ip?: string; origin?: string; host?: string } = {}) {
  const request = new NextRequest(`http://localhost:3003/api/tickets/orders/${id}/extend`, {
    method: "POST",
    headers: { host, "x-forwarded-for": ip, ...(token ? { "x-order-token": token } : {}), ...(origin ? { origin } : {}) },
  });
  return POST(request, { params: Promise.resolve({ id }) });
}

beforeEach(() => {
  epFetch.mockReset();
  epFetch.mockResolvedValue({ holdExpiresAt: "2030-01-01T10:25:00.000Z" });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("POST /api/tickets/orders/[id]/extend", () => {
  it("forwards the buyer token as a HEADER (never in the path or body), with the site key and buyer IP", async () => {
    const res = await post({ ip: "198.51.100.7" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: { holdExpiresAt: "2030-01-01T10:25:00.000Z" } });
    expect(res.headers.get("cache-control")).toBe("no-store");
    const [path, options] = epFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(path).toBe(`/tickets/orders/${ORDER_ID}/extend`);
    expect(path).not.toContain(TOKEN);
    expect(options).toMatchObject({ method: "POST", cache: "no-store", headers: { "x-order-token": TOKEN, "x-gconf-client-ip": "198.51.100.7" } });
    expect(options).not.toHaveProperty("body");
  });

  it("a malformed id or a missing / malformed token is the same opaque 404 as an unknown order, with no ep-api call", async () => {
    for (const args of [{ id: "not-a-uuid" }, { token: null }, { token: "short" }, { token: `${TOKEN}!!` }]) {
      const res = await post({ ...args, ip: "198.51.100.20" });
      expect(res.status).toBe(404);
      expect((await res.json()).code).toBe("notFound");
    }
    expect(epFetch).not.toHaveBeenCalled();
  });

  it("refuses a cross-origin POST with an opaque 403 and accepts a same-origin one", async () => {
    expect((await post({ origin: "https://evil.example", ip: "198.51.100.30" })).status).toBe(403);
    expect(epFetch).not.toHaveBeenCalled();
    expect((await post({ origin: "https://acme.example", ip: "198.51.100.31" })).status).toBe(200);
  });


  it("rate-limits per IP: 60 per minute, then 429", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 62; i += 1) statuses.push((await post({ ip: "198.51.100.50" })).status);
    expect(statuses.slice(60)).toEqual([429, 429]);
    expect((await post({ ip: "198.51.100.51" })).status).toBe(200);
  });

  it("a hold that already ended is 'holdEnded' (409); a wrong token is an opaque 404; an outage is a 502", async () => {
    epFetch.mockRejectedValueOnce(new FakeEpApiError(409, "/x", "Your hold ended", "tickets.holdEnded"));
    const ended = await post({ ip: "198.51.100.60" });
    expect(ended.status).toBe(409);
    expect((await ended.json()).code).toBe("holdEnded");

    epFetch.mockRejectedValueOnce(new FakeEpApiError(404, "/x", "no", "tickets.orderNotFound"));
    const missing = await post({ ip: "198.51.100.61" });
    expect(missing.status).toBe(404);
    expect((await missing.json()).code).toBe("orderNotFound");

    epFetch.mockRejectedValueOnce(new FakeEpApiError(500, "/x", "boom: secret internal detail"));
    const outage = await post({ ip: "198.51.100.62" });
    expect(outage.status).toBe(502);
    expect(await outage.text()).not.toContain("secret internal detail");
  });
});

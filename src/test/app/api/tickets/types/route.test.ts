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

const { GET } = await import("../../../../../app/api/tickets/types/route");

const TYPE_A = "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11";
const upstream = {
  types: [{ id: TYPE_A, name: "Full pass", description: null, priceCents: 15000, currency: "EUR", bookingFeeCents: 250, status: "on_sale", left: 4, maxPerOrder: 10, source: { kind: "event", id: "e1", name: "Summit" } }],
  checkout: { salesOpen: true, testMode: false, feePayer: "buyer", termsUrl: "https://example.com/t", questionList: [{ key: "k", id: "i", scope: "holder", fields: [] }], newsletterOffer: { on: true, pct: 5 } },
};

function get({ ip = "203.0.113.1", host = "acme.example", query = "" }: { ip?: string; host?: string; query?: string } = {}) {
  return new NextRequest(`http://localhost:3003/api/tickets/types${query}`, { method: "GET", headers: { host, "x-forwarded-for": ip } });
}

beforeEach(() => {
  epFetch.mockReset();
  epFetch.mockResolvedValue(upstream);
});

describe("GET /api/tickets/types", () => {
  it("resolves the site from Host, answers the types and the checkout block (the pop-up builds its config from it), no-store", async () => {
    const res = await GET(get({ ip: "198.51.100.7" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.types).toHaveLength(1);
    expect(json.data.types[0]).toMatchObject({ id: TYPE_A, priceCents: 15000, left: 4 });
    expect(json.data.checkout).toMatchObject({ salesOpen: true, testMode: false, feePayer: "buyer", termsUrl: "https://example.com/t", newsletterOffer: { on: true, pct: 5 } });
    expect(json.data.checkout.questionList).toHaveLength(1);
    expect(epFetch).toHaveBeenCalledWith("/tickets/types", expect.objectContaining({ cache: "no-store", locale: "en", headers: { "x-gconf-client-ip": "198.51.100.7" } }));
  });

  it("passes a well-formed locale through and ignores a malformed one", async () => {
    await GET(get({ query: "?locale=de" }));
    expect(epFetch).toHaveBeenLastCalledWith("/tickets/types", expect.objectContaining({ locale: "de" }));
    await GET(get({ query: "?locale=../../etc" }));
    expect(epFetch).toHaveBeenLastCalledWith("/tickets/types", expect.objectContaining({ locale: "en" }));
  });


  it("rate limits per IP at 60 a minute", async () => {
    const ip = "192.0.2.99";
    let last = 200;
    for (let i = 0; i < 61; i += 1) last = (await GET(get({ ip }))).status;
    expect(last).toBe(429);
    expect(epFetch).toHaveBeenCalledTimes(60);
  });

  it("maps an ep-api rejection to an opaque code and never leaks its text", async () => {
    epFetch.mockRejectedValue(new FakeEpApiError(409, "/tickets/types", "Stripe is not connected for tenant 123", "tickets.siteNotConfigured"));
    const res = await GET(get());
    const json = await res.json();
    expect(res.status).toBe(409);
    expect(json).toMatchObject({ success: false, code: "salesClosed" });
    expect(JSON.stringify(json)).not.toContain("Stripe");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("answers an opaque 502 when ep-api is down", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    epFetch.mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.1:3000"));
    const res = await GET(get());
    const json = await res.json();
    expect(res.status).toBe(502);
    expect(json.code).toBe("unavailable");
    expect(JSON.stringify(json)).not.toContain("ECONNREFUSED");
    spy.mockRestore();
  });

  it("answers unavailable when ep-api's answer has an unexpected shape", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    epFetch.mockResolvedValue({ nope: true });
    const res = await GET(get());
    expect(res.status).toBe(502);
    spy.mockRestore();
  });
});

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

const { POST } = await import("../../../../../app/api/tickets/quote/route");

const TYPE_A = "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11";
const totals = { lines: [{ ticketTypeId: TYPE_A, quantity: 2, unitCents: 5000, discountCents: 0, feeCents: 100, grossCents: 10200 }], subtotalCents: 10000, discountCents: 0, feeCents: 200, totalCents: 10200, vatCents: 1800 };
const quote = { totals, codeStatus: "none", currency: "EUR" };
const goodBody = { lines: [{ ticketTypeId: TYPE_A, quantity: 2 }], newsletter: false };

function post({ body, ip = "203.0.113.1", origin, host = "acme.example" }: { body: unknown; ip?: string; origin?: string; host?: string }) {
  return new NextRequest("http://localhost:3003/api/tickets/quote", {
    method: "POST",
    headers: { "content-type": "application/json", host, "x-forwarded-for": ip, ...(origin ? { origin } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  epFetch.mockReset();
  epFetch.mockResolvedValue(quote);
});

describe("POST /api/tickets/quote", () => {
  it("resolves the site from Host and forwards the cart, the site key and the buyer IP; answers ep-api's totals no-store", async () => {
    const res = await POST(post({ body: { ...goodBody, discountCode: " early-bird ", newsletter: true }, ip: "198.51.100.7" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: quote });
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(epFetch).toHaveBeenCalledWith(
      "/tickets/orders/quote",
      expect.objectContaining({
        method: "POST",
        body: { lines: [{ ticketTypeId: TYPE_A, quantity: 2 }], newsletter: true, discountCode: "EARLY-BIRD" },
                cache: "no-store",
        headers: { "x-gconf-client-ip": "198.51.100.7" },
      }),
    );
  });

  it("forwards a private-link token and drops every key ep-api's strict schema would refuse", async () => {
    await POST(post({ body: { ...goodBody, linkToken: "L".repeat(24), isAdmin: true, buyer: { email: "a@b.co" } }, ip: "198.51.100.8" }));
    expect((epFetch.mock.calls[0]?.[1] as { body: object }).body).toEqual({ lines: goodBody.lines, newsletter: false, linkToken: "L".repeat(24) });
  });

  it("forwards a waitlist-offer token, and refuses a malformed one before any call", async () => {
    await POST(post({ body: { ...goodBody, offerToken: "W".repeat(40) }, ip: "198.51.100.9" }));
    expect((epFetch.mock.calls[0]?.[1] as { body: object }).body).toEqual({ lines: goodBody.lines, newsletter: false, offerToken: "W".repeat(40) });
    epFetch.mockClear();
    const res = await POST(post({ body: { ...goodBody, offerToken: "bad token!" }, ip: "198.51.100.10" }));
    expect(res.status).toBe(400);
    expect(epFetch).not.toHaveBeenCalled();
  });

  it("answers ep-api's offer refusals as opaque 409 codes", async () => {
    for (const [key, code] of [["offerEnded", "offerEnded"], ["offerOverQuantity", "offerOverQuantity"], ["offerInUse", "offerInUse"]] as const) {
      epFetch.mockRejectedValueOnce(new FakeEpApiError(409, "/x", "raw upstream text", `tickets.${key}`));
      const res = await POST(post({ body: { ...goodBody, offerToken: "W".repeat(40) }, ip: "198.51.100.11" }));
      expect(res.status).toBe(409);
      expect(await res.json()).toMatchObject({ success: false, code });
    }
  });

  it("rejects an invalid body with 400 and never calls ep-api", async () => {
    const bodies = [
      {},
      "not json",
      null,
      { lines: [], newsletter: false },
      { lines: [{ ticketTypeId: "nope", quantity: 1 }], newsletter: false },
      { lines: [{ ticketTypeId: TYPE_A, quantity: 0 }], newsletter: false },
      { ...goodBody, discountCode: "no spaces allowed" },
      { ...goodBody, newsletter: "yes" },
    ];
    for (const body of bodies) {
      const res = await POST(post({ body, ip: "198.51.100.20" }));
      expect(res.status).toBe(400);
      expect((await res.json()).code).toBe("invalid");
    }
    expect(epFetch).not.toHaveBeenCalled();
  });

  it("refuses a cross-origin POST with an opaque 403 and accepts a same-origin one", async () => {
    const refused = await POST(post({ body: goodBody, origin: "https://evil.example", ip: "198.51.100.30" }));
    expect(refused.status).toBe(403);
    expect(epFetch).not.toHaveBeenCalled();
    expect((await POST(post({ body: goodBody, origin: "https://acme.example", ip: "198.51.100.31" }))).status).toBe(200);
  });


  it("rate-limits per IP: 60 per minute, then 429; another IP is unaffected", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 62; i += 1) statuses.push((await POST(post({ body: goodBody, ip: "198.51.100.50" }))).status);
    expect(statuses.filter((s) => s === 200)).toHaveLength(60);
    expect(statuses.slice(60)).toEqual([429, 429]);
    expect((await POST(post({ body: goodBody, ip: "198.51.100.51" }))).status).toBe(200);
  });

  it("maps ep-api tickets.* codes to opaque codes, and names the affected ticket type (a uuid only)", async () => {
    epFetch.mockRejectedValue(new FakeEpApiError(400, "/x", "Only one event per order, secret detail", "tickets.oneEventPerOrder", { ticketTypeId: TYPE_A, status: "sold_out", internal: "x" }));
    const res = await POST(post({ body: goodBody, ip: "198.51.100.60" }));
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).not.toContain("secret detail");
    expect(text).not.toContain("internal");
    expect(JSON.parse(text)).toEqual({ success: false, error: "Something went wrong. Please try again.", code: "oneEventPerOrder", details: { ticketTypeId: TYPE_A, status: "sold_out" } });
  });

  it("maps linkNotFound, ep-api's own rate limit and an outage", async () => {
    epFetch.mockRejectedValueOnce(new FakeEpApiError(404, "/x", "x", "tickets.typeNotFound"));
    const link = await POST(post({ body: goodBody, ip: "198.51.100.61" }));
    expect(link.status).toBe(404);
    expect((await link.json()).code).toBe("linkNotFound");

    epFetch.mockRejectedValueOnce(new FakeEpApiError(429, "/x", "slow down"));
    expect((await (await POST(post({ body: goodBody, ip: "198.51.100.62" }))).json()).code).toBe("rateLimited");

    epFetch.mockRejectedValueOnce(new FakeEpApiError(500, "/x", "boom: secret internal detail"));
    const outage = await POST(post({ body: goodBody, ip: "198.51.100.63" }));
    expect(outage.status).toBe(502);
    expect(await outage.text()).not.toContain("secret internal detail");
  });

  it("an ep-api answer of an unknown shape is an outage to the buyer, never passed through", async () => {
    epFetch.mockResolvedValue({ totals: "nope" });
    const res = await POST(post({ body: goodBody, ip: "198.51.100.64" }));
    expect(res.status).toBe(502);
    expect((await res.json()).code).toBe("unavailable");
  });
});

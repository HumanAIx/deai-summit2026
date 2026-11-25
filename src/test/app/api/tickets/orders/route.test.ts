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

const { POST } = await import("../../../../../app/api/tickets/orders/route");

const TYPE_A = "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11";
const ORDER_ID = "9b2d1c33-7e5a-4f6b-8c1d-3a4b5c6d7e8f";
const TOKEN = "b".repeat(43);
const KEY = "k".repeat(36);
const totals = { lines: [{ ticketTypeId: TYPE_A, quantity: 1, unitCents: 5000, discountCents: 0, feeCents: 0, grossCents: 5000 }], subtotalCents: 5000, discountCents: 0, feeCents: 0, totalCents: 5000, vatCents: 900 };
const paid = { orderId: ORDER_ID, orderNo: 12, buyerToken: TOKEN, holdExpiresAt: "2030-01-01T10:15:00.000Z", totals, clientSecret: "pi_123_secret_abc", publishableKey: "pk_test_123", testMode: true, free: false };
const goodBody = {
  idempotencyKey: KEY,
  lines: [{ ticketTypeId: TYPE_A, quantity: 1 }],
  buyer: { name: " Ada Lovelace ", email: " Ada@Example.COM " },
  holders: [{ ticketTypeId: TYPE_A, name: "Ada", email: "ada@example.com" }],
  newsletter: false,
  acceptTerms: true,
};

function post({ body, ip = "203.0.113.1", origin, host = "acme.example" }: { body: unknown; ip?: string; origin?: string; host?: string }) {
  return new NextRequest("http://localhost:3003/api/tickets/orders", {
    method: "POST",
    headers: { "content-type": "application/json", host, "x-forwarded-for": ip, ...(origin ? { origin } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  epFetch.mockReset();
  epFetch.mockResolvedValue(paid);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

let ipCounter = 1;

describe("POST /api/tickets/orders", () => {
  it("forwards the order with the idempotency key, site key and buyer IP and answers the payment fields no-store", async () => {
    const res = await POST(post({ body: { ...goodBody, discountCode: "vip-10", company: { name: "Acme", vatNumber: "mt123", street: "1 Main St", city: "Valletta", countryCode: "mt" } }, ip: "198.51.100.7" }));

    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({
      success: true,
      data: { orderId: ORDER_ID, buyerToken: TOKEN, holdExpiresAt: paid.holdExpiresAt, totals, clientSecret: "pi_123_secret_abc", publishableKey: "pk_test_123", testMode: true, free: false },
    });
    const [path, options] = epFetch.mock.calls[0] as [string, { body: Record<string, unknown>; headers: object; method: string; cache: string }];
    expect(path).toBe("/tickets/orders");
    expect(options).toMatchObject({ method: "POST", cache: "no-store", headers: { "x-gconf-client-ip": "198.51.100.7" } });
    expect(options.body).toMatchObject({
      idempotencyKey: KEY,
      buyer: { name: "Ada Lovelace", email: "ada@example.com" },
      discountCode: "VIP-10",
      company: { name: "Acme", street: "1 Main St", city: "Valletta", countryCode: "MT" },
    });
    expect((options.body.company as { vatNumber: string }).vatNumber).toBe("MT123");
  });

  it("forwards a waitlist-offer token to ep-api with the order", async () => {
    const res = await POST(post({ body: { ...goodBody, offerToken: "W".repeat(40) }, ip: "198.51.100.15" }));
    expect(res.status).toBe(201);
    expect((epFetch.mock.calls[0]?.[1] as { body: Record<string, unknown> }).body).toMatchObject({ offerToken: "W".repeat(40), idempotencyKey: KEY });
    const bad = await POST(post({ body: { ...goodBody, offerToken: "x y" }, ip: "198.51.100.16" }));
    expect(bad.status).toBe(400);
  });

  it("maps ep-api's offer refusals to opaque 409 codes", async () => {
    for (const key of ["offerEnded", "offerOverQuantity", "offerInUse"]) {
      epFetch.mockRejectedValueOnce(new FakeEpApiError(409, "/x", "raw upstream text", `tickets.${key}`));
      const res = await POST(post({ body: { ...goodBody, offerToken: "W".repeat(40) }, ip: `198.51.100.${20 + ipCounter++}` }));
      expect(res.status).toBe(409);
      expect(await res.json()).toMatchObject({ code: key });
    }
  });

  it("forwards each holder's answers and the heard-from answer to ep-api, and refuses an answer that is out of range before any call", async () => {
    const answers = { company: "Quantia", jobTitle: "CTO", dietary: "other", dietaryOther: "no nuts", tshirt: "L" };
    const res = await POST(post({ body: { ...goodBody, holders: [{ ...goodBody.holders[0], answers }], heardFrom: { value: "friend" } }, ip: "198.51.100.11" }));
    expect(res.status).toBe(201);
    const [, options] = epFetch.mock.calls[0] as [string, { body: { holders: Array<{ answers: unknown }>; heardFrom: unknown } }];
    expect(options.body.holders[0]?.answers).toEqual(answers);
    expect(options.body.heardFrom).toEqual({ value: "friend" });

    epFetch.mockClear();
    for (const bad of [{ tshirt: "XXXXL" }, { company: "x".repeat(121) }, { dietary: "pescatarian" }]) {
      const refused = await POST(post({ body: { ...goodBody, holders: [{ ...goodBody.holders[0], answers: bad }] }, ip: "198.51.100.12" }));
      expect(refused.status).toBe(400);
      expect((await refused.json()).code).toBe("invalid");
    }
    expect(epFetch).not.toHaveBeenCalled();
  });

  it("maps ep-api's answer refusals to opaque codes the checkout words in the buyer's language", async () => {
    for (const [code, expected] of [["tickets.answerInvalid", "answerInvalid"], ["tickets.answerRequired", "answerRequired"]] as const) {
      epFetch.mockRejectedValue(new FakeEpApiError(400, "/tickets/orders", "raw upstream text", code));
      const res = await POST(post({ body: goodBody, ip: "198.51.100.13" }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe(expected);
      expect(JSON.stringify(json)).not.toContain("raw upstream text");
    }
  });

  it("a free order answers no payment fields at all", async () => {
    epFetch.mockResolvedValue({ ...paid, totals: { ...totals, totalCents: 0 }, clientSecret: null, publishableKey: null, free: true });
    const res = await POST(post({ body: goodBody, ip: "198.51.100.8" }));
    expect(res.status).toBe(201);
    expect((await res.json()).data).toMatchObject({ free: true, clientSecret: null, publishableKey: null, buyerToken: TOKEN });
  });

  it("a payable order without its client secret or key is 'payment unavailable', not a half-working checkout", async () => {
    epFetch.mockResolvedValue({ ...paid, clientSecret: null });
    const res = await POST(post({ body: goodBody, ip: "198.51.100.9" }));
    expect(res.status).toBe(502);
    expect((await res.json()).code).toBe("paymentUnavailable");
  });

  it("an answer without a buyer token cannot lead the buyer to their order: unavailable", async () => {
    epFetch.mockResolvedValue({ ...paid, buyerToken: null });
    const res = await POST(post({ body: goodBody, ip: "198.51.100.10" }));
    expect((await res.json()).code).toBe("unavailable");
  });

  it("rejects an invalid body with 400 and never calls ep-api", async () => {
    const bodies = [
      {},
      "not json",
      { ...goodBody, idempotencyKey: "short" },
      { ...goodBody, buyer: { name: "", email: "a@b.co" } },
      { ...goodBody, buyer: { name: "Ada", email: "not-an-email" } },
      { ...goodBody, holders: [] },
      { ...goodBody, holders: [{ ticketTypeId: "nope", name: "A", email: "a@b.co" }] },
      { ...goodBody, acceptTerms: "yes" },
      { ...goodBody, company: { name: "Acme", street: "x", city: "y", countryCode: "MLT" } },
    ];
    for (const body of bodies) {
      const res = await POST(post({ body, ip: "198.51.100.20" }));
      expect(res.status).toBe(400);
      expect((await res.json()).code).toBe("invalid");
    }
    expect(epFetch).not.toHaveBeenCalled();
  });

  it("refuses a cross-origin POST with an opaque 403 and accepts a same-origin one", async () => {
    expect((await POST(post({ body: goodBody, origin: "https://evil.example", ip: "198.51.100.30" }))).status).toBe(403);
    expect(epFetch).not.toHaveBeenCalled();
    expect((await POST(post({ body: goodBody, origin: "https://acme.example", ip: "198.51.100.31" }))).status).toBe(201);
  });


  it("rate-limits order creation per IP: 10 per 10 minutes, then 429", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 12; i += 1) statuses.push((await POST(post({ body: goodBody, ip: "198.51.100.50" }))).status);
    expect(statuses.slice(0, 10).every((s) => s === 201)).toBe(true);
    expect(statuses.slice(10)).toEqual([429, 429]);
    expect((await POST(post({ body: goodBody, ip: "198.51.100.51" }))).status).toBe(201);
  });

  it.each([
    ["tickets.soldOut", 409, "soldOut"],
    ["tickets.notOnSale", 409, "notOnSale"],
    ["tickets.priceChanged", 409, "priceChanged"],
    ["tickets.codeInvalid", 409, "codeInvalid"],
    ["tickets.codeNotValidNow", 409, "codeNotValidNow"],
    ["tickets.codeNotApplicable", 409, "codeNotApplicable"],
    ["tickets.codeUsedUp", 409, "codeUsedUp"],
    ["tickets.codeOnce", 409, "codeOnce"],
    ["tickets.oneEventPerOrder", 400, "oneEventPerOrder"],
    ["tickets.holdersMismatch", 400, "holdersMismatch"],
    ["tickets.termsRequired", 400, "termsRequired"],
    ["tickets.idempotencyKeyReused", 409, "idempotencyKeyReused"],
    ["tickets.paymentUnavailable", 502, "paymentUnavailable"],
    ["tickets.tooManyPending", 409, "tooManyOpenOrders"],
    ["tickets.stripeNotConnected", 502, "paymentUnavailable"],
    ["tickets.salesClosed", 409, "salesClosed"],
  ])("maps ep-api %s to the opaque code %s (HTTP %i)", async (apiCode, status, code) => {
    epFetch.mockRejectedValue(new FakeEpApiError(409, "/x", "translated sentence", apiCode, { ticketTypeId: TYPE_A, status: "sold_out" }));
    const res = await POST(post({ body: goodBody, ip: `198.51.101.${ipCounter++}` }));
    expect(res.status).toBe(status);
    const body = await res.json();
    expect(body.code).toBe(code);
    expect(body.details).toEqual({ ticketTypeId: TYPE_A, status: "sold_out" });
    expect(JSON.stringify(body)).not.toContain("translated sentence");
  });

  it("an unknown tickets.* code and an outage are opaque, and nothing logs a token or secret", async () => {
    epFetch.mockRejectedValueOnce(new FakeEpApiError(409, "/x", "secret detail", "tickets.somethingNew"));
    expect((await (await POST(post({ body: goodBody, ip: "198.51.100.70" }))).json()).code).toBe("invalid");

    epFetch.mockRejectedValueOnce(new FakeEpApiError(500, "/x", "boom"));
    const outage = await POST(post({ body: goodBody, ip: "198.51.100.71" }));
    expect(outage.status).toBe(502);
    for (const call of (console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls) {
      const logged = JSON.stringify(call);
      expect(logged).not.toContain(TOKEN);
      expect(logged).not.toContain("pi_123_secret_abc");
      expect(logged).not.toContain(KEY);
    }
  });

  it("forwards the buyer's phone and address and each holder's sameAddressAsBuyer (API-267), and refuses a bad phone or country", async () => {
    const body = {
      ...goodBody,
      buyer: { name: "Ada", email: "ada@example.com", phone: " +356 2123 4567 ", address: { street: "1 Main St", city: "Valletta", countryCode: "mt" } },
      holders: [{ ticketTypeId: TYPE_A, name: "Ada", email: "ada@example.com", sameAddressAsBuyer: true }],
    };
    const res = await POST(post({ body, ip: "198.51.100.71" }));
    expect(res.status).toBe(201);
    const sent = (epFetch.mock.calls[0] as [string, { body: { buyer: object; holders: Record<string, unknown>[] } }])[1].body;
    expect(sent.buyer).toEqual({ name: "Ada", email: "ada@example.com", phone: "+356 2123 4567", address: { street: "1 Main St", city: "Valletta", countryCode: "MT" } });
    expect(sent.holders[0]?.sameAddressAsBuyer).toBe(true);

    epFetch.mockClear();
    for (const buyer of [{ ...body.buyer, phone: "123" }, { ...body.buyer, address: { street: "1 Main St", city: "Valletta", countryCode: "MLT" } }]) {
      expect((await POST(post({ body: { ...body, buyer }, ip: "198.51.100.72" }))).status).toBe(400);
    }
    expect(epFetch).not.toHaveBeenCalled();
  });

  it("answers ep-api's tickets.contactRequired as its own code", async () => {
    epFetch.mockRejectedValue(new FakeEpApiError(400, "/tickets/orders", "missing", "tickets.contactRequired"));
    const res = await POST(post({ body: goodBody, ip: "198.51.100.73" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("contactRequired");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { requestCreateOrder, requestExtendHold, requestQuote } from "../../../lib/tickets/checkout-client";

const ID = "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11";
const TOKEN = "b".repeat(43);
const cart = { lines: [], subtotalCents: 0, discountCents: 0, feeCents: 0, totalCents: 0, vatCents: 0 };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => vi.unstubAllGlobals());

describe("checkout client (plain fetch to our own handlers)", () => {
  it("requestQuote posts JSON to /api/tickets/quote, no-store, and parses the answer", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ success: true, data: { totals: cart, codeStatus: "valid", currency: "EUR" } }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await requestQuote({ body: { lines: [{ ticketTypeId: ID, quantity: 1 }], newsletter: false } });
    expect(result).toEqual({ ok: true, data: { totals: cart, codeStatus: "valid", currency: "EUR" } });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/tickets/quote");
    expect(init).toMatchObject({ method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" } });
  });

  it("an unknown code status is read as unknown, never as valid", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ success: true, data: { totals: cart, codeStatus: "maybe", currency: "EUR" } })));
    const result = await requestQuote({ body: { lines: [{ ticketTypeId: ID, quantity: 1 }], newsletter: false } });
    expect(result.ok && result.data.codeStatus).toBe("unknown");
  });

  it("a refusal keeps only the opaque code and the affected ticket type, never the API text", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ success: false, error: "raw text", code: "soldOut", details: { ticketTypeId: ID, status: "sold_out" } }, 409)));
    const result = await requestQuote({ body: { lines: [], newsletter: false } as never });
    expect(result).toEqual({ ok: false, code: "soldOut", ticketTypeId: ID, status: 409 });
  });

  it("an unreadable refusal is 'generic'; a network failure is 'unavailable'; a malformed success is 'unavailable'", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>", { status: 500 })));
    expect(await requestQuote({ body: {} as never })).toMatchObject({ ok: false, code: "generic" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    expect(await requestQuote({ body: {} as never })).toMatchObject({ ok: false, code: "unavailable", status: 0 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ success: true, data: { nope: true } })));
    expect(await requestQuote({ body: {} as never })).toMatchObject({ ok: false, code: "unavailable" });
  });

  it("an aborted request rethrows (the quote hook ignores it)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError")));
    await expect(requestQuote({ body: {} as never })).rejects.toThrow();
  });

  it("requestCreateOrder posts to /api/tickets/orders", async () => {
    const data = { orderId: ID, buyerToken: TOKEN, holdExpiresAt: "2030-01-01T00:00:00Z", totals: cart, clientSecret: "pi_secret", publishableKey: "pk_test", free: false };
    const fetchMock = vi.fn().mockResolvedValue(json({ success: true, data }, 201));
    vi.stubGlobal("fetch", fetchMock);
    const result = await requestCreateOrder({ body: {} as never });
    expect(result).toMatchObject({ ok: true, data: { orderId: ID, free: false } });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/tickets/orders");
  });

  it("requestExtendHold sends the buyer token in a header, never in the URL, with no body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ success: true, data: { holdExpiresAt: "2030-01-01T00:10:00Z" } }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await requestExtendHold({ orderId: ID, token: TOKEN })).toEqual({ ok: true, data: { holdExpiresAt: "2030-01-01T00:10:00Z" } });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/tickets/orders/${ID}/extend`);
    expect(url).not.toContain(TOKEN);
    expect((init.headers as Record<string, string>)["x-order-token"]).toBe(TOKEN);
    expect(init.body).toBeUndefined();
  });
});

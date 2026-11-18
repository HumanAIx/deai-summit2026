import { beforeEach, describe, expect, it, vi } from "vitest";

const { epFetch, epFetchRaw, FakeEpApiError } = vi.hoisted(() => {
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
  return { epFetch: vi.fn(), epFetchRaw: vi.fn(), FakeEpApiError };
});
vi.mock("@/lib/tickets/ep-client", () => ({ epFetch, epFetchRaw, EpApiError: FakeEpApiError }));

const api = await import("../../../lib/tickets/api");

const TOKEN = "t".repeat(43);
const ticketBody = {
  code: "T-1",
  status: "valid",
  holder: { name: "Ada", email: null },
  ticketType: { name: "General", scope: { mode: "all" } },
  source: { kind: "event", name: "Summit", startDate: null, endDate: null, timeZone: "Europe/Malta", startsAt: null },
  seller: { name: null, vatNumber: null, replyTo: null },
};

beforeEach(() => {
  epFetch.mockReset();
  epFetchRaw.mockReset();
});

describe("tickets ep-api calls", () => {
  it("every call is no-store, and the token + buyer IP travel in headers (never in the path or query)", async () => {
    epFetch.mockResolvedValue(ticketBody);
    await api.fetchMyTicket({ token: TOKEN, locale: "de", ip: "203.0.113.9" });

    const [path, options] = epFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(path).toBe("/tickets/my/ticket");
    expect(path).not.toContain(TOKEN);
    expect(options).toMatchObject({ locale: "de", cache: "no-store", headers: { "x-ticket-token": TOKEN, "x-gconf-client-ip": "203.0.113.9" } });
    expect(options).not.toHaveProperty("next");
    expect(options).not.toHaveProperty("searchParams");
  });

  it("omits the IP header when the IP is unknown, and passes an explicit site key only when given", async () => {
    epFetch.mockResolvedValue(ticketBody);
    await api.fetchMyTicket({ token: TOKEN, locale: "en", ip: undefined });
    expect((epFetch.mock.calls[0]?.[1] as { headers: object }).headers).toEqual({ "x-ticket-token": TOKEN });
    expect(epFetch.mock.calls[0]?.[1]).not.toHaveProperty("siteKey");

    epFetch.mockResolvedValue({ status: "paid", orderNo: 1, paidAt: null, holdExpiresAt: null });
    await api.fetchOrderStatus({ orderId: "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11", token: TOKEN, locale: "en", ip: undefined, siteKey: "sk_site_x" });
    expect(epFetch.mock.calls[1]?.[0]).toBe("/tickets/orders/5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11/status");
    expect(epFetch.mock.calls[1]?.[1]).toMatchObject({ siteKey: "sk_site_x", headers: { "x-order-token": TOKEN } });
  });

  it("a 404 (wrong, foreign or expired token) is the opaque invalid state, for ticket and order alike", async () => {
    epFetch.mockRejectedValue(new FakeEpApiError(404, "/x", "tickets.linkNotFound"));
    expect(await api.fetchMyTicket({ token: TOKEN, locale: "en", ip: undefined })).toEqual({ state: "invalid" });
    expect(await api.fetchMyOrder({ token: TOKEN, locale: "en", ip: undefined })).toEqual({ state: "invalid" });
  });

  it("an outage, a rate limit or a shape ep-api never sends is NOT reported as a bad link", async () => {
    epFetch.mockRejectedValueOnce(new FakeEpApiError(502, "/x", "bad gateway"));
    await expect(api.fetchMyTicket({ token: TOKEN, locale: "en", ip: undefined })).rejects.toBeInstanceOf(FakeEpApiError);
    epFetch.mockRejectedValueOnce(new FakeEpApiError(429, "/x", "slow"));
    await expect(api.fetchMyOrder({ token: TOKEN, locale: "en", ip: undefined })).rejects.toBeInstanceOf(FakeEpApiError);
    epFetch.mockResolvedValueOnce({ nonsense: true });
    await expect(api.fetchMyTicket({ token: TOKEN, locale: "en", ip: undefined })).rejects.toThrow();
  });

  it("posts the lost-link email as a no-store POST body", async () => {
    epFetch.mockResolvedValue(undefined);
    await api.postLostLink({ email: "ada@example.com", locale: "en", ip: "203.0.113.9", siteKey: "sk_site_x" });
    expect(epFetch).toHaveBeenCalledWith("/tickets/my/lost-link", expect.objectContaining({ method: "POST", body: { email: "ada@example.com" }, cache: "no-store", siteKey: "sk_site_x" }));
  });

  it("reads the public types with no token header", async () => {
    epFetch.mockResolvedValue({ types: [], checkout: { salesOpen: true, testMode: false, feePayer: "buyer" } });
    const data = await api.fetchPublicTypes({ locale: "en", ip: undefined });
    expect(data.types).toEqual([]);
    expect(epFetch).toHaveBeenCalledWith("/tickets/types", expect.objectContaining({ cache: "no-store" }));
  });

  it("downloads go through epFetchRaw with the right token header", async () => {
    epFetchRaw.mockResolvedValue({ body: new ArrayBuffer(1), contentType: "application/pdf", contentDisposition: null });
    await api.fetchOrderDocument({ token: TOKEN, documentId: "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11", locale: "en", ip: undefined });
    expect(epFetchRaw.mock.calls[0]?.[0]).toBe("/tickets/my/order/documents/5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11");
    expect(epFetchRaw.mock.calls[0]?.[1]).toMatchObject({ cache: "no-store", headers: { "x-order-token": TOKEN } });

    await api.fetchTicketCalendar({ token: TOKEN, locale: "en", ip: undefined });
    expect(epFetchRaw.mock.calls[1]?.[0]).toBe("/tickets/my/ticket/calendar.ics");
    expect(epFetchRaw.mock.calls[1]?.[1]).toMatchObject({ headers: { "x-ticket-token": TOKEN } });
  });
  describe("checkout calls", () => {
    const type = { id: "t1", name: "Full", description: null, priceCents: 100, currency: "EUR", bookingFeeCents: 0, status: "on_sale", left: null, maxPerOrder: 10, source: { kind: "event", id: "e1", name: "Summit" } };
    const checkout = { salesOpen: true, testMode: false, feePayer: "buyer" };
    const cart = { lines: [], subtotalCents: 0, discountCents: 0, feeCents: 0, totalCents: 0, vatCents: 0 };

    it("fetchPublicTypes narrows by schedule or event with the API's own parameter names", async () => {
      epFetch.mockResolvedValue({ types: [type], checkout });
      await api.fetchPublicTypes({ locale: "en", ip: undefined, scheduleId: "s1" });
      expect(epFetch.mock.calls[0]?.[1]).toMatchObject({ cache: "no-store", searchParams: { scheduleId: "s1" } });
      await api.fetchPublicTypes({ locale: "en", ip: undefined, eventId: "e1" });
      expect(epFetch.mock.calls[1]?.[1]).toMatchObject({ searchParams: { eventId: "e1" } });
      await api.fetchPublicTypes({ locale: "en", ip: undefined });
      expect(epFetch.mock.calls[2]?.[1]).not.toHaveProperty("searchParams");
    });

    it("fetchLinkType reads /types/link/:token and returns the one type in the list shape", async () => {
      epFetch.mockResolvedValue({ type, checkout });
      const result = await api.fetchLinkType({ token: "L".repeat(24), locale: "en", ip: "203.0.113.9" });
      expect(epFetch.mock.calls[0]?.[0]).toBe(`/tickets/types/link/${"L".repeat(24)}`);
      expect(epFetch.mock.calls[0]?.[1]).toMatchObject({ cache: "no-store", headers: { "x-gconf-client-ip": "203.0.113.9" } });
      expect(result.types).toHaveLength(1);
      expect(result.checkout.salesOpen).toBe(true);
    });

    it("postQuote / postCreateOrder POST no-store and parse the answer; postExtendOrder sends the token as a header", async () => {
      epFetch.mockResolvedValue({ totals: cart, codeStatus: "none", currency: "EUR" });
      await api.postQuote({ body: { lines: [{ ticketTypeId: "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11", quantity: 1 }], newsletter: false }, locale: "en", ip: undefined, siteKey: "sk_site_x" });
      expect(epFetch.mock.calls[0]?.[0]).toBe("/tickets/orders/quote");
      expect(epFetch.mock.calls[0]?.[1]).toMatchObject({ method: "POST", cache: "no-store", siteKey: "sk_site_x" });

      epFetch.mockResolvedValue({ orderId: "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11", buyerToken: TOKEN, holdExpiresAt: "2030-01-01T00:00:00Z", totals: cart, clientSecret: null, publishableKey: null, free: true });
      const order = await api.postCreateOrder({ body: {} as never, locale: "en", ip: undefined });
      expect(epFetch.mock.calls[1]?.[0]).toBe("/tickets/orders");
      expect(order.free).toBe(true);

      epFetch.mockResolvedValue({ holdExpiresAt: "2030-01-01T00:10:00Z" });
      await api.postExtendOrder({ orderId: "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11", token: TOKEN, locale: "en", ip: undefined });
      expect(epFetch.mock.calls[2]?.[0]).toBe("/tickets/orders/5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11/extend");
      expect(epFetch.mock.calls[2]?.[0]).not.toContain(TOKEN);
      expect(epFetch.mock.calls[2]?.[1]).toMatchObject({ method: "POST", headers: { "x-order-token": TOKEN } });
    });

    it("an answer of an unknown shape throws (rule 25) instead of reaching the buyer", async () => {
      epFetch.mockResolvedValue({ totals: "nope" });
      await expect(api.postQuote({ body: { lines: [], newsletter: false } as never, locale: "en", ip: undefined })).rejects.toThrow();
    });
  });

  describe("holder self-service calls (DASH-205 F1)", () => {
    const TICKET_ID = "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11";

    it("the holder-token writes POST no-store with the token in a header, never in the path or body", async () => {
      epFetch.mockResolvedValue({ holder: { name: "Ada" } });
      await api.postMyTicketName({ token: TOKEN, body: { name: "Ada" }, locale: "en", ip: "203.0.113.9", siteKey: "sk_site_x" });
      epFetch.mockResolvedValue({ passedOnTo: { name: "Grace" }, emailSent: true });
      await api.postMyTicketPassOn({ token: TOKEN, body: { name: "Grace", email: "g@example.com" }, locale: "en", ip: undefined });

      const [namePath, nameOptions] = epFetch.mock.calls[0] as [string, Record<string, unknown>];
      expect(namePath).toBe("/tickets/my/ticket/name");
      expect(nameOptions).toMatchObject({ method: "POST", cache: "no-store", siteKey: "sk_site_x", body: { name: "Ada" }, headers: { "x-ticket-token": TOKEN, "x-gconf-client-ip": "203.0.113.9" } });
      expect(JSON.stringify(nameOptions.body)).not.toContain(TOKEN);
      const [passPath, passOptions] = epFetch.mock.calls[1] as [string, Record<string, unknown>];
      expect(passPath).toBe("/tickets/my/ticket/pass-on");
      expect(passOptions).toMatchObject({ method: "POST", cache: "no-store", headers: { "x-ticket-token": TOKEN } });
    });

    it("postMyTicketPassOnCheck posts the e-mail to /pass-on/check with the holder token header and parses { ok: true }", async () => {
      epFetch.mockResolvedValue({ ok: true });
      await expect(api.postMyTicketPassOnCheck({ token: TOKEN, body: { email: "g@example.com" }, locale: "en", ip: "203.0.113.9" })).resolves.toEqual({ ok: true });
      const [path, options] = epFetch.mock.calls[0] as [string, Record<string, unknown>];
      expect(path).toBe("/tickets/my/ticket/pass-on/check");
      expect(options).toMatchObject({ method: "POST", cache: "no-store", body: { email: "g@example.com" }, headers: { "x-ticket-token": TOKEN, "x-gconf-client-ip": "203.0.113.9" } });
      epFetch.mockResolvedValue({ ok: false });
      await expect(api.postMyTicketPassOnCheck({ token: TOKEN, body: { email: "g@example.com" }, locale: "en", ip: undefined })).rejects.toThrow();
    });

    it("the buyer-token calls: PATCH a holder (id in the path) and POST a refund request, token in x-order-token", async () => {
      epFetch.mockResolvedValue({ holder: { name: "Ivo", email: "i@example.com" }, nameChanged: true, emailChanged: false, emailSent: false });
      await api.patchMyOrderHolder({ token: TOKEN, ticketId: TICKET_ID, body: { name: "Ivo" }, locale: "en", ip: undefined });
      epFetch.mockResolvedValue({ refundRequest: { status: "open", createdAt: "2026-11-12T10:00:00Z", ticketCount: 1, reason: "other", reply: null } });
      const result = await api.postMyRefundRequest({ token: TOKEN, body: { ticketIds: [TICKET_ID], reason: "other" }, locale: "en", ip: undefined });

      const [holderPath, holderOptions] = epFetch.mock.calls[0] as [string, Record<string, unknown>];
      expect(holderPath).toBe(`/tickets/my/order/holders/${TICKET_ID}`);
      expect(holderPath).not.toContain(TOKEN);
      expect(holderOptions).toMatchObject({ method: "PATCH", cache: "no-store", headers: { "x-order-token": TOKEN } });
      const [refundPath, refundOptions] = epFetch.mock.calls[1] as [string, Record<string, unknown>];
      expect(refundPath).toBe("/tickets/my/order/refund-request");
      expect(refundOptions).toMatchObject({ method: "POST", headers: { "x-order-token": TOKEN } });
      expect(result.refundRequest.status).toBe("open");
    });

    it("an answer of an unknown shape throws (rule 25)", async () => {
      epFetch.mockResolvedValue({ nope: true });
      await expect(api.postMyTicketName({ token: TOKEN, body: { name: "Ada" }, locale: "en", ip: undefined })).rejects.toThrow();
      await expect(api.postMyRefundRequest({ token: TOKEN, body: { ticketIds: [TICKET_ID], reason: "other" }, locale: "en", ip: undefined })).rejects.toThrow();
    });
  });
});

describe("waitlist calls (DASH-205 F3)", () => {
  const TYPE_ID = "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11";
  const OFFER = "W".repeat(40);
  const offerBody = {
    type: { id: TYPE_ID, name: "Full pass", description: null, priceCents: 100, currency: "EUR", bookingFeeCents: 0, status: "sold_out", left: 0, maxPerOrder: 4, waitlistEnabled: true, source: { kind: "event", id: "e1", name: "Summit" } },
    checkout: { salesOpen: true, testMode: false, feePayer: "buyer" },
    quantity: 2,
    offerExpiresAt: "2030-03-01T10:30:00.000Z",
  };

  it("joining posts the person (never the type id) to the type's waitlist, no-store, with the buyer IP", async () => {
    epFetch.mockResolvedValue({ joined: true });
    await api.postWaitlistJoin({ body: { ticketTypeId: TYPE_ID, name: "Ada", email: "ada@example.com", quantity: 2 }, locale: "en", ip: "203.0.113.9", siteKey: "sk_site_x" });
    const [path, options] = epFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(path).toBe(`/tickets/types/${TYPE_ID}/waitlist`);
    expect(options).toMatchObject({ method: "POST", body: { name: "Ada", email: "ada@example.com", quantity: 2 }, cache: "no-store", siteKey: "sk_site_x", headers: { "x-gconf-client-ip": "203.0.113.9" } });
  });

  it("a join answer that is not the neutral shape throws", async () => {
    epFetch.mockResolvedValue({ nope: 1 });
    await expect(api.postWaitlistJoin({ body: { ticketTypeId: TYPE_ID, name: "Ada", email: "a@b.co", quantity: 1 }, locale: "en", ip: undefined })).rejects.toBeTruthy();
  });

  it("reads an offer by its token (no-store) and parses it", async () => {
    epFetch.mockResolvedValue(offerBody);
    const read = await api.fetchWaitlistOffer({ token: OFFER, locale: "de", ip: "203.0.113.9" });
    expect(read).toMatchObject({ state: "ok", data: { quantity: 2, offerExpiresAt: offerBody.offerExpiresAt } });
    const [path, options] = epFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(path).toBe(`/tickets/waitlist/offers/${OFFER}`);
    expect(options).toMatchObject({ locale: "de", cache: "no-store" });
  });

  it("an ended / unknown offer (404) is the one 'invalid' state; an outage is not", async () => {
    epFetch.mockRejectedValueOnce(new FakeEpApiError(404, "/x", "gone", "tickets.offerEnded"));
    expect(await api.fetchWaitlistOffer({ token: OFFER, locale: "en", ip: undefined })).toEqual({ state: "invalid" });
    epFetch.mockRejectedValueOnce(new FakeEpApiError(502, "/x", "down"));
    await expect(api.fetchWaitlistOffer({ token: OFFER, locale: "en", ip: undefined })).rejects.toBeInstanceOf(FakeEpApiError);
  });
});

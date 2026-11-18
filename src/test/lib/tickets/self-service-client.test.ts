import { afterEach, describe, expect, it, vi } from "vitest";
import { requestHolderEdit, requestNameCorrection, requestPassOn, requestRefund } from "../../../lib/tickets/self-service-client";

const TOKEN = "t".repeat(43);
const TICKET_ID = "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11";

afterEach(() => vi.unstubAllGlobals());

function respond(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

describe("self-service browser client", () => {
  it("posts the name to our own handler with the holder token in a header and parses the answer", async () => {
    const fetchMock = respond({ success: true, data: { holder: { name: "Ada" } } });
    vi.stubGlobal("fetch", fetchMock);
    const result = await requestNameCorrection({ token: TOKEN, body: { name: "Ada" } });
    expect(result).toEqual({ ok: true, data: { holder: { name: "Ada" } } });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toBe("/api/tickets/my/ticket/name");
    expect(url).not.toContain(TOKEN);
    expect(init).toMatchObject({ method: "POST", cache: "no-store", headers: { "x-ticket-token": TOKEN, "Content-Type": "application/json" } });
    expect(init.body).toBe(JSON.stringify({ name: "Ada" }));
  });

  it("pass-on, holder edit (PATCH, order token) and refund request each hit their own handler", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { passedOnTo: { name: "G" }, emailSent: true } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { holder: { name: "I", email: null }, nameChanged: true, emailChanged: false, emailSent: false } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { refundRequest: { status: "open", createdAt: "x", ticketCount: 1, reason: "other" } } }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    expect((await requestPassOn({ token: TOKEN, body: { name: "G", email: "g@example.com" } })).ok).toBe(true);
    expect((await requestHolderEdit({ token: TOKEN, ticketId: TICKET_ID, body: { name: "I" } })).ok).toBe(true);
    expect((await requestRefund({ token: TOKEN, body: { ticketIds: [TICKET_ID], reason: "other" } })).ok).toBe(true);
    expect(fetchMock.mock.calls.map((c) => [c[0], (c[1] as RequestInit).method, Object.keys((c[1] as { headers: object }).headers).filter((h) => h.startsWith("x-"))])).toEqual([
      ["/api/tickets/my/ticket/pass-on", "POST", ["x-ticket-token"]],
      [`/api/tickets/my/order/holders/${TICKET_ID}`, "PATCH", ["x-order-token"]],
      ["/api/tickets/my/order/refund-request", "POST", ["x-order-token"]],
    ]);
  });

  it("returns only the opaque code of a failure, never the API text", async () => {
    vi.stubGlobal("fetch", respond({ success: false, error: "private sentence", code: "changesClosed" }, 409));
    expect(await requestNameCorrection({ token: TOKEN, body: { name: "Ada" } })).toEqual({ ok: false, code: "changesClosed", status: 409 });
    vi.stubGlobal("fetch", respond({ nothing: true }, 500));
    expect(await requestNameCorrection({ token: TOKEN, body: { name: "Ada" } })).toEqual({ ok: false, code: "generic", status: 500 });
  });

  it("a success with an unknown shape, and a network failure, are 'unavailable'", async () => {
    vi.stubGlobal("fetch", respond({ success: true, data: { unexpected: 1 } }));
    expect(await requestNameCorrection({ token: TOKEN, body: { name: "Ada" } })).toMatchObject({ ok: false, code: "unavailable" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    expect(await requestPassOn({ token: TOKEN, body: { name: "G", email: "g@example.com" } })).toEqual({ ok: false, code: "unavailable", status: 0 });
  });
});

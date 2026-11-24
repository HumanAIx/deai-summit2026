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

const { PATCH } = await import("../../../../../../../../app/api/tickets/my/order/holders/[ticketId]/route");

const TOKEN = "b".repeat(43);
const TICKET_ID = "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11";
let ipCounter = 1;
const nextIp = () => `198.51.100.${ipCounter++}`;

function patch({ body, token = TOKEN, ip = nextIp(), origin }: { body: unknown; token?: string | null; ip?: string; origin?: string }) {
  return new NextRequest(`http://localhost:3003/api/tickets/my/order/holders/${TICKET_ID}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", host: "acme.example", "x-forwarded-for": ip, ...(token ? { "x-order-token": token } : {}), ...(origin ? { origin } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
const params = (ticketId: string) => ({ params: Promise.resolve({ ticketId }) });

beforeEach(() => {
  epFetch.mockReset();
  epFetch.mockResolvedValue({ holder: { name: "Ivo", email: "ivo@example.com" }, nameChanged: true, emailChanged: false, emailSent: false });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("PATCH /api/tickets/my/order/holders/[ticketId]", () => {
  it("forwards a PATCH with the buyer token in a header and the ticket id in the path only", async () => {
    const res = await PATCH(patch({ body: { name: " Ivo ", email: " Ivo@Example.com " }, ip: "203.0.113.70" }), params(TICKET_ID));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const [path, options] = epFetch.mock.calls[0] as [string, { method: string; body: unknown; headers: Record<string, string>; siteKey: string }];
    expect(path).toBe(`/tickets/my/order/holders/${TICKET_ID}`);
    expect(path).not.toContain(TOKEN);
    expect(options).toMatchObject({ method: "PATCH", body: { name: "Ivo", email: "ivo@example.com" }, headers: { "x-order-token": TOKEN, "x-gconf-client-ip": "203.0.113.70" } });
    expect(await res.json()).toEqual({ success: true, data: { holder: { name: "Ivo", email: "ivo@example.com" }, nameChanged: true, emailChanged: false, emailSent: false } });
  });

  it("accepts a name alone or an email alone, and rejects an empty body and an invalid value", async () => {
    expect((await PATCH(patch({ body: { name: "Ivo" } }), params(TICKET_ID))).status).toBe(200);
    expect((await PATCH(patch({ body: { email: "ivo@example.com" } }), params(TICKET_ID))).status).toBe(200);
    epFetch.mockClear();
    for (const body of [{}, { name: "" }, { email: "nope" }, "x", null]) {
      const res = await PATCH(patch({ body }), params(TICKET_ID));
      expect(res.status).toBe(400);
    }
    expect(epFetch).not.toHaveBeenCalled();
  });

  it("a ticket id that is not a uuid, and a missing or malformed token, are the same opaque 404", async () => {
    expect((await PATCH(patch({ body: { name: "Ivo" } }), params("not-a-uuid"))).status).toBe(404);
    expect((await PATCH(patch({ body: { name: "Ivo" }, token: null }), params(TICKET_ID))).status).toBe(404);
    expect((await PATCH(patch({ body: { name: "Ivo" }, token: "short" }), params(TICKET_ID))).status).toBe(404);
    expect(epFetch).not.toHaveBeenCalled();
  });

  it("refuses a cross-origin request with 403", async () => {
    expect((await PATCH(patch({ body: { name: "Ivo" }, origin: "https://evil.example" }), params(TICKET_ID))).status).toBe(403);
    expect(epFetch).not.toHaveBeenCalled();
  });

  it("a ticket of another order / site is ep-api's 404 and stays the same opaque answer; switches off are 403", async () => {
    epFetch.mockRejectedValueOnce(new FakeEpApiError(404, "/x", "api text", "tickets.linkNotFound"));
    const missing = await PATCH(patch({ body: { name: "Ivo" } }), params(TICKET_ID));
    expect(missing.status).toBe(404);
    expect((await missing.json()).code).toBe("linkNotFound");
    epFetch.mockRejectedValueOnce(new FakeEpApiError(403, "/x", "api text", "tickets.transfersOff"));
    const off = await PATCH(patch({ body: { email: "a@b.co" } }), params(TICKET_ID));
    expect(off.status).toBe(403);
    expect((await off.json()).code).toBe("transfersOff");
  });
});

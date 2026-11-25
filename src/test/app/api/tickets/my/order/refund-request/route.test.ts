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

const { POST } = await import("../../../../../../../app/api/tickets/my/order/refund-request/route");

const TOKEN = "b".repeat(43);
const T1 = "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11";
const T2 = "6d2f8b2f-3a5b-4b64-8b4f-1f7a7b5d2c22";
let ipCounter = 1;
const nextIp = () => `198.51.100.${ipCounter++}`;
const good = { ticketIds: [T1], reason: "cant_attend", message: "I am ill" };

function post({ body, token = TOKEN, ip = nextIp(), origin }: { body: unknown; token?: string | null; ip?: string; origin?: string }) {
  return new NextRequest("http://localhost:3003/api/tickets/my/order/refund-request", {
    method: "POST",
    headers: { "content-type": "application/json", host: "acme.example", "x-forwarded-for": ip, ...(token ? { "x-order-token": token } : {}), ...(origin ? { origin } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  epFetch.mockReset();
  epFetch.mockResolvedValue({ refundRequest: { status: "open", createdAt: "2026-11-12T10:00:00.000Z", ticketCount: 1, reason: "cant_attend", reply: null } });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("POST /api/tickets/my/order/refund-request", () => {
  it("forwards tickets, reason and message with the order token in a header; answers 201 no-store with the request status only", async () => {
    const res = await POST(post({ body: { ...good, ticketIds: [T1, T2], message: "  I am ill  " }, ip: "203.0.113.80" }));
    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const [path, options] = epFetch.mock.calls[0] as [string, { method: string; body: unknown; headers: Record<string, string>; siteKey: string }];
    expect(path).toBe("/tickets/my/order/refund-request");
    expect(options).toMatchObject({ method: "POST", body: { ticketIds: [T1, T2], reason: "cant_attend", message: "I am ill" }, headers: { "x-order-token": TOKEN, "x-gconf-client-ip": "203.0.113.80" } });
    expect(await res.json()).toEqual({ success: true, data: { refundRequest: { status: "open", createdAt: "2026-11-12T10:00:00.000Z", ticketCount: 1, reason: "cant_attend", reply: null } } });
  });

  it("the message is optional", async () => {
    expect((await POST(post({ body: { ticketIds: [T1], reason: "other" } }))).status).toBe(201);
  });

  it("rejects no tickets, duplicate ids, a non-uuid id, an unknown reason, a message over 1000 characters (400)", async () => {
    for (const body of [{ ...good, ticketIds: [] }, { ...good, ticketIds: [T1, T1] }, { ...good, ticketIds: ["x"] }, { ...good, reason: "because" }, { ...good, message: "m".repeat(1001) }, {}, "x", null]) {
      const res = await POST(post({ body }));
      expect(res.status).toBe(400);
      expect((await res.json()).code).toBe("invalid");
    }
    expect(epFetch).not.toHaveBeenCalled();
  });

  it("a missing or malformed token is the same opaque 404, and a holder token header alone does not count", async () => {
    expect((await POST(post({ body: good, token: null }))).status).toBe(404);
    expect((await POST(post({ body: good, token: "nope" }))).status).toBe(404);
    expect(epFetch).not.toHaveBeenCalled();
  });

  it("refuses a cross-origin POST with 403", async () => {
    expect((await POST(post({ body: good, origin: "https://evil.example" }))).status).toBe(403);
    expect(epFetch).not.toHaveBeenCalled();
  });

  it("maps an open request, un-refundable tickets and a refunded order to opaque 409 codes, never echoing API text", async () => {
    for (const [key, code] of [
      ["tickets.refundRequestOpen", "refundRequestOpen"],
      ["tickets.ticketsNotRefundable", "ticketsNotRefundable"],
      ["tickets.orderNotRefundable", "orderNotRefundable"],
    ] as const) {
      epFetch.mockRejectedValueOnce(new FakeEpApiError(409, "/x", "private api sentence", key));
      const res = await POST(post({ body: good }));
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.code).toBe(code);
      expect(JSON.stringify(body)).not.toContain("private api sentence");
    }
  });
});

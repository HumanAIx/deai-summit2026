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

const { POST } = await import("../../../../../../../../app/api/tickets/my/ticket/pass-on/check/route");

const TOKEN = "h".repeat(43);
let ipCounter = 1;
const nextIp = () => `198.51.100.${ipCounter++}`;

function post({ body, token = TOKEN, ip = nextIp(), origin }: { body: unknown; token?: string | null; ip?: string; origin?: string }) {
  return new NextRequest("http://localhost:3003/api/tickets/my/ticket/pass-on/check", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip, ...(token ? { "x-ticket-token": token } : {}), ...(origin ? { origin } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  epFetch.mockReset();
  epFetch.mockResolvedValue({ ok: true });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("POST /api/tickets/my/ticket/pass-on/check", () => {
  it("forwards the e-mail (lower-cased) with the holder token in a header, answers no-store", async () => {
    const res = await POST(post({ body: { email: " Grace@Example.COM " }, ip: "203.0.113.60" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ success: true, data: { ok: true } });
    const [path, options] = epFetch.mock.calls[0] as [string, { method: string; body: unknown; headers: Record<string, string> }];
    expect(path).toBe("/tickets/my/ticket/pass-on/check");
    expect(options).toMatchObject({ method: "POST", body: { email: "grace@example.com" }, headers: { "x-ticket-token": TOKEN, "x-gconf-client-ip": "203.0.113.60" } });
  });

  it("a missing or malformed token is the opaque 404 notFound", async () => {
    for (const token of [null, "nope"]) {
      const res = await POST(post({ body: { email: "g@example.com" }, token }));
      expect(res.status).toBe(404);
      expect((await res.json()).code).toBe("notFound");
    }
    expect(epFetch).not.toHaveBeenCalled();
  });

  it("rejects a bad body with 400 invalid", async () => {
    for (const body of [{}, { email: "not-an-email" }, { email: "" }, "x", null]) {
      const res = await POST(post({ body }));
      expect(res.status).toBe(400);
      expect((await res.json()).code).toBe("invalid");
    }
    expect(epFetch).not.toHaveBeenCalled();
  });

  it("refuses a cross-origin POST with 403", async () => {
    expect((await POST(post({ body: { email: "g@example.com" }, origin: "https://evil.example" }))).status).toBe(403);
    expect(epFetch).not.toHaveBeenCalled();
  });

  it("relays ep-api's refusals as opaque codes (409 passOnSameEmail, transfers off, closed window)", async () => {
    for (const [status, key, code, expectedStatus] of [
      [409, "tickets.passOnSameEmail", "passOnSameEmail", 409],
      [403, "tickets.transfersOff", "transfersOff", 403],
      [409, "tickets.changesClosed", "changesClosed", 409],
    ] as const) {
      epFetch.mockRejectedValueOnce(new FakeEpApiError(status, "/x", "api text", key));
      const res = await POST(post({ body: { email: "g@example.com" } }));
      const json = await res.json();
      expect(res.status).toBe(expectedStatus);
      expect(json.code).toBe(code);
      expect(JSON.stringify(json)).not.toContain("api text");
    }
  });

  it("answers an opaque 502 when ep-api is down", async () => {
    epFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const res = await POST(post({ body: { email: "g@example.com" } }));
    expect(res.status).toBe(502);
    expect((await res.json()).code).toBe("unavailable");
  });

  it("rate-limits per IP: 20 per 10 minutes, then 429", async () => {
    const ip = "192.0.2.201";
    const statuses: number[] = [];
    for (let i = 0; i < 22; i += 1) statuses.push((await POST(post({ body: { email: "g@example.com" }, ip }))).status);
    expect(statuses.slice(0, 20).every((s) => s === 200)).toBe(true);
    expect(statuses.slice(20)).toEqual([429, 429]);
  });
});

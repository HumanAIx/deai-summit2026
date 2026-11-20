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

const { POST } = await import("../../../../../../../app/api/tickets/my/ticket/pass-on/route");

const TOKEN = "h".repeat(43);
let ipCounter = 1;
const nextIp = () => `198.51.100.${ipCounter++}`;

function post({ body, token = TOKEN, ip = nextIp(), origin }: { body: unknown; token?: string | null; ip?: string; origin?: string }) {
  return new NextRequest("http://localhost:3003/api/tickets/my/ticket/pass-on", {
    method: "POST",
    headers: { "content-type": "application/json", host: "acme.example", "x-forwarded-for": ip, ...(token ? { "x-ticket-token": token } : {}), ...(origin ? { origin } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  epFetch.mockReset();
  epFetch.mockResolvedValue({ passedOnTo: { name: "Grace Hopper" }, emailSent: true });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("POST /api/tickets/my/ticket/pass-on", () => {
  it("forwards the new holder (email lower-cased) with the holder token in a header and answers no-store", async () => {
    const res = await POST(post({ body: { name: " Grace Hopper ", email: " Grace@Example.COM " }, ip: "203.0.113.60" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ success: true, data: { passedOnTo: { name: "Grace Hopper" }, emailSent: true } });
    const [path, options] = epFetch.mock.calls[0] as [string, { method: string; body: unknown; headers: Record<string, string>; siteKey: string }];
    expect(path).toBe("/tickets/my/ticket/pass-on");
    expect(options).toMatchObject({ method: "POST", body: { name: "Grace Hopper", email: "grace@example.com" }, headers: { "x-ticket-token": TOKEN, "x-gconf-client-ip": "203.0.113.60" } });
  });

  it("a missing or malformed token is the same opaque 404", async () => {
    for (const token of [null, "nope"]) {
      expect((await POST(post({ body: { name: "G", email: "g@example.com" }, token }))).status).toBe(404);
    }
    expect(epFetch).not.toHaveBeenCalled();
  });

  it("rejects a missing name or email, an invalid email and extra fields' absence with 400", async () => {
    for (const body of [{ name: "G" }, { email: "g@example.com" }, { name: "G", email: "not-an-email" }, { name: "", email: "g@example.com" }, { name: "G", email: `${"a".repeat(250)}@example.com` }, "x", null]) {
      const res = await POST(post({ body }));
      expect(res.status).toBe(400);
      expect((await res.json()).code).toBe("invalid");
    }
    expect(epFetch).not.toHaveBeenCalled();
  });

  it("refuses a cross-origin POST with 403", async () => {
    expect((await POST(post({ body: { name: "G", email: "g@example.com" }, origin: "https://evil.example" }))).status).toBe(403);
    expect(epFetch).not.toHaveBeenCalled();
  });

  it("maps transfers off, closed window and same email to their own opaque codes", async () => {
    for (const [status, key, code] of [
      [403, "tickets.transfersOff", "transfersOff"],
      [409, "tickets.changesClosed", "changesClosed"],
      [409, "tickets.passOnSameEmail", "passOnSameEmail"],
      [404, "tickets.linkNotFound", "linkNotFound"],
      [429, "tickets.whatever", "rateLimited"],
    ] as const) {
      epFetch.mockRejectedValueOnce(new FakeEpApiError(status, "/x", "api text", key));
      const res = await POST(post({ body: { name: "G", email: "g@example.com" } }));
      expect((await res.json()).code).toBe(code);
    }
  });
});

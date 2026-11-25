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

const { POST } = await import("../../../../../../../app/api/tickets/my/ticket/cancel/route");

const TOKEN = "h".repeat(43);
let ipCounter = 1;
const nextIp = () => `198.51.100.${ipCounter++}`;

function post({ token = TOKEN, ip = nextIp(), origin }: { token?: string | null; ip?: string; origin?: string } = {}) {
  return new NextRequest("http://localhost:3003/api/tickets/my/ticket/cancel", {
    method: "POST",
    headers: { "content-type": "application/json", host: "acme.example", "x-forwarded-for": ip, ...(token ? { "x-ticket-token": token } : {}), ...(origin ? { origin } : {}) },
    body: "{}",
  });
}

beforeEach(() => {
  epFetch.mockReset();
  epFetch.mockResolvedValue({ code: "T-1", status: "void", holder: { name: "Ada", email: "ada@example.com" } });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("POST /api/tickets/my/ticket/cancel", () => {
  it("forwards the token in a HEADER with an empty body, and answers only the status, no-store", async () => {
    const res = await POST(post({ ip: "203.0.113.60" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ success: true, data: { status: "void" } });
    const [path, options] = epFetch.mock.calls[0] as [string, { method: string; body: unknown; headers: Record<string, string>; siteKey: string }];
    expect(path).toBe("/tickets/my/ticket/cancel");
    expect(path).not.toContain(TOKEN);
    expect(options).toMatchObject({ method: "POST", body: {}, headers: { "x-ticket-token": TOKEN, "x-gconf-client-ip": "203.0.113.60" } });
  });

  it("a missing or malformed token is an opaque 404 with no ep-api call", async () => {
    for (const token of [null, "short", `${"h".repeat(42)}!`]) {
      const res = await POST(post({ token }));
      expect(res.status).toBe(404);
      expect((await res.json()).code).toBe("notFound");
    }
    expect(epFetch).not.toHaveBeenCalled();
  });

  it("refuses a cross-origin POST", async () => {
    expect((await POST(post({ origin: "https://evil.example" }))).status).toBe(403);
    expect(epFetch).not.toHaveBeenCalled();
  });

  it("maps ep-api's cancelNotAllowed to a 409 with its own opaque code and no API text", async () => {
    epFetch.mockRejectedValueOnce(new FakeEpApiError(409, "/x", "internal sentence", "tickets.cancelNotAllowed"));
    const res = await POST(post());
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("cancelNotAllowed");
    expect(JSON.stringify(body)).not.toContain("internal sentence");
  });

  it("an outage is a 502 'unavailable'", async () => {
    epFetch.mockRejectedValueOnce(new FakeEpApiError(0, "/x", "connect ECONNREFUSED"));
    const res = await POST(post());
    expect(res.status).toBe(502);
    expect((await res.json()).code).toBe("unavailable");
  });
});

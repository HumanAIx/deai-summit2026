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

const { POST } = await import("../../../../../../../app/api/tickets/my/ticket/name/route");

const TOKEN = "h".repeat(43);
let ipCounter = 1;
const nextIp = () => `198.51.100.${ipCounter++}`;

function post({ body, token = TOKEN, ip = nextIp(), origin, host = "acme.example" }: { body: unknown; token?: string | null; ip?: string; origin?: string; host?: string }) {
  return new NextRequest("http://localhost:3003/api/tickets/my/ticket/name", {
    method: "POST",
    headers: { "content-type": "application/json", host, "x-forwarded-for": ip, ...(token ? { "x-ticket-token": token } : {}), ...(origin ? { origin } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  epFetch.mockReset();
  epFetch.mockResolvedValue({ holder: { name: "Ada Lovelace" } });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("POST /api/tickets/my/ticket/name", () => {
  it("forwards the trimmed name with the token in a HEADER, the site key and the buyer IP, no-store", async () => {
    const res = await POST(post({ body: { name: "  Ada Lovelace " }, ip: "203.0.113.50" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ success: true, data: { holder: { name: "Ada Lovelace" } } });
    const [path, options] = epFetch.mock.calls[0] as [string, { method: string; body: unknown; headers: Record<string, string>; cache: string }];
    expect(path).toBe("/tickets/my/ticket/name");
    expect(path).not.toContain(TOKEN);
    expect(options).toMatchObject({ method: "POST", body: { name: "Ada Lovelace" }, cache: "no-store", headers: { "x-ticket-token": TOKEN, "x-gconf-client-ip": "203.0.113.50" } });
  });

  it("a missing or malformed token is the same opaque 404 and never reaches ep-api", async () => {
    for (const token of [null, "short", `${"h".repeat(42)}!`]) {
      const res = await POST(post({ body: { name: "Ada" }, token }));
      expect(res.status).toBe(404);
      expect((await res.json()).code).toBe("notFound");
    }
    expect(epFetch).not.toHaveBeenCalled();
  });

  it("rejects an empty or too long name, a non-JSON body and unknown shapes with 400 and no ep-api call", async () => {
    for (const body of [{ name: "  " }, { name: "x".repeat(201) }, {}, "not json", null]) {
      const res = await POST(post({ body }));
      expect(res.status).toBe(400);
      expect((await res.json()).code).toBe("invalid");
    }
    expect(epFetch).not.toHaveBeenCalled();
  });

  it("refuses a cross-origin POST with an opaque 403, and accepts the same origin", async () => {
    expect((await POST(post({ body: { name: "Ada" }, origin: "https://evil.example" }))).status).toBe(403);
    expect(epFetch).not.toHaveBeenCalled();
    expect((await POST(post({ body: { name: "Ada" }, origin: "https://acme.example" }))).status).toBe(200);
  });


  it("maps ep-api refusals to opaque codes (switch off 403, window closed 409, another site's token 404) without any API text", async () => {
    for (const [status, code, expectedStatus, expectedCode] of [
      [403, "tickets.nameChangesOff", 403, "nameChangesOff"],
      [409, "tickets.changesClosed", 409, "changesClosed"],
      [404, "tickets.linkNotFound", 404, "linkNotFound"],
    ] as const) {
      epFetch.mockRejectedValueOnce(new FakeEpApiError(status, "/x", "internal sentence from ep-api", code));
      const res = await POST(post({ body: { name: "Ada" } }));
      expect(res.status).toBe(expectedStatus);
      const body = await res.json();
      expect(body.code).toBe(expectedCode);
      expect(JSON.stringify(body)).not.toContain("internal sentence");
    }
  });

  it("an outage is a 502 'unavailable' and is logged without the token", async () => {
    epFetch.mockRejectedValueOnce(new FakeEpApiError(0, "/x", "connect ECONNREFUSED"));
    const res = await POST(post({ body: { name: "Ada" } }));
    expect(res.status).toBe(502);
    expect((await res.json()).code).toBe("unavailable");
    expect(JSON.stringify((console.error as unknown as { mock: { calls: unknown[] } }).mock.calls)).not.toContain(TOKEN);
  });

  it("rate limits one IP to 20 per 10 minutes (429)", async () => {
    const ip = "203.0.113.200";
    for (let i = 0; i < 20; i += 1) expect((await POST(post({ body: { name: "Ada" }, ip }))).status).toBe(200);
    const res = await POST(post({ body: { name: "Ada" }, ip }));
    expect(res.status).toBe(429);
    expect((await res.json()).code).toBe("rateLimited");
  });
});

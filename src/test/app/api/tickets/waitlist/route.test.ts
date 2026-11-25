import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { epFetch, FakeEpApiError } = vi.hoisted(() => {
  class FakeEpApiError extends Error {
    constructor(
      readonly status: number,
      readonly path: string,
      message: string,
      readonly code?: string,
    ) {
      super(message);
    }
  }
  return { epFetch: vi.fn(), FakeEpApiError };
});
vi.mock("@/lib/tickets/ep-client", () => ({ epFetch, epFetchRaw: vi.fn(), EpApiError: FakeEpApiError }));

const { POST } = await import("../../../../../app/api/tickets/waitlist/route");

const TYPE_ID = "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11";
const valid = { ticketTypeId: TYPE_ID, name: " Ada Lovelace ", email: " Ada@Example.COM ", quantity: 2 };

function post({ body, ip = "203.0.113.1", origin, host = "acme.example" }: { body: unknown; ip?: string; origin?: string; host?: string }) {
  return new NextRequest("http://localhost:3003/api/tickets/waitlist", {
    method: "POST",
    headers: { "content-type": "application/json", host, "x-forwarded-for": ip, ...(origin ? { origin } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  epFetch.mockReset();
  epFetch.mockResolvedValue({ joined: true });
});

describe("POST /api/tickets/waitlist", () => {
  it("resolves the site from Host and forwards the trimmed body (type id in the path), the key and the buyer IP, no-store", async () => {
    const res = await POST(post({ body: valid, ip: "198.51.100.7" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(epFetch).toHaveBeenCalledWith(
      `/tickets/types/${TYPE_ID}/waitlist`,
      expect.objectContaining({
        method: "POST",
        body: { name: "Ada Lovelace", email: "ada@example.com", quantity: 2 },
                cache: "no-store",
        headers: { "x-gconf-client-ip": "198.51.100.7" },
      }),
    );
  });

  it("answers the same neutral success every time and never echoes the person", async () => {
    const first = await POST(post({ body: valid, ip: "198.51.100.10" }));
    const second = await POST(post({ body: { ...valid, email: "other@example.com" }, ip: "198.51.100.11" }));
    const text = await first.text();
    expect(JSON.parse(text)).toEqual({ success: true, data: { joined: true } });
    expect(text).not.toContain("ada");
    expect(await second.json()).toEqual({ success: true, data: { joined: true } });
  });

  it("rejects a bad body with 400 and never calls ep-api (email, quantity, name, type id, not JSON)", async () => {
    const bodies = [
      { ...valid, email: "nope" },
      { ...valid, quantity: 0 },
      { ...valid, quantity: 1.5 },
      { ...valid, quantity: "2" },
      { ...valid, name: "  " },
      { ...valid, ticketTypeId: "not-a-uuid" },
      {},
      "not json",
      null,
    ];
    let n = 100;
    for (const body of bodies) {
      const res = await POST(post({ body, ip: `198.51.100.${n++}` }));
      expect(res.status).toBe(400);
      expect((await res.json()).code).toBe("invalid");
    }
    expect(epFetch).not.toHaveBeenCalled();
  });

  it("refuses a cross-origin POST with an opaque 403, accepts a same-origin one", async () => {
    const refused = await POST(post({ body: valid, origin: "https://evil.example", ip: "198.51.100.30" }));
    expect(refused.status).toBe(403);
    expect(epFetch).not.toHaveBeenCalled();
    expect((await POST(post({ body: valid, origin: "https://acme.example", ip: "198.51.100.31" }))).status).toBe(200);
  });


  it("rate-limits per IP: 5 per 10 minutes, then 429", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 7; i += 1) statuses.push((await POST(post({ body: valid, ip: "198.51.100.50" }))).status);
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429, 429]);
    expect((await POST(post({ body: valid, ip: "198.51.100.51" }))).status).toBe(200);
  });

  it("maps ep-api's refusals to opaque codes: closed waitlist, over the maximum, unknown type", async () => {
    const cases: [FakeEpApiErrorLike, number, string][] = [
      [new FakeEpApiError(409, "/x", "raw", "tickets.waitlistClosed"), 409, "waitlistClosed"],
      [new FakeEpApiError(400, "/x", "raw", "tickets.overMax"), 409, "overMax"],
      [new FakeEpApiError(404, "/x", "raw", "tickets.typeNotFound"), 404, "linkNotFound"],
    ];
    let n = 60;
    for (const [error, status, code] of cases) {
      epFetch.mockRejectedValueOnce(error);
      const res = await POST(post({ body: valid, ip: `198.51.100.${n++}` }));
      expect(res.status).toBe(status);
      const json = await res.json();
      expect(json).toMatchObject({ success: false, code });
      expect(JSON.stringify(json)).not.toContain("raw");
    }
  });

  it("maps an ep-api outage to an opaque 502 (no upstream text leaks)", async () => {
    epFetch.mockRejectedValue(new FakeEpApiError(500, "/x", "boom: secret internal detail"));
    const res = await POST(post({ body: valid, ip: "198.51.100.80" }));
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(text).not.toContain("secret internal detail");
    expect(JSON.parse(text).code).toBe("unavailable");
  });

  it("an answer that is not the neutral shape is an outage, not a success", async () => {
    epFetch.mockResolvedValue({ somethingElse: true });
    const res = await POST(post({ body: valid, ip: "198.51.100.90" }));
    expect(res.status).not.toBe(200);
  });
});

type FakeEpApiErrorLike = InstanceType<typeof FakeEpApiError>;

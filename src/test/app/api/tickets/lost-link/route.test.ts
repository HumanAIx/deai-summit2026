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

const { POST } = await import("../../../../../app/api/tickets/lost-link/route");

function post({ body, ip = "203.0.113.1", origin, host = "acme.example" }: { body: unknown; ip?: string; origin?: string; host?: string }) {
  return new NextRequest("http://localhost:3003/api/tickets/lost-link", {
    method: "POST",
    headers: { "content-type": "application/json", host, "x-forwarded-for": ip, ...(origin ? { origin } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  epFetch.mockReset();
  epFetch.mockResolvedValue(undefined);
});

describe("POST /api/tickets/lost-link", () => {
  it("resolves the site from Host, forwards the lowercased email, the key and the buyer IP, and answers a neutral 202", async () => {
    const res = await POST(post({ body: { email: " Ada@Example.COM " }, ip: "198.51.100.7" }));

    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ success: true });
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(epFetch).toHaveBeenCalledWith(
      "/tickets/my/lost-link",
      expect.objectContaining({
        method: "POST",
        body: { email: "ada@example.com" },
                cache: "no-store",
        headers: { "x-gconf-client-ip": "198.51.100.7" },
      }),
    );
  });

  it("gives the identical answer whether or not ep-api found tickets (it always 202s)", async () => {
    const first = await POST(post({ body: { email: "known@example.com" }, ip: "198.51.100.10" }));
    const second = await POST(post({ body: { email: "unknown@example.com" }, ip: "198.51.100.11" }));
    expect(first.status).toBe(second.status);
    expect(await first.json()).toEqual(await second.json());
  });

  it("rejects an invalid email or body with 400 and never calls ep-api", async () => {
    for (const body of [{ email: "nope" }, {}, "not json", null]) {
      const res = await POST(post({ body, ip: "198.51.100.20" }));
      expect(res.status).toBe(400);
      expect((await res.json()).code).toBe("invalid");
    }
    expect(epFetch).not.toHaveBeenCalled();
  });

  it("refuses a cross-origin POST with an opaque 403", async () => {
    const res = await POST(post({ body: { email: "a@b.co" }, origin: "https://evil.example", ip: "198.51.100.30" }));
    expect(res.status).toBe(403);
    expect(epFetch).not.toHaveBeenCalled();
  });

  it("accepts a same-origin browser POST", async () => {
    const res = await POST(post({ body: { email: "a@b.co" }, origin: "https://acme.example", ip: "198.51.100.31" }));
    expect(res.status).toBe(202);
  });


  it("rate-limits per IP: 5 per 10 minutes, then 429", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 7; i += 1) statuses.push((await POST(post({ body: { email: "a@b.co" }, ip: "198.51.100.50" }))).status);
    expect(statuses).toEqual([202, 202, 202, 202, 202, 429, 429]);
    // another IP is unaffected
    expect((await POST(post({ body: { email: "a@b.co" }, ip: "198.51.100.51" }))).status).toBe(202);
  });

  it("maps an ep-api outage to an opaque 502 (no upstream text or status leaks)", async () => {
    epFetch.mockRejectedValue(new FakeEpApiError(500, "/tickets/my/lost-link", "boom: secret internal detail"));
    const res = await POST(post({ body: { email: "a@b.co" }, ip: "198.51.100.60" }));
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(text).not.toContain("secret internal detail");
    expect(JSON.parse(text).code).toBe("unavailable");
  });
});

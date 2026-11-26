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

const { POST } = await import("../../../../../app/api/tickets/sign-in/route");

const TOKEN = "s".repeat(43);

function post({ token = TOKEN, ip = "203.0.113.1", origin, host = "deaisummit.test", protocol = "https" }: { token?: string | null; ip?: string; origin?: string; host?: string; protocol?: string } = {}) {
  const form = new URLSearchParams(token === null ? {} : { token });
  return new NextRequest(`${protocol}://${host}/api/tickets/sign-in`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", host, "x-forwarded-for": ip, ...(origin ? { origin } : {}) },
    body: form.toString(),
  });
}

beforeEach(() => {
  epFetch.mockReset();
  epFetch.mockResolvedValue({ sessionToken: "session-token-" + "x".repeat(30), expiresAt: new Date(Date.now() + 3600_000).toISOString() });
});

describe("POST /api/tickets/sign-in", () => {
  it("exchanges the token at ep-api (token in the body only), sets an httpOnly Secure Lax cookie and redirects to /tickets/me", async () => {
    const res = await post_ok();
    expect(res.status).toBe(303);
    expect(new URL(res.headers.get("location") ?? "").pathname).toBe("/tickets/me");
    expect(epFetch).toHaveBeenCalledWith("/tickets/my/sign-in", expect.objectContaining({ method: "POST", body: { token: TOKEN }, cache: "no-store" }));
    const cookie = res.cookies.get("tk_session");
    expect(cookie?.value.startsWith("session-token-")).toBe(true);
    expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", path: "/" });
    expect(cookie?.maxAge).toBeGreaterThan(3500);
    expect(cookie?.maxAge).toBeLessThanOrEqual(3600);
    expect(res.headers.get("location")).not.toContain(TOKEN);
  });

  it("is not Secure on plain-http local development", async () => {
    const res = await POST(post({ host: "localhost:3002", protocol: "http", ip: "198.51.100.2" }));
    expect(res.cookies.get("tk_session")?.secure).toBe(false);
  });

  it("an unknown / used / expired token (ep-api 404) sets no cookie and shows the expired state on the lost-link page", async () => {
    epFetch.mockRejectedValue(new FakeEpApiError(404, "/tickets/my/sign-in", "not found", "tickets.linkNotFound"));
    const res = await POST(post({ ip: "198.51.100.3" }));
    expect(res.status).toBe(303);
    const location = new URL(res.headers.get("location") ?? "");
    expect(location.pathname + location.search).toBe("/tickets/lost?notice=expired");
    expect(res.cookies.get("tk_session")).toBeUndefined();
  });

  it("a missing or malformed token never calls ep-api", async () => {
    for (const token of [null, "bad!"]) {
      const res = await POST(post({ token, ip: "198.51.100.4" }));
      expect(new URL(res.headers.get("location") ?? "").search).toBe("?notice=expired");
    }
    expect(epFetch).not.toHaveBeenCalled();
  });

  it("refuses a cross-origin POST (403) and rate-limits per IP", async () => {
    expect((await POST(post({ origin: "https://evil.example", ip: "198.51.100.5" }))).status).toBe(403);
    expect(epFetch).not.toHaveBeenCalled();
    const statuses: number[] = [];
    for (let i = 0; i < 12; i += 1) statuses.push((await POST(post({ ip: "198.51.100.6" }))).status);
    expect(statuses.slice(0, 10).every((status) => status === 303)).toBe(true);
    expect(statuses.slice(10)).toEqual([429, 429]);
  });

  it("maps an ep-api outage to an opaque 502", async () => {
    epFetch.mockRejectedValue(new FakeEpApiError(500, "/tickets/my/sign-in", "boom: secret detail"));
    const res = await POST(post({ ip: "198.51.100.7" }));
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain("secret detail");
  });

  function post_ok() {
    return POST(post({ ip: "198.51.100.1" }));
  }
});

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

const { POST } = await import("../../../../../app/api/tickets/sign-out/route");
const { GET } = await import("../../../../../app/api/tickets/session/route");

function post({ cookie, ip = "203.0.113.1", origin }: { cookie?: string; ip?: string; origin?: string } = {}) {
  return new NextRequest("https://deaisummit.test/api/tickets/sign-out", {
    method: "POST",
    headers: { host: "deaisummit.test", "x-forwarded-for": ip, ...(cookie ? { cookie: `tk_session=${cookie}` } : {}), ...(origin ? { origin } : {}) },
  });
}

beforeEach(() => {
  epFetch.mockReset();
  epFetch.mockResolvedValue(undefined);
});

describe("POST /api/tickets/sign-out", () => {
  it("ends the session at ep-api with the cookie value as x-session-token, clears the cookie and redirects with the signed-out notice", async () => {
    const res = await POST(post({ cookie: "sess-abc", ip: "198.51.100.1" }));
    expect(epFetch).toHaveBeenCalledWith("/tickets/my/sign-out", expect.objectContaining({ method: "POST", headers: expect.objectContaining({ "x-session-token": "sess-abc" }) }));
    expect(res.status).toBe(303);
    const location = new URL(res.headers.get("location") ?? "");
    expect(location.pathname + location.search).toBe("/tickets/lost?notice=signedOut");
    expect(res.cookies.get("tk_session")).toMatchObject({ value: "", maxAge: 0, httpOnly: true, path: "/" });
  });

  it("clears the cookie even when ep-api fails (never leave the visitor signed in on this browser)", async () => {
    epFetch.mockRejectedValue(new FakeEpApiError(500, "/tickets/my/sign-out", "boom"));
    const res = await POST(post({ cookie: "sess-abc", ip: "198.51.100.2" }));
    expect(res.status).toBe(303);
    expect(res.cookies.get("tk_session")?.maxAge).toBe(0);
  });

  it("without a cookie makes no ep-api call; a cross-origin POST is refused", async () => {
    expect((await POST(post({ ip: "198.51.100.3" }))).status).toBe(303);
    expect(epFetch).not.toHaveBeenCalled();
    expect((await POST(post({ cookie: "x", origin: "https://evil.example", ip: "198.51.100.4" }))).status).toBe(403);
    expect(epFetch).not.toHaveBeenCalled();
  });
});

describe("GET /api/tickets/session (clears a dead cookie)", () => {
  it("deletes the cookie and goes back to /tickets/me with no ep-api call", async () => {
    const res = await GET(new NextRequest("https://deaisummit.test/api/tickets/session", { headers: { "x-forwarded-for": "198.51.100.9", cookie: "tk_session=dead" } }));
    expect(res.status).toBe(303);
    const location = new URL(res.headers.get("location") ?? "");
    expect(location.pathname + location.search).toBe("/tickets/me?ended=1");
    expect(res.cookies.get("tk_session")?.maxAge).toBe(0);
    expect(epFetch).not.toHaveBeenCalled();
  });
});

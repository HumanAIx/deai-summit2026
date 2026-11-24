import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const { FakeEpApiError } = vi.hoisted(() => ({
  FakeEpApiError: class extends Error {
    status = 500;
    code: string | undefined;
  },
}));
vi.mock("@/lib/tickets/ep-client", () => ({ EpApiError: FakeEpApiError }));

const { attachmentName, fileResponse, guardTicketsRequest, ticketsFailure } = await import("../../../lib/tickets/route-guard");

function post(headers: Record<string, string>) {
  return new NextRequest("http://localhost:3003/api/tickets/x", { method: "POST", headers: { host: "acme.example", ...headers } });
}

describe("guardTicketsRequest", () => {
  it("refuses a cross-origin POST with an opaque 403 before anything else runs", async () => {
    const isRateLimited = vi.fn(() => false);
    const guard = await guardTicketsRequest({ request: post({ origin: "https://evil.example" }), isRateLimited, checkOrigin: true, resolveSite: true });
    expect(guard.ok).toBe(false);
    if (guard.ok) return;
    expect(guard.response.status).toBe(403);
    expect(await guard.response.json()).toEqual({ success: false, error: "Something went wrong. Please try again.", code: "forbidden" });
    expect(isRateLimited).not.toHaveBeenCalled();
  });

  it("429s when the per-IP limiter trips", async () => {
    const guard = await guardTicketsRequest({ request: post({ "x-forwarded-for": "203.0.113.9" }), isRateLimited: () => true, checkOrigin: true, resolveSite: true });
    expect(guard.ok).toBe(false);
    if (guard.ok) return;
    expect(guard.response.status).toBe(429);
    expect(guard.response.headers.get("cache-control")).toBe("no-store");
  });

  it("keys the limiter on the forwarded IP", async () => {
    const isRateLimited = vi.fn(() => false);
    await guardTicketsRequest({ request: post({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }), isRateLimited, checkOrigin: false, resolveSite: false });
    expect(isRateLimited).toHaveBeenCalledWith("203.0.113.9");
  });

  it("returns the buyer IP and never a site key (DeAI is one site: the ep-api client uses GCONF_SITE_KEY)", async () => {
    const guard = await guardTicketsRequest({
      request: post({ "x-forwarded-for": "203.0.113.9", origin: "http://acme.example" }),
      isRateLimited: () => false,
      checkOrigin: true,
      resolveSite: true,
    });
    expect(guard).toEqual({ ok: true, ip: "203.0.113.9", siteKey: undefined });
  });

  it("answers ok without an IP when none is forwarded, whatever resolveSite says", async () => {
    for (const resolveSite of [true, false]) {
      const guard = await guardTicketsRequest({ request: post({}), isRateLimited: () => false, checkOrigin: false, resolveSite });
      expect(guard).toEqual({ ok: true, ip: undefined, siteKey: undefined });
    }
  });
});

describe("responses", () => {
  it("ticketsFailure is opaque: a code, generic text, no-store", async () => {
    const res = ticketsFailure({ code: "invalid" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ success: false, error: "Something went wrong. Please try again.", code: "invalid" });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("fileResponse forces attachment + no-store + nosniff whatever the upstream said", () => {
    const res = fileResponse({ body: new ArrayBuffer(2), contentType: "application/pdf", filename: "INV-1.pdf" });
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="INV-1.pdf"');
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("attachmentName keeps a plain upstream name and refuses anything with odd characters", () => {
    expect(attachmentName({ upstream: 'attachment; filename="INV-2026-0001.pdf"', fallback: "document.pdf" })).toBe("INV-2026-0001.pdf");
    expect(attachmentName({ upstream: 'attachment; filename="a/../b".pdf', fallback: "document.pdf" })).toBe("a");
    expect(attachmentName({ upstream: null, fallback: "document.pdf" })).toBe("document.pdf");
    expect(attachmentName({ upstream: "attachment", fallback: "ticket.ics" })).toBe("ticket.ics");
  });
});

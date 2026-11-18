import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { epFetchRaw, FakeEpApiError } = vi.hoisted(() => {
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
  return { epFetchRaw: vi.fn(), FakeEpApiError };
});
vi.mock("@/lib/tickets/ep-client", () => ({ epFetch: vi.fn(), epFetchRaw, EpApiError: FakeEpApiError }));
// Handlers under app/tickets/** sit behind proxy.ts and never resolve a site themselves; this only keeps env.ts out of the import graph.

const { GET } = await import("../../../../../../app/tickets/t/[token]/calendar.ics/route");

const TOKEN = "h".repeat(43);
const ICS = "BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n";

function get({ ip = "203.0.113.1" }: { ip?: string } = {}) {
  return new NextRequest(`http://localhost:3003/tickets/t/${TOKEN}/calendar.ics`, { headers: { host: "acme.example", "x-forwarded-for": ip } });
}
const params = (token = TOKEN) => ({ params: Promise.resolve({ token }) });

beforeEach(() => {
  epFetchRaw.mockReset();
  epFetchRaw.mockResolvedValue({ body: new TextEncoder().encode(ICS).buffer, contentType: "text/calendar; charset=utf-8", contentDisposition: 'attachment; filename="DEAI-T-4F2A-91.ics"' });
});

describe("GET /tickets/t/[token]/calendar.ics", () => {
  it("streams the .ics as an attachment, never cached, using the holder token only as a header (the proxy supplied the site key)", async () => {
    const res = await GET(get({ ip: "198.51.100.7" }), params());

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/calendar; charset=utf-8");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="DEAI-T-4F2A-91.ics"');
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.text()).toBe(ICS);
    const [path, options] = epFetchRaw.mock.calls[0] as [string, Record<string, unknown>];
    expect(path).toBe("/tickets/my/ticket/calendar.ics");
    expect(options).toMatchObject({ cache: "no-store", headers: { "x-ticket-token": TOKEN, "x-gconf-client-ip": "198.51.100.7" } });
    expect(options).not.toHaveProperty("siteKey");
  });

  it("answers an opaque 404 for a malformed token without calling ep-api, and for an ep-api 404", async () => {
    const malformed = await GET(get({ ip: "198.51.100.8" }), params("x"));
    expect(malformed.status).toBe(404);
    expect(epFetchRaw).not.toHaveBeenCalled();

    epFetchRaw.mockRejectedValue(new FakeEpApiError(404, "/x", "tickets.linkNotFound"));
    const unknown = await GET(get({ ip: "198.51.100.8" }), params());
    expect(unknown.status).toBe(404);
    expect((await unknown.json()).code).toBe("notFound");
  });

  it("falls back to a plain file name when the upstream one is odd", async () => {
    epFetchRaw.mockResolvedValue({ body: new ArrayBuffer(1), contentType: "text/calendar", contentDisposition: null });
    const res = await GET(get({ ip: "198.51.100.9" }), params());
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="ticket.ics"');
  });

  it("rate-limits per IP at 30 a minute", async () => {
    let last = 200;
    for (let i = 0; i < 31; i += 1) last = (await GET(get({ ip: "198.51.100.88" }), params())).status;
    expect(last).toBe(429);
  });

  it("maps an outage to an opaque 502", async () => {
    epFetchRaw.mockRejectedValue(new FakeEpApiError(500, "/x", "internal detail"));
    const res = await GET(get({ ip: "198.51.100.10" }), params());
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain("internal detail");
  });
});

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

const { GET } = await import("../../../../../../../app/tickets/order/[token]/documents/[documentId]/route");

const TOKEN = "b".repeat(43);
const DOC_ID = "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11";

function get({ ip = "203.0.113.1" }: { ip?: string } = {}) {
  return new NextRequest(`http://localhost:3003/tickets/order/${TOKEN}/documents/${DOC_ID}`, { headers: { host: "acme.example", "x-forwarded-for": ip } });
}
const params = ({ token = TOKEN, documentId = DOC_ID }: { token?: string; documentId?: string } = {}) => ({ params: Promise.resolve({ token, documentId }) });

beforeEach(() => {
  epFetchRaw.mockReset();
  epFetchRaw.mockResolvedValue({ body: new TextEncoder().encode("%PDF-1.4").buffer, contentType: "application/pdf", contentDisposition: 'attachment; filename="INV-2026-0001.pdf"' });
});

describe("GET /tickets/order/[token]/documents/[documentId]", () => {
  it("streams the PDF as application/pdf, attachment, no-store; the order token only in a header", async () => {
    const res = await GET(get({ ip: "198.51.100.7" }), params());

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="INV-2026-0001.pdf"');
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.text()).toBe("%PDF-1.4");
    const [path, options] = epFetchRaw.mock.calls[0] as [string, Record<string, unknown>];
    expect(path).toBe(`/tickets/my/order/documents/${DOC_ID}`);
    expect(path).not.toContain(TOKEN);
    expect(options).toMatchObject({ cache: "no-store", headers: { "x-order-token": TOKEN, "x-gconf-client-ip": "198.51.100.7" } });
  });

  it("forces application/pdf even if ep-api answered something else", async () => {
    epFetchRaw.mockResolvedValue({ body: new ArrayBuffer(1), contentType: "text/html", contentDisposition: null });
    const res = await GET(get({ ip: "198.51.100.8" }), params());
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="document.pdf"');
  });

  it("is the same opaque 404 for a malformed token, a malformed document id, and a document of another order (ep-api 404)", async () => {
    expect((await GET(get({ ip: "198.51.100.9" }), params({ token: "x" }))).status).toBe(404);
    expect((await GET(get({ ip: "198.51.100.9" }), params({ documentId: "../../etc/passwd" }))).status).toBe(404);
    expect(epFetchRaw).not.toHaveBeenCalled();

    epFetchRaw.mockRejectedValue(new FakeEpApiError(404, "/x", "tickets.documentNotFound"));
    const res = await GET(get({ ip: "198.51.100.9" }), params());
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe("notFound");
  });

  it("rate-limits per IP at 30 a minute", async () => {
    let last = 200;
    for (let i = 0; i < 31; i += 1) last = (await GET(get({ ip: "198.51.100.99" }), params())).status;
    expect(last).toBe(429);
  });

  it("maps an outage to an opaque 502", async () => {
    epFetchRaw.mockRejectedValue(new FakeEpApiError(502, "/x", "internal detail"));
    const res = await GET(get({ ip: "198.51.100.11" }), params());
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain("internal detail");
  });
});

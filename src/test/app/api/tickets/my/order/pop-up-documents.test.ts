import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { epFetch, epFetchRaw, FakeEpApiError } = vi.hoisted(() => {
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
  return { epFetch: vi.fn(), epFetchRaw: vi.fn(), FakeEpApiError };
});
vi.mock("@/lib/tickets/ep-client", () => ({ epFetch, epFetchRaw, EpApiError: FakeEpApiError }));

const list = await import("../../../../../../app/api/tickets/my/order/documents/route");
const one = await import("../../../../../../app/api/tickets/my/order/document/route");

const TOKEN = "b".repeat(43);
const DOC_ID = "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11";
const ORDER = {
  orderNo: 7,
  status: "paid",
  paidAt: null,
  currency: "EUR",
  lines: [],
  totals: { totalCents: 0, vatCents: 0, feeCents: 0 },
  holders: [],
  documents: [{ id: DOC_ID, kind: "invoice", number: "INV-1", issueDate: null, grossCents: 100 }],
  seller: { name: null, vatNumber: null, replyTo: null },
};

function post({ path, body, ip = "203.0.113.1", origin }: { path: string; body: unknown; ip?: string; origin?: string }) {
  return new NextRequest(`http://localhost:3003/api/tickets/my/order/${path}`, {
    method: "POST",
    headers: { host: "acme.example", "x-forwarded-for": ip, "content-type": "application/json", ...(origin ? { origin } : {}) },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  epFetch.mockReset();
  epFetch.mockResolvedValue(ORDER);
  epFetchRaw.mockReset();
  epFetchRaw.mockResolvedValue({ body: new TextEncoder().encode("%PDF-1.4").buffer, contentType: "text/html", contentDisposition: 'attachment; filename="INV-1.pdf"' });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("POST /api/tickets/my/order/documents", () => {
  it("reads the token from the BODY, forwards it as a header, answers only id/kind/number", async () => {
    const res = await list.POST(post({ path: "documents", body: { token: TOKEN }, ip: "198.51.100.1" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ success: true, data: { documents: [{ id: DOC_ID, kind: "invoice", number: "INV-1" }] } });
    const [path, options] = epFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(path).not.toContain(TOKEN);
    expect(options).toMatchObject({ headers: { "x-order-token": TOKEN } });
  });

  it("a malformed or missing token is the opaque 404; a cross-origin POST is refused", async () => {
    expect((await list.POST(post({ path: "documents", body: { token: "x" }, ip: "198.51.100.2" }))).status).toBe(404);
    expect((await list.POST(post({ path: "documents", body: {}, ip: "198.51.100.2" }))).status).toBe(404);
    expect(epFetch).not.toHaveBeenCalled();
    expect((await list.POST(post({ path: "documents", body: { token: TOKEN }, ip: "198.51.100.3", origin: "https://evil.example" }))).status).toBe(403);
  });

  it("an unknown order (ep-api 404) is the same opaque 404", async () => {
    epFetch.mockRejectedValue(new FakeEpApiError(404, "/x", "tickets.orderNotFound"));
    expect((await list.POST(post({ path: "documents", body: { token: TOKEN }, ip: "198.51.100.4" }))).status).toBe(404);
  });
});

describe("POST /api/tickets/my/order/document", () => {
  it("streams the PDF as an attachment with the token and document id taken from the BODY", async () => {
    const res = await one.POST(post({ path: "document", body: { token: TOKEN, documentId: DOC_ID }, ip: "198.51.100.5" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="INV-1.pdf"');
    expect(res.headers.get("cache-control")).toBe("no-store");
    const [path, options] = epFetchRaw.mock.calls[0] as [string, Record<string, unknown>];
    expect(path).toBe(`/tickets/my/order/documents/${DOC_ID}`);
    expect(options).toMatchObject({ headers: { "x-order-token": TOKEN } });
  });

  it("malformed ids are the opaque 404 and never reach ep-api; cross-origin is refused", async () => {
    expect((await one.POST(post({ path: "document", body: { token: TOKEN, documentId: "../x" }, ip: "198.51.100.6" }))).status).toBe(404);
    expect((await one.POST(post({ path: "document", body: { token: "x", documentId: DOC_ID }, ip: "198.51.100.6" }))).status).toBe(404);
    expect(epFetchRaw).not.toHaveBeenCalled();
    expect((await one.POST(post({ path: "document", body: { token: TOKEN, documentId: DOC_ID }, ip: "198.51.100.7", origin: "https://evil.example" }))).status).toBe(403);
  });
});

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

const { PUT } = await import("../../../../../../../app/api/tickets/my/ticket/profile/route");

const TOKEN = "h".repeat(43);
let ipCounter = 1;
const nextIp = () => `198.51.100.${ipCounter++}`;

const BLOCK = {
  values: { company: "Quantia", jobTitle: "CTO", diet: ["vegan"], dietNote: "", street: "", postcode: "", city: "", country: "MT", phone: "", linkedin: "", website: "", telegram: "", x: "", instagram: "" },
  required: ["name", "company", "jobTitle", "diet"],
  missing: [],
  deadline: null,
  frozen: false,
  saved: true,
};

function put({ body, token = TOKEN, ip = nextIp(), origin, host = "acme.example" }: { body: unknown; token?: string | null; ip?: string; origin?: string; host?: string }) {
  return new NextRequest("http://localhost:3003/api/tickets/my/ticket/profile", {
    method: "PUT",
    headers: { "content-type": "application/json", host, "x-forwarded-for": ip, ...(token ? { "x-ticket-token": token } : {}), ...(origin ? { origin } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  epFetch.mockReset();
  epFetch.mockResolvedValue(BLOCK);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("PUT /api/tickets/my/ticket/profile (DASH-205 T5)", () => {
  it("forwards the partial body (trimmed, country upper-cased) with the token in a HEADER, the site key and the buyer IP, no-store", async () => {
    const res = await PUT(put({ body: { company: " Quantia ", country: "mt", diet: ["vegan"] }, ip: "203.0.113.50" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect((await res.json()).data.values.company).toBe("Quantia");
    const [path, options] = epFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(path).toBe("/tickets/my/ticket/profile");
    expect(path).not.toContain(TOKEN);
    expect(options).toMatchObject({ method: "PUT", body: { company: "Quantia", country: "MT", diet: ["vegan"] }, cache: "no-store", headers: { "x-ticket-token": TOKEN, "x-gconf-client-ip": "203.0.113.50" } });
  });

  it("a missing or malformed token is the same opaque 404 and never reaches ep-api", async () => {
    for (const token of [null, "short", `${"h".repeat(42)}!`]) {
      const res = await PUT(put({ body: { city: "Valletta" }, token }));
      expect(res.status).toBe(404);
      expect((await res.json()).code).toBe("notFound");
    }
    expect(epFetch).not.toHaveBeenCalled();
  });

  it("rejects unknown keys, bad diet lists, a bad country or phone, too long text and non-JSON with 400 and no ep-api call", async () => {
    for (const body of [{ email: "x@y.z" }, { diet: ["raw"] }, { diet: ["none", "vegan"] }, { diet: ["vegan", "vegan"] }, { country: "Malta" }, { phone: "<b>" }, { company: "x".repeat(121) }, "not json", null]) {
      const res = await PUT(put({ body }));
      expect(res.status).toBe(400);
      expect((await res.json()).code).toBe("invalid");
    }
    expect(epFetch).not.toHaveBeenCalled();
  });

  it("refuses a cross-origin PUT with an opaque 403, and accepts the same origin", async () => {
    expect((await PUT(put({ body: { city: "Valletta" }, origin: "https://evil.example" }))).status).toBe(403);
    expect(epFetch).not.toHaveBeenCalled();
    expect((await PUT(put({ body: { city: "Valletta" }, origin: "https://acme.example" }))).status).toBe(200);
  });

  it("maps ep-api refusals to their codes (badge frozen, ticket no longer valid), never its text", async () => {
    epFetch.mockRejectedValueOnce(new FakeEpApiError(409, "/tickets/my/ticket/profile", "frozen text", "tickets.badgeFrozen"));
    let res = await PUT(put({ body: { jobTitle: "CEO" } }));
    expect(res.status).toBe(409);
    let json = await res.json();
    expect(json.code).toBe("badgeFrozen");
    expect(JSON.stringify(json)).not.toContain("frozen text");
    epFetch.mockRejectedValueOnce(new FakeEpApiError(409, "/tickets/my/ticket/profile", "closed", "tickets.changesClosed"));
    res = await PUT(put({ body: { city: "X" } }));
    json = await res.json();
    expect(json.code).toBe("changesClosed");
  });
});

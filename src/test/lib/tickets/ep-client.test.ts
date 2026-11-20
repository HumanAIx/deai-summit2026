import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EpApiError, epFetch, epFetchRaw } from "../../../lib/tickets/ep-client";

const fetchMock = vi.fn();

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const call = (index = 0) => {
  const [url, init] = fetchMock.mock.calls[index] as [string, RequestInit & { headers: Record<string, string> }];
  return { url: new URL(url), raw: url, init };
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NEXT_PUBLIC_GCONF_API_URL", "https://api.example/api");
  vi.stubEnv("GCONF_SITE_KEY", "sk_site_deai");
  vi.stubEnv("GCONF_API_KEY", "legacy_tenant_key");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("epFetch request", () => {
  it("calls `${NEXT_PUBLIC_GCONF_API_URL}/site{path}?locale=…` with the site key as a Bearer token", async () => {
    fetchMock.mockResolvedValue(json({ success: true, data: { ok: 1 } }));
    const data = await epFetch<{ ok: number }>("/tickets/types", { locale: "en" });

    expect(data).toEqual({ ok: 1 });
    const { raw, url, init } = call();
    expect(raw).toBe("https://api.example/api/site/tickets/types?locale=en");
    expect(url.searchParams.get("locale")).toBe("en");
    expect(init.method).toBe("GET");
    expect(init.headers.Authorization).toBe("Bearer sk_site_deai");
    expect(init.headers).not.toHaveProperty("x-api-key");
  });

  it("strips trailing slashes from the base URL and adds a missing leading slash", async () => {
    vi.stubEnv("NEXT_PUBLIC_GCONF_API_URL", "https://api.example/api///");
    fetchMock.mockResolvedValue(json({ success: true, data: null }));
    await epFetch("tickets/types", { locale: "en" });
    expect(call().raw).toBe("https://api.example/api/site/tickets/types?locale=en");
  });

  it("adds search params, skipping undefined ones", async () => {
    fetchMock.mockResolvedValue(json({ success: true, data: null }));
    await epFetch("/x", { locale: "en", searchParams: { a: 1, b: true, c: undefined, d: "z" } });
    const { url } = call();
    expect(url.searchParams.get("a")).toBe("1");
    expect(url.searchParams.get("b")).toBe("true");
    expect(url.searchParams.has("c")).toBe(false);
    expect(url.searchParams.get("d")).toBe("z");
  });

  it("basePath /api/settings maps to `${url}/settings…` (the base already ends in /api)", async () => {
    fetchMock.mockResolvedValue(json({ success: true, data: null }));
    await epFetch("/captcha", { locale: "en", basePath: "/api/settings" });
    expect(call().raw).toBe("https://api.example/api/settings/captcha?locale=en");
  });

  it("sends a JSON body with a content type, plus caller headers", async () => {
    fetchMock.mockResolvedValue(json({ success: true, data: { id: 1 } }));
    await epFetch("/tickets/orders", { locale: "en", method: "POST", body: { a: 1 }, headers: { "x-gconf-client-ip": "203.0.113.9" }, cache: "no-store" });
    const { init } = call();
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ a: 1 }));
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.headers["x-gconf-client-ip"]).toBe("203.0.113.9");
    expect(init.headers.Authorization).toBe("Bearer sk_site_deai");
    expect(init.cache).toBe("no-store");
  });

  it("ignores a siteKey option: the env key is always used (DeAI is one site)", async () => {
    fetchMock.mockResolvedValue(json({ success: true, data: null }));
    await epFetch("/x", { locale: "en", siteKey: "sk_site_other" });
    expect(call().init.headers.Authorization).toBe("Bearer sk_site_deai");
  });

  it("forwards `next` revalidate options only when no `cache` is set", async () => {
    fetchMock.mockResolvedValue(json({ success: true, data: null }));
    await epFetch("/x", { locale: "en", next: { revalidate: 60 } });
    expect(call(0).init).toMatchObject({ next: { revalidate: 60 } });
    await epFetch("/x", { locale: "en", next: { revalidate: 60 }, cache: "no-store" });
    expect(call(1).init).not.toHaveProperty("next");
  });
});

describe("epFetch fails closed", () => {
  it.each(["", "   "])("throws EpApiError status 0 without calling ep-api when GCONF_SITE_KEY is %j", async (key) => {
    vi.stubEnv("GCONF_SITE_KEY", key);
    const error = await epFetch("/x", { locale: "en" }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(EpApiError);
    expect((error as EpApiError).status).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never falls back to GCONF_API_KEY", async () => {
    vi.stubEnv("GCONF_SITE_KEY", "");
    vi.stubEnv("GCONF_API_KEY", "legacy_tenant_key");
    await expect(epFetch("/x", { locale: "en" })).rejects.toMatchObject({ status: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain("legacy_tenant_key");
  });

  it.each(["", "  "])("throws EpApiError status 0 when NEXT_PUBLIC_GCONF_API_URL is %j", async (url) => {
    vi.stubEnv("NEXT_PUBLIC_GCONF_API_URL", url);
    const error = await epFetch("/x", { locale: "en" }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(EpApiError);
    expect((error as EpApiError).status).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("the key never appears in an error message", async () => {
    fetchMock.mockRejectedValue(new Error("boom"));
    const error = (await epFetch("/x", { locale: "en" }).catch((e: unknown) => e)) as EpApiError;
    expect(error.message).not.toContain("sk_site_deai");
  });
});

describe("epFetch errors", () => {
  it("turns an error body into EpApiError with status, code and details", async () => {
    fetchMock.mockResolvedValue(json({ success: false, error: "Sold out", code: "tickets.soldOut", details: { ticketTypeId: "t1" } }, 409));
    const error = (await epFetch("/tickets/orders", { locale: "en", method: "POST", body: {} }).catch((e: unknown) => e)) as EpApiError;
    expect(error).toBeInstanceOf(EpApiError);
    expect(error.name).toBe("EpApiError");
    expect(error.status).toBe(409);
    expect(error.path).toBe("/tickets/orders");
    expect(error.apiMessage).toBe("Sold out");
    expect(error.code).toBe("tickets.soldOut");
    expect(error.details).toEqual({ ticketTypeId: "t1" });
    expect(error.message).toContain("409");
  });

  it("treats `success: false` on a 200 as an error", async () => {
    fetchMock.mockResolvedValue(json({ success: false, error: "nope", code: "x" }, 200));
    await expect(epFetch("/x", { locale: "en" })).rejects.toMatchObject({ status: 200, code: "x" });
  });

  it("drops non-object details", async () => {
    fetchMock.mockResolvedValue(json({ success: false, error: "e", details: ["a"] }, 400));
    expect(((await epFetch("/x", { locale: "en" }).catch((e: unknown) => e)) as EpApiError).details).toBeUndefined();
    fetchMock.mockResolvedValue(json({ success: false, error: "e", details: "text" }, 400));
    expect(((await epFetch("/x", { locale: "en" }).catch((e: unknown) => e)) as EpApiError).details).toBeUndefined();
  });

  it("copes with a non-JSON error body (uses the status text)", async () => {
    fetchMock.mockResolvedValue(new Response("<html>", { status: 403, statusText: "Forbidden" }));
    const error = (await epFetch("/x", { locale: "en" }).catch((e: unknown) => e)) as EpApiError;
    expect(error.status).toBe(403);
    expect(error.apiMessage).toBe("Forbidden");
  });

  it("wraps a network failure as EpApiError status 0", async () => {
    fetchMock.mockRejectedValue(new Error("connect ECONNREFUSED"));
    const error = (await epFetch("/x", { locale: "en" }).catch((e: unknown) => e)) as EpApiError;
    expect(error).toBeInstanceOf(EpApiError);
    expect(error.status).toBe(0);
    expect(error.apiMessage).toBe("connect ECONNREFUSED");
  });
});

describe("epFetch retries", () => {
  it("retries a GET once on a 5xx and returns the second answer", async () => {
    fetchMock.mockResolvedValueOnce(json({ success: false, error: "down" }, 503)).mockResolvedValueOnce(json({ success: true, data: "ok" }));
    await expect(epFetch("/x", { locale: "en" })).resolves.toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after that one retry", async () => {
    fetchMock.mockResolvedValue(json({ success: false, error: "down" }, 502));
    await expect(epFetch("/x", { locale: "en" })).rejects.toMatchObject({ status: 502 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a GET on a 4xx", async () => {
    fetchMock.mockResolvedValue(json({ success: false, error: "no" }, 404));
    await expect(epFetch("/x", { locale: "en" })).rejects.toMatchObject({ status: 404 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(["POST", "PUT", "PATCH"] as const)("never retries a %s (it may already have been committed)", async (method) => {
    fetchMock.mockResolvedValue(json({ success: false, error: "down" }, 500));
    await expect(epFetch("/x", { locale: "en", method, body: {} })).rejects.toMatchObject({ status: 500 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("epFetchRaw", () => {
  it("returns the bytes and the content headers", async () => {
    fetchMock.mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "application/pdf", "content-disposition": 'attachment; filename="a.pdf"' } }));
    const raw = await epFetchRaw("/tickets/my/order/document", { locale: "en" });
    expect(new Uint8Array(raw.body)).toEqual(new Uint8Array([1, 2, 3]));
    expect(raw.contentType).toBe("application/pdf");
    expect(raw.contentDisposition).toBe('attachment; filename="a.pdf"');
    expect(call().raw).toBe("https://api.example/api/site/tickets/my/order/document?locale=en");
  });

  it("answers null headers when absent", async () => {
    fetchMock.mockResolvedValue(new Response(new Uint8Array([1]), { status: 200 }));
    const raw = await epFetchRaw("/x", { locale: "en" });
    expect(raw.contentDisposition).toBeNull();
  });

  it("throws EpApiError with code and details on a failure", async () => {
    fetchMock.mockResolvedValue(json({ error: "gone", code: "tickets.documentGone", details: { a: 1 } }, 404));
    await expect(epFetchRaw("/x", { locale: "en" })).rejects.toMatchObject({ status: 404, code: "tickets.documentGone", details: { a: 1 } });
  });

  it("fails closed without a site key", async () => {
    vi.stubEnv("GCONF_SITE_KEY", "");
    await expect(epFetchRaw("/x", { locale: "en" })).rejects.toMatchObject({ status: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("retries a GET once on 5xx", async () => {
    fetchMock.mockResolvedValueOnce(new Response("x", { status: 500 })).mockResolvedValueOnce(new Response(new Uint8Array([9]), { status: 200 }));
    await epFetchRaw("/x", { locale: "en" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

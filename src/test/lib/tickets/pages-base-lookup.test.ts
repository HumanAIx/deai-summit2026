import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadTicketPagesBasePath, resetTicketPagesBaseCache } from "@/lib/tickets/pages-base-lookup";

const answer = (ticketPagesUrl: unknown, ok = true) =>
  vi.fn(async () => new Response(JSON.stringify({ success: ok, data: { types: [], checkout: { ticketPagesUrl } } }), { status: ok ? 200 : 500 }));

beforeEach(() => {
  resetTicketPagesBaseCache();
  vi.stubEnv("NEXT_PUBLIC_GCONF_API_URL", "https://api.example/api/");
  vi.stubEnv("GCONF_SITE_KEY", "sk_site_test");
});
afterEach(() => vi.unstubAllEnvs());

describe("loadTicketPagesBasePath", () => {
  it("reads checkout.ticketPagesUrl from the public catalogue with the site key, and returns its path", async () => {
    const fetchImpl = answer("https://deaisummit.org/buy");
    expect(await loadTicketPagesBasePath({ fetchImpl: fetchImpl as unknown as typeof fetch })).toBe("/buy");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.example/api/site/tickets/types?locale=en");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk_site_test");
    expect(init.cache).toBe("no-store");
  });

  it("caches a good answer for 5 minutes, then asks again", async () => {
    const fetchImpl = answer("https://deaisummit.org/buy");
    const f = fetchImpl as unknown as typeof fetch;
    await loadTicketPagesBasePath({ now: 0, fetchImpl: f });
    await loadTicketPagesBasePath({ now: 4 * 60_000, fetchImpl: f });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await loadTicketPagesBasePath({ now: 5 * 60_000 + 1, fetchImpl: f });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("is null with no address, an older ep-api (no field), an error answer, or a network failure; a failure is retried after 30 s", async () => {
    expect(await loadTicketPagesBasePath({ fetchImpl: answer(null) as unknown as typeof fetch })).toBeNull();
    resetTicketPagesBaseCache();
    expect(await loadTicketPagesBasePath({ fetchImpl: answer(undefined) as unknown as typeof fetch })).toBeNull();
    resetTicketPagesBaseCache();
    expect(await loadTicketPagesBasePath({ fetchImpl: answer("https://x.org/buy", false) as unknown as typeof fetch })).toBeNull();
    resetTicketPagesBaseCache();
    const failing = vi.fn(async () => {
      throw new Error("down");
    });
    expect(await loadTicketPagesBasePath({ now: 0, fetchImpl: failing as unknown as typeof fetch })).toBeNull();
    await loadTicketPagesBasePath({ now: 20_000, fetchImpl: failing as unknown as typeof fetch });
    expect(failing).toHaveBeenCalledTimes(1);
    await loadTicketPagesBasePath({ now: 30_001, fetchImpl: failing as unknown as typeof fetch });
    expect(failing).toHaveBeenCalledTimes(2);
  });

  it("never calls ep-api without the API address or the site key", async () => {
    vi.stubEnv("GCONF_SITE_KEY", "");
    const fetchImpl = answer("https://deaisummit.org/buy");
    expect(await loadTicketPagesBasePath({ fetchImpl: fetchImpl as unknown as typeof fetch })).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

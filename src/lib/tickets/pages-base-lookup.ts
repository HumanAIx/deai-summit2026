import { basePathOf } from './pages-base';

/**
 * The configured ticket pages base path, read from ep-api's public catalogue (`checkout.ticketPagesUrl`) with the site
 * key, for the middleware. Cached per server instance: 5 minutes after a good answer, 30 seconds after a failure, so a
 * changed address applies within minutes and an ep-api outage never slows every page. `null` = no address (or unknown).
 */
const OK_TTL_MS = 5 * 60_000;
const FAIL_TTL_MS = 30_000;
const TIMEOUT_MS = 3_000;

let cached: { basePath: string | null; until: number } | null = null;

export async function loadTicketPagesBasePath({ now = Date.now(), fetchImpl = fetch }: { now?: number; fetchImpl?: typeof fetch } = {}): Promise<string | null> {
  if (cached && cached.until > now) return cached.basePath;
  const api = process.env.NEXT_PUBLIC_GCONF_API_URL?.trim().replace(/\/+$/, '') ?? '';
  const key = process.env.GCONF_SITE_KEY?.trim() ?? '';
  if (!api || !key) {
    cached = { basePath: null, until: now + FAIL_TTL_MS };
    return null;
  }
  try {
    const response = await fetchImpl(`${api}/site/tickets/types?locale=en`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = (await response.json().catch(() => null)) as { data?: { checkout?: { ticketPagesUrl?: unknown } } } | null;
    const address = body?.data?.checkout?.ticketPagesUrl;
    const basePath = response.ok && typeof address === 'string' ? basePathOf(address) : null;
    cached = { basePath, until: now + (response.ok ? OK_TTL_MS : FAIL_TTL_MS) };
    return basePath;
  } catch {
    cached = { basePath: null, until: now + FAIL_TTL_MS };
    return null;
  }
}

/** Tests only: forget the cached answer. */
export function resetTicketPagesBaseCache(): void {
  cached = null;
}

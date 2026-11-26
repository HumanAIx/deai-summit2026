/**
 * The dashboard's "Ticket pages address" (Tickets › Settings › Checkout) decides where ticket emails link:
 * `{address}/t/{token}`, `/order/{token}`, `/w/{token}`, `/l/{token}`, `/me/{token}` and `/lost`. DeAI's pages live at
 * `/tickets/…`; these pure helpers map a request under any other configured path to that canonical page, so the
 * organiser can set the address freely and every email link still opens. Middleware redirects (308) rather than
 * rewrites, so the private-page protections keyed to `/tickets/…` (no analytics, no referrer, noindex) always apply.
 */

/** DeAI's own, canonical base path of the ticket pages. */
export const CANONICAL_TICKETS_BASE = '/tickets';

/** The pages ep-api links to under the address: token pages and the lost-link form. */
const TOKEN_SECTIONS = new Set(['t', 'order', 'w', 'l', 'me', 'sign-in']);

/**
 * The path part of the configured address: `https://deaisummit.org/buy` → `/buy`, the bare domain → `''` (pages at the
 * root). `null` when there is no address (emails use the GConf.ai pages) or it cannot be read.
 */
export function basePathOf(address: string | null | undefined): string | null {
  const raw = (address ?? '').trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.pathname.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

/**
 * Cheap pre-check before the address is looked up: could `pathname` be one of the ticket pages under SOME address
 * other than `/tickets`? Only these requests cost a lookup.
 */
export function mayBeTicketPage(pathname: string): boolean {
  if (pathname === CANONICAL_TICKETS_BASE || pathname.startsWith(`${CANONICAL_TICKETS_BASE}/`)) return false;
  return /\/(t|order|w|l|me|sign-in)\/[^/]+/.test(pathname) || /\/lost$/.test(pathname);
}

/**
 * Where a request under the configured base goes: `/buy/t/abc` with base `/buy` → `/tickets/t/abc`, `/buy/lost` →
 * `/tickets/lost`. Null when the path is not a ticket page under that base, or the base already is `/tickets`.
 */
export function ticketPageRedirect({ pathname, basePath }: { pathname: string; basePath: string | null }): string | null {
  if (basePath === null || basePath === CANONICAL_TICKETS_BASE) return null;
  const prefix = `${basePath}/`;
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length);
  if (rest === 'lost') return `${CANONICAL_TICKETS_BASE}/lost`;
  const [section, token] = rest.split('/');
  if (!section || !TOKEN_SECTIONS.has(section) || !token) return null;
  return `${CANONICAL_TICKETS_BASE}/${rest}`;
}

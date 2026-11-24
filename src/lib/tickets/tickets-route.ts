/** Set by `middleware.ts` on every page request: the root layout reads it to keep analytics off private ticket pages. */
export const PATHNAME_HEADER = "x-deai-pathname";

/** DeAI has no locale prefixes: a path is just its segments. */
function parsePath(pathname: string): { segments: string[]; isDefaultLocale: true; locale: "en" } {
  return { segments: pathname.split("/").filter(Boolean), isDefaultLocale: true, locale: "en" };
}

/** Ticket pages whose URL carries a secret: the holder link, the buyer link, a private link, a waitlist offer, "My tickets". */
const PRIVATE_TICKET_SECTIONS = new Set(["t", "order", "l", "w", "me"]);

/**
 * Whether `pathname` (with or without a locale prefix) is a ticket page whose URL is a secret —
 * `/tickets/{t|order|l|w|me}/{token}…`. Anyone holding the URL can open the order, the ticket or the private sale, so
 * nothing on these pages may report the URL to a third party: no analytics or ad pixel loads there
 * (`shouldLoadAnalytics`), the pages send no referrer (their metadata), and the checkout opens the order page with
 * a full page load so a pixel loaded on `/tickets` never sees the route change (`openPrivateTicketPage`).
 */
export function isPrivateTicketPath({ pathname }: { pathname: string }): boolean {
  const [first, section, token] = parsePath(pathname).segments;
  return first === "tickets" && PRIVATE_TICKET_SECTIONS.has(section ?? "") && Boolean(token);
}

/**
 * The legacy private-link form `/tickets?link={token}` keeps the secret in the query string, where the analytics gate
 * (which sees the path only) cannot tell it apart from the public `/tickets` page. `proxy.ts` redirects it to the
 * canonical `/tickets/l/{token}` before any page renders. Returns that path (locale prefix and other query parameters
 * kept), or `null` when the request is not the legacy form.
 */
export function legacyPrivateLinkRedirect({ pathname, searchParams }: { pathname: string; searchParams: URLSearchParams }): string | null {
  const parsed = parsePath(pathname);
  if (parsed.segments.length !== 1 || parsed.segments[0] !== "tickets") return null;
  const link = searchParams.get("link");
  if (!link) return null;
  const rest = new URLSearchParams(searchParams);
  rest.delete("link");
  const query = rest.toString();
  const prefix = parsed.isDefaultLocale ? "" : `/${parsed.locale}`;
  return `${prefix}/tickets/l/${encodeURIComponent(link)}${query ? `?${query}` : ""}`;
}

/** The slug of the Site Builder page that, once published, replaces the built-in ticket list at `/tickets`. */
export const TICKETS_PAGE_SLUG = "tickets";

/**
 * Whether `pathname` (with or without a locale prefix) is exactly `/tickets` — the one ticket path an organiser can
 * design (a published builder page with slug `tickets`). Every subpath (`/tickets/t/…`, `/order`, `/l`, `/w`, `/lost`)
 * is a private or token page and stays built-in, so none of them can ever be a CMS page.
 */
export function isTicketsRootPath({ pathname }: { pathname: string }): boolean {
  const { segments } = parsePath(pathname);
  return segments.length === 1 && segments[0] === TICKETS_PAGE_SLUG;
}

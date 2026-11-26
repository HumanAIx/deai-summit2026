/**
 * CSRF guard for the tickets POST route handlers: a browser always sends
 * `Origin` on a cross-site POST, so when it is present its host must be the
 * host this request was addressed to. A missing `Origin` (a non-browser client,
 * which has no ambient cookies to abuse) passes. Refusal is opaque (403).
 *
 * Compares hosts (not full origins) so a TLS-terminating proxy that rewrites
 * the scheme does not cause false refusals.
 *
 * `Origin: null` is what a browser sends for a plain HTML form POST from a page
 * with `Referrer-Policy: no-referrer` — every private ticket page (sign-in,
 * My tickets) sets it, so their Continue / Sign out forms post `null`. It is
 * accepted only when the browser's own `Sec-Fetch-Site` says `same-origin`
 * (a header no page script can set); a cross-site form, a sandboxed frame or a
 * missing `Sec-Fetch-Site` is still refused.
 */
export function isSameOriginRequest({ request }: { request: Request }): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) return true;
  if (origin === "null") return request.headers.get("sec-fetch-site") === "same-origin";
  const host = request.headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false; // "null" or malformed Origin
  }
}

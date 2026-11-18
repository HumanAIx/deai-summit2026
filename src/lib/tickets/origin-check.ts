/**
 * CSRF guard for the tickets POST route handlers: a browser always sends
 * `Origin` on a cross-site POST, so when it is present its host must be the
 * host this request was addressed to. A missing `Origin` (a non-browser client,
 * which has no ambient cookies to abuse) passes. Refusal is opaque (403).
 *
 * Compares hosts (not full origins) so a TLS-terminating proxy that rewrites
 * the scheme does not cause false refusals.
 */
export function isSameOriginRequest({ request }: { request: Request }): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) return true;
  const host = request.headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false; // "null" or malformed Origin
  }
}

import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { clientIp, createRateLimiter } from "@/lib/tickets/rate-limit";
import { forwardedClientIp } from "./client-ip";
import { GENERIC_ERROR_TEXT, statusForTicketError, ticketErrorCode, ticketErrorDetails, type TicketErrorCode, type TicketErrorDetails } from "./errors";
import { isSameOriginRequest } from "./origin-check";

export { createRateLimiter };

/** Responses that must never be stored by a browser or a shared cache (private ticket data, stock). */
export const NO_STORE = { "Cache-Control": "no-store" } as const;

/** The opaque JSON failure every tickets route handler answers (rule 28): a code the client translates. */
export function ticketsFailure({ code, details }: { code: TicketErrorCode; details?: TicketErrorDetails | undefined }): NextResponse {
  return NextResponse.json(
    { success: false, error: GENERIC_ERROR_TEXT, code, ...(details ? { details } : {}) },
    { status: statusForTicketError({ code }), headers: NO_STORE },
  );
}

/**
 * The failure answer for a caught ep-api error: its opaque code (+ the affected ticket type, when ep-api named
 * one), and a server-side log line for outages only (never the message of a 4xx, never a token or secret).
 */
export function ticketsFailureFrom({ error, tag }: { error: unknown; tag: string }): NextResponse {
  const code = ticketErrorCode({ error });
  if (code === "unavailable") console.error(`[${tag}] ep-api call failed:`, error instanceof Error ? error.message : "unknown error");
  return ticketsFailure({ code, details: ticketErrorDetails({ error }) });
}

export type TicketsGuard =
  | { ok: true; ip: string | undefined; siteKey: string | undefined }
  | { ok: false; response: NextResponse };

/**
 * The checks every tickets route handler runs first, in a fixed order:
 *   1. origin (POST only): a cross-origin browser POST is refused, 403;
 *   2. per-IP rate limit (defence in depth; ep-api has its own): 429;
 *   3. site resolution — only for handlers under `app/api/**`, which `proxy.ts`'s matcher excludes, so
 *      they resolve the site from `Host` themselves (`resolveRequestSite`) and pass the key to `epFetch`
 *      explicitly. Handlers under `app/tickets/**` do go through the proxy: `epFetch` reads the key it
 *      resolved, so `siteKey` stays `undefined` for them. Never a default site (rule 21): 404.
 * Rate limiting runs before site resolution so a flood costs no resolver lookups.
 */
export async function guardTicketsRequest({
  request,
  isRateLimited,
  checkOrigin,
  resolveSite,
}: {
  request: NextRequest;
  isRateLimited: (ip: string) => boolean;
  checkOrigin: boolean;
  resolveSite?: boolean;
}): Promise<TicketsGuard> {
  if (checkOrigin && !isSameOriginRequest({ request })) {
    return { ok: false, response: ticketsFailure({ code: "forbidden" }) };
  }
  if (isRateLimited(clientIp(request))) {
    return { ok: false, response: ticketsFailure({ code: "rateLimited" }) };
  }
  const ip = forwardedClientIp({ headers: request.headers });
  // DeAI is one site: the ep-api client always uses GCONF_SITE_KEY, so there is nothing to resolve per request.
  void resolveSite;
  return { ok: true, ip, siteKey: undefined };
}

/** A safe `Content-Disposition` file name: ep-api's own name when it is plain, else `fallback`. */
export function attachmentName({ upstream, fallback }: { upstream: string | null; fallback: string }): string {
  const match = upstream?.match(/filename="?([A-Za-z0-9._-]{1,100})"?/);
  return match?.[1] ?? fallback;
}

/** A downloaded file answered with `attachment` + `no-store`, whatever the upstream headers were. */
export function fileResponse({ body, contentType, filename }: { body: ArrayBuffer; contentType: string; filename: string }): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

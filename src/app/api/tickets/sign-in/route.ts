import { NextResponse, type NextRequest } from "next/server";
import { postSignIn } from "@/lib/tickets/api";
import { ticketErrorCode } from "@/lib/tickets/errors";
import { guardTicketsRequest, createRateLimiter, NO_STORE, ticketsFailure } from "@/lib/tickets/route-guard";
import { signInBodySchema } from "@/lib/tickets/schemas";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/tickets/session-cookie";

/**
 * "Continue" on `/tickets/sign-in/{token}` — a plain form POST (the page itself never consumes the token: mail
 * scanners pre-open links). Exchanges the one-time token for a session at ep-api (`POST /tickets/my/sign-in`), keeps
 * the session token in an httpOnly cookie only, and redirects to `/tickets/me`. A used / expired / foreign token goes
 * back to the "request a new link" page with the "expired" notice. Origin-checked and rate-limited like the other writes.
 */
const isRateLimited = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 10 });

function redirectTo({ request, path }: { request: NextRequest; path: string }): NextResponse {
  const response = NextResponse.redirect(new URL(path, request.url), 303);
  response.headers.set("Cache-Control", NO_STORE["Cache-Control"]);
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function POST(request: NextRequest) {
  const guard = await guardTicketsRequest({ request, isRateLimited, checkOrigin: true, resolveSite: true });
  if (!guard.ok) return guard.response;

  const form = await request.formData().catch(() => null);
  const body = signInBodySchema.safeParse({ token: form?.get("token") });
  if (!body.success) return redirectTo({ request, path: "/tickets/lost?notice=expired" });

  try {
    const result = await postSignIn({ token: body.data.token, locale: "en", ip: guard.ip, siteKey: guard.siteKey });
    if (result.state === "invalid") return redirectTo({ request, path: "/tickets/lost?notice=expired" });
    const response = redirectTo({ request, path: "/tickets/me" });
    response.cookies.set(SESSION_COOKIE, result.data.sessionToken, sessionCookieOptions({ request, expiresAt: result.data.expiresAt }));
    return response;
  } catch (error) {
    console.error("[tickets/sign-in] ep-api call failed:", error instanceof Error ? error.message : "unknown error");
    return ticketsFailure({ code: ticketErrorCode({ error }) });
  }
}

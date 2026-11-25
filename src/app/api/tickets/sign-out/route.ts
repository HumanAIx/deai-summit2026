import { NextResponse, type NextRequest } from "next/server";
import { postSignOut } from "@/lib/tickets/api";
import { guardTicketsRequest, createRateLimiter, NO_STORE } from "@/lib/tickets/route-guard";
import { SESSION_COOKIE, clearedCookieOptions } from "@/lib/tickets/session-cookie";

/**
 * "Sign out" on `/tickets/me`: ends the session at ep-api (`POST /tickets/my/sign-out`, the cookie value as
 * `x-session-token`), deletes the cookie whatever ep-api answers (a failed call must never leave the visitor signed in
 * on this browser), and goes to the find-your-tickets page with a "signed out" notice.
 */
const isRateLimited = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 20 });

export async function POST(request: NextRequest) {
  const guard = await guardTicketsRequest({ request, isRateLimited, checkOrigin: true, resolveSite: true });
  if (!guard.ok) return guard.response;

  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  if (sessionToken) {
    try {
      await postSignOut({ sessionToken, locale: "en", ip: guard.ip, siteKey: guard.siteKey });
    } catch (error) {
      // The cookie is cleared below regardless; ep-api's session ends by itself at its expiry.
      console.error("[tickets/sign-out] ep-api call failed:", error instanceof Error ? error.message : "unknown error");
    }
  }
  const response = NextResponse.redirect(new URL("/tickets/lost?notice=signedOut", request.url), 303);
  response.headers.set("Cache-Control", NO_STORE["Cache-Control"]);
  response.cookies.set(SESSION_COOKIE, "", clearedCookieOptions({ request }));
  return response;
}

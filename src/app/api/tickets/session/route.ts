import { NextResponse, type NextRequest } from "next/server";
import { guardTicketsRequest, createRateLimiter, NO_STORE } from "@/lib/tickets/route-guard";
import { SESSION_COOKIE, clearedCookieOptions } from "@/lib/tickets/session-cookie";

/**
 * `GET /api/tickets/session` — clears a dead session cookie. A server-rendered page cannot delete a cookie, so
 * `/tickets/me` sends a visitor whose session ep-api no longer knows here; the answer is a redirect back to
 * `/tickets/me?ended=1`, which (with no cookie) shows the sign-in form. No ep-api call, nothing private is read.
 */
const isRateLimited = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 30 });

export async function GET(request: NextRequest) {
  const guard = await guardTicketsRequest({ request, isRateLimited, checkOrigin: false });
  if (!guard.ok) return guard.response;
  const response = NextResponse.redirect(new URL("/tickets/me?ended=1", request.url), 303);
  response.headers.set("Cache-Control", NO_STORE["Cache-Control"]);
  response.cookies.set(SESSION_COOKIE, "", clearedCookieOptions({ request }));
  return response;
}

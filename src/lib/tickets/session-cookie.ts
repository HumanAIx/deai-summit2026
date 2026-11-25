import "server-only";
import type { NextRequest } from "next/server";

/**
 * The "My tickets" session (ep-api API-266). The session token lives ONLY in this httpOnly cookie: the browser's
 * scripts never read it, it is never in a URL, and it is sent to ep-api only as the `x-session-token` header.
 */
export const SESSION_COOKIE = "tk_session";

/** Longest a session cookie may live, whatever `expiresAt` says (defence in depth: ep-api's own expiry is what counts). */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** Secure everywhere except plain-http local development. */
export function isSecureRequest({ request }: { request: NextRequest }): boolean {
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return (forwarded ?? request.nextUrl.protocol.replace(":", "")) === "https";
}

/** Cookie attributes of a live session: httpOnly, SameSite=Lax, path `/`, max-age from ep-api's `expiresAt`. */
export function sessionCookieOptions({ request, expiresAt }: { request: NextRequest; expiresAt: string }) {
  const remaining = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
  const maxAge = Number.isFinite(remaining) ? Math.min(Math.max(remaining, 1), MAX_AGE_SECONDS) : 60 * 60;
  return { httpOnly: true, secure: isSecureRequest({ request }), sameSite: "lax" as const, path: "/", maxAge };
}

/** Attributes that delete the cookie (same name, path and flags). */
export function clearedCookieOptions({ request }: { request: NextRequest }) {
  return { httpOnly: true, secure: isSecureRequest({ request }), sameSite: "lax" as const, path: "/", maxAge: 0 };
}

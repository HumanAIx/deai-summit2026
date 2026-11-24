import { NextResponse, type NextRequest } from "next/server";
import { postLostLink } from "@/lib/tickets/api";
import { ticketErrorCode } from "@/lib/tickets/errors";
import { guardTicketsRequest, createRateLimiter, NO_STORE, ticketsFailure } from "@/lib/tickets/route-guard";
import { lostLinkBodySchema } from "@/lib/tickets/schemas";

/**
 * "Send my ticket links again" — proxies `POST /tickets/my/lost-link`. ep-api always answers the same 202
 * whether or not the address has tickets (no enumeration); this handler keeps that property: the success
 * answer is identical every time, and the only failures a visitor can see are an invalid address, our own
 * rate limit, a cross-origin POST, or an outage. Sits outside `proxy.ts`'s matcher (`api/`), so it resolves
 * the site from `Host` and passes the key explicitly (rule 21).
 */
const isRateLimited = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 5 });

export async function POST(request: NextRequest) {
  const guard = await guardTicketsRequest({ request, isRateLimited, checkOrigin: true, resolveSite: true });
  if (!guard.ok) return guard.response;

  const body = lostLinkBodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return ticketsFailure({ code: "invalid" });

  try {
    await postLostLink({ email: body.data.email, locale: "en", ip: guard.ip, siteKey: guard.siteKey });
  } catch (error) {
    console.error("[tickets/lost-link] ep-api call failed:", error instanceof Error ? error.message : "unknown error");
    return ticketsFailure({ code: ticketErrorCode({ error }) });
  }
  return NextResponse.json({ success: true }, { status: 202, headers: NO_STORE });
}

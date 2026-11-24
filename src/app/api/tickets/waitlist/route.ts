import { NextResponse, type NextRequest } from "next/server";
import { postWaitlistJoin } from "@/lib/tickets/api";
import { createRateLimiter, guardTicketsRequest, NO_STORE, ticketsFailure, ticketsFailureFrom } from "@/lib/tickets/route-guard";
import { waitlistBodySchema } from "@/lib/tickets/schemas";

/**
 * "Join the waitlist" of a sold-out ticket type — proxies `POST /tickets/types/:id/waitlist`. ep-api answers the
 * same neutral `{ joined: true }` whether or not the email was already listed (nothing may reveal who is on the
 * list); this handler keeps that property: the success body is identical every time and carries no personal data.
 * The visitor-visible failures are an invalid body, a closed waitlist, a quantity over the per-order maximum, our
 * own rate limit, a cross-origin POST, or an outage. Outside `proxy.ts`'s matcher (`api/`), so it resolves the site
 * from `Host` and passes the key explicitly (rule 21). 5 per 10 minutes per IP: joining is a rare, one-off action.
 */
const isRateLimited = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 5 });

export async function POST(request: NextRequest) {
  const guard = await guardTicketsRequest({ request, isRateLimited, checkOrigin: true, resolveSite: true });
  if (!guard.ok) return guard.response;

  const body = waitlistBodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return ticketsFailure({ code: "invalid" });

  try {
    await postWaitlistJoin({ body: body.data, locale: "en", ip: guard.ip, siteKey: guard.siteKey });
  } catch (error) {
    return ticketsFailureFrom({ error, tag: "tickets/waitlist" });
  }
  return NextResponse.json({ success: true, data: { joined: true } }, { headers: NO_STORE });
}

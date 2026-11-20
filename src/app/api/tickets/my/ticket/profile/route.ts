import { NextResponse, type NextRequest } from "next/server";
import { putMyTicketProfile } from "@/lib/tickets/api";
import { createRateLimiter, guardTicketsRequest, NO_STORE, ticketsFailure, ticketsFailureFrom } from "@/lib/tickets/route-guard";
import { profileBodySchema, ticketTokenSchema } from "@/lib/tickets/schemas";

/**
 * "Your details" on a holder's own ticket — proxies `PUT /tickets/my/ticket/profile` (ep-api DASH-205 T5). The holder token
 * comes in the `x-ticket-token` header and is forwarded as a header only; the body is the partial set of fields the form
 * changed. ep-api refuses a ticket that is no longer valid (`changesClosed`) and, after the badge cut-off, a change to company
 * or job title (`badgeFrozen`). A missing or malformed token is the same opaque `notFound` as an unknown one. Outside
 * `proxy.ts`'s matcher: resolves the site from `Host`. 30 / 10 min per IP (the form saves on demand, never on each key).
 */
const isRateLimited = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 30 });

export async function PUT(request: NextRequest) {
  const guard = await guardTicketsRequest({ request, isRateLimited, checkOrigin: true, resolveSite: true });
  if (!guard.ok) return guard.response;

  const token = ticketTokenSchema.safeParse(request.headers.get("x-ticket-token"));
  if (!token.success) return ticketsFailure({ code: "notFound" });
  const body = profileBodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return ticketsFailure({ code: "invalid" });

  try {
    const result = await putMyTicketProfile({ token: token.data, body: body.data, locale: "en", ip: guard.ip, siteKey: guard.siteKey });
    return NextResponse.json({ success: true, data: result }, { headers: NO_STORE });
  } catch (error) {
    return ticketsFailureFrom({ error, tag: "tickets/my/profile" });
  }
}

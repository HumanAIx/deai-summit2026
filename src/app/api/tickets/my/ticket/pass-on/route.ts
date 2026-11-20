import { NextResponse, type NextRequest } from "next/server";
import { postMyTicketPassOn } from "@/lib/tickets/api";
import { createRateLimiter, guardTicketsRequest, NO_STORE, ticketsFailure, ticketsFailureFrom } from "@/lib/tickets/route-guard";
import { passOnBodySchema, ticketTokenSchema } from "@/lib/tickets/schemas";

/**
 * "Pass this ticket on" — proxies `POST /tickets/my/ticket/pass-on`. The holder token travels in the `x-ticket-token`
 * header only; the body is the new holder's name and email. The old QR code stops working and the new holder gets their
 * own ticket (ep-api does it in one transaction). ep-api answers `transfersOff`, `changesClosed` or `passOnSameEmail`
 * as opaque codes; its own limit is 5 per ticket per day. Outside `proxy.ts`'s matcher: resolves the site from `Host`.
 * 10 / 10 min per IP.
 */
const isRateLimited = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 10 });

export async function POST(request: NextRequest) {
  const guard = await guardTicketsRequest({ request, isRateLimited, checkOrigin: true, resolveSite: true });
  if (!guard.ok) return guard.response;

  const token = ticketTokenSchema.safeParse(request.headers.get("x-ticket-token"));
  if (!token.success) return ticketsFailure({ code: "notFound" });
  const body = passOnBodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return ticketsFailure({ code: "invalid" });

  try {
    const result = await postMyTicketPassOn({ token: token.data, body: body.data, locale: "en", ip: guard.ip, siteKey: guard.siteKey });
    return NextResponse.json({ success: true, data: result }, { headers: NO_STORE });
  } catch (error) {
    return ticketsFailureFrom({ error, tag: "tickets/my/pass-on" });
  }
}

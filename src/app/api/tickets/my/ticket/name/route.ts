import { NextResponse, type NextRequest } from "next/server";
import { postMyTicketName } from "@/lib/tickets/api";
import { createRateLimiter, guardTicketsRequest, NO_STORE, ticketsFailure, ticketsFailureFrom } from "@/lib/tickets/route-guard";
import { nameBodySchema, ticketTokenSchema } from "@/lib/tickets/schemas";

/**
 * "Correct my name" on a holder's own ticket — proxies `POST /tickets/my/ticket/name`. The holder token comes in the
 * `x-ticket-token` header and is forwarded as a header only; the body is just the new name. ep-api checks the organiser's
 * "name changes" switch and the change window (`nameChangesOff`, `changesClosed`). A missing or malformed token is the same
 * opaque `notFound` as an unknown one. Outside `proxy.ts`'s matcher: resolves the site from `Host`. 20 / 10 min per IP.
 */
const isRateLimited = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 20 });

export async function POST(request: NextRequest) {
  const guard = await guardTicketsRequest({ request, isRateLimited, checkOrigin: true, resolveSite: true });
  if (!guard.ok) return guard.response;

  const token = ticketTokenSchema.safeParse(request.headers.get("x-ticket-token"));
  if (!token.success) return ticketsFailure({ code: "notFound" });
  const body = nameBodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return ticketsFailure({ code: "invalid" });

  try {
    const result = await postMyTicketName({ token: token.data, body: body.data, locale: "en", ip: guard.ip, siteKey: guard.siteKey });
    return NextResponse.json({ success: true, data: result }, { headers: NO_STORE });
  } catch (error) {
    return ticketsFailureFrom({ error, tag: "tickets/my/name" });
  }
}

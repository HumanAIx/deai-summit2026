import { NextResponse, type NextRequest } from "next/server";
import { postMyTicketCancel } from "@/lib/tickets/api";
import { createRateLimiter, guardTicketsRequest, NO_STORE, ticketsFailure, ticketsFailureFrom } from "@/lib/tickets/route-guard";
import { ticketTokenSchema } from "@/lib/tickets/schemas";

/**
 * "Cancel my ticket" on a free order — proxies `POST /tickets/my/ticket/cancel`. The holder token comes in the
 * `x-ticket-token` header and is forwarded as a header only; there is no body. ep-api decides eligibility (free order,
 * valid, not checked in, event not started: `cancelNotAllowed` otherwise). A missing or malformed token is the same opaque
 * `notFound` as an unknown one. Outside `proxy.ts`'s matcher: resolves the site from `Host`. 10 / 10 min per IP.
 */
const isRateLimited = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 10 });

export async function POST(request: NextRequest) {
  const guard = await guardTicketsRequest({ request, isRateLimited, checkOrigin: true, resolveSite: true });
  if (!guard.ok) return guard.response;

  const token = ticketTokenSchema.safeParse(request.headers.get("x-ticket-token"));
  if (!token.success) return ticketsFailure({ code: "notFound" });

  try {
    const result = await postMyTicketCancel({ token: token.data, locale: "en", ip: guard.ip, siteKey: guard.siteKey });
    return NextResponse.json({ success: true, data: result }, { headers: NO_STORE });
  } catch (error) {
    return ticketsFailureFrom({ error, tag: "tickets/my/cancel" });
  }
}

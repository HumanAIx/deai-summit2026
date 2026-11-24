import { NextResponse, type NextRequest } from "next/server";
import { postMyTicketPassOnCheck } from "@/lib/tickets/api";
import { createRateLimiter, guardTicketsRequest, NO_STORE, ticketsFailure, ticketsFailureFrom } from "@/lib/tickets/route-guard";
import { passOnCheckBodySchema, ticketTokenSchema } from "@/lib/tickets/schemas";

/**
 * "Pass this ticket on" pre-check — proxies `POST /tickets/my/ticket/pass-on/check` before the "cannot be undone"
 * question. Same refusals as the pass-on (`passOnSameEmail`, `transfersOff`, `changesClosed`, `refundRequestOpen`),
 * nothing is changed. Holder token in `x-ticket-token` only. 20 / 10 min per IP (a buyer may retype the address).
 */
const isRateLimited = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 20 });

export async function POST(request: NextRequest) {
  const guard = await guardTicketsRequest({ request, isRateLimited, checkOrigin: true });
  if (!guard.ok) return guard.response;

  const token = ticketTokenSchema.safeParse(request.headers.get("x-ticket-token"));
  if (!token.success) return ticketsFailure({ code: "notFound" });
  const body = passOnCheckBodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return ticketsFailure({ code: "invalid" });

  try {
    const result = await postMyTicketPassOnCheck({ token: token.data, body: body.data, locale: "en", ip: guard.ip });
    return NextResponse.json({ success: true, data: result }, { headers: NO_STORE });
  } catch (error) {
    return ticketsFailureFrom({ error, tag: "tickets/my/pass-on/check" });
  }
}

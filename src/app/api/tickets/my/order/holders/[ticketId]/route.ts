import { NextResponse, type NextRequest } from "next/server";
import { patchMyOrderHolder } from "@/lib/tickets/api";
import { createRateLimiter, guardTicketsRequest, NO_STORE, ticketsFailure, ticketsFailureFrom } from "@/lib/tickets/route-guard";
import { holderEditBodySchema, ticketIdSchema, ticketTokenSchema } from "@/lib/tickets/schemas";

/**
 * The buyer edits a holder of their order — proxies `PATCH /tickets/my/order/holders/:ticketId`. The buyer token comes
 * in the `x-order-token` header (never the URL); a ticket id that is not a uuid, a missing token and an unknown pair are
 * all the same opaque `notFound`. ep-api decides what may change (a name needs "name changes", a new email needs
 * "transfers", both inside the change window). Outside `proxy.ts`'s matcher: resolves the site from `Host`. 20 / 10 min per IP.
 */
const isRateLimited = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 20 });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  const guard = await guardTicketsRequest({ request, isRateLimited, checkOrigin: true, resolveSite: true });
  if (!guard.ok) return guard.response;

  const { ticketId: rawTicketId } = await params;
  const ticketId = ticketIdSchema.safeParse(rawTicketId);
  const token = ticketTokenSchema.safeParse(request.headers.get("x-order-token"));
  if (!ticketId.success || !token.success) return ticketsFailure({ code: "notFound" });
  const body = holderEditBodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return ticketsFailure({ code: "invalid" });

  try {
    const result = await patchMyOrderHolder({ token: token.data, ticketId: ticketId.data, body: body.data, locale: "en", ip: guard.ip, siteKey: guard.siteKey });
    return NextResponse.json({ success: true, data: result }, { headers: NO_STORE });
  } catch (error) {
    return ticketsFailureFrom({ error, tag: "tickets/my/holder" });
  }
}

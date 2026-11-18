import { NextResponse, type NextRequest } from "next/server";
import { postExtendOrder } from "@/lib/tickets/api";
import { createRateLimiter, guardTicketsRequest, NO_STORE, ticketsFailure, ticketsFailureFrom } from "@/lib/tickets/route-guard";
import { orderIdSchema, ticketTokenSchema } from "@/lib/tickets/schemas";

/**
 * Asks ep-api for more hold time right before the buyer pays — proxies `POST /tickets/orders/:id/extend`. The
 * buyer token comes in the `x-order-token` header (it was returned by the order call) and is forwarded as a
 * header only. A hold that already ended answers `holdEnded`. Outside `proxy.ts`'s matcher: resolves the site
 * from `Host`, passes the key explicitly. 60 / min per IP.
 */
const isRateLimited = createRateLimiter({ windowMs: 60 * 1000, max: 60 });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await guardTicketsRequest({ request, isRateLimited, checkOrigin: true, resolveSite: true });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const orderId = orderIdSchema.safeParse(id);
  const token = ticketTokenSchema.safeParse(request.headers.get("x-order-token"));
  // Same answer as an unknown order: nothing tells a prober which part was wrong.
  if (!orderId.success || !token.success) return ticketsFailure({ code: "notFound" });

  try {
    const extended = await postExtendOrder({ orderId: orderId.data, token: token.data, locale: "en", ip: guard.ip, siteKey: guard.siteKey });
    return NextResponse.json({ success: true, data: extended }, { headers: NO_STORE });
  } catch (error) {
    return ticketsFailureFrom({ error, tag: "tickets/extend" });
  }
}

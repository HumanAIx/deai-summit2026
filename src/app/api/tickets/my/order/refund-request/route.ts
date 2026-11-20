import { NextResponse, type NextRequest } from "next/server";
import { postMyRefundRequest } from "@/lib/tickets/api";
import { createRateLimiter, guardTicketsRequest, NO_STORE, ticketsFailure, ticketsFailureFrom } from "@/lib/tickets/route-guard";
import { refundRequestBodySchema, ticketTokenSchema } from "@/lib/tickets/schemas";

/**
 * "Request a refund" from the buyer's order page — proxies `POST /tickets/my/order/refund-request`. The buyer token
 * travels in the `x-order-token` header only; the body names the tickets, a reason from a fixed list and an optional
 * message (the buyer's own words, forwarded as is and never echoed back). ep-api allows one open request per order
 * (`refundRequestOpen`). Outside `proxy.ts`'s matcher: resolves the site from `Host`. 10 / 10 min per IP.
 */
const isRateLimited = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 10 });

export async function POST(request: NextRequest) {
  const guard = await guardTicketsRequest({ request, isRateLimited, checkOrigin: true, resolveSite: true });
  if (!guard.ok) return guard.response;

  const token = ticketTokenSchema.safeParse(request.headers.get("x-order-token"));
  if (!token.success) return ticketsFailure({ code: "notFound" });
  const body = refundRequestBodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return ticketsFailure({ code: "invalid" });

  try {
    const result = await postMyRefundRequest({ token: token.data, body: body.data, locale: "en", ip: guard.ip, siteKey: guard.siteKey });
    return NextResponse.json({ success: true, data: result }, { status: 201, headers: NO_STORE });
  } catch (error) {
    return ticketsFailureFrom({ error, tag: "tickets/my/refund-request" });
  }
}

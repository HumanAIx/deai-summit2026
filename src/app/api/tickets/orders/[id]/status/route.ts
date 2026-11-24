import { NextResponse, type NextRequest } from "next/server";
import { fetchOrderStatus } from "@/lib/tickets/api";
import { ticketErrorCode } from "@/lib/tickets/errors";
import { guardTicketsRequest, createRateLimiter, NO_STORE, ticketsFailure } from "@/lib/tickets/route-guard";
import { orderIdSchema, ticketTokenSchema } from "@/lib/tickets/schemas";

/**
 * Order status for the "confirming your payment" screen (after paying, and on the 3-D Secure return) —
 * proxies `GET /tickets/orders/:id/status`. The buyer token comes in the `x-order-token` header from the
 * visitor's own URL and is forwarded as a header only. Outside `proxy.ts`'s matcher: resolves the site from
 * `Host` and passes the key explicitly. Polled every 2 s per tab, hence 60 / min per IP.
 */
const isRateLimited = createRateLimiter({ windowMs: 60 * 1000, max: 60 });

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await guardTicketsRequest({ request, isRateLimited, checkOrigin: false, resolveSite: true });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const orderId = orderIdSchema.safeParse(id);
  const token = ticketTokenSchema.safeParse(request.headers.get("x-order-token"));
  // Same answer as an unknown order: nothing tells a prober which part was wrong.
  if (!orderId.success || !token.success) return ticketsFailure({ code: "notFound" });

  try {
    const status = await fetchOrderStatus({ orderId: orderId.data, token: token.data, locale: "en", ip: guard.ip, siteKey: guard.siteKey });
    return NextResponse.json({ success: true, data: status }, { headers: NO_STORE });
  } catch (error) {
    const code = ticketErrorCode({ error });
    if (code === "unavailable") console.error("[tickets/status] ep-api call failed:", error instanceof Error ? error.message : "unknown error");
    return ticketsFailure({ code });
  }
}

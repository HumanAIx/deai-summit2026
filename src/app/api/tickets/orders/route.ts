import { NextResponse, type NextRequest } from "next/server";
import { postCreateOrder } from "@/lib/tickets/api";
import { createRateLimiter, guardTicketsRequest, NO_STORE, ticketsFailure, ticketsFailureFrom } from "@/lib/tickets/route-guard";
import { createOrderBodySchema } from "@/lib/tickets/schemas";

/**
 * Creates the pending order (stock hold + Stripe payment intent, or a paid order at once when the total is 0) —
 * proxies `POST /tickets/orders`. The client's random `idempotencyKey` makes a double click or a retry replay
 * the same order. The answer carries the buyer token and the intent's client secret: it is `no-store` and never
 * logged. Outside `proxy.ts`'s matcher: resolves the site from `Host`, passes the key explicitly (rule 21).
 * Order creation is the expensive path (stock locks, Stripe), hence 10 per 10 minutes per IP.
 */
const isRateLimited = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 10 });

export async function POST(request: NextRequest) {
  const guard = await guardTicketsRequest({ request, isRateLimited, checkOrigin: true, resolveSite: true });
  if (!guard.ok) return guard.response;

  const body = createOrderBodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return ticketsFailure({ code: "invalid" });

  try {
    const order = await postCreateOrder({ body: body.data, locale: "en", ip: guard.ip, siteKey: guard.siteKey });
    // Without a token the buyer could never reach their order; a paid-intent order without its secret / key cannot be paid.
    if (order.buyerToken === null) return ticketsFailure({ code: "unavailable" });
    if (!order.free && (!order.clientSecret || !order.publishableKey)) return ticketsFailure({ code: "paymentUnavailable" });
    return NextResponse.json(
      {
        success: true,
        data: {
          orderId: order.orderId,
          buyerToken: order.buyerToken,
          holdExpiresAt: order.holdExpiresAt,
          ...(order.holdMaxAt ? { holdMaxAt: order.holdMaxAt } : {}),
          totals: order.totals,
          clientSecret: order.free ? null : order.clientSecret,
          publishableKey: order.free ? null : order.publishableKey,
          stripeAccount: order.free ? null : (order.stripeAccount ?? null),
          testMode: order.testMode ?? false,
          free: order.free,
        },
      },
      { status: 201, headers: NO_STORE },
    );
  } catch (error) {
    return ticketsFailureFrom({ error, tag: "tickets/orders" });
  }
}

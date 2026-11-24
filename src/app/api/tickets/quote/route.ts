import { NextResponse, type NextRequest } from "next/server";
import { postQuote } from "@/lib/tickets/api";
import { createRateLimiter, guardTicketsRequest, NO_STORE, ticketsFailure, ticketsFailureFrom } from "@/lib/tickets/route-guard";
import { quoteBodySchema } from "@/lib/tickets/schemas";

/**
 * Live price of the cart — proxies `POST /tickets/orders/quote` (no writes). The browser never computes money:
 * the totals shown in the checkout are exactly this answer. Sits outside `proxy.ts`'s matcher (`api/`), so it
 * resolves the site from `Host` and passes the key explicitly (rule 21). 60 / min per IP (the cart re-quotes on
 * every change, debounced client-side).
 */
const isRateLimited = createRateLimiter({ windowMs: 60 * 1000, max: 60 });

export async function POST(request: NextRequest) {
  const guard = await guardTicketsRequest({ request, isRateLimited, checkOrigin: true, resolveSite: true });
  if (!guard.ok) return guard.response;

  const body = quoteBodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return ticketsFailure({ code: "invalid" });

  try {
    const quote = await postQuote({ body: body.data, locale: "en", ip: guard.ip, siteKey: guard.siteKey });
    return NextResponse.json({ success: true, data: quote }, { headers: NO_STORE });
  } catch (error) {
    return ticketsFailureFrom({ error, tag: "tickets/quote" });
  }
}

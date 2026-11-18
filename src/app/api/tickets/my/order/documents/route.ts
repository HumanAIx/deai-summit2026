import { NextResponse, type NextRequest } from "next/server";
import { fetchMyOrder } from "@/lib/tickets/api";
import { createRateLimiter, guardTicketsRequest, NO_STORE, ticketsFailure, ticketsFailureFrom } from "@/lib/tickets/route-guard";
import { orderDocumentsBodySchema } from "@/lib/tickets/schemas";

/**
 * The documents (invoice, credit notes) of the buyer's order, for the Tickets block's checkout pop-up
 * confirmation — reads `GET /tickets/my/order` and answers only `{ id, kind, number }` per document. The buyer
 * token comes in the request BODY (the pop-up keeps it in memory; it is never a URL), is shape-checked, and is
 * forwarded as a header only. A bad or unknown token is the same opaque `notFound`. Outside `proxy.ts`'s matcher:
 * resolves the site from `Host`. 30 / min per IP.
 */
const isRateLimited = createRateLimiter({ windowMs: 60 * 1000, max: 30 });

export async function POST(request: NextRequest) {
  const guard = await guardTicketsRequest({ request, isRateLimited, checkOrigin: true, resolveSite: true });
  if (!guard.ok) return guard.response;

  const body = orderDocumentsBodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return ticketsFailure({ code: "notFound" });

  try {
    const read = await fetchMyOrder({ token: body.data.token, locale: "en", ip: guard.ip, siteKey: guard.siteKey });
    if (read.state === "invalid") return ticketsFailure({ code: "notFound" });
    const documents = (Array.isArray(read.data.documents) ? read.data.documents : []).map(({ id, kind, number }) => ({ id, kind, number }));
    return NextResponse.json({ success: true, data: { documents } }, { headers: NO_STORE });
  } catch (error) {
    return ticketsFailureFrom({ error, tag: "tickets/my/documents" });
  }
}

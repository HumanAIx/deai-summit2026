import { NextResponse, type NextRequest } from "next/server";
import { fetchPublicTypes } from "@/lib/tickets/api";
import { createRateLimiter, guardTicketsRequest, NO_STORE, ticketsFailureFrom } from "@/lib/tickets/route-guard";
import { blockTypesSchema, type BlockTypes } from "@/lib/tickets/schemas";

/**
 * Live ticket types for the site-builder Tickets block — proxies `GET /tickets/types` (no writes). The CMS page is
 * cached for 60 s, so prices, stock and sale state are NEVER baked into it: the block's browser island calls this
 * on mount and when the tab regains focus. Answers the types and the `checkout` block (the cards read its flags), `no-store`. Sits outside `proxy.ts`'s matcher (`api/`), so it resolves the site from `Host` and passes
 * the key explicitly (rule 21). 60 / min per IP: one call per page view and per tab refocus.
 */
const isRateLimited = createRateLimiter({ windowMs: 60 * 1000, max: 60 });

const LOCALE = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;

export async function GET(request: NextRequest) {
  const guard = await guardTicketsRequest({ request, isRateLimited, checkOrigin: false, resolveSite: true });
  if (!guard.ok) return guard.response;

  const requested = request.nextUrl.searchParams.get("locale") ?? "";
  const locale = LOCALE.test(requested) ? requested : "en";

  try {
    const { types, checkout } = await fetchPublicTypes({ locale, ip: guard.ip, siteKey: guard.siteKey });
    const data: BlockTypes = blockTypesSchema.parse({ types, checkout });
    return NextResponse.json({ success: true, data }, { headers: NO_STORE });
  } catch (error) {
    return ticketsFailureFrom({ error, tag: "tickets/types" });
  }
}

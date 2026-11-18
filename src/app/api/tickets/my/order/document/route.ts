import type { NextRequest } from "next/server";
import { fetchOrderDocument } from "@/lib/tickets/api";
import { ticketErrorCode } from "@/lib/tickets/errors";
import { attachmentName, createRateLimiter, fileResponse, guardTicketsRequest, ticketsFailure } from "@/lib/tickets/route-guard";
import { orderDocumentBodySchema } from "@/lib/tickets/schemas";

/**
 * One invoice / credit note PDF of the buyer's order for the checkout pop-up's confirmation — the POST twin of
 * `app/tickets/order/[token]/documents/[documentId]` (which keeps the token in the URL for the order page). Here the
 * buyer token and the document id come in the request BODY, so nothing secret is ever a URL. Streams
 * `GET /tickets/my/order/documents/:id` as `application/pdf`, `attachment`, `no-store`. Outside `proxy.ts`'s
 * matcher: resolves the site from `Host`. 30 / min per IP.
 */
const isRateLimited = createRateLimiter({ windowMs: 60 * 1000, max: 30 });

export async function POST(request: NextRequest) {
  const guard = await guardTicketsRequest({ request, isRateLimited, checkOrigin: true, resolveSite: true });
  if (!guard.ok) return guard.response;

  const body = orderDocumentBodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return ticketsFailure({ code: "notFound" });

  try {
    const file = await fetchOrderDocument({ token: body.data.token, documentId: body.data.documentId, locale: "en", ip: guard.ip, siteKey: guard.siteKey });
    return fileResponse({
      body: file.body,
      contentType: "application/pdf",
      filename: attachmentName({ upstream: file.contentDisposition, fallback: "document.pdf" }),
    });
  } catch (error) {
    const code = ticketErrorCode({ error });
    if (code === "unavailable") console.error("[tickets/document] ep-api call failed:", error instanceof Error ? error.message : "unknown error");
    return ticketsFailure({ code });
  }
}

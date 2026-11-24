import type { NextRequest } from "next/server";
import { fetchOrderDocument } from "@/lib/tickets/api";
import { ticketErrorCode } from "@/lib/tickets/errors";
import { attachmentName, createRateLimiter, fileResponse, guardTicketsRequest, ticketsFailure } from "@/lib/tickets/route-guard";
import { documentIdSchema, ticketTokenSchema } from "@/lib/tickets/schemas";

/**
 * An invoice / credit note PDF of the buyer's order — streams
 * `GET /tickets/my/order/documents/:documentId` as `application/pdf`, `attachment`, `no-store`. Under
 * `app/tickets/**` (through `proxy.ts`). The buyer token is forwarded as the `x-order-token` header only;
 * a document of another order is the same 404 as an unknown one (ep-api).
 */
const isRateLimited = createRateLimiter({ windowMs: 60 * 1000, max: 30 });

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string; documentId: string }> }) {
  const guard = await guardTicketsRequest({ request, isRateLimited, checkOrigin: false, resolveSite: false });
  if (!guard.ok) return guard.response;

  const { token: rawToken, documentId: rawDocumentId } = await params;
  const token = ticketTokenSchema.safeParse(rawToken);
  const documentId = documentIdSchema.safeParse(rawDocumentId);
  if (!token.success || !documentId.success) return ticketsFailure({ code: "notFound" });

  try {
    const file = await fetchOrderDocument({ token: token.data, documentId: documentId.data, locale: "en", ip: guard.ip });
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

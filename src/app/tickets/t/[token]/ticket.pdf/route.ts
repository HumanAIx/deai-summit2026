import type { NextRequest } from "next/server";
import { fetchTicketPdf } from "@/lib/tickets/api";
import { ticketErrorCode } from "@/lib/tickets/errors";
import { attachmentName, createRateLimiter, fileResponse, guardTicketsRequest, ticketsFailure } from "@/lib/tickets/route-guard";
import { ticketTokenSchema } from "@/lib/tickets/schemas";

/**
 * "Save as PDF" for a holder link — streams `GET /tickets/my/ticket/ticket.pdf`. Under
 * `app/tickets/**`, so `proxy.ts` ran and `epFetch` reads the site key it resolved. The holder token is
 * the URL segment the visitor already holds; it is forwarded as the `x-ticket-token` header only.
 */
const isRateLimited = createRateLimiter({ windowMs: 60 * 1000, max: 30 });

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const guard = await guardTicketsRequest({ request, isRateLimited, checkOrigin: false, resolveSite: false });
  if (!guard.ok) return guard.response;

  const token = ticketTokenSchema.safeParse((await params).token);
  if (!token.success) return ticketsFailure({ code: "notFound" });

  try {
    const file = await fetchTicketPdf({ token: token.data, locale: "en", ip: guard.ip });
    return fileResponse({
      body: file.body,
      contentType: "application/pdf",
      filename: attachmentName({ upstream: file.contentDisposition, fallback: "ticket.pdf" }),
    });
  } catch (error) {
    const code = ticketErrorCode({ error });
    if (code === "unavailable") console.error("[tickets/pdf] ep-api call failed:", error instanceof Error ? error.message : "unknown error");
    return ticketsFailure({ code });
  }
}

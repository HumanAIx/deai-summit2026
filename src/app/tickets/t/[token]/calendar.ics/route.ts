import type { NextRequest } from "next/server";
import { fetchTicketCalendar } from "@/lib/tickets/api";
import { ticketErrorCode } from "@/lib/tickets/errors";
import { attachmentName, createRateLimiter, fileResponse, guardTicketsRequest, ticketsFailure } from "@/lib/tickets/route-guard";
import { ticketTokenSchema } from "@/lib/tickets/schemas";

/**
 * "Add to calendar" for a holder link — streams `GET /tickets/my/ticket/calendar.ics`. Under
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
    const file = await fetchTicketCalendar({ token: token.data, locale: "en", ip: guard.ip });
    return fileResponse({
      body: file.body,
      contentType: "text/calendar; charset=utf-8",
      filename: attachmentName({ upstream: file.contentDisposition, fallback: "ticket.ics" }),
    });
  } catch (error) {
    const code = ticketErrorCode({ error });
    if (code === "unavailable") console.error("[tickets/calendar] ep-api call failed:", error instanceof Error ? error.message : "unknown error");
    return ticketsFailure({ code });
  }
}

import "server-only";
import type { z } from "zod";
import { EpApiError, epFetch, epFetchRaw, type EpRawResponse } from "@/lib/tickets/ep-client";
import { clientIpHeaders } from "./client-ip";
import {
  createOrderResultSchema,
  cancelResultSchema,
  extendResultSchema,
  holderEditResultSchema,
  nameResultSchema,
  passOnCheckResultSchema,
  passOnResultSchema,
  refundRequestResultSchema,
  linkTypeSchema,
  myOrderSchema,
  myOverviewSchema,
  mySessionSchema,
  signInResultSchema,
  myTicketSchema,
  profileBlockSchema,
  orderStatusSchema,
  publicTypesSchema,
  quoteResultSchema,
  waitlistJoinResultSchema,
  waitlistOfferSchema,
  type CreateOrderBody,
  type CreateOrderResult,
  type HolderEditBody,
  type MyOrder,
  type MyOverview,
  type SignInResult,
  type MyTicket,
  type ProfileBlock,
  type ProfileBody,
  type NameBody,
  type OrderStatusAnswer,
  type PassOnBody,
  type PassOnCheckBody,
  type PublicTypes,
  type QuoteBody,
  type QuoteResult,
  type RefundRequestBody,
  type WaitlistBody,
  type WaitlistOffer,
} from "./schemas";

/**
 * Every ep-api call of the tickets pages and route handlers (`/api/site/tickets/*`),
 * through `epFetch` only (rule 2). Shared rules:
 *   - `cache: "no-store"` on EVERY call: stock and private ticket data must never be served from
 *     Next's fetch cache (rule 16 is about reads we choose to cache; these we never do);
 *   - tokens travel in headers (`x-ticket-token`, `x-order-token`), never in a URL or query;
 *   - the buyer's IP goes as `x-gconf-client-ip` when known, so ep-api's per-IP limits see the
 *     buyer, not this server;
 *   - every JSON answer is Zod-parsed (rule 25); a shape ep-api never sends throws.
 * `siteKey` is passed only by route handlers under `app/api/**`, which bypass the proxy (rule 1 of
 * the contract); pages and `app/tickets/**` handlers let `epFetch` read the proxy's resolved key.
 */

interface Common {
  locale: string;
  ip: string | undefined;
  siteKey?: string | undefined;
}

function base({ locale, ip, siteKey }: Common) {
  return { locale, cache: "no-store" as const, ...(siteKey ? { siteKey } : {}), headers: clientIpHeaders({ ip }) };
}

/** Result of a token read: the data, or "this link is not valid" (every ep-api 404/4xx miss). */
export type TokenRead<T> = { state: "ok"; data: T } | { state: "invalid" };

/**
 * A wrong, foreign, expired or malformed token (ep-api answers 404; its own validation answers 4xx) is
 * the SAME opaque "not valid" state (rule 28). Rate limits, key problems and outages are NOT a bad link:
 * they throw so the themed error page shows instead of telling the visitor their link is broken.
 */
function isInvalidLink({ error }: { error: unknown }): boolean {
  return error instanceof EpApiError && (error.status === 404 || error.status === 400);
}

export async function fetchMyTicket({ token, ...common }: Common & { token: string }): Promise<TokenRead<MyTicket>> {
  try {
    const raw = await epFetch<unknown>("/tickets/my/ticket", {
      ...base(common),
      headers: { ...clientIpHeaders({ ip: common.ip }), "x-ticket-token": token },
    });
    return { state: "ok", data: myTicketSchema.parse(raw) };
  } catch (error) {
    if (isInvalidLink({ error })) return { state: "invalid" };
    throw error;
  }
}

export async function fetchMyOrder({ token, ...common }: Common & { token: string }): Promise<TokenRead<MyOrder>> {
  try {
    const raw = await epFetch<unknown>("/tickets/my/order", {
      ...base(common),
      headers: { ...clientIpHeaders({ ip: common.ip }), "x-order-token": token },
    });
    return { state: "ok", data: myOrderSchema.parse(raw) };
  } catch (error) {
    if (isInvalidLink({ error })) return { state: "invalid" };
    throw error;
  }
}

/** `GET /tickets/my/overview` — "My tickets" behind a list link (`x-list-token`); unknown or expired = the same "invalid". */
export async function fetchMyOverview({ token, ...common }: Common & { token: string }): Promise<TokenRead<MyOverview>> {
  try {
    const raw = await epFetch<unknown>("/tickets/my/overview", {
      ...base(common),
      headers: { ...clientIpHeaders({ ip: common.ip }), "x-list-token": token },
    });
    return { state: "ok", data: myOverviewSchema.parse(raw) };
  } catch (error) {
    if (isInvalidLink({ error })) return { state: "invalid" };
    throw error;
  }
}

/** `POST /tickets/my/sign-in` — exchange the one-time emailed token for a session (404 = used, expired, other site or bad). */
export async function postSignIn({ token, ...common }: Common & { token: string }): Promise<TokenRead<SignInResult>> {
  try {
    const raw = await epFetch<unknown>("/tickets/my/sign-in", { ...base(common), method: "POST", body: { token } });
    return { state: "ok", data: signInResultSchema.parse(raw) };
  } catch (error) {
    if (isInvalidLink({ error })) return { state: "invalid" };
    throw error;
  }
}

/** `GET /tickets/my/session` — the signed-in list (`x-session-token`); 401 (or 404) = the session has ended. */
export async function fetchMySession({ sessionToken, ...common }: Common & { sessionToken: string }): Promise<TokenRead<MyOverview>> {
  try {
    const raw = await epFetch<unknown>("/tickets/my/session", {
      ...base(common),
      headers: { ...clientIpHeaders({ ip: common.ip }), "x-session-token": sessionToken },
    });
    return { state: "ok", data: mySessionSchema.parse(raw) };
  } catch (error) {
    if (error instanceof EpApiError && error.status === 401) return { state: "invalid" };
    if (isInvalidLink({ error })) return { state: "invalid" };
    throw error;
  }
}

/** `POST /tickets/my/sign-out` — ends the session at ep-api (204). */
export async function postSignOut({ sessionToken, ...common }: Common & { sessionToken: string }): Promise<void> {
  await epFetch<unknown>("/tickets/my/sign-out", {
    ...base(common),
    method: "POST",
    headers: { ...clientIpHeaders({ ip: common.ip }), "x-session-token": sessionToken },
  });
}

export async function fetchOrderStatus({ orderId, token, ...common }: Common & { orderId: string; token: string }): Promise<OrderStatusAnswer> {
  const raw = await epFetch<unknown>(`/tickets/orders/${encodeURIComponent(orderId)}/status`, {
    ...base(common),
    headers: { ...clientIpHeaders({ ip: common.ip }), "x-order-token": token },
  });
  return orderStatusSchema.parse(raw);
}

/** `GET /tickets/types`, optionally narrowed to one schedule or one event (ep-api refuses both at once). */
export async function fetchPublicTypes({ scheduleId, eventId, ...common }: Common & { scheduleId?: string | undefined; eventId?: string | undefined }): Promise<PublicTypes> {
  const raw = await epFetch<unknown>("/tickets/types", {
    ...base(common),
    ...(scheduleId || eventId ? { searchParams: { ...(scheduleId ? { scheduleId } : {}), ...(eventId ? { eventId } : {}) } } : {}),
  });
  return publicTypesSchema.parse(raw);
}

/** `GET /tickets/types/link/:token` — the one type behind a private link (404 `tickets.typeNotFound` when unknown). */
export async function fetchLinkType({ token, ...common }: Common & { token: string }): Promise<PublicTypes> {
  const raw = await epFetch<unknown>(`/tickets/types/link/${encodeURIComponent(token)}`, base(common));
  const { type, checkout } = linkTypeSchema.parse(raw);
  return { types: [type], checkout };
}

/** `POST /tickets/orders/quote` — no writes; the only source of the totals the cart shows. */
export async function postQuote({ body, ...common }: Common & { body: QuoteBody }): Promise<QuoteResult> {
  const raw = await epFetch<unknown>("/tickets/orders/quote", { ...base(common), method: "POST", body });
  return quoteResultSchema.parse(raw);
}

/** `POST /tickets/orders` — creates the pending order (and the Stripe payment intent, unless it is free). */
export async function postCreateOrder({ body, ...common }: Common & { body: CreateOrderBody }): Promise<CreateOrderResult> {
  const raw = await epFetch<unknown>("/tickets/orders", { ...base(common), method: "POST", body });
  return createOrderResultSchema.parse(raw);
}

/** `POST /tickets/orders/:id/extend` — the buyer asks for more hold time right before paying. */
export async function postExtendOrder({ orderId, token, ...common }: Common & { orderId: string; token: string }): Promise<z.infer<typeof extendResultSchema>> {
  const raw = await epFetch<unknown>(`/tickets/orders/${encodeURIComponent(orderId)}/extend`, {
    ...base(common),
    method: "POST",
    headers: { ...clientIpHeaders({ ip: common.ip }), "x-order-token": token },
  });
  return extendResultSchema.parse(raw);
}

/**
 * `POST /tickets/types/:id/waitlist` — join the waitlist of a sold-out type. ep-api answers the same neutral
 * `{ joined: true }` whether or not the email was already listed; nothing here reads or returns more.
 */
export async function postWaitlistJoin({ body, ...common }: Common & { body: WaitlistBody }): Promise<void> {
  const { ticketTypeId, ...person } = body;
  const raw = await epFetch<unknown>(`/tickets/types/${encodeURIComponent(ticketTypeId)}/waitlist`, { ...base(common), method: "POST", body: person });
  waitlistJoinResultSchema.parse(raw);
}

/** `GET /tickets/waitlist/offers/:token` — an unknown, ended or used offer is one opaque "ended" state (404). */
export async function fetchWaitlistOffer({ token, ...common }: Common & { token: string }): Promise<TokenRead<WaitlistOffer>> {
  try {
    const raw = await epFetch<unknown>(`/tickets/waitlist/offers/${encodeURIComponent(token)}`, base(common));
    return { state: "ok", data: waitlistOfferSchema.parse(raw) };
  } catch (error) {
    if (isInvalidLink({ error })) return { state: "invalid" };
    throw error;
  }
}

export async function postLostLink({ email, ...common }: Common & { email: string }): Promise<void> {
  await epFetch<unknown>("/tickets/my/lost-link", { ...base(common), method: "POST", body: { email } });
}

export async function fetchTicketCalendar({ token, ...common }: Common & { token: string }): Promise<EpRawResponse> {
  return epFetchRaw("/tickets/my/ticket/calendar.ics", {
    ...base(common),
    headers: { ...clientIpHeaders({ ip: common.ip }), "x-ticket-token": token },
  });
}

export async function fetchOrderDocument({ token, documentId, ...common }: Common & { token: string; documentId: string }): Promise<EpRawResponse> {
  return epFetchRaw(`/tickets/my/order/documents/${encodeURIComponent(documentId)}`, {
    ...base(common),
    headers: { ...clientIpHeaders({ ip: common.ip }), "x-order-token": token },
  });
}

// ─── holder self-service (ep-api DASH-205 F1) ─────────────────────────────────────────────────────────────
// Writes go through our own POST/PATCH route handlers only (rule 27). The token stays in a header; the body
// carries only what the form collected. ep-api checks the organiser's switches and the change window.

/** `POST /tickets/my/ticket/name` — correct the holder's name (holder token). */
export async function postMyTicketName({ token, body, ...common }: Common & { token: string; body: NameBody }): Promise<z.infer<typeof nameResultSchema>> {
  const raw = await epFetch<unknown>("/tickets/my/ticket/name", {
    ...base(common),
    method: "POST",
    body,
    headers: { ...clientIpHeaders({ ip: common.ip }), "x-ticket-token": token },
  });
  return nameResultSchema.parse(raw);
}

/** `POST /tickets/my/ticket/cancel` — the holder cancels a ticket of a free order (holder token); no body. */
export async function postMyTicketCancel({ token, ...common }: Common & { token: string }): Promise<z.infer<typeof cancelResultSchema>> {
  const raw = await epFetch<unknown>("/tickets/my/ticket/cancel", {
    ...base(common),
    method: "POST",
    body: {},
    headers: { ...clientIpHeaders({ ip: common.ip }), "x-ticket-token": token },
  });
  return cancelResultSchema.parse(raw);
}

/** `PUT /tickets/my/ticket/profile` — "Your details" on the ticket page, a partial save (holder token). */
export async function putMyTicketProfile({ token, body, ...common }: Common & { token: string; body: ProfileBody }): Promise<ProfileBlock> {
  const raw = await epFetch<unknown>("/tickets/my/ticket/profile", {
    ...base(common),
    method: "PUT",
    body,
    headers: { ...clientIpHeaders({ ip: common.ip }), "x-ticket-token": token },
  });
  return profileBlockSchema.parse(raw);
}

/**
 * `POST /tickets/my/ticket/pass-on/check` — the same refusals as the pass-on itself (same email, transfers off, change
 * window closed, an open refund request naming the ticket), without changing anything (holder token).
 */
export async function postMyTicketPassOnCheck({ token, body, ...common }: Common & { token: string; body: PassOnCheckBody }): Promise<z.infer<typeof passOnCheckResultSchema>> {
  const raw = await epFetch<unknown>("/tickets/my/ticket/pass-on/check", {
    ...base(common),
    method: "POST",
    body,
    headers: { ...clientIpHeaders({ ip: common.ip }), "x-ticket-token": token },
  });
  return passOnCheckResultSchema.parse(raw);
}

/** `POST /tickets/my/ticket/pass-on` — pass the ticket on to someone else (holder token). */
export async function postMyTicketPassOn({ token, body, ...common }: Common & { token: string; body: PassOnBody }): Promise<z.infer<typeof passOnResultSchema>> {
  const raw = await epFetch<unknown>("/tickets/my/ticket/pass-on", {
    ...base(common),
    method: "POST",
    body,
    headers: { ...clientIpHeaders({ ip: common.ip }), "x-ticket-token": token },
  });
  return passOnResultSchema.parse(raw);
}

/** `PATCH /tickets/my/order/holders/:ticketId` — the buyer edits a holder of their order (order token). */
export async function patchMyOrderHolder({ token, ticketId, body, ...common }: Common & { token: string; ticketId: string; body: HolderEditBody }): Promise<z.infer<typeof holderEditResultSchema>> {
  const raw = await epFetch<unknown>(`/tickets/my/order/holders/${encodeURIComponent(ticketId)}`, {
    ...base(common),
    method: "PATCH",
    body,
    headers: { ...clientIpHeaders({ ip: common.ip }), "x-order-token": token },
  });
  return holderEditResultSchema.parse(raw);
}

/** `POST /tickets/my/order/refund-request` — the buyer asks the organiser for a refund (order token). */
export async function postMyRefundRequest({ token, body, ...common }: Common & { token: string; body: RefundRequestBody }): Promise<z.infer<typeof refundRequestResultSchema>> {
  const raw = await epFetch<unknown>("/tickets/my/order/refund-request", {
    ...base(common),
    method: "POST",
    body,
    headers: { ...clientIpHeaders({ ip: common.ip }), "x-order-token": token },
  });
  return refundRequestResultSchema.parse(raw);
}

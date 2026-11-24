import { createOrderResultSchema, extendResultSchema, quoteResultSchema, type CreateOrderBody, type CreateOrderResult, type ExtendResult, type QuoteBody, type QuoteResult } from "./schemas";

/**
 * The browser side of the checkout: plain `fetch` to OUR route handlers (`/api/tickets/*`), never to ep-api and
 * never react-query/axios (public bundle guard). Every answer is `{ ok: true, data }` or `{ ok: false, code }`
 * where `code` is the opaque key the UI translates (`tickets.errors.<code>`) — raw API text is never read.
 */
export interface ApiFailure {
  ok: false;
  code: string;
  /** The ticket type a rejection is about, when ep-api named one. */
  ticketTypeId?: string;
  status: number;
}
export type ApiResult<T> = { ok: true; data: T } | ApiFailure;

interface Parser<T> {
  safeParse(value: unknown): { success: true; data: T } | { success: false };
}

async function failureOf({ response }: { response: Response }): Promise<ApiFailure> {
  const body = (await response.json().catch(() => null)) as { code?: unknown; details?: { ticketTypeId?: unknown } } | null;
  const ticketTypeId = typeof body?.details?.ticketTypeId === "string" ? body.details.ticketTypeId : undefined;
  return { ok: false, code: typeof body?.code === "string" ? body.code : "generic", status: response.status, ...(ticketTypeId ? { ticketTypeId } : {}) };
}

async function post<T>({ endpoint, body, headers, parser, signal }: { endpoint: string; body?: unknown; headers?: Record<string, string>; parser: Parser<T>; signal?: AbortSignal }): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`/api/tickets/${endpoint}`, {
      method: "POST",
      cache: "no-store",
      headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      ...(signal ? { signal } : {}),
    });
    if (!response.ok) return await failureOf({ response });
    const json = (await response.json().catch(() => null)) as { data?: unknown } | null;
    const parsed = parser.safeParse(json?.data);
    return parsed.success ? { ok: true, data: parsed.data } : { ok: false, code: "unavailable", status: 502 };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return { ok: false, code: "unavailable", status: 0 };
  }
}

export function requestQuote({ body, signal }: { body: QuoteBody; signal?: AbortSignal }): Promise<ApiResult<QuoteResult>> {
  return post({ endpoint: "quote", body, parser: quoteResultSchema, ...(signal ? { signal } : {}) });
}

export function requestCreateOrder({ body }: { body: CreateOrderBody }): Promise<ApiResult<CreateOrderResult>> {
  return post({ endpoint: "orders", body, parser: createOrderResultSchema });
}

/** The buyer token goes in a header (never the URL), like the order status poll. */
export function requestExtendHold({ orderId, token }: { orderId: string; token: string }): Promise<ApiResult<ExtendResult>> {
  return post({ endpoint: `orders/${encodeURIComponent(orderId)}/extend`, headers: { "x-order-token": token }, parser: extendResultSchema });
}

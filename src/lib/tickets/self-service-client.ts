import type { ApiResult } from "./checkout-client";
import {
  cancelResultSchema,
  holderEditResultSchema,
  nameResultSchema,
  passOnResultSchema,
  profileBlockSchema,
  refundRequestResultSchema,
  type HolderEditBody,
  type NameBody,
  type PassOnBody,
  type ProfileBody,
  type RefundRequestBody,
} from "./schemas";

/**
 * The browser side of holder self-service (ep-api DASH-205 F1): plain `fetch` to OUR route handlers
 * (`/api/tickets/my/*`), never to ep-api, never react-query/axios (public bundle guard). The holder / buyer token
 * goes in a header, never a URL. Every answer is `{ ok: true, data }` or `{ ok: false, code }`, `code` being the
 * opaque key the UI translates (`tickets.errors.<code>`); raw API text is never read.
 */

interface Parser<T> {
  safeParse(value: unknown): { success: true; data: T } | { success: false };
}

async function send<T>({ endpoint, method, token, tokenHeader, body, parser }: { endpoint: string; method: "POST" | "PUT" | "PATCH"; token: string; tokenHeader: "x-ticket-token" | "x-order-token"; body: unknown; parser: Parser<T> }): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`/api/tickets/${endpoint}`, {
      method,
      cache: "no-store",
      headers: { "Content-Type": "application/json", [tokenHeader]: token },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const failure = (await response.json().catch(() => null)) as { code?: unknown } | null;
      return { ok: false, code: typeof failure?.code === "string" ? failure.code : "generic", status: response.status };
    }
    const json = (await response.json().catch(() => null)) as { data?: unknown } | null;
    const parsed = parser.safeParse(json?.data);
    return parsed.success ? { ok: true, data: parsed.data } : { ok: false, code: "unavailable", status: 502 };
  } catch {
    return { ok: false, code: "unavailable", status: 0 };
  }
}

export function requestNameCorrection({ token, body }: { token: string; body: NameBody }) {
  return send({ endpoint: "my/ticket/name", method: "POST", token, tokenHeader: "x-ticket-token", body, parser: nameResultSchema });
}

export function requestPassOn({ token, body }: { token: string; body: PassOnBody }) {
  return send({ endpoint: "my/ticket/pass-on", method: "POST", token, tokenHeader: "x-ticket-token", body, parser: passOnResultSchema });
}

export function requestCancelTicket({ token }: { token: string }) {
  return send({ endpoint: "my/ticket/cancel", method: "POST", token, tokenHeader: "x-ticket-token", body: {}, parser: cancelResultSchema });
}

export function requestHolderEdit({ token, ticketId, body }: { token: string; ticketId: string; body: HolderEditBody }) {
  return send({ endpoint: `my/order/holders/${encodeURIComponent(ticketId)}`, method: "PATCH", token, tokenHeader: "x-order-token", body, parser: holderEditResultSchema });
}

export function requestRefund({ token, body }: { token: string; body: RefundRequestBody }) {
  return send({ endpoint: "my/order/refund-request", method: "POST", token, tokenHeader: "x-order-token", body, parser: refundRequestResultSchema });
}

export function requestSaveProfile({ token, body }: { token: string; body: ProfileBody }) {
  return send({ endpoint: "my/ticket/profile", method: "PUT", token, tokenHeader: "x-ticket-token", body, parser: profileBlockSchema });
}

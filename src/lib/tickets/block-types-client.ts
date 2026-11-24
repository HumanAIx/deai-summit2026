import type { ApiResult } from "./checkout-client";
import { blockTypesSchema, type BlockTypes } from "./schemas";

/**
 * Browser side of the Tickets block: a plain `fetch` to OUR `GET /api/tickets/types` (never ep-api; no react-query in
 * the public bundle, like `checkout-client.ts`). The answer is `{ success, data }`; a failure carries the opaque
 * `code` the checkout already uses. Nothing is cached: prices and stock are read live.
 */
export async function requestBlockTypes({ locale, signal }: { locale: string; signal?: AbortSignal }): Promise<ApiResult<BlockTypes>> {
  try {
    const response = await fetch(`/api/tickets/types?locale=${encodeURIComponent(locale)}`, { cache: "no-store", ...(signal ? { signal } : {}) });
    const json = (await response.json().catch(() => null)) as { data?: unknown; code?: unknown } | null;
    if (!response.ok) return { ok: false, code: typeof json?.code === "string" ? json.code : "unavailable", status: response.status };
    const parsed = blockTypesSchema.safeParse(json?.data);
    return parsed.success ? { ok: true, data: parsed.data } : { ok: false, code: "unavailable", status: 502 };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return { ok: false, code: "unavailable", status: 0 };
  }
}

/** Codes that mean "this site sells no tickets here" (not configured, sales closed, no key): the block shows no cards rather than an error. */
export const NO_TICKETS_CODES: ReadonlySet<string> = new Set(["salesClosed", "notFound"]);

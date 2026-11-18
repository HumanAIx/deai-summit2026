/**
 * Browser side of the Tickets block's checkout pop-up confirmation: plain `fetch` to OUR route handlers, never ep-api.
 * The buyer token lives in memory and travels in the request BODY (documents) or the `x-order-token` header (status)
 * — never in a URL, the history or an analytics event.
 */

export interface OrderDocumentRef {
  id: string;
  kind: string;
  number: string;
}

/** The order's documents; an empty list on any failure (the invoice button then simply does not show). */
export async function requestOrderDocuments({ token, signal }: { token: string; signal?: AbortSignal }): Promise<OrderDocumentRef[]> {
  try {
    const response = await fetch("/api/tickets/my/order/documents", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      ...(signal ? { signal } : {}),
    });
    if (!response.ok) return [];
    const json = (await response.json().catch(() => null)) as { data?: { documents?: unknown } } | null;
    const list = json?.data?.documents;
    if (!Array.isArray(list)) return [];
    return list.flatMap((item): OrderDocumentRef[] => {
      const doc = item as { id?: unknown; kind?: unknown; number?: unknown } | null;
      return typeof doc?.id === "string" && typeof doc.kind === "string" && typeof doc.number === "string" ? [{ id: doc.id, kind: doc.kind, number: doc.number }] : [];
    });
  } catch {
    return [];
  }
}

/** Saves `blob` as `filename` through a temporary link (no navigation, no URL with a secret). */
export function saveBlob({ blob, filename }: { blob: Blob; filename: string }): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Downloads one document: POST with the token + document id in the body. `false` = it could not be fetched. */
export async function downloadOrderDocument({ token, documentId, fallbackName }: { token: string; documentId: string; fallbackName: string }): Promise<boolean> {
  try {
    const response = await fetch("/api/tickets/my/order/document", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, documentId }),
    });
    if (!response.ok) return false;
    const name = /filename="?([A-Za-z0-9._-]{1,100})"?/.exec(response.headers.get("Content-Disposition") ?? "")?.[1] ?? fallbackName;
    saveBlob({ blob: await response.blob(), filename: name });
    return true;
  } catch {
    return false;
  }
}

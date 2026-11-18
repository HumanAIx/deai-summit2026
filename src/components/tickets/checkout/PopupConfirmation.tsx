"use client";

// Interactive: polls our own status route handler until the payment is confirmed, then offers downloads (browser-only
// blobs) — timers, fetch and local state.

import { useTranslations } from "@/lib/tickets/i18n";
import { useEffect, useRef, useState } from "react";
import { buildOrderIcs } from "@/lib/tickets/calendar";
import { downloadOrderDocument, requestOrderDocuments, saveBlob, type OrderDocumentRef } from "@/lib/tickets/popup-client";
import { TICKETS_BUTTON, TICKETS_BUTTON_OUTLINE, TICKETS_CARD } from "../tickets-classes";
import type { CheckoutDone } from "./types";

const POLL_MS = 2000;
const GIVE_UP_MS = 60_000;
/** ep-api order statuses the buyer page treats as "paid" (the same set as `OrderConfirming`). */
const VIEWABLE = new Set(["paid", "partial", "refunded", "disputed"]);

type Phase = { kind: "pending" } | { kind: "paid"; orderNo: number | null } | { kind: "expired" } | { kind: "failed" } | { kind: "slow" };

function readStatus(body: unknown): { status: string; orderNo: number | null } | null {
  const data = typeof body === "object" && body !== null ? (body as { data?: unknown }).data : null;
  if (typeof data !== "object" || data === null) return null;
  const { status, orderNo } = data as { status?: unknown; orderNo?: unknown };
  return typeof status === "string" ? { status, orderNo: typeof orderNo === "number" ? orderNo : null } : null;
}

/**
 * Polls the status of the order the pop-up just placed. The buyer token goes in the `x-order-token` header (never a
 * URL). `paid` only when ep-api says so: a webhook that has not landed yet stays `pending`, so "paid" is never shown early.
 */
function useOrderPhase({ orderId, token }: { orderId: string; token: string }): { phase: Phase; trouble: boolean } {
  const [phase, setPhase] = useState<Phase>({ kind: "pending" });
  const [trouble, setTrouble] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function tick() {
      let next: Phase | null = null;
      try {
        const response = await fetch(`/api/tickets/orders/${encodeURIComponent(orderId)}/status`, { headers: { "x-order-token": token }, cache: "no-store", signal: controller.signal });
        if (response.status === 404) next = { kind: "failed" };
        else if (response.ok) {
          const read = readStatus(await response.json().catch(() => null));
          if (read && VIEWABLE.has(read.status)) next = { kind: "paid", orderNo: read.orderNo };
          else if (read?.status === "pending") next = { kind: "pending" };
          else if (read?.status === "expired") next = { kind: "expired" };
          else if (read) next = { kind: "failed" };
        }
        setTrouble(next === null);
      } catch {
        if (controller.signal.aborted) return;
        setTrouble(true);
      }
      if (controller.signal.aborted) return;
      if (next && next.kind !== "pending") {
        setPhase(next);
        return; // final
      }
      if (Date.now() - startedAt >= GIVE_UP_MS) {
        setPhase({ kind: "slow" });
        return;
      }
      timer = setTimeout(tick, POLL_MS);
    }

    void tick();
    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [orderId, token]);

  return { phase, trouble };
}

/**
 * The confirmation screen inside the checkout pop-up (no redirect): "You're going to {event}", the order number, each
 * holder with the address the ticket was sent to, Add to calendar, Download invoice (only when an invoice exists),
 * View your order (a NEW tab: analytics never load on the private page) and Back to the site. The buyer token stays in
 * this component's memory; the only place it is ever written is the body of the invoice requests.
 */
export function PopupConfirmation({ done, orderHref, onClose }: { done: CheckoutDone; orderHref: string; onClose: () => void }) {
  const t = useTranslations("block.ticketsBlock.popup");
  const tc = useTranslations("tickets.confirming");
  const { phase, trouble } = useOrderPhase({ orderId: done.orderId, token: done.buyerToken });
  const [documents, setDocuments] = useState<OrderDocumentRef[]>([]);
  const [downloadFailed, setDownloadFailed] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const paid = phase.kind === "paid";

  // The invoice list is read once the order is paid (a test-mode order has none).
  useEffect(() => {
    if (!paid) return;
    const controller = new AbortController();
    void requestOrderDocuments({ token: done.buyerToken, signal: controller.signal }).then((list) => {
      if (!controller.signal.aborted) setDocuments(list);
    });
    return () => controller.abort();
  }, [paid, done.buyerToken]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [phase.kind]);

  const invoice = documents.find((doc) => doc.kind === "invoice");
  const ics = paid ? buildOrderIcs({ name: done.eventName, startDate: done.startDate, endDate: done.endDate, uid: done.orderId }) : null;

  if (phase.kind === "pending") {
    return (
      <div className={`${TICKETS_CARD} flex flex-col items-start gap-3`}>
        <h2 ref={headingRef} tabIndex={-1} className="font-heading text-2xl font-semibold focus:outline-none">
          {t("confirming")}
        </h2>
        <div role="status" aria-live="polite" className="flex flex-col gap-2">
          <p className="max-w-prose text-muted">{tc("pendingBody")}</p>
          {trouble ? <p className="text-sm text-muted">{tc("errorBody")}</p> : null}
        </div>
        <span aria-hidden className="inline-block h-1 w-24 animate-pulse rounded bg-primary motion-reduce:animate-none" />
      </div>
    );
  }

  if (phase.kind !== "paid") {
    const key = phase.kind;
    return (
      <div className={`${TICKETS_CARD} flex flex-col items-start gap-3`}>
        <h2 ref={headingRef} tabIndex={-1} className="font-heading text-2xl font-semibold focus:outline-none">
          {tc(`${key}Heading`)}
        </h2>
        <p role="status" className="max-w-prose text-muted">
          {tc(`${key}Body`)}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          {key === "slow" ? (
            // Still confirming after a minute: the order page keeps checking and shows the tickets once paid. A new tab on
            // purpose, as below: the private order page loads no analytics.
            <a href={orderHref} target="_blank" rel="noopener noreferrer" className={TICKETS_BUTTON_OUTLINE}>
              {t("viewOrder")}
              <span className="sr-only"> {t("newTab")}</span>
            </a>
          ) : null}
          <button type="button" className={TICKETS_BUTTON} onClick={onClose}>
            {t("backToSite")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 ref={headingRef} tabIndex={-1} className="font-heading text-2xl font-semibold [overflow-wrap:anywhere] focus:outline-none">
          {t("going", { event: done.eventName })}
        </h2>
        {phase.orderNo !== null ? <p className="mt-1 text-muted">{t("orderNo", { number: phase.orderNo })}</p> : null}
      </div>

      <section aria-labelledby="popup-holders-heading" className={TICKETS_CARD}>
        <h3 id="popup-holders-heading" className="font-heading text-lg font-semibold">
          {t("holdersHeading")}
        </h3>
        <ul className="mt-3 flex list-none flex-col gap-3 p-0">
          {done.holders.map((holder, index) => (
            <li key={index} className="min-w-0">
              <p className="font-medium [overflow-wrap:anywhere]">{holder.name}</p>
              <p className="text-sm text-muted [overflow-wrap:anywhere]">{t("sentTo", { email: holder.email })}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {ics ? (
          <button type="button" className={TICKETS_BUTTON_OUTLINE} onClick={() => saveBlob({ blob: new Blob([ics], { type: "text/calendar;charset=utf-8" }), filename: "event.ics" })}>
            {t("addToCalendar")}
          </button>
        ) : null}
        {invoice ? (
          <button
            type="button"
            className={TICKETS_BUTTON_OUTLINE}
            onClick={() => {
              setDownloadFailed(false);
              void downloadOrderDocument({ token: done.buyerToken, documentId: invoice.id, fallbackName: "invoice.pdf" }).then((ok) => setDownloadFailed(!ok));
            }}
          >
            {t("downloadInvoice")}
          </button>
        ) : null}
        {/* A new tab on purpose: the private order page loads no analytics, and this page keeps its own state. */}
        <a href={orderHref} target="_blank" rel="noopener noreferrer" className={TICKETS_BUTTON_OUTLINE}>
          {t("viewOrder")}
          <span className="sr-only"> {t("newTab")}</span>
        </a>
        <button type="button" className={TICKETS_BUTTON} onClick={onClose}>
          {t("backToSite")}
        </button>
      </div>
      <div role="alert" className="text-sm text-danger">
        {downloadFailed ? t("downloadFailed") : null}
      </div>
    </div>
  );
}

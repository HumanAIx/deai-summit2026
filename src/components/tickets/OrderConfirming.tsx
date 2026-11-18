"use client";

// Interactive: polls our own status route handler every 2 s (up to 60 s) after a payment and refreshes the
// server-rendered order page once the order is paid — needs timers, fetch and the router.

import { useTranslations } from "@/lib/tickets/i18n";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TICKETS_BUTTON, TICKETS_BUTTON_OUTLINE, TICKETS_CARD } from "./tickets-classes";

const POLL_MS = 2000;
const GIVE_UP_MS = 60_000;

/** ep-api order statuses that mean "paid" for the buyer page (it shows these: paid, partial, refunded, disputed). */
const VIEWABLE = new Set(["paid", "partial", "refunded", "disputed"]);

type Phase = "pending" | "paid" | "expired" | "failed" | "slow";

/** Narrowing of our own handler's `{ success, data: { status } }` answer without pulling zod into the public bundle. */
function statusOf(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const data = (body as { data?: unknown }).data;
  if (typeof data !== "object" || data === null) return null;
  const status = (data as { status?: unknown }).status;
  return typeof status === "string" ? status : null;
}

/**
 * The "confirming your payment" screen: shown instead of the order when the page URL has `?o={orderId}` and
 * ep-api does not know the order as paid yet (right after paying, and on the 3-D Secure return). The buyer
 * token is sent to our handler in the `x-order-token` header (never a URL or query), the handler forwards it.
 * `paid` → `router.refresh()` swaps in the real order page; `pending` keeps waiting; `expired` and anything
 * else final show a clear message and a way back. After 60 s it stops and says so.
 */
export function OrderConfirming({ orderId, token, ticketsHref, lostLinkHref }: { orderId: string; token: string; ticketsHref: string; lostLinkHref: string }) {
  const t = useTranslations("tickets.confirming");
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("pending");
  const [trouble, setTrouble] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function tick() {
      let next: Phase | null = null;
      try {
        const response = await fetch(`/api/tickets/orders/${encodeURIComponent(orderId)}/status`, {
          headers: { "x-order-token": token },
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.status === 404) {
          next = "failed"; // unknown order for this token: nothing to wait for
        } else if (response.ok) {
          const status = statusOf(await response.json().catch(() => null));
          if (status !== null && VIEWABLE.has(status)) next = "paid";
          else if (status === "pending") next = "pending";
          else if (status === "expired") next = "expired";
          else if (status !== null) next = "failed";
        }
        setTrouble(next === null);
      } catch {
        if (controller.signal.aborted) return;
        setTrouble(true);
      }

      if (controller.signal.aborted) return;
      if (next === "paid") {
        setPhase("paid");
        router.refresh(); // the order page re-renders with the paid order; this component unmounts with it
      } else if (next === "expired" || next === "failed") {
        setPhase(next);
        return; // final: stop polling
      }
      if (Date.now() - startedAt >= GIVE_UP_MS) {
        if (next !== "paid") setPhase("slow");
        return;
      }
      timer = setTimeout(tick, POLL_MS);
    }

    void tick();
    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [orderId, token, router]);

  const heading =
    phase === "pending"
      ? t("pendingHeading")
      : phase === "paid"
        ? t("paidHeading")
        : phase === "expired"
          ? t("expiredHeading")
          : phase === "failed"
            ? t("failedHeading")
            : t("slowHeading");
  const body =
    phase === "pending"
      ? t("pendingBody")
      : phase === "paid"
        ? t("paidBody")
        : phase === "expired"
          ? t("expiredBody")
          : phase === "failed"
            ? t("failedBody")
            : t("slowBody");
  const waiting = phase === "pending" || phase === "paid";

  return (
    <section aria-labelledby="confirming-heading" className={`${TICKETS_CARD} flex flex-col items-start gap-3`}>
      <h1 id="confirming-heading" className="font-heading text-2xl font-semibold">
        {heading}
      </h1>
      <div role="status" aria-live="polite" className="flex flex-col gap-2">
        <p className="max-w-prose text-muted">{body}</p>
        {waiting && trouble ? <p className="text-sm text-muted">{t("errorBody")}</p> : null}
      </div>
      {waiting ? (
        <span aria-hidden className="inline-block h-1 w-24 animate-pulse rounded bg-primary motion-reduce:animate-none" />
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href={ticketsHref} className={TICKETS_BUTTON}>
            {t("backToTickets")}
          </Link>
          {phase === "slow" ? (
            <Link href={lostLinkHref} className={TICKETS_BUTTON_OUTLINE}>
              {t("lostLinkCta")}
            </Link>
          ) : null}
        </div>
      )}
    </section>
  );
}

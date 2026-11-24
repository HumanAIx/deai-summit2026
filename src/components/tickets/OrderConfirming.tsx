"use client";

// Interactive: polls our own status route handler every 2 s (up to 60 s) after a payment and refreshes the
// server-rendered order page once the order is paid — needs timers, fetch and the router.

import { useTranslations } from "@/lib/tickets/i18n";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const POLL_MS = 2000;
const SLOW_MS = 15_000;
const GIVE_UP_MS = 60_000;
/** "Payment received" ticks after this beat: Stripe already accepted the payment when the buyer lands here. */
const RECEIVED_MS = 1500;
/** How long the "you're going" screen shows before the order (`?paid=1`) replaces it. */
const PAID_HOLD_MS = 1500;

/** ep-api order statuses that mean "paid" for the buyer page (it shows these: paid, partial, refunded, disputed). */
const VIEWABLE = new Set(["paid", "partial", "refunded", "disputed"]);

type Phase = "pending" | "paid" | "expired" | "failed" | "timeout";

const STEP_KEYS = ["received", "issuing", "emailing"] as const;
/** Circumference of the progress arc (r = 44 in a 132 × 132 box). */
const ARC = 2 * Math.PI * 44;

/** Narrowing of our own handler's `{ success, data: { status } }` answer without pulling zod into the public bundle. */
function statusOf(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const data = (body as { data?: unknown }).data;
  if (typeof data !== "object" || data === null) return null;
  const status = (data as { status?: unknown }).status;
  return typeof status === "string" ? status : null;
}

/**
 * The "confirming your payment" screen (the 24 Nov "DeAI Payment Loader" design): shown instead of the order when the
 * page URL has `?o={orderId}` (right after paying, and on the 3-D
 * Secure return). The buyer token is sent to our handler in the `x-order-token` header (never a URL or query), the
 * handler forwards it. `pending` keeps waiting (after 15 s it says it is taking longer); `paid` shows the confirmed
 * state, then opens the order at `?paid=1` (the page itself, minus `?o`, plus the "just paid" note); `expired` and
 * anything else final show a clear message and a way back. After 60 s it stops and offers "Check again", which starts a
 * new round of polling. `paid` (the server already knows the order as paid) starts on the confirmed state, no polling.
 */
export function OrderConfirming({
  orderId,
  token,
  ticketsHref,
  contactHref,
  paid = false,
}: {
  orderId: string;
  token: string;
  ticketsHref: string;
  contactHref: string;
  paid?: boolean;
}) {
  const t = useTranslations("tickets.confirming");
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>(paid ? "paid" : "pending");
  const [trouble, setTrouble] = useState(false);
  const [received, setReceived] = useState(paid);
  const [slow, setSlow] = useState(false);
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (!paid) return;
    const timer = setTimeout(() => router.replace(`${pathname}?paid=1`), PAID_HOLD_MS);
    return () => clearTimeout(timer);
  }, [paid, pathname, router]);

  useEffect(() => {
    if (paid) return;
    const controller = new AbortController();
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const receivedTimer = setTimeout(() => setReceived(true), RECEIVED_MS);
    const slowTimer = setTimeout(() => setSlow(true), SLOW_MS);

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
        // the order page renders the paid order; this component unmounts with it
        timer = setTimeout(() => router.replace(`${pathname}?paid=1`), PAID_HOLD_MS);
        return;
      }
      if (next === "expired" || next === "failed") {
        setPhase(next);
        return; // final: stop polling
      }
      if (Date.now() - startedAt >= GIVE_UP_MS) {
        setPhase("timeout");
        return;
      }
      timer = setTimeout(tick, POLL_MS);
    }

    void tick();
    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
      clearTimeout(receivedTimer);
      clearTimeout(slowTimer);
    };
  }, [orderId, token, router, pathname, paid, round]);

  function checkAgain() {
    setPhase("pending");
    setTrouble(false);
    setSlow(false);
    setRound((value) => value + 1);
  }

  const done = phase === "paid";
  const err = phase === "expired" || phase === "failed" || phase === "timeout";
  const working = phase === "pending";
  const isSlow = working && slow;
  /** The step in progress: 0 until "payment received" ticks, then 1 while ep-api issues the tickets; 3 = all done. */
  const step = done ? 3 : received ? 1 : 0;
  const progress = err ? 0.33 : done ? 1 : (step + 0.5) / 3;
  const tone = err ? "warn" : done ? "done" : "work";

  const heading = {
    pending: isSlow ? t("slowHeading") : t("pendingHeading"),
    paid: t("paidHeading"),
    expired: t("expiredHeading"),
    failed: t("failedHeading"),
    timeout: t("timeoutHeading"),
  }[phase];
  const body = {
    pending: isSlow ? t("slowBody") : t("pendingBody"),
    paid: t("paidBody"),
    expired: t("expiredBody"),
    failed: t("failedBody"),
    timeout: t("timeoutBody"),
  }[phase];

  return (
    <div className="flex flex-col items-center gap-8">
      <section
        aria-labelledby="confirming-heading"
        className="flex w-full max-w-[520px] flex-col items-center gap-[30px] rounded-[28px] border border-(--mt-line) bg-(--mt-card) px-[clamp(24px,5vw,44px)] py-[clamp(32px,5vw,48px)] text-center shadow-[0_40px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur-[14px]"
      >
        <Spinner tone={tone} progress={progress} />

        <div role="status" aria-live="polite" className="flex flex-col gap-3">
          <h1 id="confirming-heading" className="m-0 text-[clamp(26px,4vw,32px)] leading-[1.15] font-semibold tracking-[-0.03em] text-balance">
            {heading}
          </h1>
          <p className="m-0 text-base leading-[1.55] text-pretty text-(--mt-body)">{body}</p>
          {working && trouble ? <p className="m-0 text-sm text-(--mt-dim)">{t("errorBody")}</p> : null}
        </div>

        {phase === "expired" || phase === "failed" ? null : (
          <ol className="m-0 flex w-full list-none flex-col gap-1 p-0 text-left">
            {STEP_KEYS.map((key, index) => {
              const ok = !err && (done || index < step);
              const current = working && index === step;
              const waiting = err && index === 0;
              return (
                <li
                  key={key}
                  className={`flex items-center gap-3.5 rounded-[14px] px-4 py-3 transition-colors duration-300 ${current ? "bg-[rgba(44,199,217,0.07)]" : ""}`}
                >
                  <span
                    aria-hidden
                    className={`relative flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all duration-300 ${
                      ok ? "border-(--tk-accent) bg-(--tk-accent)" : current ? "border-(--tk-accent)" : waiting ? "border-(--mt-warn)" : "border-[rgba(255,255,255,0.18)]"
                    }`}
                  >
                    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" className={ok ? "opacity-100" : "opacity-0"}>
                      <path d="M4 10.5l4 4 8-9" stroke="#040A1E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {current ? <span className="absolute size-1.5 animate-pulse rounded-full bg-(--tk-accent) motion-reduce:animate-none" /> : null}
                  </span>
                  <span className={`flex-1 text-[15px] font-medium transition-colors duration-300 ${ok || current ? "text-white" : waiting ? "text-(--mt-warn)" : "text-(--mt-dim)"}`}>
                    {t(`steps.${key}`)}
                  </span>
                  {ok || current || waiting ? (
                    <span className={`font-mono text-[11px] tracking-[0.14em] uppercase ${ok ? "text-(--tk-accent)" : current ? "text-(--mt-body)" : "text-(--mt-warn)"}`}>
                      {ok ? t("stepDone") : current ? t("stepInProgress") : t("stepWaiting")}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}

        {working && !isSlow ? (
          <p className="m-0 flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-(--mt-dim) uppercase">
            <svg aria-hidden width="12" height="12" viewBox="0 0 14 14" fill="none">
              <rect x="2.5" y="6" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            {t("keepOpen")}
          </p>
        ) : null}

        {isSlow ? (
          <div className="flex w-full flex-col gap-3">
            <p className="m-0 flex items-center gap-3 rounded-[14px] border border-[rgba(44,199,217,0.3)] bg-[rgba(44,199,217,0.06)] px-4 py-3.5 text-left text-sm leading-normal text-(--mt-soft)">
              <svg aria-hidden width="18" height="18" viewBox="0 0 16 16" fill="none" className="shrink-0">
                <circle cx="8" cy="8" r="6.2" stroke="#2CC7D9" strokeWidth="1.4" />
                <path d="M8 4.5V8l2.4 1.6" stroke="#2CC7D9" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t("slowNote")}
            </p>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="flex h-[52px] items-center justify-center rounded-full border border-(--mt-control) bg-transparent text-[15px] font-medium text-white hover:border-(--tk-accent) hover:bg-[rgba(44,199,217,0.08)]"
            >
              {t("viewStatus")}
            </button>
            <ContactLink href={contactHref} label={t("contactCta")} />
          </div>
        ) : null}

        {done ? (
          <button
            type="button"
            onClick={() => router.replace(`${pathname}?paid=1`)}
            className="flex h-[54px] w-full items-center justify-center gap-2.5 rounded-full border-0 [background:var(--tk-grad)] text-base font-semibold text-white shadow-[0_18px_40px_-18px_rgba(30,107,240,0.8)] hover:brightness-110"
          >
            {t("viewOrder")}
            <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : null}

        {err ? (
          <div className="flex w-full flex-col gap-3">
            {phase === "timeout" ? (
              <button type="button" onClick={checkAgain} className={WHITE_BUTTON}>
                {t("checkAgain")}
              </button>
            ) : (
              <Link href={ticketsHref} className={WHITE_BUTTON}>
                {t("backToTickets")}
              </Link>
            )}
            <ContactLink href={contactHref} label={t("contactCta")} />
          </div>
        ) : null}
      </section>

      <p className="m-0 font-mono text-[11px] tracking-[0.14em] text-[#5C6680] uppercase">{t("securedBy")}</p>
    </div>
  );
}

const WHITE_BUTTON = "flex h-[54px] items-center justify-center rounded-full border-0 bg-white text-base font-semibold text-(--mt-ink) hover:bg-(--mt-hover)";

function ContactLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center justify-center text-sm text-(--color-muted) hover:text-white">
      {label}
    </Link>
  );
}

/** The ripple rings, the progress arc and the core icon (waves while working, a tick when done, "!" on a problem). */
function Spinner({ tone, progress }: { tone: "work" | "done" | "warn"; progress: number }) {
  const rgb = tone === "warn" ? "245,196,81" : tone === "done" ? "44,199,217" : "30,107,240";
  const arc = tone === "warn" ? "#F5C451" : tone === "done" ? "#2CC7D9" : "#1E6BF0";
  const core = tone === "warn" ? "bg-(--mt-warn)" : tone === "done" ? "[background:linear-gradient(135deg,#1E6BF0,#08B5C6)]" : "bg-[rgba(30,107,240,0.14)]";
  return (
    <div aria-hidden className="relative flex size-[132px] items-center justify-center">
      <svg width="132" height="132" viewBox="0 0 132 132" className="absolute inset-0 overflow-visible">
        {[0, 1, 2].map((index) => (
          <circle
            key={index}
            cx="66"
            cy="66"
            r="48"
            fill="none"
            stroke={`rgb(${rgb})`}
            strokeWidth="1.5"
            className="tk-ripple motion-reduce:hidden"
            style={{ animationDelay: `${(-index * 1.82) / 3}s` }}
          />
        ))}
        <circle cx="66" cy="66" r="44" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
        <circle
          cx="66"
          cy="66"
          r="44"
          fill="none"
          stroke={arc}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${(ARC * progress).toFixed(1)} ${ARC.toFixed(1)}`}
          transform="rotate(-90 66 66)"
          className="transition-[stroke-dasharray,stroke] duration-500 ease-out"
        />
      </svg>
      <span className={`relative flex size-16 items-center justify-center rounded-full transition-[background] duration-400 ${core}`}>
        {tone === "work" ? (
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
            <path d="M5 11q5-4 10 0t10 0" stroke="#3B8BFF" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M5 16q5-4 10 0t10 0" stroke="#14A0EC" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M5 21q5-4 10 0t10 0" stroke="#2CC7D9" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
        ) : tone === "done" ? (
          <svg width="30" height="30" viewBox="0 0 20 20" fill="none">
            <path d="M4 10.5l4 4 8-9" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 20 20" fill="none">
            <path d="M10 5v6" stroke="#040A1E" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="10" cy="14.5" r="1.4" fill="#040A1E" />
          </svg>
        )}
      </span>
    </div>
  );
}

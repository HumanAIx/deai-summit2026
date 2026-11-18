import { useEffect, useMemo, useRef, useState } from "react";
import type { CartLine } from "@/lib/tickets/checkout-cart";
import { requestQuote } from "@/lib/tickets/checkout-client";
import type { QuoteResult } from "@/lib/tickets/schemas";
import type { QuoteState } from "./types";

const QUOTE_DEBOUNCE_MS = 350;

type Answer = { key: string; ok: true; result: QuoteResult } | { key: string; ok: false; code: string };

/**
 * The live quote of the cart: re-requested (debounced) whenever the lines, the applied code, the newsletter box or a
 * private-link token change. A newer request aborts the older one, so a slow answer can never overwrite a fresh one.
 * The state is DERIVED: an answer counts only while its key still matches the cart, so a changed cart reads as
 * "loading" at once, with the previous totals kept (dimmed by the caller) until the new ones land. `onRejected` hears
 * a refusal's code and the ticket type it names, so the card can be marked.
 */
export function useCheckoutQuote({
  lines,
  code,
  newsletter,
  linkToken,
  offerToken,
  onRejected,
}: {
  lines: readonly CartLine[];
  code: string | null;
  newsletter: boolean;
  linkToken: string | undefined;
  /** The waitlist-offer token of `/tickets/w/{token}`: sent with every quote, so the held ticket is priced. */
  offerToken?: string | undefined;
  onRejected: (args: { code: string; ticketTypeId: string | undefined }) => void;
}): QuoteState {
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [lastResult, setLastResult] = useState<QuoteResult | undefined>(undefined);
  const key = useMemo(() => JSON.stringify({ lines, code, newsletter, linkToken, offerToken }), [lines, code, newsletter, linkToken, offerToken]);
  const rejected = useRef(onRejected);
  useEffect(() => {
    rejected.current = onRejected;
  });

  useEffect(() => {
    if (lines.length === 0) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const reply = await requestQuote({
          body: { lines: [...lines], newsletter, ...(code ? { discountCode: code } : {}), ...(linkToken ? { linkToken } : {}), ...(offerToken ? { offerToken } : {}) },
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (reply.ok) {
          setLastResult(reply.data);
          setAnswer({ key, ok: true, result: reply.data });
        } else {
          setAnswer({ key, ok: false, code: reply.code });
          rejected.current({ code: reply.code, ticketTypeId: reply.ticketTypeId });
        }
      } catch {
        // aborted by a newer request or an unmount: nothing to show
      }
    }, QUOTE_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // `key` stands for lines / code / newsletter / linkToken / offerToken by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (lines.length === 0) return { status: "idle" };
  const previous = lastResult ? { result: lastResult } : {};
  if (answer?.key !== key) return { status: "loading", ...previous };
  return answer.ok ? { status: "ready", result: answer.result } : { status: "error", code: answer.code, ...previous };
}

/**
 * Milliseconds left until `until` (ISO), re-read every second; `null` while there is no hold. `onExpire` fires once
 * when it reaches zero (from the timer, never from render) — also for a deadline that has already passed (at the first
 * tick). `now` starts at the hook's mount, so mount it where the hold starts counting (the payment step).
 */
export function useRemainingMs({ until, onExpire }: { until: string | null; onExpire: () => void }): number | null {
  const target = until ? new Date(until).getTime() : null;
  const [now, setNow] = useState(() => Date.now());
  const expire = useRef(onExpire);
  useEffect(() => {
    expire.current = onExpire;
  });

  useEffect(() => {
    if (target === null || Number.isNaN(target)) return;
    let done = false;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (!done && current >= target) {
        done = true;
        clearInterval(interval);
        expire.current();
      }
    };
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [target]);
  return target === null || Number.isNaN(target) ? null : Math.max(0, target - now);
}

export type CaptchaProvider = "recaptcha" | "hcaptcha";
/** `loading`: not answered yet (the step-3 button waits); `off`: no usable captcha, so no widget and NO token is sent. */
export type CheckoutCaptcha = { status: "loading" } | { status: "off" } | { status: "on"; provider: CaptchaProvider };

/**
 * Whether the site has a captcha for the order, asked of the same-origin `/api/captcha-site-key` the forms block uses.
 * Fetched only once `active` (from the details step; the widget mounts on the holders step, where the order is placed), so
 * the captcha provider's script and the extra request never reach a visitor who only browses the tickets. Any failure reads as `off`: the widget cannot be
 * shown, and ep-api's own answer then decides (a refusal is turned into a message, never a blocked button).
 */
export function useCheckoutCaptcha({ active }: { active: boolean }): CheckoutCaptcha {
  const [state, setState] = useState<CheckoutCaptcha>({ status: "loading" });
  const asked = useRef(false);
  useEffect(() => {
    if (!active || asked.current) return;
    asked.current = true;
    fetch("/api/captcha-site-key")
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { provider?: string; site_key?: string; disabled?: boolean } | null) => {
        const usable = body !== null && !body.disabled && Boolean(body.site_key);
        setState(usable ? { status: "on", provider: body?.provider === "hcaptcha" ? "hcaptcha" : "recaptcha" } : { status: "off" });
      })
      .catch(() => setState({ status: "off" }));
  }, [active]);
  return state;
}

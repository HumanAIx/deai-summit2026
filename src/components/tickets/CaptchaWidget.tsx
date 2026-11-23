"use client";

// Interactive: loads a third-party script and renders its widget into a DOM
// node via a ref, then reports the solved token back up — genuinely needs
// client lifecycle (RULES.md rule 14).
//
// No new npm dependency (matches the "no dependency until needed" bias
// already established for `BlockCarousel`) — this hand-rolls the provider's
// own script-injection + explicit-render + callback contract, which is all
// either provider actually requires.
//
// Deliberately does NOT call `epFetch` or any server-only module — this
// file, like the rest of `src/lib/blocks/registry.tsx`'s tree, is imported
// by `BuilderCanvas.tsx` (a Client Component) as well as the public
// Server Component page, so nothing here can depend on `server-only` code
// (rule 7 would make that a build failure). The site key comes from the
// new `/api/captcha-site-key` route handler instead, over a plain
// same-origin `fetch()`, exactly like `PublicForm`'s own submit call.

import { useTranslations } from "@/lib/tickets/i18n";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The two providers' explicit-render APIs. Read through `captchaApis()` instead of a `declare global`, because
 * DeAI's contact form already declares a narrower `window.grecaptcha`.
 */
interface ExplicitCaptchaApi {
  ready?: (cb: () => void) => void;
  render: (container: HTMLElement, params: Record<string, unknown>) => number | string;
  /** reCAPTCHA v3 only (script loaded with `?render={siteKey}`). */
  execute?: (siteKey: string, options: { action: string }) => Promise<string>;
}

function captchaApis(): { grecaptcha?: ExplicitCaptchaApi; hcaptcha?: ExplicitCaptchaApi } {
  return window as unknown as { grecaptcha?: ExplicitCaptchaApi; hcaptcha?: ExplicitCaptchaApi };
}

type Provider = "recaptcha" | "hcaptcha" | "recaptcha-v3";

/** v3 has no widget: its script is loaded with the site key and hands out a token per `execute()`. */
const SCRIPT_SRC: Record<Provider, (siteKey: string) => string> = {
  recaptcha: () => "https://www.google.com/recaptcha/api.js?render=explicit",
  hcaptcha: () => "https://js.hcaptcha.com/1/api.js?render=explicit",
  "recaptcha-v3": (siteKey) => `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`,
};

/** A v3 token is valid for 2 minutes: a fresh one is fetched well before that while the buyer is on the step. */
const V3_REFRESH_MS = 90_000;
/** The v3 action ep-api checks for ticket orders (handoff 2026-11-23: `ticket_order`; a token for another action is refused). */
export const V3_ACTION = "ticket_order";

/** Width of the providers' "normal" checkbox (reCAPTCHA 304px, hCaptcha 303px). */
const NORMAL_WIDGET_WIDTH = 304;

// Module-scope, not React state — the script should load exactly once for
// the page's lifetime regardless of how many widgets mount/unmount.
const scriptLoads: Partial<Record<Provider, Promise<void>>> = {};

function loadCaptchaScript(provider: Provider, siteKey: string): Promise<void> {
  const existing = scriptLoads[provider];
  if (existing) return existing;
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC[provider](siteKey);
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${provider} script`));
    document.head.appendChild(script);
  });
  scriptLoads[provider] = promise;
  return promise;
}

/**
 * Renders a real reCAPTCHA/hCaptcha checkbox widget and reports the solved
 * token via `onToken` (`null` again if the token expires). Renders nothing
 * on any failure (site key fetch, script load) — rule 25/28 — and calls
 * `onUnavailable` exactly once when that happens, so the parent form can
 * fail OPEN (treat captcha as effectively off) rather than leaving its
 * submit button disabled forever with no explanation: confirmed live, a
 * form with `captcha.enabled: true` but no real site key configured
 * blocked every visitor permanently, silently, on both this widget and
 * ep-api's own `verifyCaptcha` (which already treats "secret not
 * configured" as a hard reject, not "skip enforcement").
 */
export function CaptchaWidget({
  provider,
  onToken,
  onUnavailable,
}: {
  provider: Provider;
  onToken: (token: string | null) => void;
  onUnavailable: () => void;
}) {
  const a11yT = useTranslations("a11y");
  const containerRef = useRef<HTMLDivElement>(null);
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // A check that should be there but cannot run (script blocked, key refused by the provider) is said in words and
  // logged, never left as a box nobody can solve. `failed` alone (no message) = the site has no captcha.
  const [broken, setBroken] = useState(false);
  const t = useTranslations("tickets.checkout.captcha");
  const breakDown = useCallback(
    (reason: string) => {
      console.warn(`[CaptchaWidget] ${provider} could not run: ${reason}`);
      setBroken(true);
      setFailed(true);
      onUnavailable();
    },
    [provider, onUnavailable],
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/captcha-site-key")
      .then((r) => r.json())
      .then((body: { site_key?: string; disabled?: boolean }) => {
        if (cancelled) return;
        if (body.disabled || !body.site_key) {
          setFailed(true);
          onUnavailable();
          return;
        }
        setSiteKey(body.site_key);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        onUnavailable();
      });
    return () => {
      cancelled = true;
    };
  }, [onUnavailable]);

  useEffect(() => {
    if (!siteKey || provider !== "recaptcha-v3") return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    // Invisible: ask for a token now and again before it expires. A failure to get one is "unavailable" (fail open,
    // like the widget), so the buyer is never stuck behind a captcha that cannot run.
    const fetchToken = () => {
      const api = captchaApis().grecaptcha;
      if (cancelled || !api?.execute) return;
      api
        .execute(siteKey, { action: V3_ACTION })
        .then((token) => {
          if (!cancelled) onToken(token);
        })
        .catch(() => {
          if (!cancelled) breakDown("execute() was refused");
        });
    };

    loadCaptchaScript(provider, siteKey)
      .then(() => {
        if (cancelled) return;
        const api = captchaApis().grecaptcha;
        if (!api?.ready) throw new Error("reCAPTCHA v3 did not load");
        api.ready(() => {
          fetchToken();
          timer = setInterval(fetchToken, V3_REFRESH_MS);
        });
      })
      .catch(() => {
        if (!cancelled) breakDown("the script did not load");
      });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [siteKey, provider, onToken, breakDown]);

  useEffect(() => {
    if (!siteKey || provider === "recaptcha-v3") return;
    let cancelled = false;

    const render = () => {
      if (cancelled || !containerRef.current) return;
      const api = provider === "recaptcha" ? captchaApis().grecaptcha : captchaApis().hcaptcha;
      if (!api) return;
      try {
        api.render(containerRef.current, {
          sitekey: siteKey,
          // Both providers draw a fixed ~304px checkbox that overflows a phone
          // form column; their own "compact" size (~164px) fits. Picked once, at
          // render — the widget can't switch size afterwards.
          size: containerRef.current.clientWidth < NORMAL_WIDGET_WIDTH ? "compact" : "normal",
          callback: (token: string) => onToken(token),
          "expired-callback": () => onToken(null),
          // The provider reports a problem it cannot recover from (e.g. a refused key): say so, never a dead box.
          "error-callback": () => breakDown("the provider reported an error"),
        });
      } catch (error) {
        breakDown(error instanceof Error ? error.message : "render failed");
      }
    };

    loadCaptchaScript(provider, siteKey)
      .then(() => {
        if (cancelled) return;
        const recaptcha = captchaApis().grecaptcha;
        if (provider === "recaptcha" && recaptcha?.ready) {
          recaptcha.ready(render);
        } else {
          render();
        }
      })
      .catch(() => {
        if (!cancelled) breakDown("the script did not load");
      });

    return () => {
      cancelled = true;
    };
  }, [siteKey, provider, onToken, breakDown]);

  if (broken) {
    return (
      <p role="alert" className="text-sm text-danger">
        {t("unavailable")}
      </p>
    );
  }
  if (failed) return null;
  // v3 draws nothing here (Google shows its own badge); the empty group keeps the layout identical.
  if (provider === "recaptcha-v3") return null;
  return <div ref={containerRef} role="group" aria-label={a11yT("captcha")} />;
}

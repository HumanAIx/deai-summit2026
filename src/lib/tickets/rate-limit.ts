import type { NextRequest } from "next/server";

/**
 * Shared per-IP rate limiter for the public forms proxy routes (submit,
 * deliver-document, email-document) — see submit/route.ts's own doc comment
 * for why this is defense-in-depth, not the primary control. Deliberately
 * one Map per route module (each route imports its own instance via
 * `createRateLimiter`), not a single shared Map across all three routes —
 * a burst on one action (e.g. repeated email-document requests) shouldn't
 * spend a visitor's budget on the others.
 */
export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export function createRateLimiter({ windowMs, max }: { windowMs: number; max: number }) {
  const byIp = new Map<string, { count: number; windowStart: number }>();
  return function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = byIp.get(ip);
    if (!entry || now - entry.windowStart > windowMs) {
      byIp.set(ip, { count: 1, windowStart: now });
      return false;
    }
    entry.count += 1;
    return entry.count > max;
  };
}

// A handful of ep-api's AppError paths pass a raw, untranslated i18n key
// (e.g. `forms.documentNotFound`) straight through as the error string rather
// than a resolved sentence — never show a raw dotted key to a visitor.
const UNTRANSLATED_KEY_SHAPE = /^[a-z][a-zA-Z]*\.[a-zA-Z]+$/;
export function displaySafeApiMessage(apiMessage: string): string {
  return UNTRANSLATED_KEY_SHAPE.test(apiMessage) ? "Request failed. Please try again." : apiMessage;
}

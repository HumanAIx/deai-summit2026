import { useTranslations } from "@/lib/tickets/i18n";
import { formatCountdown } from "@/lib/tickets/checkout-cart";
import { useRemainingMs } from "./hooks";

/** Minutes left at which a screen reader is told (a ticking timer itself is not announced every second). */
const ANNOUNCE_AT_MINUTES = [5, 2, 1];

/**
 * "Your tickets are reserved for mm:ss". The visible clock is a `timer` role with live updates OFF (it would read
 * out every second); a separate polite status line speaks only at 5, 2 and 1 minute left.
 */
export function HoldTimerView({ remainingMs }: { remainingMs: number }) {
  const t = useTranslations("tickets.checkout.pay");
  const minutesLeft = Math.ceil(remainingMs / 60_000);
  const announce = remainingMs > 0 && ANNOUNCE_AT_MINUTES.includes(minutesLeft);
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
      <span>{t("holdLabel")}</span>
      <span role="timer" aria-live="off" className="font-semibold tabular-nums">
        {formatCountdown({ remainingMs })}
      </span>
      <span role="status" className="sr-only">
        {announce ? t("holdAnnounce", { minutes: minutesLeft }) : ""}
      </span>
    </div>
  );
}

/**
 * The hold's clock: counts down to `until` and calls `onExpire` once at zero. Key it by `until`, so an extended hold
 * starts a fresh clock.
 */
export function HoldTimer({ until, onExpire }: { until: string; onExpire: () => void }) {
  const remaining = useRemainingMs({ until, onExpire });
  return <HoldTimerView remainingMs={remaining ?? 0} />;
}

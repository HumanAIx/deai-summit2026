import { useState } from "react";
import { useTranslations } from "@/lib/tickets/i18n";
import { formatCountdown } from "@/lib/tickets/checkout-cart";
import { useRemainingMs } from "./hooks";
import { Icon } from "./ui";

/** The last stretch of the hold: a warning shows, with an Extend button while the hold can still grow. */
export const HOLD_WARNING_MS = 2 * 60_000;

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
    <div className="flex flex-wrap items-center gap-x-2 text-sm">
      <Icon name="timer" />
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
export function HoldTimer({
  until,
  onExpire,
  canExtend = false,
  onExtend,
}: {
  until: string;
  onExpire: () => void;
  /** The hold is still below ep-api's `holdMaxAt`: an Extend button is offered near the end. */
  canExtend?: boolean;
  /** Asks ep-api for more time; `true` when the hold was extended (the parent re-keys this timer with the new end). */
  onExtend?: () => Promise<boolean>;
}) {
  const t = useTranslations("tickets.checkout.pay");
  const remaining = useRemainingMs({ until, onExpire }) ?? 0;
  const [extending, setExtending] = useState(false);
  const [failed, setFailed] = useState(false);
  const ending = remaining > 0 && remaining <= HOLD_WARNING_MS;

  async function extend() {
    if (!onExtend) return;
    setExtending(true);
    setFailed(false);
    const ok = await onExtend();
    setExtending(false);
    if (!ok) setFailed(true);
  }

  // Design: a tinted pill in the accent colour, amber in the last 2 minutes.
  return (
    <div className={`flex flex-col gap-2 rounded-xl px-3.5 py-2.5 ${ending ? "bg-[color-mix(in_srgb,var(--tk-warn)_10%,transparent)] text-(--tk-warn)" : "bg-(--tk-tint) text-(--tk-soft)"}`}>
      <HoldTimerView remainingMs={remaining} />
      {ending ? (
        <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <span className="font-medium">{canExtend ? t("holdEndingSoon") : t("holdEndingNoMore")}</span>
          {canExtend && onExtend ? (
            <button
              type="button"
              onClick={() => void extend()}
              disabled={extending}
              className="inline-flex min-h-11 items-center rounded-full border border-current px-4 font-semibold text-inherit hover:bg-[color-mix(in_srgb,currentColor_10%,transparent)] disabled:opacity-50"
            >
              {extending ? t("extending") : t("extend")}
            </button>
          ) : null}
          {failed ? <span className="text-(--tk-err)">{t("extendFailed")}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

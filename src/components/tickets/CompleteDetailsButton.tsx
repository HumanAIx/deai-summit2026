"use client";

import { goToDetails } from "./details-focus";
import { TP_FOCUS } from "./ticket-page-classes";

/** "Complete my details" in the banner: scroll to "Your details" and focus the first missing field (details-focus.ts). */
export function CompleteDetailsButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => goToDetails()} className={`inline-flex min-h-11 items-center justify-center rounded-full bg-(--mt-warn) px-5 text-sm font-semibold text-(--mt-ink) hover:brightness-110 ${TP_FOCUS}`}>
      {label}
    </button>
  );
}

"use client";

import { goToDetails } from "./details-focus";
import { MT_BUTTON } from "./my-ticket-classes";

/** "Complete my details" in the banner: scroll to "Your details" and focus the first missing field (details-focus.ts). */
export function CompleteDetailsButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => goToDetails()} className={MT_BUTTON}>
      {label}
    </button>
  );
}

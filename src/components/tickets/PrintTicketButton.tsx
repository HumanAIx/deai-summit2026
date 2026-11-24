"use client";

// Interactive: opens the browser's print dialog (where "Save as PDF" is a destination); the print styles in globals.css
// print the ticket card alone.

import { DownloadIcon } from "./ticket-page-icons";
import { TP_BUTTON_OUTLINE } from "./ticket-page-classes";

/** "Save as PDF" next to "Add to calendar": the browser prints the ticket card (QR and all), which saves as a PDF. */
export function PrintTicketButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={`${TP_BUTTON_OUTLINE} min-h-12 w-full`}>
      <DownloadIcon />
      {label}
    </button>
  );
}

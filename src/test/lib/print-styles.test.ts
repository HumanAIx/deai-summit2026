import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// DASH-205: "Save as PDF" on the ticket page printed a blank page because the schedule's print rule hid every child of
// <body> on every page. Print rules that hide the whole page must only apply where their own print content exists.

const css = readFileSync(fileURLToPath(new URL("../../app/globals.css", import.meta.url)), "utf8");
const noComments = css.replace(/\/\*[\s\S]*?\*\//g, "");

/** Every selector (one per rule) that hides direct children of <body>. */
const bodyHidingSelectors = [...noComments.matchAll(/([^{}]*body[^{}]*>\s*\*[^{}]*)\{[^}]*display:\s*none/g)].map((m) => m[1].trim());

describe("print styles", () => {
  it("finds the schedule's page-wide print rule", () => {
    expect(bodyHidingSelectors.length).toBeGreaterThan(0);
  });

  it("scopes every page-wide hide to the page that has the schedule print portal", () => {
    for (const selector of bodyHidingSelectors) {
      expect(selector).toMatch(/^body:has\(>\s*\.schedule-print-portal\)/);
    }
  });

  it("keeps the ticket card print rule for the ticket page", () => {
    expect(noComments).toMatch(/body:has\(\[data-ticket-card\]\)/);
  });
});

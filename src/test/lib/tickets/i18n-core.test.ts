import { afterEach, describe, expect, it, vi } from "vitest";
import { createFormatter, createTranslator, TICKETS_LOCALE } from "../../../lib/tickets/i18n-core";
import { useFormatter, useLocale, useTranslations } from "../../../lib/tickets/i18n";
import { getFormatter, getLocale, getTranslations } from "../../../lib/tickets/i18n-server";

afterEach(() => vi.restoreAllMocks());

describe("createTranslator", () => {
  it("returns a plain message", () => {
    expect(createTranslator("tickets.ticket")("addToCalendar")).toBe("Add to calendar");
  });

  it("interpolates values", () => {
    expect(createTranslator("tickets.ticket")("timeZoneNote", { zone: "Europe/Malta" })).toBe("Times are shown in the event's time zone (Europe/Malta).");
  });

  it("formats ICU plurals (one / other)", () => {
    const t = createTranslator("tickets.ticket");
    expect(t("accessSessions", { count: 1 })).toBe("1 session");
    expect(t("accessSessions", { count: 3 })).toBe("3 sessions");
    expect(t("kickerDays", { count: 1 })).toBe("Ticket · 1 day");
    expect(t("kickerDays", { count: 2 })).toBe("Ticket · 2 days");
  });

  it("works without a namespace, using the full key path", () => {
    expect(createTranslator()("tickets.ticket.addToCalendar")).toBe("Add to calendar");
    expect(createTranslator()("a11y.skipToContent")).toBe("Skip to main content");
  });

  it("has() is true for a string message and false for a missing key or a namespace node", () => {
    const t = createTranslator("tickets.ticket");
    expect(t.has("addToCalendar")).toBe(true);
    expect(t.has("nope")).toBe(false);
    expect(t.has("status")).toBe(false); // an object, not a message
    expect(createTranslator().has("tickets.ticket.status.valid")).toBe(true);
  });

  it("returns the full key path (and warns) for a missing key", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(createTranslator("tickets.ticket")("doesNotExist")).toBe("tickets.ticket.doesNotExist");
    expect(createTranslator()("totally.missing")).toBe("totally.missing");
    expect(warn).toHaveBeenCalled();
  });

  it("returns the key path when the key names an object rather than a message", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(createTranslator("tickets.ticket")("status")).toBe("tickets.ticket.status");
  });

  it("resolves nested keys", () => {
    expect(createTranslator("tickets.ticket.status")("valid")).toBe("Valid");
  });

  it("caches compiled messages without changing the output", () => {
    const t = createTranslator("tickets.ticket");
    expect(t("accessSessions", { count: 2 })).toBe(t("accessSessions", { count: 2 }));
  });
});

describe("createFormatter", () => {
  const f = createFormatter();

  it("formats a date in English with the given options", () => {
    const date = new Date(Date.UTC(2026, 10, 25, 12, 0, 0));
    expect(f.dateTime(date, { dateStyle: "long", timeZone: "UTC" })).toBe("November 25, 2026");
  });

  it("formats a date range", () => {
    const out = f.dateTimeRange(new Date(Date.UTC(2026, 10, 25)), new Date(Date.UTC(2026, 10, 27)), { dateStyle: "medium", timeZone: "UTC" });
    expect(out).toContain("Nov");
    expect(out).toMatch(/25/);
    expect(out).toMatch(/27/);
  });

  it("formats numbers as English currency", () => {
    expect(f.number(1234.5, { style: "currency", currency: "EUR" })).toBe("€1,234.50");
    expect(f.number(1234567)).toBe("1,234,567");
  });

  it("formats a list with English conjunctions", () => {
    expect(f.list(["a", "b", "c"], { type: "conjunction" })).toBe("a, b, and c");
    expect(f.list(["a", "b"])).toBe("a and b");
  });
});

describe("hooks and server counterparts", () => {
  it("are English-only and behave like the core", async () => {
    expect(TICKETS_LOCALE).toBe("en");
    expect(useLocale()).toBe("en");
    expect(await getLocale()).toBe("en");
    expect(useTranslations("tickets.ticket")("addToCalendar")).toBe("Add to calendar");
    expect((await getTranslations("tickets.ticket"))("addToCalendar")).toBe("Add to calendar");
    expect(useFormatter().number(1000)).toBe("1,000");
    expect((await getFormatter()).number(1000)).toBe("1,000");
  });
});

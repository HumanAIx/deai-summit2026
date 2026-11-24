import { describe, expect, it } from "vitest";
import { formatEventWhen, formatMoney, formatPlainDate } from "../../../lib/tickets/format";

// The same Intl calls next-intl's formatter makes, without importing next-intl (its server entry needs
// `next/headers`, which this project's `react-server` condition cannot resolve outside a Next build).
function intlFormatter(locale: string) {
  return {
    number: (value: number, options?: Intl.NumberFormatOptions) => new Intl.NumberFormat(locale, options).format(value),
    dateTime: (value: Date, options?: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, options).format(value),
    dateTimeRange: (from: Date, to: Date, options?: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, options).formatRange(from, to),
  } as unknown as Parameters<typeof formatMoney>[0]["format"];
}
const format = intlFormatter("en");
const de = intlFormatter("de");

describe("formatMoney", () => {
  it("formats integer cents with the visitor's locale", () => {
    expect(formatMoney({ format, cents: 12345, currency: "EUR" })).toBe("€123.45");
    expect(formatMoney({ format: de, cents: 12345, currency: "EUR" })).toMatch(/123,45\s€/);
  });
  it("drops the decimals of a whole amount (house rule) and keeps them otherwise", () => {
    expect(formatMoney({ format, cents: 9900, currency: "EUR" })).toBe("€99");
    expect(formatMoney({ format, cents: 9905, currency: "EUR" })).toBe("€99.05");
    expect(formatMoney({ format, cents: 9950, currency: "EUR" })).toBe("€99.50");
    expect(formatMoney({ format: de, cents: 9900, currency: "EUR" })).toMatch(/^99\s€$/);
  });
  it("degrades (never throws) for a bad currency code", () => {
    expect(formatMoney({ format, cents: 250, currency: "??" })).toBe("2.50 ??");
  });
});

describe("formatEventWhen", () => {
  it("shows a single day in the EVENT's time zone with its short zone name", () => {
    const text = formatEventWhen({ format, source: { startDate: "2026-11-25", endDate: "2026-11-25", timeZone: "Europe/Malta", startsAt: "2026-11-25T08:00:00.000Z" } });
    expect(text).toContain("Wednesday");
    expect(text).toContain("9:00");
    expect(text).toMatch(/GMT\+1|CET/);
  });
  it("shows a multi-day event as a date range", () => {
    const text = formatEventWhen({ format, source: { startDate: "2026-11-25", endDate: "2026-11-26", timeZone: "Europe/Malta", startsAt: "2026-11-25T08:00:00.000Z" } });
    expect(text).toContain("25");
    expect(text).toContain("26");
    expect(text).toContain("November");
  });
  it("falls back to UTC for an unknown zone and to the day when there is no start time", () => {
    expect(formatEventWhen({ format, source: { startDate: null, endDate: null, timeZone: "Nowhere/Land", startsAt: "2026-11-25T08:00:00.000Z" } })).toContain("UTC");
    expect(formatEventWhen({ format, source: { startDate: "2026-11-25", endDate: null, timeZone: "Europe/Malta", startsAt: null } })).toContain("November 25, 2026");
  });
  it("is null when ep-api gave no date", () => {
    expect(formatEventWhen({ format, source: { startDate: null, endDate: null, timeZone: "Europe/Malta", startsAt: null } })).toBeNull();
  });
});

describe("formatPlainDate", () => {
  it("formats a day and a timestamp, and keeps unparseable text", () => {
    expect(formatPlainDate({ format, value: "2026-11-25" })).toBe("November 25, 2026");
    expect(formatPlainDate({ format, value: "2026-11-25T23:30:00.000Z" })).toBe("November 25, 2026");
    expect(formatPlainDate({ format, value: "soon" })).toBe("soon");
  });
});

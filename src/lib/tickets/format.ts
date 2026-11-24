import type { useFormatter } from "@/lib/tickets/i18n";
import { centsToMajor } from "./money";

type Formatter = ReturnType<typeof useFormatter>;

/** Money from integer cents + an ISO currency, through the visitor's locale (display only, no arithmetic). */
export function formatMoney({ format, cents, currency }: { format: Formatter; cents: number; currency: string }): string {
  const major = centsToMajor({ cents, currency });
  try {
    // House rule (DASH-205): whole amounts show no decimals (€99, not €99.00); any other amount keeps the currency's own.
    const whole = Number.isInteger(major);
    return format.number(major, { style: "currency", currency, ...(whole ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {}) });
  } catch {
    return `${major.toFixed(2)} ${currency}`; // not an ISO currency code: degrade, never throw into the page
  }
}

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A calendar day (`YYYY-MM-DD`, as ep-api stores event days) as a Date that formats the same in any zone with `timeZone: "UTC"`. */
function dayToUtcDate({ ymd }: { ymd: string }): Date | null {
  const match = YMD.exec(ymd);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

export interface EventSourceTimes {
  startDate: string | null;
  endDate: string | null;
  timeZone: string;
  startsAt: string | null;
}

/**
 * "When" of an event, in the EVENT's own time zone (not the visitor's): a single day with a known start
 * is a full weekday/date/time with the zone's short name; a multi-day event is its date range; otherwise
 * the start day alone. Returns `null` when ep-api gave no date at all. An unknown zone id falls back to UTC
 * rather than throwing (the page must still render).
 */
export function formatEventWhen({ format, source }: { format: Formatter; source: EventSourceTimes }): string | null {
  const start = source.startDate ? dayToUtcDate({ ymd: source.startDate }) : null;
  const end = source.endDate ? dayToUtcDate({ ymd: source.endDate }) : null;
  const multiDay = start !== null && end !== null && end.getTime() > start.getTime();

  if (multiDay) {
    return format.dateTimeRange(start, end, { dateStyle: "long", timeZone: "UTC" });
  }
  const instant = source.startsAt ? new Date(source.startsAt) : null;
  if (instant && !Number.isNaN(instant.getTime())) {
    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" } as const;
    try {
      return format.dateTime(instant, { ...options, timeZone: source.timeZone });
    } catch {
      return format.dateTime(instant, { ...options, timeZone: "UTC" });
    }
  }
  return start ? format.dateTime(start, { dateStyle: "full", timeZone: "UTC" }) : null;
}

/** A stored `YYYY-MM-DD` day or ISO timestamp as a long date (UTC); the raw text when it cannot be parsed. */
export function formatPlainDate({ format, value }: { format: Formatter; value: string }): string {
  const parsed = value.includes("T") ? new Date(value) : dayToUtcDate({ ymd: value });
  if (parsed && !Number.isNaN(parsed.getTime())) return format.dateTime(parsed, { dateStyle: "long", timeZone: "UTC" });
  return value;
}

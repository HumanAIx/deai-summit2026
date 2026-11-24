/**
 * An "Add to calendar" file for an order, built in the browser from the event data the checkout already holds (name,
 * dates, time zone from `/api/tickets/types`). ep-api's calendar file is per holder link; an order has no holder
 * token the buyer's browser could use, so nothing secret is needed or sent. All-day (the catalogue carries dates, not
 * times). Returns null when the event has no start date.
 */
const YMD = /^(\d{4})-(\d{2})-(\d{2})/;

function icsDate({ value, addDays = 0 }: { value: string; addDays?: number }): string | null {
  const match = YMD.exec(value);
  if (!match) return null;
  const day = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + addDays));
  return `${day.getUTCFullYear()}${String(day.getUTCMonth() + 1).padStart(2, "0")}${String(day.getUTCDate()).padStart(2, "0")}`;
}

function escapeText({ value }: { value: string }): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

export function buildOrderIcs({ name, startDate, endDate, uid }: { name: string; startDate: string | null | undefined; endDate: string | null | undefined; uid: string }): string | null {
  const start = startDate ? icsDate({ value: startDate }) : null;
  if (!start) return null;
  const endExclusive = (endDate ? icsDate({ value: endDate, addDays: 1 }) : null) ?? icsDate({ value: startDate ?? "", addDays: 1 });
  if (!endExclusive || endExclusive <= start) return null;
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GConf.ai//Tickets//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}@tickets`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${endExclusive}`,
    `SUMMARY:${escapeText({ value: name })}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

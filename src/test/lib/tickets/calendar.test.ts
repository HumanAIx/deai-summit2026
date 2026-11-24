import { describe, expect, it } from "vitest";
import { buildOrderIcs } from "@/lib/tickets/calendar";

describe("buildOrderIcs", () => {
  it("builds an all-day event whose end is the day AFTER the last day", () => {
    const ics = buildOrderIcs({ name: "DeAI Summit, Day 1", startDate: "2026-11-25", endDate: "2026-11-26", uid: "abc" }) ?? "";
    expect(ics).toContain("DTSTART;VALUE=DATE:20261125");
    expect(ics).toContain("DTEND;VALUE=DATE:20261127");
    expect(ics).toContain("SUMMARY:DeAI Summit\\, Day 1");
    expect(ics).toContain("UID:abc@tickets");
  });
  it("a single-day event ends the next day; no start date means no file", () => {
    expect(buildOrderIcs({ name: "x", startDate: "2026-12-31", endDate: null, uid: "u" })).toContain("DTEND;VALUE=DATE:20270101");
    expect(buildOrderIcs({ name: "x", startDate: null, endDate: null, uid: "u" })).toBeNull();
  });
});

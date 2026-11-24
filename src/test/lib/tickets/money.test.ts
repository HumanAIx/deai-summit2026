import { describe, expect, it } from "vitest";
import { centsToMajor } from "../../../lib/tickets/money";

describe("centsToMajor", () => {
  it("uses the currency's own number of decimals", () => {
    expect(centsToMajor({ cents: 12345, currency: "EUR" })).toBe(123.45);
    expect(centsToMajor({ cents: 500, currency: "JPY" })).toBe(500);
    expect(centsToMajor({ cents: 1234, currency: "KWD" })).toBe(1.234);
  });
  it("falls back to two decimals for an unknown currency code", () => {
    expect(centsToMajor({ cents: 250, currency: "not-a-code" })).toBe(2.5);
  });
});

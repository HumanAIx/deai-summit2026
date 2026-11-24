import { describe, expect, it } from "vitest";
import { COUNTRY_CODES, countryOptions } from "../../../lib/tickets/countries";

describe("countryOptions", () => {
  it("is every ISO code once, as {value, label} pairs sorted by the visitor's language", () => {
    expect(new Set(COUNTRY_CODES).size).toBe(COUNTRY_CODES.length);
    expect(COUNTRY_CODES.every((code) => /^[A-Z]{2}$/.test(code))).toBe(true);
    const en = countryOptions({ locale: "en" });
    expect(en.find((c) => c.value === "MT")?.label).toBe("Malta");
    expect(en.map((c) => c.label)).toEqual([...en.map((c) => c.label)].sort((a, b) => a.localeCompare(b, "en")));
    expect(countryOptions({ locale: "de" }).find((c) => c.value === "DE")?.label).toBe("Deutschland");
  });

  it("an invalid locale degrades instead of throwing", () => {
    expect(() => countryOptions({ locale: "not a locale" })).not.toThrow();
    expect(countryOptions({ locale: "not a locale" }).length).toBe(COUNTRY_CODES.length);
  });
});

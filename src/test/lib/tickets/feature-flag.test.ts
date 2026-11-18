import { afterEach, describe, expect, it, vi } from "vitest";
import { ticketsCheckoutEnabled } from "../../../lib/tickets/feature-flag";

afterEach(() => vi.unstubAllEnvs());

describe("ticketsCheckoutEnabled", () => {
  it("is off by default", () => {
    vi.stubEnv("TICKETS_CHECKOUT_ENABLED", "");
    expect(ticketsCheckoutEnabled()).toBe(false);
  });

  it.each(["true", "TRUE", " True ", "true\n"])("is on for %j", (value) => {
    vi.stubEnv("TICKETS_CHECKOUT_ENABLED", value);
    expect(ticketsCheckoutEnabled()).toBe(true);
  });

  it.each(["false", "0", "1", "yes", "on", "truthy"])("is off for %j (only the word true switches it on)", (value) => {
    vi.stubEnv("TICKETS_CHECKOUT_ENABLED", value);
    expect(ticketsCheckoutEnabled()).toBe(false);
  });
});

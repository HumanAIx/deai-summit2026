import { describe, expect, it, vi } from "vitest";
import { buildStripeAppearance, type AppearanceSources } from "../../../components/tickets/checkout/stripe-appearance";

type Rgb = { r: number; g: number; b: number; a: number };
const rgb = (r: number, g: number, b: number, a = 1): Rgb => ({ r, g, b, a });

/** A fake page: each token's "computed value" is a label we map to an RGBA, standing in for the canvas parse. */
function sources({ tokens, colors }: { tokens: Record<string, string>; colors: Record<string, Rgb> }): AppearanceSources {
  return {
    read: ({ token }) => tokens[token] ?? "",
    parse: ({ value }) => colors[value] ?? null,
  };
}

const LIGHT = sources({
  tokens: { "--color-background": "bg", "--color-text": "fg", "--color-text-muted": "muted", "--color-primary": "brand", "--color-danger": "red", "--color-control-border": "edge", "--radius": "8px", "--font-body": "Inter, sans-serif" },
  colors: { bg: rgb(255, 255, 255), fg: rgb(23, 23, 23), muted: rgb(82, 82, 91), brand: rgb(10, 122, 66), red: rgb(180, 35, 24), edge: rgb(142, 142, 144) },
});
const DARK = sources({
  tokens: { "--color-background": "bg", "--color-text": "fg", "--color-primary": "brand", "--radius": "0px", "--font-body": "" },
  colors: { bg: rgb(10, 10, 10), fg: rgb(237, 237, 237), brand: rgb(21, 214, 118) },
});

describe("buildStripeAppearance", () => {
  it("carries the site's theme tokens into Stripe's variables (colours as hex, radius, font)", () => {
    const appearance = buildStripeAppearance(LIGHT);
    expect(appearance.theme).toBe("stripe");
    expect(appearance.variables).toMatchObject({
      colorBackground: "#ffffff",
      colorText: "#171717",
      colorTextSecondary: "#52525b",
      colorPrimary: "#0a7a42",
      colorDanger: "#b42318",
      borderRadius: "8px",
      fontFamily: "Inter, sans-serif",
    });
    expect(appearance.rules).toMatchObject({ ".Input": { border: "1px solid #8e8e90" } });
  });

  it("a dark page gets Stripe's night base, so icons and dividers fit too", () => {
    expect(buildStripeAppearance(DARK).theme).toBe("night");
  });

  it("a token the browser cannot resolve is left out (Stripe's default), never an empty or broken value", () => {
    const appearance = buildStripeAppearance(DARK);
    expect(appearance.variables).not.toHaveProperty("colorDanger");
    expect(appearance.variables).not.toHaveProperty("fontFamily");
    expect(appearance.rules).toEqual({});
    expect(JSON.stringify(appearance)).not.toContain("undefined");
  });

  it("keeps alpha when a token is translucent", () => {
    const translucent = sources({ tokens: { "--color-primary": "p" }, colors: { p: rgb(1, 2, 3, 0.5) } });
    expect(buildStripeAppearance(translucent).variables?.colorPrimary).toBe("#01020380");
  });

  it("in a browser without canvas (or an unparsable value) it degrades to Stripe's defaults without throwing", () => {
    const spy = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(() => buildStripeAppearance()).not.toThrow();
    expect(buildStripeAppearance().variables).not.toHaveProperty("colorPrimary");
    spy.mockRestore();
  });
});

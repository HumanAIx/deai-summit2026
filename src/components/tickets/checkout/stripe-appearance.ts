import type { Appearance } from "@stripe/stripe-js";

/**
 * Stripe's Elements live in an iframe that cannot read our CSS variables, so the `appearance` is built at runtime
 * from the COMPUTED theme tokens of the page (rule 10: no literal colour here — every value is read from a token,
 * so each site's palette and its light / dark mode carry over). Stripe parses hex / rgb / hsl but not oklch or
 * `color-mix()`, so a token is first resolved by the browser and normalised through a 1x1 canvas to hex.
 */
type Rgba = { r: number; g: number; b: number; a: number };

type TokenProperty = "color" | "borderRadius" | "fontFamily";

/** Reads a theme token's computed value (the browser resolves `var()`, `oklch()`, `color-mix()`…). */
function resolveToken({ token, property }: { token: string; property: TokenProperty }): string {
  const probe = document.createElement("span");
  probe.style.display = "none";
  probe.style[property] = `var(${token})`;
  document.documentElement.append(probe);
  try {
    return getComputedStyle(probe)[property];
  } finally {
    probe.remove();
  }
}

/** A CSS colour string as RGBA through a 1x1 canvas (null when the browser cannot parse it or has no canvas). */
function toRgba({ value }: { value: string }): Rgba | null {
  try {
    const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (!context || !value) return null;
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = value;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
    return r === undefined || g === undefined || b === undefined || a === undefined ? null : { r, g, b, a: a / 255 };
  } catch {
    return null;
  }
}

/** `#rrggbb`, or `#rrggbbaa` when translucent: every CSS colour parser (Stripe's included) reads both. */
function serialize({ rgba }: { rgba: Rgba }): string {
  const hex = (value: number) => Math.round(value).toString(16).padStart(2, "0");
  return `#${hex(rgba.r)}${hex(rgba.g)}${hex(rgba.b)}${rgba.a >= 1 ? "" : hex(rgba.a * 255)}`;
}

/** WCAG relative luminance, 0 (black) .. 1 (white). */
function luminance({ rgba }: { rgba: Rgba }): number {
  const channel = (value: number) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgba.r) + 0.7152 * channel(rgba.g) + 0.0722 * channel(rgba.b);
}

export interface AppearanceSources {
  read: (args: { token: string; property: TokenProperty }) => string;
  parse: (args: { value: string }) => Rgba | null;
}

const DOM_SOURCES: AppearanceSources = { read: resolveToken, parse: toRgba };

/** `sources` is injectable so the mapping can be tested without a layout engine; production uses the DOM. */
export function buildStripeAppearance({ read, parse }: AppearanceSources = DOM_SOURCES): Appearance {
  const color = ({ token }: { token: string }): { css: string; rgba: Rgba } | null => {
    const rgba = parse({ value: read({ token, property: "color" }) });
    return rgba ? { css: serialize({ rgba }), rgba } : null;
  };
  const background = color({ token: "--color-background" });
  const text = color({ token: "--color-text" });
  const muted = color({ token: "--color-text-muted" });
  const primary = color({ token: "--color-primary" });
  const danger = color({ token: "--color-danger" });
  const border = color({ token: "--color-control-border" });
  const radius = read({ token: "--radius", property: "borderRadius" });
  const fontFamily = read({ token: "--font-body", property: "fontFamily" });

  const variables: NonNullable<Appearance["variables"]> = {
    ...(background ? { colorBackground: background.css } : {}),
    ...(text ? { colorText: text.css } : {}),
    ...(muted ? { colorTextSecondary: muted.css, colorTextPlaceholder: muted.css } : {}),
    ...(primary ? { colorPrimary: primary.css } : {}),
    ...(danger ? { colorDanger: danger.css } : {}),
    ...(radius ? { borderRadius: radius } : {}),
    ...(fontFamily ? { fontFamily } : {}),
    spacingUnit: "4px",
  };
  return {
    // Stripe's "night" base has the right defaults for the bits a variable does not reach (icons, dividers).
    theme: background && luminance({ rgba: background.rgba }) < 0.4 ? "night" : "stripe",
    variables,
    rules: border ? { ".Input": { border: `1px solid ${border.css}` }, ".Tab": { border: `1px solid ${border.css}` } } : {},
  };
}

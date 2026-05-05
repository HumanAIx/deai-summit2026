import type React from 'react';

/**
 * Shared resolver for which photo URL to render for a person across the
 * dashboard surfaces (Edit form preview, Preview mode, Members list).
 *
 * Mirrors the public-site contract:
 *   activeEnhancedUrl (AI-baked WebP) → person_photo_nobg → person_photo
 *
 * Keeping this in one place means rolling out a new fallback (or extra
 * source field) is a one-line change, not a hunt across components.
 */
export type PersonPhotoBackground =
  | { type: 'gradient'; colors: string[] }
  | { type: 'sunrays'; color1: string; color2: string; count: number; centerX: number; centerY: number; animate?: boolean; swirl?: boolean; swirlAmount?: number }
  | { type: 'swirl'; colors: string[]; centerX: number; centerY: number; animate?: boolean };

/**
 * Build a `url(data:image/svg+xml,...)` background value for sunrays rendered
 * as CURVED wedges (the "swirl" toggle on the sun-rays variant). Each ray is
 * a quadratic bezier spiral that starts radial at the center and twists by
 * ~120° at the perimeter — the classic carnival barber-spiral look.
 *
 * Centered at (centerX%, centerY%) of the SVG viewBox, with an oversized
 * radius (700) so even when the swirl center sits in a corner the rays cover
 * the whole frame.
 */
export function buildSpiralRaysSvgUrl(params: { count: number; color1: string; color2: string; centerX: number; centerY: number; swirlAmount?: number }): string {
  const SIZE = 400;
  const cx = (params.centerX / 100) * SIZE;
  const cy = (params.centerY / 100) * SIZE;
  const r = 700;
  const total = Math.max(2, Math.floor(params.count)) * 2; // alternating wedges
  const slice = (Math.PI * 2) / total;
  // swirlAmount is in DEGREES of twist from center to perimeter; default 120°.
  const twistDeg = params.swirlAmount ?? 120;
  const twist = (twistDeg * Math.PI) / 180;
  // Subdivide each ray edge into N straight segments. A single quadratic
  // bezier can only approximate a slight bend; for real spiral arms (which
  // are roughly Archimedean — angle grows linearly with radius) we need a
  // polyline. Steps scale with twist (~3° between samples) plus a baseline
  // so even gentle curves render without visible facets, capped to keep
  // the data URL reasonable at extreme twists.
  const STEPS = Math.min(240, Math.max(40, Math.ceil(Math.abs(twistDeg) / 3) + 12));
  const segs: string[] = [];
  for (let i = 0; i < total; i++) {
    const a0 = i * slice - Math.PI / 2;
    const a1 = (i + 1) * slice - Math.PI / 2;
    const fill = (i % 2 === 0) ? params.color1 : params.color2;
    const pts: string[] = [`${cx} ${cy}`];
    // Edge A: from center outward, sampling t = 1/STEPS .. 1
    for (let s = 1; s <= STEPS; s++) {
      const t = s / STEPS;
      const rt = r * t;
      const at = a0 + twist * t;
      pts.push(`${(cx + rt * Math.cos(at)).toFixed(1)} ${(cy + rt * Math.sin(at)).toFixed(1)}`);
    }
    // Edge B: from perimeter back inward, sampling t = 1 .. 1/STEPS
    for (let s = STEPS; s >= 1; s--) {
      const t = s / STEPS;
      const rt = r * t;
      const at = a1 + twist * t;
      pts.push(`${(cx + rt * Math.cos(at)).toFixed(1)} ${(cy + rt * Math.sin(at)).toFixed(1)}`);
    }
    segs.push(`<path d="M${pts.join('L')}Z" fill="${fill}"/>`);
  }
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${SIZE} ${SIZE}' preserveAspectRatio='xMidYMid slice'>${segs.join('')}</svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

export interface PersonPhotoSource {
  person_photo?: string | null;
  person_photo_nobg?: string | null;
  photo_settings?: {
    activeEnhancedUrl?: string | null;
    updatedAt?: string | null;
    scale?: number;
    offsetX?: number;
    offsetY?: number;
    filters?: { brightness?: number; contrast?: number; saturation?: number };
    tint?: { color?: string; opacity?: number };
    shadow?: { color?: string; blur?: number; offsetY?: number; opacity?: number };
    background?: PersonPhotoBackground | null;
  } | null;
}

export function resolvePersonPhotoSrc(p: PersonPhotoSource): string {
  return (
    p.photo_settings?.activeEnhancedUrl ||
    p.person_photo_nobg ||
    p.person_photo ||
    ''
  );
}

/**
 * Like `resolvePersonPhotoSrc`, but only prefers `person_photo_nobg` when a
 * decorative background (gradient / sunrays / swirl) or non-zero tint is
 * actually configured for this person — otherwise returns the original
 * `person_photo` so its native background shows through.
 *
 * Use this on gallery surfaces (Members overview list) where a no-bg cutout
 * floating on a plain card looks unnatural unless something is painted
 * behind it. The studio + edit/preview tiles still use the dumb resolver
 * because they always render on the studio's blue framing.
 *
 * `activeEnhancedUrl` (AI-baked headshot) still wins — it embeds its own
 * composition.
 */
export function resolvePersonListPhotoSrc(p: PersonPhotoSource, template?: PersonPhotoSource['photo_settings']): string {
  if (p.photo_settings?.activeEnhancedUrl) return p.photo_settings.activeEnhancedUrl;
  if (hasDecoration(p, template)) {
    return p.person_photo_nobg || p.person_photo || '';
  }
  return p.person_photo || p.person_photo_nobg || '';
}

/**
 * True iff the resolved settings (per-person override, falling back to the
 * tenant template when the person follows the template) carry a decorative
 * background layer or a non-transparent tint that needs the no-bg cutout
 * underneath to look right.
 */
function hasDecoration(p: PersonPhotoSource, template?: PersonPhotoSource['photo_settings']): boolean {
  const source = !hasVisualOverride(p) && template ? templateAsSource(template) : p;
  const s = source.photo_settings;
  if (!s) return false;
  if (s.background) return true;
  if (s.tint && (s.tint.opacity ?? 0) > 0) return true;
  return false;
}

/**
 * Append a cache-buster keyed to `photo_settings.updatedAt` so that when the
 * studio saves a new look (different snapshot, AI re-run, etc.) the URL
 * changes and the browser refetches — without busting cache on every render.
 * Members who never used the studio get the URL unchanged so the browser
 * cache still benefits.
 */
export function withPhotoCacheBuster(url: string, p: PersonPhotoSource): string {
  if (!url) return url;
  const updatedAt = p.photo_settings?.updatedAt;
  if (!updatedAt) return url;
  const ts = Date.parse(updatedAt);
  if (!Number.isFinite(ts)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}_cb=${ts}`;
}

/**
 * CSS filter string assembled from photo_settings — apply to an <img> via
 * `style={{ filter: getPhotoCssFilter(p) }}` to mirror what the public site
 * renders. Combines brightness/contrast/saturation + drop-shadow.
 */
export function getPhotoCssFilter(p: PersonPhotoSource, template?: PersonPhotoSource['photo_settings']): string | undefined {
  const source = !hasVisualOverride(p) && template ? templateAsSource(template) : p;
  const f = source.photo_settings?.filters;
  const sh = source.photo_settings?.shadow;
  const parts: string[] = [];
  if (f) {
    if (f.brightness !== undefined && f.brightness !== 1) parts.push(`brightness(${f.brightness})`);
    if (f.contrast !== undefined && f.contrast !== 1) parts.push(`contrast(${f.contrast})`);
    if (f.saturation !== undefined && f.saturation !== 1) parts.push(`saturate(${f.saturation})`);
  }
  if (sh && (sh.opacity ?? 0) > 0 && (sh.blur ?? 0) > 0) {
    const r = parseInt((sh.color ?? '#000').slice(1, 3), 16) || 0;
    const g = parseInt((sh.color ?? '#000').slice(3, 5), 16) || 0;
    const b = parseInt((sh.color ?? '#000').slice(5, 7), 16) || 0;
    parts.push(`drop-shadow(0 ${sh.offsetY ?? 0}px ${sh.blur ?? 0}px rgba(${r}, ${g}, ${b}, ${sh.opacity ?? 0.5}))`);
  }
  return parts.length > 0 ? parts.join(' ') : undefined;
}

/**
 * Per-person scale / offset transform. Mirrors Photo Studio's bottom-anchor
 * model: scale grows upward from the bottom; offsets are percent of the
 * rendered tile. Apply with `transform-origin: bottom center`.
 *
 * Per-person only — does NOT fall back to template scale (template-level
 * scale is studio-only and would shrink everyone on the public list).
 */
export function getPhotoTransform(p: PersonPhotoSource): string | undefined {
  const ps = p.photo_settings;
  const scale = ps?.scale ?? 1;
  const offsetX = ps?.offsetX ?? 0;
  const offsetY = ps?.offsetY ?? 0;
  if (scale === 1 && offsetX === 0 && offsetY === 0) return undefined;
  const parts: string[] = [];
  if (offsetX !== 0 || offsetY !== 0) parts.push(`translate(${offsetX}%, ${offsetY}%)`);
  if (scale !== 1) parts.push(`scale(${scale})`);
  return parts.join(' ');
}

/**
 * Background tint colour assembled from photo_settings.tint — apply to the
 * wrapper element (behind the photo) with `style={{ background: getPhotoTintBg(p) }}`.
 * Returns `undefined` when no tint should render.
 *
 * NOTE: prefer `getPhotoBackgroundCss(p)` when the surface should also support
 * gradient / sun-rays backgrounds. This helper only returns the tint layer.
 */
export function getPhotoTintBg(p: PersonPhotoSource): string | undefined {
  const t = p.photo_settings?.tint;
  if (!t || (t.opacity ?? 0) === 0) return undefined;
  const color = t.color ?? '#0A1530';
  const r = parseInt(color.slice(1, 3), 16) || 0;
  const g = parseInt(color.slice(3, 5), 16) || 0;
  const b = parseInt(color.slice(5, 7), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${t.opacity ?? 0})`;
}

/**
 * True iff the person carries any explicit per-person visual override.
 * When false, callers should fall back to the tenant template's visuals so
 * "follow tenant template" persons still render with the studio look.
 */
function hasVisualOverride(p: PersonPhotoSource): boolean {
  const s = p.photo_settings;
  if (!s) return false;
  return !!(s.tint || s.filters || s.shadow || s.background);
}

/** Build a `PersonPhotoSource` from a tenant photo template (which is itself
 *  a `PhotoSettings`-shaped object) so the existing `getPhoto*` helpers can
 *  read it without changes. */
function templateAsSource(template: PersonPhotoSource['photo_settings']): PersonPhotoSource {
  return { photo_settings: template ?? null };
}

/**
 * Full wrapper-background CSS that composes (in order, top to bottom):
 *   1. The optional `tint` rgba layer (overlay on top).
 *   2. The optional decorative `background` layer (gradient or sun rays).
 * When the person has no per-person visual override AND a tenant template
 * is supplied, falls back to the template's visuals so "follow template"
 * persons still render with the studio look.
 * Returns `undefined` when neither is set so the call site can fall back to
 * its own default (e.g. the page background).
 */
export function getPhotoBackgroundCss(p: PersonPhotoSource, template?: PersonPhotoSource['photo_settings']): string | undefined {
  const source = !hasVisualOverride(p) && template ? templateAsSource(template) : p;
  return getPhotoBackgroundCssInner(source);
}

function getPhotoBackgroundCssInner(p: PersonPhotoSource): string | undefined {
  const layers: string[] = [];
  const tintCss = getPhotoTintBg(p);
  if (tintCss) {
    // Tints stack as a flat-color layer in CSS multi-background notation.
    layers.push(`linear-gradient(${tintCss}, ${tintCss})`);
  }
  const bg = p.photo_settings?.background;
  if (bg) {
    if (bg.type === 'gradient' && bg.colors?.length) {
      layers.push(`linear-gradient(to bottom, ${bg.colors.join(', ')})`);
    } else if (bg.type === 'sunrays' && !bg.animate) {
      // Static sunrays paint as a wrapper background. Animated sunrays are
      // rendered by `getAnimatedSunraysStyle` instead because GPU-accelerated
      // transform rotation needs a separate (oversized) child element.
      if (bg.swirl) {
        // Curved (barber-pole) variant — SVG data URL.
        layers.push(`${buildSpiralRaysSvgUrl(bg)} center / cover no-repeat`);
      } else {
        const slice = 360 / Math.max(1, bg.count * 2);
        layers.push(
          `repeating-conic-gradient(from 0deg at ${bg.centerX}% ${bg.centerY}%, ` +
            `${bg.color1} 0deg, ${bg.color1} ${slice}deg, ` +
            `${bg.color2} ${slice}deg, ${bg.color2} ${slice * 2}deg)`
        );
      }
    } else if (bg.type === 'swirl' && !bg.animate && bg.colors?.length) {
      // Static swirl paints via plain `conic-gradient` (smooth interpolation
      // across stops). Animated swirl goes through `getAnimatedSunraysStyle`
      // for the same reason as animated sunrays.
      // Append the first colour again at 360° so the wrap is seamless even
      // if the user enters non-looping stops.
      const stops = [...bg.colors, bg.colors[0]];
      layers.push(
        `conic-gradient(from 0deg at ${bg.centerX}% ${bg.centerY}%, ${stops.join(', ')})`
      );
    }
  }
  return layers.length > 0 ? layers.join(', ') : undefined;
}

/**
 * Returns the inline style for a child `<div>` that paints an animated
 * decorative background (sun rays or swirl) via a transform-based rotation
 * (compositor thread → smooth). Returns `null` unless the resolved background
 * is sunrays-or-swirl + animate. The child must be mounted inside a
 * `position: relative` (or absolute) parent with `overflow: hidden` so the
 * oversized element stays clipped to the photo tile. The parent's photo
 * `<img>` should sit ON TOP of this child via DOM order or z-index so the
 * decoration renders BEHIND the photo.
 *
 * Name kept as `getAnimatedSunraysStyle` for backwards-compat with existing
 * call sites — it now handles swirl too.
 */
export function getAnimatedSunraysStyle(p: PersonPhotoSource, template?: PersonPhotoSource['photo_settings']): React.CSSProperties | null {
  const source = !hasVisualOverride(p) && template ? templateAsSource(template) : p;
  const bg = source.photo_settings?.background;
  if (!bg || !('animate' in bg) || !bg.animate) return null;
  let bgCss: string;
  if (bg.type === 'sunrays') {
    if (bg.swirl) {
      // Curved variant — SVG data URL covering the oversized child div.
      // Always centered at 50/50 in the animated case so the rotation pivot
      // stays at the visual center (matches the existing animated-sunrays
      // convention which also hardcodes `at 50% 50%`).
      bgCss = `${buildSpiralRaysSvgUrl({ ...bg, centerX: 50, centerY: 50 })} center / cover no-repeat`;
    } else {
      const slice = 360 / Math.max(1, bg.count * 2);
      bgCss =
        `repeating-conic-gradient(from 0deg at 50% 50%, ` +
        `${bg.color1} 0deg, ${bg.color1} ${slice}deg, ` +
        `${bg.color2} ${slice}deg, ${bg.color2} ${slice * 2}deg)`;
    }
  } else if (bg.type === 'swirl' && bg.colors?.length) {
    const stops = [...bg.colors, bg.colors[0]];
    bgCss = `conic-gradient(from 0deg at 50% 50%, ${stops.join(', ')})`;
  } else {
    return null;
  }
  // Tighter spirals are visually self-similar (the pattern is rotationally
  // symmetric at every fold, and the curl makes neighbouring frames look
  // near-identical), so the 60s default looks "barely moving" at high
  // twist. Scale the period inversely with the twist amount when swirl is
  // on — straight rays still spin every 60s; vortex spins every ~12s.
  const swirlOn = bg.type === 'sunrays' && bg.swirl;
  const twistDeg = swirlOn ? (bg.swirlAmount ?? 120) : 0;
  const duration = swirlOn ? Math.max(8, 60 / (1 + twistDeg / 360)) : 60;
  return {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '200%',
    height: '200%',
    background: bgCss,
    transform: 'translate(-50%, -50%)',
    animation: `photo-rays-spin ${duration.toFixed(1)}s linear infinite`,
    pointerEvents: 'none',
    willChange: 'transform',
  };
}

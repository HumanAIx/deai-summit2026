const SVG_SRC = /\.svg(\?|$)/i;

/**
 * Logos rendered on the uniform white scroller tile.
 * SVG / dark-bg artwork → dark silhouette (brightness(0), no invert).
 * Raster logos → grayscale only so white PNG backgrounds stay white.
 */
export function sponsorScrollerUsesSilhouetteFilter(src: string, logoHasDarkBg?: boolean): boolean {
  if (logoHasDarkBg) return true;
  return SVG_SRC.test(src);
}

export const SPONSOR_SCROLLER_TILE_CLASS =
  'bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.06]';

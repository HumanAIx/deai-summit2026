/** Desktop menu scale against the full viewport. */
export function heroMenuScale(viewportWidth: number, viewportHeight: number): number {
  const next = Math.min(viewportWidth / 1440, Math.max(viewportHeight, 1) / 860);
  return next > 0 ? next : 1;
}

/**
 * Runs from the document head, before the menu is painted, so the first
 * frame is already at the fitted scale instead of scale 1.
 */
export const heroMenuScaleBoot = `(function(){
  var w=window.innerWidth;
  var h=window.innerHeight;
  var next=Math.min(w/1440,Math.max(h,1)/860);
  if(!(next>0)) next=1;
  document.documentElement.style.setProperty('--hero-menu-scale',String(next));
})();`;

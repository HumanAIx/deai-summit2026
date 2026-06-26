const FA_TO_REMIX: Record<string, string> = {
  'fa-map-marker-alt': 'ri-map-pin-line',
  'fa-map-marker': 'ri-map-pin-line',
  'fa-map': 'ri-map-pin-line',
  'fa-location-dot': 'ri-map-pin-line',
  'fa-calendar': 'ri-calendar-line',
  'fa-calendar-alt': 'ri-calendar-line',
  'fa-calendar-days': 'ri-calendar-line',
  'fa-calendar-check': 'ri-calendar-check-line',
};

/** Map dashboard Font Awesome icon keys to Remix classes used on deaisummit.org. */
export function cmsIconClass(icon?: string, fallback = 'ri-information-line'): string {
  if (!icon) return fallback;
  if (icon.startsWith('ri-')) return icon;
  return FA_TO_REMIX[icon] ?? fallback;
}

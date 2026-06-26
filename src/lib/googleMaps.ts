/** Normalize pasted iframe HTML or raw Maps URLs. */
export function normalizeGoogleMapsInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  const srcMatch = trimmed.match(/src=["']([^"']+)["']/i);
  if (srcMatch?.[1]?.includes('google.com/maps')) {
    return srcMatch[1];
  }

  return trimmed;
}

/**
 * Convert stored Maps links (including embed?pb= iframe URLs) to a normal
 * browser link for "View on Google Maps" buttons.
 */
export function getGoogleMapsViewUrl(input: string, addressFallback?: string): string {
  const url = normalizeGoogleMapsInput(input);
  if (!url) {
    return addressFallback
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressFallback)}`
      : '';
  }

  if (!/google\.com\/maps\/embed/i.test(url)) {
    return url
      .replace(/([?&])output=embed(?=&|$)/, '$1')
      .replace(/[?&]$/, '');
  }

  const v1Match = url.match(/embed\/v1\/place\?(?:[^#]*&)?q=([^&]+)/);
  if (v1Match) {
    const q = decodeURIComponent(v1Match[1]);
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }

  let lat: string | undefined;
  let lng: string | undefined;
  const latLng = url.match(/!3d(-?\d+\.?\d*)!2d(-?\d+\.?\d*)/);
  const lngLat = url.match(/!2d(-?\d+\.?\d*)!3d(-?\d+\.?\d*)/);
  if (latLng) {
    lat = latLng[1];
    lng = latLng[2];
  } else if (lngLat) {
    lng = lngLat[1];
    lat = lngLat[2];
  }

  const placeNameMatch = url.match(/!2s([^!]+)/);
  const placeName = placeNameMatch
    ? decodeURIComponent(placeNameMatch[1].replace(/\+/g, ' '))
    : undefined;

  if (placeName && lat && lng) {
    return `https://www.google.com/maps/place/${encodeURIComponent(placeName)}/@${lat},${lng},17z`;
  }
  if (lat && lng) {
    return `https://www.google.com/maps/@${lat},${lng},17z`;
  }
  if (placeName) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName)}`;
  }

  if (addressFallback?.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressFallback.trim())}`;
  }

  return 'https://www.google.com/maps';
}

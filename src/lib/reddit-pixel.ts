/**
 * Fires Reddit Lead after the global reddit pixel.js loader has run (see root layout).
 */
export function fireRedditLeadConversion(pixelId: string | undefined | null, email: string | undefined | null): void {
  if (typeof window === 'undefined') return;
  const id = typeof pixelId === 'string' ? pixelId.trim() : '';
  const em = typeof email === 'string' ? email.trim() : '';
  if (!id || !em) return;
  const win = window as unknown as { rdt?: (...args: unknown[]) => void };
  if (typeof win.rdt !== 'function') return;
  try {
    win.rdt('init', id, { email: em });
    win.rdt('track', 'Lead');
  } catch {
    /* ignore third-party failures */
  }
}

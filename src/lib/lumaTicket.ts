/** True when a link leaves this site for a Luma page. */
export function isLumaTicketUrl(href: string, base = 'https://deaisummit.org'): boolean {
  try {
    const host = new URL(href, base).hostname.toLowerCase().replace(/^www\./, '');
    return host === 'luma.com' || host.endsWith('.luma.com') || host === 'lu.ma' || host.endsWith('.lu.ma');
  } catch {
    return false;
  }
}

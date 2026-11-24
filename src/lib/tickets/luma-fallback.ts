import { isLumaTicketUrl } from '@/lib/lumaTicket';
import type { TicketsPageContent } from '@/lib/tickets-page';

/**
 * The Luma address to offer next to the live checkout ("Prefer Luma? Buy on Luma"), read from the CMS `tickets` page
 * the organiser already maintains: the closing banner's button first, then the first pass button. Only an http(s)
 * link to Luma counts; anything else (or none) means no Luma option is shown, so removing the link in the CMS is how
 * the organiser turns it off.
 */
export function lumaHrefOf({ content }: { content: TicketsPageContent | null }): string | null {
  if (!content) return null;
  const candidates = [content.closingHref, ...content.passes.map((pass) => pass.buttonHref)];
  return candidates.find((href) => /^https?:\/\//i.test(href) && isLumaTicketUrl(href)) ?? null;
}

import type { CMSBlock } from '@/lib/api-types';
import type { TicketsPageContent } from '@/lib/tickets-page';

export interface HomeTicketPass {
  id: string;
  eyebrow: string;
  title: string;
  includesLabel: string;
  includes: string[];
  href: string;
  featured: boolean;
  notice: string;
  dateLine: string;
  placeLine: string;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function splitMeta(meta: string): { date: string; place: string } {
  const parts = meta.split(/\s*[·•|]\s*/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return { date: parts[0], place: parts.slice(1).join(' · ') };
  return { date: meta, place: '' };
}

/** Homepage banners built from the tickets page, with the price left off. */
export function homeTicketPassesFromTickets(content: TicketsPageContent): HomeTicketPass[] {
  const when = splitMeta(content.meta);

  return content.passes.map((pass) => ({
    id: pass.id,
    eyebrow: pass.eyebrow || content.eyebrow,
    title: pass.title,
    includesLabel: pass.includesLabel,
    includes: pass.includes,
    href: '/tickets',
    featured: pass.featured,
    notice: content.notice,
    dateLine: when.date,
    placeLine: when.place,
  }));
}

/** Homepage blocks that duplicate the tickets page, so they can be removed from the CMS. */
export function isHomepageTicketBlock(block: CMSBlock): boolean {
  const title = text(block.title);
  const subtitle = text(block.subtitle);
  if (block.type && block.type !== 'simple' && block.type !== 'content') return false;
  return /\bpass\b/i.test(title) || /ticket/i.test(subtitle);
}

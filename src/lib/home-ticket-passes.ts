import type { CMSBlock } from '@/lib/api-types';

export interface HomeTicketPass {
  id: string;
  eyebrow: string;
  title: string;
  priceMajor: string;
  priceMinor: string;
  includesLabel: string;
  includes: string[];
  href: string;
  featured: boolean;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isPrice(value: string): boolean {
  return /[€$£]\s?\d/.test(value);
}

function splitPrice(value: string): { major: string; minor: string } {
  const match = value.trim().match(/^(.*?)(\.\d{2})$/);
  if (!match) return { major: value.trim(), minor: '' };
  return { major: match[1], minor: match[2] };
}

function isHeadingLine(value: string): boolean {
  return /:\s*$/.test(value) || (value === value.toUpperCase() && /[A-Z]/.test(value) && value.length < 48);
}

function linesOf(block: CMSBlock): string[] {
  const raw = (block as { collectionItems?: unknown }).collectionItems ?? block.items;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return '';
      const row = item as { title?: string; description?: string };
      return text(row.description) || text(row.title);
    })
    .filter(Boolean);
}

function hrefOf(block: CMSBlock): string {
  const buttons = block.buttons;
  if (!Array.isArray(buttons) || buttons.length === 0) return '/tickets';
  const btn = buttons[0] as { link?: string };
  return text(btn.link) || '/tickets';
}

/** Ticket cards on the homepage, including drafts the CMS has not published yet. */
export function extractHomeTicketPasses(blocks: CMSBlock[]): HomeTicketPass[] {
  const passes: HomeTicketPass[] = [];

  for (const block of blocks) {
    const description = text(block.description);
    const title = text(block.title);
    if (!title || !isPrice(description)) continue;
    if (block.type && block.type !== 'simple' && block.type !== 'content') continue;

    const lines = linesOf(block);
    let includesLabel = '';
    if (lines.length > 0 && isHeadingLine(lines[0])) {
      includesLabel = lines.shift() || '';
    }
    const price = splitPrice(description);
    passes.push({
      id: block.id,
      eyebrow: text(block.subtitle),
      title,
      priceMajor: price.major,
      priceMinor: price.minor,
      includesLabel,
      includes: lines,
      href: hrefOf(block),
      featured: /\bvip\b/i.test(title),
    });
  }

  return passes;
}

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
  notice: string;
  dateLine: string;
  placeLine: string;
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

function nodeLines(block: CMSBlock): string[] {
  const nodes = block.textNodes;
  if (!Array.isArray(nodes)) return [];
  return nodes.map((node) => text(node?.text)).filter(Boolean);
}

function splitEventLine(value: string): { date: string; place: string } {
  const match = value.match(/^(.*?\d{4})\s+(.+)$/);
  if (!match) return { date: value, place: '' };
  return { date: match[1], place: match[2] };
}

function isTicketBlock(block: CMSBlock): boolean {
  const title = text(block.title);
  const subtitle = text(block.subtitle);
  if (block.type && block.type !== 'simple' && block.type !== 'content') return false;
  return /\bpass\b/i.test(title) || /ticket/i.test(subtitle);
}

function priceOf(block: CMSBlock, lines: string[]): { major: string; minor: string } {
  const candidates = [text(block.description), ...nodeLines(block), ...lines];
  const priced = candidates.find(isPrice);
  return priced ? splitPrice(priced) : { major: '', minor: '' };
}

/** Ticket cards on the homepage, including drafts the CMS has not published yet. */
export function extractHomeTicketPasses(blocks: CMSBlock[]): HomeTicketPass[] {
  const passes: HomeTicketPass[] = [];

  for (const block of blocks) {
    const title = text(block.title);
    if (!title || !isTicketBlock(block)) continue;

    const lines = linesOf(block);
    let includesLabel = '';
    if (lines.length > 0 && isHeadingLine(lines[0])) {
      includesLabel = lines.shift() || '';
    }
    const notes = nodeLines(block).filter((line) => !isPrice(line));
    const notice = notes.find((line) => /price|increase/i.test(line)) || '';
    const event = notes.find((line) => line !== notice) || '';
    const when = splitEventLine(event);
    const price = priceOf(block, lines);
    passes.push({
      id: block.id,
      eyebrow: text(block.subtitle),
      title,
      priceMajor: price.major,
      priceMinor: price.minor,
      includesLabel,
      includes: lines.filter((line) => !isPrice(line)),
      href: hrefOf(block),
      featured: /\bvip\b/i.test(title),
      notice,
      dateLine: when.date,
      placeLine: when.place,
    });
  }

  return passes;
}

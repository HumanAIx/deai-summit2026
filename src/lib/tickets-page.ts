import type { CMSBlock } from '@/lib/api-types';

export interface TicketPass {
  id: string;
  eyebrow: string;
  title: string;
  priceMajor: string;
  priceMinor: string;
  includesLabel: string;
  includes: string[];
  buttonLabel: string;
  buttonHref: string;
  featured: boolean;
}

export interface TicketsPageContent {
  eyebrow: string;
  titleLead: string;
  accentWord: string;
  meta: string;
  passes: TicketPass[];
  notice: string;
  closingTitle: string;
  closingLabel: string;
  closingHref: string;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function buttonOf(block: CMSBlock): { label: string; href: string } | null {
  const buttons = block.buttons;
  if (!Array.isArray(buttons) || buttons.length === 0) return null;
  const btn = buttons[0] as { text?: string; label?: string; link?: string };
  const href = text(btn.link);
  if (!href) return null;
  return { label: text(btn.text) || text(btn.label) || 'Buy ticket', href };
}

function linesOf(block: CMSBlock): string[] {
  const items = (block as { collectionItems?: { title?: string; description?: string }[] }).collectionItems;
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => text(item.title) || text(item.description))
    .filter(Boolean);
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

const CLOSING_NOTICE = 'PRICE INCREASE FROM 15 OCTOBER';
const CLOSING_TITLE = 'Secure your place in Valletta';
const CLOSING_LABEL = 'Buy tickets now on Luma';

export function parseTicketsPage(blocks: CMSBlock[]): TicketsPageContent {
  const passes: TicketPass[] = [];
  let hero: CMSBlock | undefined;
  let closing: CMSBlock | undefined;

  for (const block of blocks) {
    const description = text(block.description);
    const lines = linesOf(block);
    const button = buttonOf(block);
    const passLike = isPrice(description) || (lines.length > 0 && !!button);
    if (passLike) {
      const featureLines = [...lines];
      let includesLabel = '';
      if (featureLines.length > 0 && isHeadingLine(featureLines[0])) {
        includesLabel = featureLines.shift() || '';
      }
      const price = splitPrice(description);
      passes.push({
        id: block.id,
        eyebrow: text(block.subtitle),
        title: text(block.title),
        priceMajor: price.major,
        priceMinor: price.minor,
        includesLabel,
        includes: featureLines,
        buttonLabel: button?.label || 'Buy ticket',
        buttonHref: button?.href || '#',
        featured: false,
      });
      continue;
    }
    if (!hero && text(block.title)) {
      hero = block;
      continue;
    }
    if (text(block.title) || button) closing = block;
  }

  const featuredIndex = passes.findIndex((pass) => /\bvip\b/i.test(pass.title));
  const accentAt = featuredIndex >= 0 ? featuredIndex : Math.max(passes.length - 1, 0);
  passes.forEach((pass, index) => {
    pass.featured = passes.length > 1 && index === accentAt;
  });

  const title = text(hero?.title) || 'Choose your pass';
  const words = title.split(/\s+/).filter(Boolean);
  const accentWord = words.length > 1 ? words[words.length - 1] : '';
  const titleLead = accentWord ? words.slice(0, -1).join(' ') : title;

  const closingButton = closing ? buttonOf(closing) : null;
  const fallbackHref = passes.find((pass) => pass.buttonHref && pass.buttonHref !== '#')?.buttonHref || '#';

  return {
    eyebrow: text(hero?.subtitle) || 'TICKETS · 2 DAYS',
    titleLead,
    accentWord,
    meta: text(hero?.description),
    passes,
    notice: text(closing?.subtitle) || CLOSING_NOTICE,
    closingTitle: text(closing?.title) || CLOSING_TITLE,
    closingLabel: closingButton?.label || CLOSING_LABEL,
    closingHref: closingButton?.href || fallbackHref,
  };
}

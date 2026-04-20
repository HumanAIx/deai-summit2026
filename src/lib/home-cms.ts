// Maps CMS blocks on /cms/pages/home → per-section data for the homepage.
//
// Identification strategy (first match wins, per section):
//   1. Block has a matching `slot` field:
//        'hero' | 'marquee' | 'stats' | 'about' | 'highlights'
//        | 'leading-voices' | 'speaker-cta' | 'networking' | 'sponsors'
//   2. Fallback: first block whose type/addon signature matches that section.
//
// Every return field is optional — callers fall back to siteConfig / entity APIs
// when the CMS doesn't provide data for a section.

import type { CMSBlock, CMSCompanyItem, CMSSpeakerItem } from './api-types';
import type {
  HeroConfig,
  StatsConfig,
  AboutConfig,
  HighlightsConfig,
  NetworkingItem,
} from '@/config/types';
import type {
  LeadingSpeakerData,
  MarqueeItemData,
  PartnerItemData,
} from '@/components/LandingPage';
import { normalizeSpeaker, normalizeSponsor } from './prefetch';

type RawBtn = {
  id?: string;
  label?: string;
  text?: string;
  link?: string;
  url?: string;
  href?: string;
  action?: string;
  formPrefill?: Record<string, string>;
};

function firstButton(block: CMSBlock): { label: string; link: string } | undefined {
  const buttons = block.buttons as RawBtn[] | undefined;
  if (!Array.isArray(buttons) || buttons.length === 0) return undefined;
  const b = buttons[0];
  const label = b.label || b.text || '';
  let link = b.link || b.url || b.href || '';
  if (!link && b.action === 'form') {
    const prefillValue = b.formPrefill ? Object.values(b.formPrefill).find(v => !!v) : undefined;
    link = prefillValue ? `/contact?inquiry=${encodeURIComponent(prefillValue)}` : '/contact';
  }
  return label ? { label, link } : undefined;
}

function allButtons(block: CMSBlock): Array<{ label: string; link: string }> {
  const buttons = block.buttons as RawBtn[] | undefined;
  if (!Array.isArray(buttons)) return [];
  return buttons
    .map((b) => {
      const label = b.label || b.text || '';
      let link = b.link || b.url || b.href || '';
      if (!link && b.action === 'form') {
        const prefillValue = b.formPrefill ? Object.values(b.formPrefill).find(v => !!v) : undefined;
        link = prefillValue ? `/contact?inquiry=${encodeURIComponent(prefillValue)}` : '/contact';
      }
      return { label, link };
    })
    .filter((b) => b.label);
}

function findBySlot(blocks: CMSBlock[], slot: string): CMSBlock | undefined {
  return blocks.find((b) => (b as Record<string, unknown>).slot === slot && b.type !== undefined);
}

// Recognise the id convention the dashboard editor gives new blocks:
//   content-hero-*, content-stats-*, content-about-*, content-highlights-*,
//   content-speakers-*, content-networking-*, content-partners-*, etc.
// Accepts a few variants so admins who rename or re-seed don't break matching.
function findByIdPrefix(blocks: CMSBlock[], prefixes: string[]): CMSBlock | undefined {
  return blocks.find((b) => {
    const id = typeof b.id === 'string' ? b.id.toLowerCase() : '';
    return prefixes.some((p) => id.startsWith(p));
  });
}

function findByPredicate(blocks: CMSBlock[], pred: (b: CMSBlock) => boolean): CMSBlock | undefined {
  return blocks.find((b) => {
    if ((b as Record<string, unknown>).slot !== undefined) return false; // leave slotted blocks alone
    return pred(b);
  });
}

function extractHero(blocks: CMSBlock[]): Partial<HeroConfig> | undefined {
  const block =
    findBySlot(blocks, 'hero') ??
    findByIdPrefix(blocks, ['content-hero-', 'hero-']);
  if (!block) return undefined;

  const buttons = allButtons(block);
  const ctaPrimary = buttons[0];
  const ctaSecondary = buttons[1];
  const ctaTertiary = buttons[2];

  const image = typeof block.image === 'string' ? block.image : Array.isArray(block.image) ? block.image[0] : undefined;

  return {
    backgroundImage: image as string | undefined,
    badge: (block.badge as string) || block.subtitle || undefined,
    headline: block.title || (block.content as string) || undefined,
    subheadline: (block.description as string) || undefined,
    location: (block.location as string) || undefined,
    date: (block.date as string) || undefined,
    ctaPrimary,
    ctaSecondary,
    ctaTertiary,
  } as Partial<HeroConfig>;
}

function extractMarquee(blocks: CMSBlock[]): MarqueeItemData[] | undefined {
  // Marquee commonly lives inside the hero block as a `companies-list` addon with
  // `all-sponsors`. Dedicated marquee blocks also exist; try both.
  const block =
    findBySlot(blocks, 'marquee') ??
    findByIdPrefix(blocks, ['content-marquee-', 'marquee-']) ??
    blocks.find((b) => {
      const listType = (b as Record<string, unknown>).listType ?? (b as Record<string, unknown>).companiesListType;
      return (
        (b.addon === 'companies-list' || b.type === 'companies-list') &&
        listType === 'all-sponsors'
      );
    });
  if (!block) return undefined;

  const items = (block.items as unknown as CMSCompanyItem[] | undefined) ?? [];
  // Strict `=== true` so drafts whose published flags are undefined/null are
  // filtered out — the CMS API sometimes omits the field for unpublished rows.
  const mapped = items
    .filter((c) => c.company_published === true && c.sponsor_published === true && c.company_logo)
    .map((c) => ({
      label: c.company_name,
      slug: c.company_slug || '',
      logo: c.company_logo || '',
    }));
  return mapped.length > 0 ? mapped : undefined;
}

function extractStats(blocks: CMSBlock[]): Partial<StatsConfig> | undefined {
  const block =
    findBySlot(blocks, 'stats') ??
    findByIdPrefix(blocks, ['content-stats-', 'stats-']);
  if (!block) return undefined;

  const items = (block as Record<string, unknown>).collectionItems as Array<{ title: string; description: string }> | undefined;
  if (!items || items.length === 0) return undefined;

  const quoteText = (block.content as string) || (block.description as string) || '';
  const quoteAuthor = (block.quoteAuthor as string) || '';
  const quoteRole = (block.quoteRole as string) || '';
  const quoteImage = (block.quoteImage as string) || '';
  const quoteUrl = (block.quoteUrl as string) || '';

  const quote: Record<string, string> = {};
  if (quoteText) quote.text = quoteText;
  if (quoteAuthor) quote.author = quoteAuthor;
  if (quoteRole) quote.role = quoteRole;
  if (quoteImage) quote.image = quoteImage;
  if (quoteUrl) quote.url = quoteUrl;

  return {
    quote: quote as unknown as Partial<StatsConfig>['quote'],
    items: items.map((i) => ({ number: i.title, label: i.description })),
  } as Partial<StatsConfig>;
}

function extractAbout(blocks: CMSBlock[]): Partial<AboutConfig> | undefined {
  const block =
    findBySlot(blocks, 'about') ??
    findByIdPrefix(blocks, ['content-about-', 'about-']);
  if (!block) return undefined;

  const bulletItems = (block as Record<string, unknown>).collectionItems as Array<{ description?: string; title?: string }> | undefined;
  const bullets = (bulletItems ?? []).map((b) => b.description || b.title || '').filter(Boolean);
  const btns = allButtons(block);

  return {
    sectionTitle: (block.subtitle as string) || '',
    coverImage: (typeof block.image === 'string' ? block.image : Array.isArray(block.image) ? block.image[0] : '') as string,
    badge: (block.badge as string) || '',
    overlayTitle: (block.overlayTitle as string) || (block.title as string) || '',
    galleryLabel: (block.galleryLabel as string) || '',
    mainStatement: (block.mainStatement as string) || (block.title as string) || '',
    description: (block.description as string) || (block.content as string) || '',
    bulletPoints: bullets,
    ctaPrimary: btns[0]?.label || '',
    ctaSecondary: btns[1]?.label || '',
  } as Partial<AboutConfig>;
}

function extractHighlights(blocks: CMSBlock[]): Partial<HighlightsConfig> | undefined {
  const block =
    findBySlot(blocks, 'highlights') ??
    findByIdPrefix(blocks, ['content-highlights-', 'highlights-']);
  if (!block) return undefined;

  const image = typeof block.image === 'string' ? block.image : Array.isArray(block.image) ? block.image[0] : undefined;
  const rawHotspots = (block as Record<string, unknown>).hotspots;
  if (!Array.isArray(rawHotspots) || rawHotspots.length === 0) return undefined;

  return {
    backgroundImage: (image as string) || '',
    hotspots: rawHotspots as HighlightsConfig['hotspots'],
  };
}

function extractLeadingVoices(blocks: CMSBlock[]): LeadingSpeakerData[] | undefined {
  const block =
    findBySlot(blocks, 'leading-voices') ??
    findByIdPrefix(blocks, ['content-speakers-', 'speakers-', 'content-leading-voices-']) ??
    findByPredicate(blocks, (b) => b.addon === 'members-list' || b.type === 'members-list');
  if (!block) return undefined;

  const items = (block.items as unknown as CMSSpeakerItem[] | undefined) ?? [];
  if (items.length === 0) return undefined;

  return items
    .filter((m) => m.is_published !== false)
    .map((m) => {
      const fullMember = m as unknown as Parameters<typeof normalizeSpeaker>[0];
      const n = normalizeSpeaker(fullMember);
      return {
        name: n.name,
        slug: n.slug,
        role: n.role,
        company: n.company,
        image: n.image,
        icon: 'ri-user-line',
      };
    });
}

function extractSpeakerCta(blocks: CMSBlock[]): { title?: string; subtitle?: string; button?: { label: string; link: string } } | undefined {
  // The "Apply to Speak" CTA typically lives on the Leading Voices block's
  // buttons. Also accept a standalone block if the admin separated it.
  const dedicated =
    findBySlot(blocks, 'speaker-cta') ??
    findByIdPrefix(blocks, ['content-speaker-cta-', 'content-cta-', 'cta-']);
  const block =
    dedicated ??
    findBySlot(blocks, 'leading-voices') ??
    findByIdPrefix(blocks, ['content-speakers-', 'speakers-', 'content-leading-voices-']);
  if (!block) return undefined;

  return {
    title: block.title || (block.content as string) || undefined,
    subtitle: (block.subtitle as string) || (block.description as string) || undefined,
    button: firstButton(block),
  };
}

function extractNetworking(blocks: CMSBlock[]): NetworkingItem[] | undefined {
  const block =
    findBySlot(blocks, 'networking') ??
    findByIdPrefix(blocks, ['content-networking-', 'networking-']);
  if (!block) return undefined;

  const items = (block as Record<string, unknown>).collectionItems as Array<{ title?: string; description?: string; icon?: string; image?: string }> | undefined;
  if (!items || items.length === 0) return undefined;

  return items.map((i, idx) => ({
    id: idx + 1,
    title: i.title || '',
    description: i.description || '',
    icon: i.icon || '',
    image: i.image || '',
  }));
}

function extractSponsorsAndPartners(blocks: CMSBlock[]): PartnerItemData[] | undefined {
  // The "Sponsors & Partners" strip at the bottom of the home page combines both.
  const block =
    findBySlot(blocks, 'sponsors') ??
    findByIdPrefix(blocks, ['content-partners-', 'content-sponsors-', 'partners-', 'sponsors-']) ??
    findByPredicate(blocks, (b) => {
      const listType = (b as Record<string, unknown>).listType ?? (b as Record<string, unknown>).companiesListType;
      return (
        (b.addon === 'companies-list' || b.type === 'companies-list') &&
        (listType === 'all-partners' || listType === 'all-companies')
      );
    });
  if (!block) return undefined;

  const items = (block.items as unknown as CMSCompanyItem[] | undefined) ?? [];
  if (items.length === 0) return undefined;

  return items
    .filter((c) => c.company_published !== false && c.company_logo)
    .filter((c) => (c.company_is_partner && c.partner_published !== false) || (c.company_is_sponsor && c.sponsor_published !== false))
    .map((c) => {
      const n = normalizeSponsor(c as unknown as Parameters<typeof normalizeSponsor>[0]);
      return {
        name: n.name,
        slug: n.slug,
        logo: n.logo,
        isSponsor: !!n.isSponsor,
        logoHasDarkBg: n.logoHasDarkBg,
      };
    });
}

export interface HomeSections {
  hero?: Partial<HeroConfig>;
  marqueeItems?: MarqueeItemData[];
  stats?: Partial<StatsConfig>;
  about?: Partial<AboutConfig>;
  highlights?: Partial<HighlightsConfig>;
  leadingVoices?: LeadingSpeakerData[];
  speakerCta?: { title?: string; subtitle?: string; button?: { label: string; link: string } };
  networking?: NetworkingItem[];
  partnerItems?: PartnerItemData[];
}

export function extractHomeSections(blocks: CMSBlock[] | undefined | null): HomeSections {
  if (!Array.isArray(blocks) || blocks.length === 0) return {};
  const published = blocks.filter((b) => (b as Record<string, unknown>).published !== false);
  return {
    hero: extractHero(published),
    marqueeItems: extractMarquee(published),
    stats: extractStats(published),
    about: extractAbout(published),
    highlights: extractHighlights(published),
    leadingVoices: extractLeadingVoices(published),
    speakerCta: extractSpeakerCta(published),
    networking: extractNetworking(published),
    partnerItems: extractSponsorsAndPartners(published),
  };
}

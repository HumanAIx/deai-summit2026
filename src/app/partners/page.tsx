import type { Metadata } from 'next';
import { prefetchCMSPage, prefetchSponsors, prefetchPartners, prefetchNavigation, mapNavigationData, prefetchSocials } from '@/lib/prefetch';
import { SEO_DEFAULTS } from '@/lib/seo-defaults';
import { PartnersListClient } from '@/components/PartnersListClient';
import type { NormalizedSponsor, CMSBlock, CMSCompanyItem } from '@/lib/api-types';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deaisummit.org';

function normalizeCMSCompany(item: CMSCompanyItem, isSponsor: boolean, isPartner: boolean): NormalizedSponsor {
  return {
    id: item.id,
    name: item.company_name,
    slug: item.company_slug || '',
    logo: item.company_logo || '',
    bio: item.company_bio,
    socials: item.company_socials,
    isSponsor,
    isPartner,
    logoHasDarkBg: item.company_logo_has_dark_bg,
  };
}

function extractCompaniesFromBlocks(blocks: CMSBlock[]): {
  sponsors: NormalizedSponsor[];
  partners: NormalizedSponsor[];
} {
  let sponsors: NormalizedSponsor[] = [];
  let partners: NormalizedSponsor[] = [];

  for (const block of blocks) {
    const items = block.items as unknown as CMSCompanyItem[] | undefined;
    if (!items || items.length === 0) continue;

    const listType = block.listType || block.companiesListType;

    const publishedSponsors = (list: CMSCompanyItem[]) =>
      list.filter(i => i.company_published !== false && i.sponsor_published !== false);
    const publishedPartners = (list: CMSCompanyItem[]) =>
      list.filter(i => i.company_published !== false && i.partner_published !== false);

    // Direct companies-list block
    if (block.type === 'companies-list') {
      if (listType === 'all-sponsors') {
        sponsors = publishedSponsors(items).map(item => normalizeCMSCompany(item, true, false));
      } else if (listType === 'all-partners') {
        partners = publishedPartners(items).map(item => normalizeCMSCompany(item, false, true));
      }
    }
    // Content block with companies-list addon
    if (block.addon === 'companies-list') {
      const addonListType = (block as Record<string, unknown>).companiesListType || block.listType;
      if (addonListType === 'all-sponsors') {
        sponsors = publishedSponsors(items).map(item => normalizeCMSCompany(item, true, false));
      } else if (addonListType === 'all-partners') {
        partners = publishedPartners(items).map(item => normalizeCMSCompany(item, false, true));
      }
    }
  }

  return { sponsors, partners };
}

function extractHeroFromBlocks(blocks: CMSBlock[]): {
  badge?: string;
  title?: string;
  subtitle?: string;
} {
  for (const block of blocks) {
    if (block.type === 'hero' || block.type === 'heading') {
      return {
        badge: (block.badge as string) || (block.subtitle as string) || undefined,
        title: block.title || block.content || undefined,
        subtitle: (block.description as string) || undefined,
      };
    }
    // Content blocks (CMS uses subtitle for badge, description for subtitle)
    if (block.type === 'content' && block.title) {
      return {
        badge: block.subtitle || undefined,
        title: block.title,
        subtitle: (block.description as string) || block.content || undefined,
      };
    }
  }
  return {};
}

type RawCtaButton = {
  label?: string;
  text?: string;
  link?: string;
  url?: string;
  href?: string;
  action?: string;
  formPrefill?: Record<string, string>;
};

function normalizeCtaButtons(raw: unknown): { label: string; link?: string }[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const normalized = (raw as RawCtaButton[])
    .map(b => {
      const label = b.label || b.text || '';
      let link = b.link || b.url || b.href || undefined;
      if (!link && b.action === 'form') {
        const prefillValue = b.formPrefill ? Object.values(b.formPrefill).find(v => !!v) : undefined;
        link = prefillValue ? `/contact?inquiry=${encodeURIComponent(prefillValue)}` : '/contact';
      }
      return { label, link };
    })
    .filter(b => b.label);
  return normalized.length > 0 ? normalized : undefined;
}

function extractCtaFromBlocks(blocks: CMSBlock[]): {
  title?: string;
  subtitle?: string;
  buttons?: { label: string; link?: string }[];
} {
  // Prefer explicit cta block types
  for (const block of blocks) {
    if (block.type === 'cta' || block.type === 'call-to-action') {
      return {
        title: block.title || (block.content as string) || undefined,
        subtitle: (block.subtitle as string) || (block.description as string) || undefined,
        buttons: normalizeCtaButtons(block.buttons),
      };
    }
  }
  // Fallback: content blocks with buttons (but not the hero / list blocks)
  for (const block of blocks) {
    if (block.addon === 'companies-list' || block.addon === 'members-list') continue;
    if (block.type === 'companies-list' || block.type === 'members-list' || block.type === 'hero') continue;
    const buttons = normalizeCtaButtons(block.buttons);
    if (buttons) {
      return {
        title: block.title || (block.content as string) || undefined,
        subtitle: (block.subtitle as string) || (block.description as string) || undefined,
        buttons,
      };
    }
  }
  return {};
}

export async function generateMetadata(): Promise<Metadata> {
  const cmsPage = await prefetchCMSPage('partners');
  const seo = cmsPage?.seo;

  const title = seo?.meta_title || `Sponsors & Partners - ${SEO_DEFAULTS.siteName}`;
  const description = seo?.meta_description || 'Meet the sponsors and partners powering DeAI Summit 2026. Join leading organizations shaping the future of decentralized AI.';

  return {
    title,
    description,
    openGraph: {
      title: seo?.og_title || title,
      description: seo?.og_description || description,
      type: 'website',
      siteName: SEO_DEFAULTS.siteName,
      ...(seo?.og_image ? { images: [{ url: seo.og_image }] } : {}),
    },
    twitter: {
      card: SEO_DEFAULTS.twitterCard,
      title: seo?.og_title || title,
      description: seo?.og_description || description,
    },
    alternates: {
      canonical: seo?.canonical_url || `${BASE_URL}/partners`,
    },
    ...(seo?.robots_tag ? { robots: seo.robots_tag } : {}),
  };
}

export default async function PartnersPage() {
  let sponsors: NormalizedSponsor[] = [];
  let partners: NormalizedSponsor[] = [];
  let heroData: { badge?: string; title?: string; subtitle?: string } = {};
  let ctaData: { title?: string; subtitle?: string; buttons?: { label: string; link?: string }[] } = {};

  const [apiNav, socials] = await Promise.all([prefetchNavigation(), prefetchSocials()]);
  const navigationData = apiNav ? mapNavigationData(apiNav) : undefined;

  try {
    const cmsPage = await prefetchCMSPage('partners');

    if (cmsPage?.content?.blocks) {
      const blocks: CMSBlock[] = Array.isArray(cmsPage.content.blocks)
        ? cmsPage.content.blocks
        : Object.values(cmsPage.content.blocks) as CMSBlock[];

      const extracted = extractCompaniesFromBlocks(blocks);
      sponsors = extracted.sponsors;
      partners = extracted.partners;
      heroData = extractHeroFromBlocks(blocks);
      ctaData = extractCtaFromBlocks(blocks);
    }
  } catch (error) {
    console.error('Failed to fetch CMS partners page:', error);
  }

  // Fallback: if CMS returned no companies, try the direct APIs
  if (sponsors.length === 0 && partners.length === 0) {
    try {
      [sponsors, partners] = await Promise.all([
        prefetchSponsors(),
        prefetchPartners(),
      ]);

      // Separate partners that aren't already sponsors
      const sponsorIds = new Set(sponsors.map(s => s.id));
      partners = partners.filter(p => !sponsorIds.has(p.id) && p.isPartner);
    } catch (error) {
      console.error('Failed to fetch partners from direct API:', error);
    }
  }

  return (
    <PartnersListClient
      sponsors={sponsors}
      partners={partners}
      heroTitle={heroData.title}
      heroSubtitle={heroData.subtitle}
      heroBadge={heroData.badge}
      ctaTitle={ctaData.title}
      ctaSubtitle={ctaData.subtitle}
      ctaButtons={ctaData.buttons}
      navigationData={navigationData}
      navigationAPIData={apiNav || undefined}
      socials={socials}
    />
  );
}

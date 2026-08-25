import type { Metadata } from 'next';
import {
  prefetchCMSPage,
  prefetchHotels,
  prefetchNavigation,
  mapNavigationData,
  prefetchSocials,
  normalizeHotel,
} from '@/lib/prefetch';
import { generatePageMetadata } from '@/lib/seo-defaults';
import { HotelsListClient } from '@/components/HotelsListClient';
import type { NormalizedSponsor, CMSBlock, CMSCompanyItem, Company } from '@/lib/api-types';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deaisummit.org';
const CMS_SLUG = 'partner-hotels';

function normalizeCMSHotel(item: CMSCompanyItem): NormalizedSponsor {
  return normalizeHotel({
    id: item.id,
    company_name: item.company_name,
    company_slug: item.company_slug || '',
    company_bio: item.company_bio,
    company_logo: item.company_logo,
    company_thumbnail: item.company_thumbnail,
    venue_photo: item.venue_photo,
    company_website: item.company_website,
    company_socials: item.company_socials,
    company_logo_has_dark_bg: item.company_logo_has_dark_bg,
    logo_settings: item.logo_settings,
    logo_background_white: item.logo_background_white,
    company_is_sponsor: !!item.company_is_sponsor,
    company_is_partner: !!item.company_is_partner,
    company_is_venue: !!item.company_is_venue,
    company_is_supporter: false,
    company_is_affiliated_hotel: true,
    company_published: item.company_published !== false,
    sponsor_published: item.sponsor_published !== false,
    partner_published: item.partner_published !== false,
    venue_published: item.venue_published !== false,
    supporter_published: true,
    affiliated_hotel_published: item.affiliated_hotel_published !== false,
    company_affiliated_hotel_bookings_url: item.company_affiliated_hotel_bookings_url,
    company_embedded_youtube: item.company_embedded_youtube,
    company_youtube_videos: item.company_youtube_videos,
    company_email: item.company_email,
    company_phone: item.company_phone,
    company_address: item.company_address,
    company_city: item.company_city,
    company_country: item.company_country,
    company_google_maps: item.company_google_maps,
    brochure_url: item.brochure_url,
    tenant_id: '',
  } as Company);
}

function extractHotelsFromBlocks(blocks: CMSBlock[]): NormalizedSponsor[] {
  let hotels: NormalizedSponsor[] = [];

  for (const block of blocks) {
    const items = block.items as unknown as CMSCompanyItem[] | undefined;
    if (!items || items.length === 0) continue;

    const listType = (block.listType || block.companiesListType) as string | undefined;

    const publishedHotels = (list: CMSCompanyItem[]) =>
      list.filter(
        (i) =>
          i.company_published !== false &&
          i.company_is_affiliated_hotel === true &&
          i.affiliated_hotel_published !== false,
      );

    const assignFromListType = (resolvedListType: string | undefined, list: CMSCompanyItem[]) => {
      if (resolvedListType === 'all-affiliated-hotels') {
        hotels = publishedHotels(list).map(normalizeCMSHotel);
      }
    };

    if (block.type === 'companies-list') {
      assignFromListType(listType, items);
    }
    if (block.addon === 'companies-list') {
      const addonListType = (block as Record<string, unknown>).companiesListType || block.listType;
      assignFromListType(typeof addonListType === 'string' ? addonListType : undefined, items);
    }
  }

  return hotels;
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
    .map((b) => {
      const label = b.label || b.text || '';
      let link = b.link || b.url || b.href || undefined;
      if (!link && b.action === 'form') {
        const prefillValue = b.formPrefill ? Object.values(b.formPrefill).find((v) => !!v) : undefined;
        link = prefillValue ? `/contact?inquiry=${encodeURIComponent(prefillValue)}` : '/contact';
      }
      return { label, link };
    })
    .filter((b) => b.label);
  return normalized.length > 0 ? normalized : undefined;
}

function extractCtaFromBlocks(blocks: CMSBlock[]): {
  title?: string;
  subtitle?: string;
  buttons?: { label: string; link?: string }[];
} {
  for (const block of blocks) {
    if (block.type === 'cta' || block.type === 'call-to-action') {
      return {
        title: block.title || (block.content as string) || undefined,
        subtitle: (block.subtitle as string) || (block.description as string) || undefined,
        buttons: normalizeCtaButtons(block.buttons),
      };
    }
  }
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
  const cmsPage = await prefetchCMSPage(CMS_SLUG);
  return generatePageMetadata(cmsPage?.seo || null, 'partner-hotels', BASE_URL);
}

export default async function PartnerHotelsPage() {
  let hotels: NormalizedSponsor[] = [];
  let heroData: { badge?: string; title?: string; subtitle?: string } = {};
  let ctaData: { title?: string; subtitle?: string; buttons?: { label: string; link?: string }[] } = {};

  const [apiNav, socials] = await Promise.all([prefetchNavigation(), prefetchSocials()]);
  const navigationData = apiNav ? mapNavigationData(apiNav) : undefined;

  try {
    const cmsPage = await prefetchCMSPage(CMS_SLUG);

    if (cmsPage?.content?.blocks) {
      const blocks: CMSBlock[] = Array.isArray(cmsPage.content.blocks)
        ? cmsPage.content.blocks
        : (Object.values(cmsPage.content.blocks) as CMSBlock[]);

      hotels = extractHotelsFromBlocks(blocks);
      heroData = extractHeroFromBlocks(blocks);
      ctaData = extractCtaFromBlocks(blocks);
    }
  } catch (error) {
    console.error('Failed to fetch CMS partner-hotels page:', error);
  }

  if (hotels.length === 0) {
    try {
      hotels = await prefetchHotels();
    } catch (error) {
      console.error('Failed to fetch affiliated hotels from API:', error);
    }
  }

  return (
    <HotelsListClient
      hotels={hotels}
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

import type { Metadata } from 'next';
import { prefetchCMSPage, prefetchSpeakers, prefetchNavigation, mapNavigationData, prefetchSocials } from '@/lib/prefetch';
import { siteConfig } from '@/config/site';
import { SEO_DEFAULTS } from '@/lib/seo-defaults';
import { SpeakersListClient } from '@/components/SpeakersListClient';
import type { NormalizedSpeaker, CMSBlock, CMSSpeakerItem } from '@/lib/api-types';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deaisummit.org';

function normalizeCMSSpeaker(item: CMSSpeakerItem, index: number): NormalizedSpeaker {
  const name = `${item.person_firstname || ''} ${item.person_surname || ''}`.trim();
  return {
    id: item.id,
    name,
    slug: item.person_slug || '',
    role: '',
    company: '',
    image: item.person_photo_nobg || item.person_photo || '',
    bio: item.person_bio,
    socials: item.person_socials,
    isFeatured: item.is_speaker_featured || false,
  };
}

function extractSpeakersFromBlocks(blocks: CMSBlock[]): NormalizedSpeaker[] {
  for (const block of blocks) {
    // Direct members-list block
    if (block.type === 'members-list' && block.items && block.items.length > 0) {
      return block.items.map((item, i) => normalizeCMSSpeaker(item, i));
    }
    // Content block with members-list addon
    if (block.addon === 'members-list' && block.items && block.items.length > 0) {
      return block.items.map((item, i) => normalizeCMSSpeaker(item, i));
    }
  }
  return [];
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
    // Content blocks with a title (CMS uses subtitle for badge, description for subtitle)
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

interface CollectionItem {
  title: string;
  description: string;
  counterType?: string;
  rawCount?: number;
}

function extractStatsFromBlocks(blocks: CMSBlock[]): { label: string; value: string }[] {
  for (const block of blocks) {
    const items = (block as Record<string, unknown>).collectionItems as CollectionItem[] | undefined;
    if (items && Array.isArray(items) && items.length > 0) {
      return items.map(item => ({
        label: item.description,
        value: item.rawCount != null ? String(item.rawCount) : item.title,
      }));
    }
  }
  return [];
}

export async function generateMetadata(): Promise<Metadata> {
  const cmsPage = await prefetchCMSPage('speakers');
  const seo = cmsPage?.seo;

  const title = seo?.meta_title || `Speakers - ${SEO_DEFAULTS.siteName}`;
  const description = seo?.meta_description || 'Meet the leading voices at DeAI Summit 2026. Speakers from frontier AI, decentralized systems, policy, and academia.';

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
      canonical: seo?.canonical_url || `${BASE_URL}/speakers`,
    },
    ...(seo?.robots_tag ? { robots: seo.robots_tag } : {}),
  };
}

export default async function SpeakersPage() {
  let speakers: NormalizedSpeaker[] = [];
  let heroData: { badge?: string; title?: string; subtitle?: string } = {};
  let stats: { label: string; value: string }[] = [];

  const [apiNav, socials] = await Promise.all([prefetchNavigation(), prefetchSocials()]);
  const navigationData = apiNav ? mapNavigationData(apiNav) : undefined;

  try {
    const cmsPage = await prefetchCMSPage('speakers');

    if (cmsPage?.content?.blocks) {
      const blocks: CMSBlock[] = Array.isArray(cmsPage.content.blocks)
        ? cmsPage.content.blocks
        : Object.values(cmsPage.content.blocks) as CMSBlock[];

      speakers = extractSpeakersFromBlocks(blocks);
      heroData = extractHeroFromBlocks(blocks);
      stats = extractStatsFromBlocks(blocks);
    }
  } catch (error) {
    console.error('Failed to fetch CMS speakers page:', error);
  }

  // Fallback: if CMS returned no speakers, try the members API directly
  if (speakers.length === 0) {
    try {
      speakers = await prefetchSpeakers();
    } catch (error) {
      console.error('Failed to fetch speakers from members API:', error);
    }
  }

  // Final fallback to hardcoded data
  if (speakers.length === 0) {
    speakers = siteConfig.speakers.leading.map((s, i) => ({
      id: String(i),
      name: s.name,
      slug: '',
      role: s.role,
      company: s.company,
      image: s.image,
      isFeatured: false,
    }));
  }

  return (
    <SpeakersListClient
      speakers={speakers}
      heroTitle={heroData.title}
      heroSubtitle={heroData.subtitle}
      heroBadge={heroData.badge}
      stats={stats}
      navigationData={navigationData}
      navigationAPIData={apiNav || undefined}
      socials={socials}
    />
  );
}

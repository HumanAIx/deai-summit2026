import type { Metadata } from 'next';
import { prefetchCMSPage, prefetchNavigation, mapNavigationData, prefetchSocials } from '@/lib/prefetch';
import { SEO_DEFAULTS } from '@/lib/seo-defaults';
import { AgendaClient } from '@/components/AgendaClient';
import type { CMSBlock } from '@/lib/api-types';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deaisummit.org';

interface CollectionItem {
  title: string;
  description: string;
  rawCount?: number;
}

interface AgendaSection {
  title: string;
  subtitle?: string;
  description: string;
  collectionItems?: CollectionItem[];
}

function extractSectionsFromBlocks(blocks: CMSBlock[]): AgendaSection[] {
  const sections: AgendaSection[] = [];
  for (const block of blocks) {
    if (!block.title) continue;
    sections.push({
      title: block.title,
      subtitle: block.subtitle || undefined,
      description: (block.description as string) || block.content || '',
      collectionItems: (block as any).collectionItems || undefined,
    });
  }
  return sections;
}

export async function generateMetadata(): Promise<Metadata> {
  const cmsPage = await prefetchCMSPage('agenda');
  const seo = cmsPage?.seo;

  const title = seo?.meta_title || `Agenda - ${SEO_DEFAULTS.siteName}`;
  const description = seo?.meta_description || 'Explore the agenda for DeAI Summit 2026. Keynotes, panels, and discussions on decentralized AI.';

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
      canonical: seo?.canonical_url || `${BASE_URL}/agenda`,
    },
    ...(seo?.robots_tag ? { robots: seo.robots_tag } : {}),
  };
}

export default async function AgendaPage() {
  let sections: AgendaSection[] = [];
  let heroTitle = 'Agenda';
  let heroSubtitle = '';
  let heroDescription = '';
  let stats: { label: string; value: string }[] = [];

  const [apiNav, socials] = await Promise.all([prefetchNavigation(), prefetchSocials()]);
  const navigationData = apiNav ? mapNavigationData(apiNav) : undefined;

  try {
    const cmsPage = await prefetchCMSPage('agenda');

    if (cmsPage?.content?.blocks) {
      const blocks: CMSBlock[] = Array.isArray(cmsPage.content.blocks)
        ? cmsPage.content.blocks
        : Object.values(cmsPage.content.blocks) as CMSBlock[];

      sections = extractSectionsFromBlocks(blocks);

      // Use first section for hero
      if (sections.length > 0) {
        const first = sections[0];
        heroTitle = first.title || 'Agenda';
        heroSubtitle = first.subtitle || '';
        heroDescription = first.description || '';

        if (first.collectionItems && first.collectionItems.length > 0) {
          stats = first.collectionItems.map(ci => ({
            label: ci.description,
            value: ci.rawCount != null ? String(ci.rawCount) : ci.title,
          }));
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch CMS agenda page:', error);
  }

  return (
    <AgendaClient
      heroTitle={heroTitle}
      heroSubtitle={heroSubtitle}
      heroDescription={heroDescription}
      stats={stats}
      sections={sections.slice(1)}
      navigationData={navigationData}
      navigationAPIData={apiNav || undefined}
      socials={socials}
    />
  );
}

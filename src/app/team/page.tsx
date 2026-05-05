import type { Metadata } from 'next';
import { prefetchCMSPage, prefetchNavigation, mapNavigationData, prefetchSocials, prefetchTeam } from '@/lib/prefetch';
import { SEO_DEFAULTS } from '@/lib/seo-defaults';
import { SpeakersListClient } from '@/components/SpeakersListClient';
import type { NormalizedSpeaker, CMSBlock, CMSSpeakerItem } from '@/lib/api-types';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deaisummit.org';

// Render on every request so Photo Studio saves (photo_settings) propagate
// immediately without waiting for ISR / CDN HTML cache.
export const dynamic = 'force-dynamic';

function normalizeCMSMember(item: CMSSpeakerItem): NormalizedSpeaker {
  const name = `${item.person_firstname || ''} ${item.person_surname || ''}`.trim();
  const image =
    item.photo_settings?.activeEnhancedUrl ||
    item.person_photo_nobg ||
    item.person_photo ||
    '';
  return {
    id: item.id,
    name,
    title: item.person_title || undefined,
    slug: item.person_slug || '',
    role: '',
    company: '',
    image,
    person_photo: item.person_photo ?? null,
    person_photo_nobg: item.person_photo_nobg ?? null,
    photo_settings: item.photo_settings ?? null,
    bio: item.person_bio,
    socials: item.person_socials,
    isFeatured: item.is_speaker_featured || false,
  };
}

function extractMembersFromBlocks(blocks: CMSBlock[]): NormalizedSpeaker[] {
  for (const block of blocks) {
    if (block.type === 'members-list' && block.items && block.items.length > 0) {
      return block.items.map(normalizeCMSMember);
    }
    if (block.addon === 'members-list' && block.items && block.items.length > 0) {
      return block.items.map(normalizeCMSMember);
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

type RawButton = {
  label?: string;
  text?: string;
  link?: string;
  url?: string;
  href?: string;
  action?: string;
  formPrefill?: Record<string, string>;
};

function normalizeButtons(raw: unknown): { label: string; link?: string }[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const normalized = (raw as RawButton[])
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
  for (const block of blocks) {
    if (block.type === 'cta' || block.type === 'call-to-action') {
      return {
        title: block.title || (block.content as string) || undefined,
        subtitle: (block.subtitle as string) || (block.description as string) || undefined,
        buttons: normalizeButtons(block.buttons),
      };
    }
  }
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (i === 0) continue;
    const buttons = normalizeButtons(block.buttons);
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
  const cmsPage = await prefetchCMSPage('team');
  const seo = cmsPage?.seo;

  const title = seo?.meta_title || `Team - ${SEO_DEFAULTS.siteName}`;
  const description = seo?.meta_description || 'Meet the team behind DeAI Summit 2026.';

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
      canonical: seo?.canonical_url || `${BASE_URL}/team`,
    },
    ...(seo?.robots_tag ? { robots: seo.robots_tag } : {}),
  };
}

export default async function TeamPage() {
  let members: NormalizedSpeaker[] = [];
  let heroData: { badge?: string; title?: string; subtitle?: string } = {};
  let stats: { label: string; value: string }[] = [];
  let ctaData: { title?: string; subtitle?: string; buttons?: { label: string; link?: string }[] } = {};

  const [apiNav, socials] = await Promise.all([prefetchNavigation(), prefetchSocials()]);
  const navigationData = apiNav ? mapNavigationData(apiNav) : undefined;

  // Pull CMS + API in parallel; enrich CMS-curated members with full
  // photo_settings (and any other API-only fields) by matching on slug.
  const [cmsResult, apiTeam] = await Promise.allSettled([
    prefetchCMSPage('team'),
    prefetchTeam(),
  ]);

  const apiBySlug = new Map<string, NormalizedSpeaker>();
  if (apiTeam.status === 'fulfilled') {
    for (const m of apiTeam.value) {
      if (m.slug) apiBySlug.set(m.slug, m);
    }
  }

  try {
    const cmsPage = cmsResult.status === 'fulfilled' ? cmsResult.value : null;
    if (cmsPage?.content?.blocks) {
      const blocks: CMSBlock[] = Array.isArray(cmsPage.content.blocks)
        ? cmsPage.content.blocks
        : Object.values(cmsPage.content.blocks) as CMSBlock[];

      members = extractMembersFromBlocks(blocks).map(m => {
        const fromApi = m.slug ? apiBySlug.get(m.slug) : undefined;
        if (!fromApi) return m;
        // Prefer API for photo source — Photo Studio writes there. Keep CMS
        // for display fields like role / company so curation wins.
        return {
          ...m,
          image: fromApi.image || m.image,
          person_photo: fromApi.person_photo ?? m.person_photo,
          person_photo_nobg: fromApi.person_photo_nobg ?? m.person_photo_nobg,
          photo_settings: fromApi.photo_settings ?? m.photo_settings,
        };
      });
      heroData = extractHeroFromBlocks(blocks);
      stats = extractStatsFromBlocks(blocks);
      ctaData = extractCtaFromBlocks(blocks);
    }
  } catch (error) {
    console.error('Failed to fetch CMS team page:', error);
  }

  // Fallback: if CMS returned no members, use the API list directly so the
  // page still renders.
  if (members.length === 0 && apiTeam.status === 'fulfilled') {
    members = apiTeam.value;
  }

  return (
    <SpeakersListClient
      speakers={members}
      heroTitle={heroData.title}
      heroSubtitle={heroData.subtitle}
      heroBadge={heroData.badge}
      stats={stats}
      ctaTitle={ctaData.title}
      ctaSubtitle={ctaData.subtitle}
      ctaButtons={ctaData.buttons}
      navigationData={navigationData}
      navigationAPIData={apiNav || undefined}
      socials={socials}
      gridId="team-grid"
      itemNoun="member"
      itemNounPlural="members"
      defaultHeroBadge="Meet Our Team"
      defaultHeroHtml='The People Behind <br class="hidden md:block" /><span class="text-brand-cyan">DeAI Summit</span>'
      defaultHeroSubtitle="The organizers, curators, and operators bringing DeAI Summit to life."
      defaultPrimaryStatLabel="Team Members"
      emptyMessage="No team members available at the moment."
      detailBasePath="/team"
    />
  );
}

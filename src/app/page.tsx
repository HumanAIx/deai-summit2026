import { LandingPage } from '@/components/LandingPage';
import {
  prefetchHomePageData,
  prefetchNavigation,
  prefetchCMSPage,
  mapNavigationData,
} from '@/lib/prefetch';
import type { SocialLink } from '@/lib/prefetch';
import { siteConfig } from '@/config/site';
import { generateEventSchema } from '@/lib/structured-data';
import { extractHomeSections } from '@/lib/home-cms';
import type { CMSBlock } from '@/lib/api-types';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deaisummit.org';

export default async function Home() {
  let speakers: Awaited<ReturnType<typeof prefetchHomePageData>>['speakers'] = [];
  let sponsors: Awaited<ReturnType<typeof prefetchHomePageData>>['sponsors'] = [];
  let partners: Awaited<ReturnType<typeof prefetchHomePageData>>['partners'] = [];
  let socials: SocialLink[] = [];

  const apiNav = await prefetchNavigation();
  const navigationData = apiNav ? mapNavigationData(apiNav) : undefined;

  try {
    const data = await prefetchHomePageData();
    speakers = data.speakers;
    sponsors = data.sponsors;
    partners = data.partners;
    socials = data.socials;
  } catch (error) {
    console.error('Failed to fetch home page data, using fallback:', error);
  }

  // Pull CMS-managed content for the home page. Each section falls back to
  // the existing entity APIs or siteConfig when the CMS doesn't provide data.
  let cmsSections = {} as ReturnType<typeof extractHomeSections>;
  try {
    const cmsPage = await prefetchCMSPage('home');
    if (cmsPage?.content?.blocks) {
      const blocks: CMSBlock[] = Array.isArray(cmsPage.content.blocks)
        ? cmsPage.content.blocks
        : (Object.values(cmsPage.content.blocks) as CMSBlock[]);
      cmsSections = extractHomeSections(blocks);
    }
  } catch (error) {
    console.error('Failed to fetch CMS home page, falling back to entity APIs / siteConfig:', error);
  }

  const eventSchema = generateEventSchema(BASE_URL);

  // Leading voices: CMS → API → siteConfig.
  const leadingSpeakers = cmsSections.leadingVoices && cmsSections.leadingVoices.length > 0
    ? cmsSections.leadingVoices
    : speakers.length > 0
      ? speakers.map(s => ({
          name: s.name,
          slug: s.slug,
          role: s.role,
          company: s.company,
          image: s.image,
          icon: 'ri-user-line',
        }))
      : siteConfig.speakers.leading.map(s => ({ ...s, slug: '' }));

  // Marquee sponsors: CMS → API → siteConfig.
  const marqueeItems = cmsSections.marqueeItems && cmsSections.marqueeItems.length > 0
    ? cmsSections.marqueeItems
    : sponsors.length > 0
      ? sponsors.map(s => ({
          label: s.name,
          slug: s.slug,
          logo: s.logo,
        }))
      : siteConfig.marquee.map(m => ({ ...m, slug: '' }));

  // Sponsors & Partners grid: CMS → API → siteConfig.
  const partnerItems = cmsSections.partnerItems && cmsSections.partnerItems.length > 0
    ? cmsSections.partnerItems
    : partners.length > 0
      ? partners.map(p => ({
          name: p.name,
          slug: p.slug,
          logo: p.logo,
          isSponsor: p.isSponsor,
          logoHasDarkBg: p.logoHasDarkBg,
        }))
      : siteConfig.partners.map(p => ({ ...p, slug: '', isSponsor: false }));

  // Merge CMS overrides onto the siteConfig defaults for the content-heavy
  // sections. Missing CMS fields fall through to siteConfig.
  const heroData = { ...siteConfig.hero, ...(cmsSections.hero ?? {}) };
  const statsData = cmsSections.stats
    ? {
        quote: { ...siteConfig.stats.quote, ...(cmsSections.stats.quote ?? {}) },
        items: cmsSections.stats.items ?? siteConfig.stats.items,
      }
    : siteConfig.stats;
  const aboutData = { ...siteConfig.about, ...(cmsSections.about ?? {}) };
  const highlightsData = cmsSections.highlights
    ? { ...siteConfig.highlights, ...cmsSections.highlights }
    : siteConfig.highlights;
  const networkingData =
    cmsSections.networking && cmsSections.networking.length > 0
      ? cmsSections.networking
      : siteConfig.networking;

  return (
    <>
      {eventSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
        />
      )}
      <LandingPage
        speakers={leadingSpeakers}
        marqueeItems={marqueeItems}
        partnerItems={partnerItems}
        socials={socials}
        navigationData={navigationData}
        navigationAPIData={apiNav || undefined}
        heroData={heroData}
        statsData={statsData}
        aboutData={aboutData}
        highlightsData={highlightsData}
        networkingData={networkingData}
        speakerCtaData={cmsSections.speakerCta}
      />
    </>
  );
}

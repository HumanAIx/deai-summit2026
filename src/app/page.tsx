import type { Metadata } from 'next';
import { LandingPage } from '@/components/LandingPage';
import {
  prefetchHomePageData,
  prefetchNavigation,
  prefetchCMSPage,
  mapNavigationData,
  prefetchPublicAnalyticsTags,
  prefetchOrganizers,
} from '@/lib/prefetch';
import { redditSpeakerLeadPixel } from '@/lib/analytics-tags';
import type { SocialLink } from '@/lib/prefetch';
import { siteConfig } from '@/config/site';
import { generateEventSchema, jsonLdSafe } from '@/lib/structured-data';
import { extractHomeSections, buildHomeRenderPlan } from '@/lib/home-cms';
import { parseCmsBlocks } from '@/lib/cmsBlocks';
import { generatePageMetadata } from '@/lib/seo-defaults';
import type { CMSBlock } from '@/lib/api-types';
import type { OrganizerConfig } from '@/config/types';
import { resolveGeneralLogoSrc, resolveScrollerLogoSrc } from '@/lib/companyLogo';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deaisummit.org';

// Render on every request so unpublished companies drop out of the sponsor
// scroller immediately (no waiting for ISR / CDN HTML cache to expire).
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const cmsPage = await prefetchCMSPage('home');
  return generatePageMetadata(cmsPage?.seo || null, 'home', BASE_URL);
}

export default async function Home() {
  let speakers: Awaited<ReturnType<typeof prefetchHomePageData>>['speakers'] = [];
  let sponsors: Awaited<ReturnType<typeof prefetchHomePageData>>['sponsors'] = [];
  let partners: Awaited<ReturnType<typeof prefetchHomePageData>>['partners'] = [];
  let socials: SocialLink[] = [];

  const apiNav = await prefetchNavigation();
  const navigationData = apiNav ? mapNavigationData(apiNav) : undefined;
  const analyticsTags = await prefetchPublicAnalyticsTags();
  const organizerCompanies = await prefetchOrganizers();

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
  // Blocks that don't match a designed section are rendered in place.
  let cmsBlocks: CMSBlock[] = [];
  let cmsSections = {} as ReturnType<typeof extractHomeSections>;
  try {
    const cmsPage = await prefetchCMSPage('home');
    if (cmsPage) {
      cmsBlocks = parseCmsBlocks(cmsPage);
      cmsSections = extractHomeSections(cmsBlocks);
    }
  } catch (error) {
    console.error('Failed to fetch CMS home page, falling back to entity APIs / siteConfig:', error);
  }
  const renderPlan = buildHomeRenderPlan(cmsBlocks);

  const eventSchema = generateEventSchema(BASE_URL);

  // Leading voices: CMS → API → siteConfig. CMS-sourced entries are enriched
  // with the API row's photo_settings (and resolved image) by slug so the
  // scroller picks up the active snapshot / nobg URL even when the CMS hasn't
  // synced the full photo data.
  const apiSpeakerBySlug = new Map(speakers.map(s => [s.slug, s]));
  const leadingSpeakers = cmsSections.leadingVoices && cmsSections.leadingVoices.length > 0
    ? cmsSections.leadingVoices.map(v => {
        const fromApi = v.slug ? apiSpeakerBySlug.get(v.slug) : undefined;
        if (!fromApi) return v;
        return {
          ...v,
          image: fromApi.image || v.image,
          photoSource: {
            person_photo: fromApi.person_photo,
            person_photo_nobg: fromApi.person_photo_nobg,
            photo_settings: fromApi.photo_settings,
          },
        };
      })
    : speakers.length > 0
      ? speakers.map(s => ({
          name: s.name,
          slug: s.slug,
          role: s.role,
          company: s.company,
          image: s.image,
          icon: 'ri-user-line',
          photoSource: {
            person_photo: s.person_photo,
            person_photo_nobg: s.person_photo_nobg,
            photo_settings: s.photo_settings,
          },
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
          logoHasDarkBg: s.logoHasDarkBg,
        }))
      : siteConfig.marquee.map(m => ({ ...m, slug: '' }));

  // Sponsors & Partners grid: CMS → API → siteConfig.
  const partnerItems = cmsSections.partnerItems && cmsSections.partnerItems.length > 0
    ? cmsSections.partnerItems
    : sponsors.length > 0 || partners.length > 0
      ? (() => {
          const sponsorSlugs = new Set(sponsors.map(s => s.slug).filter(Boolean));
          const toItem = (p: (typeof sponsors)[number]) => ({
            name: p.name,
            slug: p.slug,
            logo: p.logo,
            isSponsor: p.isSponsor,
            isPartner: p.isPartner,
            logoHasDarkBg: p.logoHasDarkBg,
          });
          return [
            ...sponsors.map(toItem),
            ...partners
              .filter(p => p.isPartner && (!p.slug || !sponsorSlugs.has(p.slug)))
              .map(toItem),
          ];
        })()
      : siteConfig.partners.map(p => ({ ...p, slug: '', isSponsor: false, isPartner: true }));

  // Merge CMS overrides onto the siteConfig defaults for the content-heavy
  // sections. Missing CMS fields fall through to siteConfig.
  const heroData = {
    ...siteConfig.hero,
    ...(cmsSections.hero ?? {}),
    textNodes:
      cmsSections.hero?.textNodes ??
      [
        { icon: 'ri-map-pin-line', text: siteConfig.hero.location },
        { icon: 'ri-calendar-line', text: siteConfig.hero.date },
      ],
  };
  const organizerBySlug = new Map(organizerCompanies.map((c) => [c.company_slug, c]));
  const enrichOrganizers = (list: OrganizerConfig[]): OrganizerConfig[] =>
    list.map((o) => {
      const fromApi = o.slug ? organizerBySlug.get(o.slug) : undefined;
      if (!fromApi) return o;
      const logo =
        resolveGeneralLogoSrc(fromApi) ||
        resolveScrollerLogoSrc(fromApi) ||
        fromApi.company_logo ||
        o.image;
      let websiteLabel = o.websiteLabel;
      if (!websiteLabel && fromApi.company_website) {
        try {
          websiteLabel = new URL(fromApi.company_website).hostname.replace(/^www\./i, '');
        } catch {
          /* keep undefined */
        }
      }
      return {
        ...o,
        image: logo || o.image,
        websiteLabel,
        href: o.slug ? `/companies/${o.slug}` : o.href,
      };
    });

  // Only the CMS companies-list / all-organizers add-on may populate Hosted-by.
  // Do not fall back to every published organizer when the add-on is "none".
  const resolvedOrganizers: OrganizerConfig[] | undefined = (() => {
    const fromCms = cmsSections.stats?.organizers;
    if (!fromCms || fromCms.length === 0) return undefined;
    const list = enrichOrganizers(fromCms);
    // HumanAIx leads the Hosted-by row.
    return [...list].sort((a, b) => {
      const rank = (o: OrganizerConfig) =>
        o.slug === 'humanaix-foundation' || /humanaix/i.test(o.name) ? 0 : 1;
      return rank(a) - rank(b);
    });
  })();

  const cmsQuote = cmsSections.stats?.quote;
  const statsData = {
    quote: cmsQuote?.text
      ? {
          text: cmsQuote.text,
          author: cmsQuote.author || '',
          role: cmsQuote.role || '',
          image: cmsQuote.image || '',
          url: cmsQuote.url || '',
        }
      : siteConfig.stats.quote,
    items: cmsSections.stats?.items?.length
      ? cmsSections.stats.items
      : siteConfig.stats.items,
    ...(cmsSections.stats?.intro ? { intro: cmsSections.stats.intro } : {}),
    ...(cmsSections.stats?.body ? { body: cmsSections.stats.body } : {}),
    ...(resolvedOrganizers ? { organizers: resolvedOrganizers } : {}),
  };
  const aboutData = { ...siteConfig.about, ...(cmsSections.about ?? {}) };
  const networkingData =
    cmsSections.networking && cmsSections.networking.items.length > 0
      ? cmsSections.networking.items
      : siteConfig.networking;

  return (
    <>
      {eventSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdSafe(eventSchema) }}
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
        networkingData={networkingData}
        networkingHeading={{
          title: cmsSections.networking?.title,
          badge: cmsSections.networking?.badge,
        }}
        speakerCtaData={cmsSections.speakerCta}
        sponsorsSectionData={cmsSections.sponsorsAndPartners}
        renderPlan={renderPlan}
        redditSpeakerLeadPixelId={
          redditSpeakerLeadPixel(analyticsTags) || undefined
        }
      />
    </>
  );
}

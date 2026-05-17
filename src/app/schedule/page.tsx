import type { Metadata } from 'next';
import { prefetchCMSPage, prefetchNavigation, mapNavigationData, prefetchSocials } from '@/lib/prefetch';
import { SEO_DEFAULTS } from '@/lib/seo-defaults';
import { SchedulePageClient } from '@/components/SchedulePageClient';
import { buildSchedulePageModel } from '@/lib/buildSchedulePageModel';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deaisummit.org';

export async function generateMetadata(): Promise<Metadata> {
  const cmsPage = await prefetchCMSPage('schedule');
  const seo = cmsPage?.seo;

  const title = seo?.meta_title || `Schedule - ${SEO_DEFAULTS.siteName}`;
  const description =
    seo?.meta_description ||
    'Full conference schedule — keynotes, sessions, and speakers at DeAI Malta.';

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
      canonical: seo?.canonical_url || `${BASE_URL}/schedule`,
    },
    ...(seo?.robots_tag ? { robots: seo.robots_tag } : {}),
  };
}

export default async function SchedulePage() {
  const [cmsPage, apiNav, socials] = await Promise.all([
    prefetchCMSPage('schedule'),
    prefetchNavigation(),
    prefetchSocials(),
  ]);
  const navigationData = apiNav ? mapNavigationData(apiNav) : undefined;
  const { heroTitle, heroSubtitle, heroDescription, bodyBlocks } = buildSchedulePageModel(cmsPage);

  return (
    <SchedulePageClient
      heroTitle={heroTitle}
      heroSubtitle={heroSubtitle}
      heroDescription={heroDescription}
      blocks={bodyBlocks}
      navigationData={navigationData}
      navigationAPIData={apiNav || undefined}
      socials={socials}
    />
  );
}

import type { Metadata } from 'next';
import { prefetchCMSPage, prefetchNavigation, mapNavigationData, prefetchSocials } from '@/lib/prefetch';
import { generatePageMetadata } from '@/lib/seo-defaults';
import { SchedulePageClient } from '@/components/SchedulePageClient';
import { buildSchedulePageModel } from '@/lib/buildSchedulePageModel';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deaisummit.org';

export async function generateMetadata(): Promise<Metadata> {
  const cmsPage = await prefetchCMSPage('schedule');
  return generatePageMetadata(cmsPage?.seo || null, 'schedule', BASE_URL);
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

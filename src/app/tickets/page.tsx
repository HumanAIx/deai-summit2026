import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DetailPageLayout } from '@/components/DetailPageLayout';
import { TicketsPageView } from '@/components/TicketsPageView';
import { siteConfig } from '@/config/site';
import { parseCmsBlocks } from '@/lib/cmsBlocks';
import {
  mapNavigationData,
  prefetchCMSPage,
  prefetchNavigation,
  prefetchSocials,
} from '@/lib/prefetch';
import { parseTicketsPage } from '@/lib/tickets-page';
import { generatePageMetadata, SEO_DEFAULTS } from '@/lib/seo-defaults';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deaisummit.org';

export async function generateMetadata(): Promise<Metadata> {
  const cmsPage = await prefetchCMSPage('tickets');
  if (!cmsPage) return { title: `Tickets - ${SEO_DEFAULTS.siteName}` };
  return generatePageMetadata(cmsPage.seo || null, 'tickets', BASE_URL, {
    title: `${cmsPage.page_title} - ${SEO_DEFAULTS.siteName}`,
    description: SEO_DEFAULTS.defaultDescription,
  });
}

export default async function TicketsPage() {
  const [cmsPage, apiNav, socials] = await Promise.all([
    prefetchCMSPage('tickets'),
    prefetchNavigation(),
    prefetchSocials(),
  ]);

  if (!cmsPage) notFound();

  const content = parseTicketsPage(parseCmsBlocks(cmsPage));
  const navigationData = apiNav ? mapNavigationData(apiNav) : siteConfig.navigation;

  return (
    <DetailPageLayout
      navigationData={navigationData}
      navigationAPIData={apiNav || undefined}
      socials={socials}
      navTone="light"
    >
      <TicketsPageView content={content} />
    </DetailPageLayout>
  );
}

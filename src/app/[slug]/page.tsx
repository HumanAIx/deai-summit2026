import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CmsPageRenderer } from '@/components/cms/CmsPageRenderer';
import { DetailPageLayout } from '@/components/DetailPageLayout';
import { siteConfig } from '@/config/site';
import { parseCmsBlocks } from '@/lib/cmsBlocks';
import {
  prefetchCMSPage,
  prefetchNavigation,
  prefetchSocials,
  mapNavigationData,
} from '@/lib/prefetch';
import { generatePageMetadata, SEO_DEFAULTS } from '@/lib/seo-defaults';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deaisummit.org';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cmsPage = await prefetchCMSPage(slug);
  if (!cmsPage) {
    return { title: SEO_DEFAULTS.defaultTitle };
  }

  return generatePageMetadata(cmsPage.seo || null, slug, BASE_URL, {
    title: `${cmsPage.page_title} - ${SEO_DEFAULTS.siteName}`,
    description: SEO_DEFAULTS.defaultDescription,
  });
}

/**
 * Catch-all for CMS pages without a dedicated App Router folder.
 * Renders every published content/simple box and known addons (companies-list,
 * members-list, youtube, schedule link-outs, etc.) via CmsPageRenderer.
 * Static routes (/partners, /partner-hotels, /speakers, …) still take priority.
 */
export default async function CmsContentPage({ params }: PageProps) {
  const { slug } = await params;

  const [cmsPage, apiNav, socials] = await Promise.all([
    prefetchCMSPage(slug),
    prefetchNavigation(),
    prefetchSocials(),
  ]);

  if (!cmsPage) {
    notFound();
  }

  const navigationData = apiNav ? mapNavigationData(apiNav) : siteConfig.navigation;
  const blocks = parseCmsBlocks(cmsPage);

  return (
    <DetailPageLayout
      navigationData={navigationData}
      navigationAPIData={apiNav || undefined}
      socials={socials}
    >
      <CmsPageRenderer blocks={blocks} pageTitle={cmsPage.page_title} />
    </DetailPageLayout>
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CmsPageRenderer } from '@/components/cms/CmsPageRenderer';
import { DetailPageLayout } from '@/components/DetailPageLayout';
import { siteConfig } from '@/config/site';
import { parseCmsBlocks } from '@/lib/cmsBlocks';
import {
  prefetchCMSPage,
  prefetchCaptchaConfig,
  prefetchDocumentsGateForms,
  prefetchNavigation,
  prefetchSocials,
  mapNavigationData,
} from '@/lib/prefetch';
import { generatePageMetadata, SEO_DEFAULTS } from '@/lib/seo-defaults';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deaisummit.org';
const CMS_SLUG = 'downloads';

export async function generateMetadata(): Promise<Metadata> {
  const cmsPage = await prefetchCMSPage(CMS_SLUG);
  if (!cmsPage) {
    return { title: SEO_DEFAULTS.defaultTitle };
  }

  return generatePageMetadata(cmsPage.seo || null, 'downloads', BASE_URL, {
    title: `${cmsPage.page_title} - ${SEO_DEFAULTS.siteName}`,
    description: SEO_DEFAULTS.defaultDescription,
  });
}

export default async function DownloadsPage() {
  const [cmsPage, apiNav, socials, captchaConfig] = await Promise.all([
    prefetchCMSPage(CMS_SLUG),
    prefetchNavigation(),
    prefetchSocials(),
    prefetchCaptchaConfig(),
  ]);

  if (!cmsPage) {
    notFound();
  }

  const navigationData = apiNav ? mapNavigationData(apiNav) : siteConfig.navigation;
  const blocks = parseCmsBlocks(cmsPage);
  const formConfigs = await prefetchDocumentsGateForms(
    blocks,
    cmsPage.content?.formConfigs || null,
  );

  return (
    <DetailPageLayout
      navigationData={navigationData}
      navigationAPIData={apiNav || undefined}
      socials={socials}
    >
      <CmsPageRenderer
        blocks={blocks}
        pageTitle={cmsPage.page_title}
        formConfigs={formConfigs}
        captchaSiteKey={captchaConfig.site_key}
        captchaDisabled={captchaConfig.disabled === true}
        captchaProvider={captchaConfig.provider}
      />
    </DetailPageLayout>
  );
}

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { prefetchCMSPage, prefetchNavigation, prefetchSocials, mapNavigationData, prefetchCaptchaConfig } from '@/lib/prefetch';
import { SEO_DEFAULTS } from '@/lib/seo-defaults';
import { ContactClient } from '@/components/ContactClient';
import type { CMSBlock, CMSFormConfig } from '@/lib/api-types';

/** Pull inquiry-type choices out of whichever form in the CMS page has a select field. */
function extractInquiryOptions(formConfigs?: Record<string, CMSFormConfig>): string[] | undefined {
  if (!formConfigs) return undefined;
  for (const form of Object.values(formConfigs)) {
    for (const field of form.form_fields || []) {
      if (field.type === 'select' && field.settings?.choices?.length) {
        return field.settings.choices.map(c => c.value || c.label).filter(Boolean);
      }
    }
  }
  return undefined;
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deaisummit.org';

export async function generateMetadata(): Promise<Metadata> {
  const cmsPage = await prefetchCMSPage('contact');
  const seo = cmsPage?.seo;

  const title = seo?.meta_title || `Contact - ${SEO_DEFAULTS.siteName}`;
  const description =
    seo?.meta_description ||
    'Get in touch with the DeAI Summit 2026 team for partnerships, sponsorships, speaker applications, and general inquiries.';

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
      canonical: seo?.canonical_url || `${BASE_URL}/contact`,
    },
    ...(seo?.robots_tag ? { robots: seo.robots_tag } : {}),
  };
}

export default async function ContactPage() {
  const [cmsPage, apiNav, socials, captchaConfig] = await Promise.all([
    prefetchCMSPage('contact'),
    prefetchNavigation(),
    prefetchSocials(),
    prefetchCaptchaConfig(),
  ]);

  const navigationData = apiNav ? mapNavigationData(apiNav) : undefined;

  const blocks: CMSBlock[] = cmsPage?.content?.blocks
    ? Array.isArray(cmsPage.content.blocks)
      ? cmsPage.content.blocks
      : (Object.values(cmsPage.content.blocks) as CMSBlock[])
    : [];

  const inquiryOptions = extractInquiryOptions(cmsPage?.content?.formConfigs);

  return (
    <Suspense fallback={null}>
      <ContactClient
        blocks={blocks}
        inquiryOptions={inquiryOptions}
        navigationData={navigationData}
        navigationAPIData={apiNav || undefined}
        socials={socials}
        captchaSiteKey={captchaConfig.site_key}
      />
    </Suspense>
  );
}

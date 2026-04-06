import type { Metadata } from 'next';
import { Suspense } from 'react';
import { prefetchCMSPage, prefetchNavigation, prefetchSocials, mapNavigationData } from '@/lib/prefetch';
import { SEO_DEFAULTS } from '@/lib/seo-defaults';
import { ContactClient } from '@/components/ContactClient';
import type { CMSBlock } from '@/lib/api-types';

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
  const [cmsPage, apiNav, socials] = await Promise.all([
    prefetchCMSPage('contact'),
    prefetchNavigation(),
    prefetchSocials(),
  ]);

  const navigationData = apiNav ? mapNavigationData(apiNav) : undefined;

  const blocks: CMSBlock[] = cmsPage?.content?.blocks
    ? Array.isArray(cmsPage.content.blocks)
      ? cmsPage.content.blocks
      : (Object.values(cmsPage.content.blocks) as CMSBlock[])
    : [];

  return (
    <Suspense fallback={null}>
      <ContactClient
        blocks={blocks}
        navigationData={navigationData}
        navigationAPIData={apiNav || undefined}
        socials={socials}
      />
    </Suspense>
  );
}

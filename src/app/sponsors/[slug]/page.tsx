import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prefetchSponsorDetailPageData, prefetchNavigation, prefetchSocials, mapNavigationData } from '@/lib/prefetch';
import { generateOrganizationSchema, jsonLdSafe } from '@/lib/structured-data';
import { SEO_DEFAULTS, buildSocialMetadata } from '@/lib/seo-defaults';
import { CompanyDetailClient } from '@/components/CompanyDetailClient';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deaisummit.org';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { company, seo } = await prefetchSponsorDetailPageData(slug);

  if (!company) {
    return { title: 'Sponsor Not Found' };
  }

  const title = seo?.meta_title || `${company.company_name} | Sponsors - ${SEO_DEFAULTS.siteName}`;
  const description =
    seo?.meta_description ||
    company.company_bio?.replace(/<[^>]*>/g, '').slice(0, 160) ||
    `${company.company_name} - Sponsor of DeAI Summit 2026`;
  const canonical = seo?.canonical_url || `${BASE_URL}/sponsors/${company.company_slug}`;

  return {
    title,
    description,
    robots: seo?.robots_tag?.toLowerCase() || SEO_DEFAULTS.defaultRobots,
    ...buildSocialMetadata({
      title,
      description,
      seo,
      imageFallback: company.company_logo,
      baseUrl: BASE_URL,
      imageAlt: company.company_name,
    }),
    alternates: {
      canonical,
    },
  };
}

export default async function SponsorDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [{ company, seo }, apiNav, socials] = await Promise.all([
    prefetchSponsorDetailPageData(slug),
    prefetchNavigation(),
    prefetchSocials(),
  ]);

  if (!company) {
    notFound();
  }

  const navigationData = apiNav ? mapNavigationData(apiNav) : undefined;

  const schema = generateOrganizationSchema(company, BASE_URL, 'sponsors');
  const seoOverrides = seo?.structured_data;
  const finalSchema =
    schema && seoOverrides && Object.keys(seoOverrides).length > 0
      ? { ...schema, ...seoOverrides }
      : schema;

  return (
    <>
      {finalSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdSafe(finalSchema) }}
        />
      )}
      <CompanyDetailClient
        company={company}
        backLabel="Sponsors & Partners"
        backHref="/partners"
        navigationData={navigationData}
        navigationAPIData={apiNav || undefined}
        socials={socials}
      />
    </>
  );
}

import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import {
  prefetchPartnerDetailPageData,
  prefetchSponsorDetailPageData,
  prefetchNavigation,
  prefetchSocials,
  mapNavigationData,
} from '@/lib/prefetch';
import { getCompanyCanonicalUrl, getCompanyPublicPath } from '@/lib/company-public-path';
import { generateOrganizationSchema, jsonLdSafe } from '@/lib/structured-data';
import { SEO_DEFAULTS, buildSocialMetadata } from '@/lib/seo-defaults';
import { CompanyDetailClient } from '@/components/CompanyDetailClient';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deaisummit.org';

export const dynamic = 'force-dynamic';

async function redirectIfNotPreferredPartner(slug: string) {
  // Prefer sponsor URL when both roles apply; also catch mis-typed partner URLs.
  const sponsor = await prefetchSponsorDetailPageData(slug);
  if (sponsor.company) {
    permanentRedirect(getCompanyPublicPath(sponsor.company));
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { company, seo } = await prefetchPartnerDetailPageData(slug);

  if (!company) {
    await redirectIfNotPreferredPartner(slug);
    return { title: 'Partner Not Found' };
  }

  const preferredPath = getCompanyPublicPath(company);
  if (preferredPath !== `/partners/${company.company_slug}`) {
    permanentRedirect(preferredPath);
  }

  const title = seo?.meta_title || `${company.company_name} | Partners - ${SEO_DEFAULTS.siteName}`;
  const description = seo?.meta_description || company.company_bio?.replace(/<[^>]*>/g, '').slice(0, 160) || `${company.company_name} - Partner of DeAI Summit 2026`;
  const canonical = getCompanyCanonicalUrl(company, BASE_URL);

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

export default async function PartnerDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [{ company, seo }, apiNav, socials] = await Promise.all([
    prefetchPartnerDetailPageData(slug),
    prefetchNavigation(),
    prefetchSocials(),
  ]);

  if (!company) {
    await redirectIfNotPreferredPartner(slug);
    notFound();
  }

  const preferredPath = getCompanyPublicPath(company);
  if (preferredPath !== `/partners/${company.company_slug}`) {
    permanentRedirect(preferredPath);
  }

  const navigationData = apiNav ? mapNavigationData(apiNav) : undefined;

  const schema = generateOrganizationSchema(company, BASE_URL, 'partners');
  const seoOverrides = seo?.structured_data;
  const finalSchema = schema && seoOverrides && Object.keys(seoOverrides).length > 0
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

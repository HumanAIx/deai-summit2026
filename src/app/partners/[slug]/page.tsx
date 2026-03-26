import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prefetchSponsorDetailPageData } from '@/lib/prefetch';
import { generateOrganizationSchema } from '@/lib/structured-data';
import { SEO_DEFAULTS } from '@/lib/seo-defaults';
import { CompanyDetailClient } from '@/components/CompanyDetailClient';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deaisummit.org';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { company, seo } = await prefetchSponsorDetailPageData(slug);

  if (!company) {
    return { title: 'Partner Not Found' };
  }

  const title = seo?.meta_title || `${company.company_name} | Partners - ${SEO_DEFAULTS.siteName}`;
  const description = seo?.meta_description || company.company_bio?.replace(/<[^>]*>/g, '').slice(0, 160) || `${company.company_name} - Partner of DeAI Summit 2026`;
  const logo = company.company_logo;
  const ogImage = logo?.startsWith('http') ? logo : logo ? `${BASE_URL}${logo}` : undefined;

  return {
    title,
    description,
    robots: seo?.robots_tag?.toLowerCase() || SEO_DEFAULTS.defaultRobots,
    openGraph: {
      title: seo?.og_title || title,
      description: seo?.og_description || description,
      ...(ogImage && { images: [{ url: ogImage, alt: company.company_name }] }),
      type: 'website',
      siteName: SEO_DEFAULTS.siteName,
    },
    twitter: {
      card: SEO_DEFAULTS.twitterCard,
      title: seo?.og_title || title,
      description: seo?.og_description || description,
      ...(ogImage && { images: [ogImage] }),
    },
    alternates: {
      canonical: seo?.canonical_url || `${BASE_URL}/partners/${company.company_slug}`,
    },
  };
}

export default async function PartnerDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { company, seo } = await prefetchSponsorDetailPageData(slug);

  if (!company) {
    notFound();
  }

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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(finalSchema) }}
        />
      )}
      <CompanyDetailClient
        company={company}
        backLabel="Sponsors & Partners"
        backHref="/partners"
      />
    </>
  );
}

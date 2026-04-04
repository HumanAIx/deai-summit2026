import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prefetchVenueDetailPageData, prefetchNavigation, prefetchSocials, mapNavigationData } from '@/lib/prefetch';
import { generateOrganizationSchema } from '@/lib/structured-data';
import { SEO_DEFAULTS } from '@/lib/seo-defaults';
import { VenueDetailClient } from '@/components/VenueDetailClient';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deaisummit.org';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { company, seo } = await prefetchVenueDetailPageData(slug);

  if (!company) {
    return { title: 'Venue Not Found' };
  }

  const title = seo?.meta_title || `${company.company_name} | Venue - ${SEO_DEFAULTS.siteName}`;
  const description = seo?.meta_description || company.company_bio?.replace(/<[^>]*>/g, '').slice(0, 160) || `${company.company_name} - Venue for DeAI Summit 2026`;
  const image = company.venue_photo || company.company_logo;
  const ogImage = image?.startsWith('http') ? image : image ? `${BASE_URL}${image}` : undefined;

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
      canonical: seo?.canonical_url || `${BASE_URL}/venues/${company.company_slug}`,
    },
  };
}

export default async function VenueDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [{ company, seo }, apiNav, socials] = await Promise.all([
    prefetchVenueDetailPageData(slug),
    prefetchNavigation(),
    prefetchSocials(),
  ]);

  if (!company) {
    notFound();
  }

  const navigationData = apiNav ? mapNavigationData(apiNav) : undefined;

  const schema = generateOrganizationSchema(company, BASE_URL, 'venues');
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
      <VenueDetailClient
        company={company}
        navigationData={navigationData}
        navigationAPIData={apiNav || undefined}
        socials={socials}
      />
    </>
  );
}

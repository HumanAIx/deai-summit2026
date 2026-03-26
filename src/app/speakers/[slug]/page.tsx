import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prefetchSpeakerDetailPageData } from '@/lib/prefetch';
import { generatePersonSchema } from '@/lib/structured-data';
import { SEO_DEFAULTS } from '@/lib/seo-defaults';
import { SpeakerDetailClient } from '@/components/SpeakerDetailClient';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deaisummit.org';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { member } = await prefetchSpeakerDetailPageData(slug);

  if (!member) {
    return { title: 'Speaker Not Found' };
  }

  const name = `${member.person_firstname} ${member.person_surname}`.trim();
  const firstCompany = member.person_companies?.[0];
  const bio = member.speaker_bio || member.person_bio || '';

  const seo = member.seo;
  const title = seo?.meta_title || `${name}${firstCompany?.company_name ? ` - ${firstCompany.company_name}` : ''} | ${SEO_DEFAULTS.siteName}`;
  const description = seo?.meta_description || bio.replace(/<[^>]*>/g, '').slice(0, 160) || `${name} speaking at DeAI Summit 2026`;
  const image = member.person_photo_nobg || member.person_photo;
  const ogImage = image?.startsWith('http') ? image : image ? `${BASE_URL}${image}` : undefined;

  return {
    title,
    description,
    robots: seo?.robots_tag?.toLowerCase() || SEO_DEFAULTS.defaultRobots,
    openGraph: {
      title: seo?.og_title || title,
      description: seo?.og_description || description,
      ...(ogImage && { images: [{ url: ogImage, alt: name }] }),
      type: 'profile',
      siteName: SEO_DEFAULTS.siteName,
    },
    twitter: {
      card: SEO_DEFAULTS.twitterCard,
      title: seo?.og_title || title,
      description: seo?.og_description || description,
      ...(ogImage && { images: [ogImage] }),
    },
    alternates: {
      canonical: seo?.canonical_url || `${BASE_URL}/speakers/${member.person_slug}`,
    },
  };
}

export default async function SpeakerDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { member, companies } = await prefetchSpeakerDetailPageData(slug);

  if (!member) {
    notFound();
  }

  const schema = generatePersonSchema(member, BASE_URL, 'speakers');
  const seoOverrides = member.seo?.structured_data;
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
      <SpeakerDetailClient member={member} companies={companies} />
    </>
  );
}

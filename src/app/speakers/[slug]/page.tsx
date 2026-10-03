import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prefetchSpeakerDetailPageData, prefetchNavigation, prefetchSocials, mapNavigationData } from '@/lib/prefetch';
import { generatePersonSchema, jsonLdSafe } from '@/lib/structured-data';
import { SEO_DEFAULTS, buildSocialMetadata } from '@/lib/seo-defaults';
import { SpeakerDetailClient } from '@/components/SpeakerDetailClient';
import { formatPersonName } from '@/lib/utils';
import { getCompanyPublicPath } from '@/lib/company-public-path';
import type { Company } from '@/lib/api-types';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deaisummit.org';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { member } = await prefetchSpeakerDetailPageData(slug);

  if (!member) {
    return { title: 'Speaker Not Found' };
  }

  const baseName = `${member.person_firstname} ${member.person_surname}`.trim();
  const name = formatPersonName(member.person_title, baseName);
  const firstCompany = member.person_companies?.[0];
  const bio = member.speaker_bio || member.person_bio || '';

  const seo = member.seo;
  const title = seo?.meta_title || `${name}${firstCompany?.company_name ? ` - ${firstCompany.company_name}` : ''} | ${SEO_DEFAULTS.siteName}`;
  const description = seo?.meta_description || bio.replace(/<[^>]*>/g, '').slice(0, 160) || `${name} speaking at DeAI Summit 2026`;
  const canonical = seo?.canonical_url || `${BASE_URL}/speakers/${member.person_slug}`;

  return {
    title,
    description,
    robots: seo?.robots_tag?.toLowerCase() || SEO_DEFAULTS.defaultRobots,
    ...buildSocialMetadata({
      title,
      description,
      seo,
      imageFallback: member.person_photo_nobg || member.person_photo,
      baseUrl: BASE_URL,
      ogType: 'profile',
      imageAlt: name,
    }),
    alternates: {
      canonical,
    },
  };
}

function companyBackLink(from: string | undefined, companies: Company[]) {
  if (!from || !from.startsWith('/') || from.startsWith('//')) return null;
  const path = from.split('?')[0].split('#')[0];
  const match = companies.find((company) => getCompanyPublicPath(company) === path);
  if (!match) return null;
  return { href: path, label: match.company_name };
}

export default async function SpeakerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { slug } = await params;
  const { from } = await searchParams;
  const [{ member, companies }, apiNav, socials] = await Promise.all([
    prefetchSpeakerDetailPageData(slug),
    prefetchNavigation(),
    prefetchSocials(),
  ]);

  if (!member) {
    notFound();
  }

  const navigationData = apiNav ? mapNavigationData(apiNav) : undefined;
  const back = companyBackLink(from, companies);

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
          dangerouslySetInnerHTML={{ __html: jsonLdSafe(finalSchema) }}
        />
      )}
      <SpeakerDetailClient
        member={member}
        companies={companies}
        navigationData={navigationData}
        navigationAPIData={apiNav || undefined}
        socials={socials}
        backHref={back?.href}
        backLabel={back?.label}
      />
    </>
  );
}

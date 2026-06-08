import type { Member, Company, PersonSocials, CompanySocials } from './api-types';

/**
 * Serialise an object for inclusion inside an inline <script type="application/ld+json">.
 *
 * `JSON.stringify` does NOT escape `<`, `>` or `&`, which lets any CMS-controlled
 * string containing a literal `</script>` close the surrounding tag and inject
 * arbitrary HTML / JavaScript. Escaping those three characters to their `\uXXXX`
 * forms is the standard React mitigation and is invisible to JSON parsers.
 */
export function jsonLdSafe(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '');
}

function cleanText(text?: string | null): string | undefined {
  if (!text) return undefined;
  return stripMarkdown(stripHtml(text)).trim() || undefined;
}

function absoluteUrl(url?: string | null, baseUrl?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${baseUrl || ''}${url.startsWith('/') ? '' : '/'}${url}`;
}

function collectSocialUrls(socials?: PersonSocials | CompanySocials | null): string[] {
  if (!socials) return [];
  return Object.values(socials).filter((v): v is string => typeof v === 'string' && v.startsWith('http'));
}

export function generatePersonSchema(
  member: Member | null | undefined,
  baseUrl: string,
  pathPrefix: string = 'speakers',
) {
  const name = `${member?.person_firstname || ''} ${member?.person_surname || ''}`.trim();
  if (!name) return null;

  const description = cleanText(member?.speaker_bio || member?.person_bio);
  const image = absoluteUrl(member?.person_photo_nobg || member?.person_photo, baseUrl);
  const sameAs = collectSocialUrls(member?.person_socials);
  if (member?.person_website) sameAs.unshift(member.person_website);

  const jobTitle = member?.person_companies?.[0]?.person_job_title;
  const worksFor = member?.person_companies
    ?.filter(c => c.company_name)
    .map(c => ({ '@type': 'Organization' as const, name: c.company_name! }));

  const honorificPrefix = member?.person_title || undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    ...(honorificPrefix && { honorificPrefix }),
    ...(description && { description }),
    ...(image && { image }),
    url: `${baseUrl}/${pathPrefix}/${member?.person_slug}`,
    ...(jobTitle && { jobTitle }),
    ...(worksFor && worksFor.length > 0 && { worksFor }),
    ...(sameAs.length > 0 && { sameAs }),
  };
}

export function generateOrganizationSchema(
  company: Company | null | undefined,
  baseUrl: string,
  pathPrefix: string = 'companies',
) {
  if (!company?.company_name) return null;

  const description = cleanText(company.company_bio);
  const logo = absoluteUrl(company.company_logo, baseUrl);
  const sameAs = collectSocialUrls(company.company_socials);
  if (company.company_website) sameAs.unshift(company.company_website);

  const hasAddress = company.company_address || company.company_city || company.company_country;

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: company.company_name,
    ...(description && { description }),
    ...(logo && { logo }),
    url: company.company_website || `${baseUrl}/${pathPrefix}/${company.company_slug}`,
    ...(hasAddress && {
      address: {
        '@type': 'PostalAddress',
        ...(company.company_address && { streetAddress: company.company_address }),
        ...(company.company_city && { addressLocality: company.company_city }),
        ...(company.company_country && { addressCountry: company.company_country }),
      },
    }),
    ...(company.company_email && { email: company.company_email }),
    ...(company.company_phone && { telephone: company.company_phone }),
    ...(sameAs.length > 0 && { sameAs }),
  };
}

interface BlogPostInput {
  title?: string;
  slug?: string;
  meta_description?: string;
  featured_image?: string | null;
  published_at?: string;
  last_updated?: string;
  reading_time?: number;
}

interface PublisherInput {
  name?: string;
  id?: string;
  slug?: string;
  role?: string;
  isSpeaker?: boolean;
  isTeam?: boolean;
}

export function generateArticleSchema(
  post: BlogPostInput | null | undefined,
  publishers: PublisherInput[] | null | undefined,
  baseUrl: string,
) {
  if (!post?.title) return null;

  const image = absoluteUrl(post.featured_image, baseUrl);
  const canonicalUrl = `${baseUrl}/blog/${post.slug}`;
  const author = publishers?.find(p => p.role === 'author');

  const authorSchema = author?.name ? {
    '@type': 'Person',
    name: author.name,
    ...(author.slug && author.isSpeaker && { url: `${baseUrl}/speakers/${author.slug}` }),
    ...(author.slug && author.isTeam && !author.isSpeaker && { url: `${baseUrl}/team/${author.slug}` }),
  } : {
    '@type': 'Organization',
    name: 'HumanAIx Foundation',
    url: 'https://humanaix.io',
  };

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    ...(post.meta_description && { description: post.meta_description }),
    ...(image && { image }),
    url: canonicalUrl,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
    ...(post.published_at && { datePublished: post.published_at }),
    ...(post.last_updated && { dateModified: post.last_updated }),
    author: authorSchema,
    publisher: {
      '@type': 'Organization',
      name: 'DeAI Summit',
      logo: { '@type': 'ImageObject', url: `${baseUrl}/og-image.png` },
    },
    ...(post.reading_time && { wordCount: post.reading_time * 200 }),
  };
}

export function generateEventSchema(baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: 'DeAI Summit 2026',
    startDate: '2026-10-28',
    endDate: '2026-10-30',
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: 'Monte Kristo Estate',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Is-Siġġiewi',
        addressCountry: 'Malta',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: 'HumanAIx Foundation',
      url: 'https://humanaix.io',
    },
    url: baseUrl,
    description: 'The Global Inflection Point for AI Governance. Where frontier AI, decentralized systems, and global regulators confront the future of intelligence.',
  };
}

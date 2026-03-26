import type { Member, Company, PersonSocials, CompanySocials } from './api-types';

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

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
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
      name: 'InterContinental Malta',
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

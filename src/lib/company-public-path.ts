import type { Company } from '@/lib/api-types';

export type CompanyPublicPrefix = 'sponsors' | 'partners' | 'venues' | 'companies';

type CompanyRoleFields = Pick<
  Company,
  | 'company_slug'
  | 'company_is_sponsor'
  | 'sponsor_published'
  | 'company_is_partner'
  | 'partner_published'
  | 'company_is_venue'
  | 'venue_published'
>;

/**
 * One public URL per company. Priority: sponsor → partner → venue → companies.
 * Role detail routes and /companies/[slug] must all agree on this path for SEO.
 */
export function getCompanyPublicPrefix(company: CompanyRoleFields): CompanyPublicPrefix {
  if (company.company_is_sponsor === true && company.sponsor_published === true) {
    return 'sponsors';
  }
  if (company.company_is_partner === true && company.partner_published === true) {
    return 'partners';
  }
  if (company.company_is_venue === true && company.venue_published === true) {
    return 'venues';
  }
  return 'companies';
}

export function getCompanyPublicPath(company: CompanyRoleFields): string {
  return `/${getCompanyPublicPrefix(company)}/${company.company_slug}`;
}

export function getCompanyCanonicalUrl(company: CompanyRoleFields, baseUrl: string): string {
  return `${baseUrl}${getCompanyPublicPath(company)}`;
}

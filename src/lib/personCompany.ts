import type { PersonCompany } from './api-types';

export interface LiveCompanyName {
  company_name?: string | null;
}

/**
 * Company shown under a person's name.
 * Affiliations are stored in order. The first one whose company still exists
 * is the current one, whether or not that company has its own public page.
 * The name stored on the link is ignored, because that text can remain after
 * the company is deleted.
 */
export function currentLinkedCompany(
  links: PersonCompany[] | undefined,
  liveById: ReadonlyMap<string, LiveCompanyName>,
): { link: PersonCompany; companyName: string } | undefined {
  if (!links?.length || liveById.size === 0) return undefined;
  for (const link of links) {
    const companyName = liveById.get(link.company_id)?.company_name?.trim();
    if (companyName) return { link, companyName };
  }
  return undefined;
}

export function liveCompanyMap<T extends { id: string; company_name?: string | null }>(
  companies: readonly T[],
): Map<string, T> {
  return new Map(companies.map((company) => [company.id, company]));
}

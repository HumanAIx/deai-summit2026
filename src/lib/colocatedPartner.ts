import type { HighlightsHotspotBanner } from '@/config/types';
import {
  resolveGeneralLogoSrc,
  resolveScrollerLogoHasDarkBg,
  type CompanyLogoFields,
} from './companyLogo';

export const COLOCATED_PARTNER_SLUG = 'techxpo-eu';

export const COLOCATED_PARTNER_BANNER: HighlightsHotspotBanner = {
  label: 'Co-located by TechXpo EU',
  href: `/companies/${COLOCATED_PARTNER_SLUG}`,
  companySlug: COLOCATED_PARTNER_SLUG,
};

export const COLOCATED_VENUE_SLUG = 'mfcc-malta';
/** Footer custom-link label that should show the co-located partner banner underneath. */
export const VENUE_PROMO_LINK_LABEL = /beautiful venue/i;

export function isVenuePromoCustomLink(widget: { type?: string; linkLabel?: string }): boolean {
  return widget.type === 'custom-link' && VENUE_PROMO_LINK_LABEL.test(widget.linkLabel || '');
}

export type ColocatedCompany = CompanyLogoFields & {
  company_slug?: string;
  company_name?: string;
  company_published?: boolean;
};

/** Co-located partner link is only public when the company row is explicitly published. */
export function isColocatedPartnerPublished(
  company?: ColocatedCompany | null,
): company is ColocatedCompany {
  return company?.company_published === true;
}

/** Find the hardcoded co-located partner in a companies list only when published. */
export function findPublishedColocatedPartner(
  companies: ColocatedCompany[] | null | undefined,
): ColocatedCompany | null {
  const match = companies?.find((c) => c.company_slug === COLOCATED_PARTNER_SLUG);
  return isColocatedPartnerPublished(match) ? match : null;
}

/**
 * Browser helper: probe publish state via the companies list (drafts do not 404),
 * then fetch detail only when published.
 */
export async function fetchColocatedPartnerCompany(): Promise<ColocatedCompany | null> {
  const listRes = await fetch(
    `/api/companies?search=${encodeURIComponent(COLOCATED_PARTNER_SLUG)}&limit=25`,
    { cache: 'no-store' },
  );
  if (!listRes.ok) return null;

  const listJson = await listRes.json().catch(() => null);
  const listed = Array.isArray(listJson?.data) ? listJson.data : null;
  if (!findPublishedColocatedPartner(listed)) return null;

  const detailRes = await fetch(
    `/api/companies?id=${encodeURIComponent(COLOCATED_PARTNER_SLUG)}`,
    { cache: 'no-store' },
  );
  if (!detailRes.ok) return null;

  const detailJson = await detailRes.json().catch(() => null);
  const company = detailJson?.data as ColocatedCompany | undefined;
  return isColocatedPartnerPublished(company) ? company : null;
}

export function enrichColocatedPartnerBanner(
  company?: ColocatedCompany,
): HighlightsHotspotBanner | undefined {
  if (!isColocatedPartnerPublished(company)) return undefined;

  const logo = resolveGeneralLogoSrc(company);
  const name = company.company_name?.trim();

  return {
    ...COLOCATED_PARTNER_BANNER,
    logo: logo || COLOCATED_PARTNER_BANNER.logo,
    logoHasDarkBg: resolveScrollerLogoHasDarkBg(company, logo),
    logoBackgroundWhite: company.logo_background_white,
    label: name ? `Co-located by ${name}` : COLOCATED_PARTNER_BANNER.label,
  };
}

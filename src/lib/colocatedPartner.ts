import type { HighlightsHotspotBanner } from '@/config/types';
import {
  resolveGeneralLogoSrc,
  resolveScrollerLogoHasDarkBg,
  type CompanyLogoFields,
} from './companyLogo';

export const COLOCATED_PARTNER_BANNER: HighlightsHotspotBanner = {
  label: 'Co-located by TechXpo EU',
  href: '/companies/techxpo-eu',
  companySlug: 'techxpo-eu',
};

export const COLOCATED_VENUE_SLUG = 'mfcc-malta';
/** Footer custom-link label that should show the co-located partner banner underneath. */
export const VENUE_PROMO_LINK_LABEL = /beautiful venue/i;

export function isVenuePromoCustomLink(widget: { type?: string; linkLabel?: string }): boolean {
  return widget.type === 'custom-link' && VENUE_PROMO_LINK_LABEL.test(widget.linkLabel || '');
}

type ColocatedCompany = CompanyLogoFields & {
  company_name?: string;
  company_published?: boolean;
};

/** Co-located partner link is only public when the company row is explicitly published. */
export function isColocatedPartnerPublished(
  company?: ColocatedCompany | null,
): company is ColocatedCompany {
  return company?.company_published === true;
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

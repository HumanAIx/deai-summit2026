export type PublicEntityKind = 'venues' | 'companies' | 'sponsors' | 'partners';

export type FooterCompanyPublishFields = {
  id?: string;
  company_slug?: string;
  company_published?: boolean;
  venue_published?: boolean;
  sponsor_published?: boolean;
  partner_published?: boolean;
  company_is_venue?: boolean;
  company_is_sponsor?: boolean;
  company_is_partner?: boolean;
};

/** Parse `/venues|companies|sponsors|partners/:slug` paths. External/other URLs return null. */
export function parsePublicEntityPath(
  href: string,
): { kind: PublicEntityKind; slug: string } | null {
  if (!href) return null;
  const trimmed = href.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('#')
  ) {
    return null;
  }

  const path = trimmed.split('?')[0]?.split('#')[0] || '';
  const match = path.match(/^\/(venues|companies|sponsors|partners)\/([^/]+)\/?$/);
  if (!match) return null;
  return { kind: match[1] as PublicEntityKind, slug: decodeURIComponent(match[2]) };
}

export function isPublishedVenueCompany(company?: FooterCompanyPublishFields | null): boolean {
  return (
    company?.company_published === true &&
    company?.company_is_venue === true &&
    company?.venue_published === true
  );
}

export function isPublicEntityPathLive(
  kind: PublicEntityKind,
  slug: string,
  companies: FooterCompanyPublishFields[],
): boolean {
  const company = companies.find((c) => c.company_slug === slug);
  if (!company || company.company_published !== true) return false;

  switch (kind) {
    case 'venues':
      return company.company_is_venue === true && company.venue_published === true;
    case 'sponsors':
      return company.company_is_sponsor === true && company.sponsor_published === true;
    case 'partners':
      return company.company_is_partner === true && company.partner_published === true;
    case 'companies':
      return true;
    default:
      return false;
  }
}

/** Keep non-entity links; hide entity links that are not publicly live. */
export function isFooterCustomLinkPublic(
  widget: { type?: string; linkUrl?: string },
  companies: FooterCompanyPublishFields[] | null,
): boolean {
  if (widget.type !== 'custom-link') return true;
  const parsed = parsePublicEntityPath(widget.linkUrl || '');
  if (!parsed) return true;
  if (!companies) return false;
  return isPublicEntityPathLive(parsed.kind, parsed.slug, companies);
}

export function isFooterVenueWidgetPublic(
  venueId: string,
  companies: FooterCompanyPublishFields[] | null,
): boolean {
  if (!companies) return false;
  const publishedVenues = companies.filter(isPublishedVenueCompany);
  if (publishedVenues.length === 0) return false;
  if (!venueId) return true;
  const selected = companies.find((c) => c.id === venueId);
  return isPublishedVenueCompany(selected);
}

export function filterPublicFooterWidgets<T extends { type?: string; linkUrl?: string }>(
  widgets: T[],
  companies: FooterCompanyPublishFields[] | null,
  venueId: string,
): T[] {
  return widgets.filter((widget) => {
    if (widget.type === 'custom-link') {
      return isFooterCustomLinkPublic(widget, companies);
    }
    if (widget.type === 'venue') {
      return isFooterVenueWidgetPublic(venueId, companies);
    }
    return true;
  });
}

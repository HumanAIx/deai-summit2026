/**
 * Resolve company logo URLs from Logo Studio `logo_settings` JSONB.
 * Mirrors ep-dashboard `utils/companyLogo.ts` without cross-package imports.
 */

interface LogoSlotConfig {
  url?: string;
  snapshotId?: string;
  invert?: boolean;
  scale?: number;
}

interface LogoSettings {
  vectorSvgUrl?: string;
  slots?: Partial<Record<string, LogoSlotConfig>>;
}

export interface CompanyLogoFields {
  company_logo?: string;
  logo_background_white?: boolean;
  company_logo_has_dark_bg?: boolean;
  logo_settings?: LogoSettings | null;
}

const SVG_SRC = /\.svg(\?|$)/i;

function normalizeSlots(slots?: Partial<Record<string, LogoSlotConfig>> | null) {
  if (!slots) return {};
  const next = { ...slots };
  if (next.primary?.url && !next.general?.url) {
    next.general = { ...next.primary };
  }
  return next;
}

export function resolveGeneralLogoSrc(company: CompanyLogoFields): string {
  const slots = normalizeSlots(company.logo_settings?.slots);
  if (slots.general?.url) return slots.general.url;
  if (company.logo_settings?.vectorSvgUrl) return company.logo_settings.vectorSvgUrl;
  return company.company_logo || '';
}

export function resolveScrollerLogoSrc(company: CompanyLogoFields): string {
  const slots = normalizeSlots(company.logo_settings?.slots);
  if (slots.scroller?.url) return slots.scroller.url;
  return resolveGeneralLogoSrc(company);
}

export function resolveScrollerLogoHasDarkBg(company: CompanyLogoFields, src?: string): boolean | undefined {
  const url = src || resolveScrollerLogoSrc(company);
  if (!url) return undefined;
  const slots = normalizeSlots(company.logo_settings?.slots);
  const scrollerSlot = slots.scroller;
  if (scrollerSlot?.url && scrollerSlot.url === url) {
    if (scrollerSlot.invert) return true;
    if (SVG_SRC.test(url)) return false;
  }
  const c = company as Record<string, unknown>;
  if (typeof company.logo_background_white === 'boolean') return !company.logo_background_white;
  if (typeof company.company_logo_has_dark_bg === 'boolean') return company.company_logo_has_dark_bg;
  if (typeof c.logo_has_dark_bg === 'boolean') return c.logo_has_dark_bg as boolean;
  if (SVG_SRC.test(url)) return false;
  return undefined;
}

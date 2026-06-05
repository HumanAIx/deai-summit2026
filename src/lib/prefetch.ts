import { Member, Company, SEOSettings, NormalizedSpeaker, NormalizedSponsor, CMSPageData, NavigationAPIData } from './api-types';
import type { NavigationConfig } from '@/config/types';
import {
  resolveAnalyticsTagsFromApi,
  type AnalyticsTagsPartial,
  type PublicAnalyticsTagsResolved,
} from './analytics-tags';

const EXTERNAL_API_URL = process.env.NEXT_PUBLIC_GCONF_API_URL || 'http://localhost:3000/api';
// SECURITY: prefer server-only GCONF_API_KEY. NEXT_PUBLIC_* is inlined into the
// client bundle and must be rotated upstream. Fallback retained for migration.
const API_KEY = process.env.GCONF_API_KEY || process.env.NEXT_PUBLIC_GCONF_API_KEY || '';

const CACHE_DURATION = 60; // 1 minute

// Request deduplication within same render
const requestCache = new Map<string, Promise<unknown>>();

/** Reduce dev console noise: layout + metadata + page each prefetch analytics */
let devWarnedPublicAnalyticsTagsEmpty = false;

function getCachedRequest<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (requestCache.has(key)) {
    return requestCache.get(key) as Promise<T>;
  }
  const promise = fn();
  requestCache.set(key, promise);
  // Clean up after settling
  promise.finally(() => {
    setTimeout(() => requestCache.delete(key), 100);
  });
  return promise;
}

async function fetchFromAPI<T>(
  endpoint: string,
  options?: { cacheDuration?: number; noAuth?: boolean }
): Promise<T | null> {
  const cacheKey = `fetch:${API_KEY}:${endpoint}`;
  return getCachedRequest(cacheKey, async () => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (!options?.noAuth) {
        headers['Authorization'] = `Bearer ${API_KEY}`;
      }

      const url = `${EXTERNAL_API_URL}${endpoint}`;
      const keyPresent = !!API_KEY;
      console.log(`[prefetch] ${url} (apiKey: ${keyPresent ? 'set' : 'MISSING'})`);
      // `cacheDuration: 0` opts out of the Next data cache for endpoints that
      // must reflect draft/publish flips immediately (sponsor scroller, etc.).
      const cacheDur = options?.cacheDuration ?? CACHE_DURATION;
      const response = await fetch(url, {
        method: 'GET',
        headers,
        ...(cacheDur === 0
          ? { cache: 'no-store' as const }
          : { next: { revalidate: cacheDur } }),
      });

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        console.error(
          `[prefetch] API ${response.status} for ${endpoint}${bodyText ? ` — ${bodyText.slice(0, 200)}` : ''}`,
        );
        return null;
      }

      const json = await response.json();
      return (json.data ?? json) as T;
    } catch (err) {
      // Surface the real cause instead of swallowing silently — otherwise
      // deploy-time env issues and network failures are invisible.
      console.error(`[prefetch] fetch failed for ${endpoint}:`, err instanceof Error ? err.message : err);
      return null;
    }
  });
}

// --- Normalization ---

export function normalizeSpeaker(member: Member): NormalizedSpeaker {
  const name = `${member.person_firstname || ''} ${member.person_surname || ''}`.trim();
  const firstCompany = member.person_companies?.[0];

  // Render contract: activeEnhancedUrl (AI-baked) → person_photo_nobg → person_photo.
  const image =
    member.photo_settings?.activeEnhancedUrl ||
    member.person_photo_nobg ||
    member.person_photo ||
    '';

  return {
    id: member.id,
    name,
    title: member.person_title || undefined,
    slug: member.person_slug,
    role: firstCompany?.person_job_title || '',
    company: firstCompany?.company_name || '',
    image,
    person_photo: member.person_photo ?? null,
    person_photo_nobg: member.person_photo_nobg ?? null,
    photo_settings: member.photo_settings ?? null,
    bio: member.speaker_bio || member.person_bio,
    website: member.person_website,
    socials: member.person_socials,
    companies: member.person_companies,
    isFeatured: member.is_speaker_featured,
  };
}

export function normalizeSponsor(company: Company): NormalizedSponsor {
  return {
    id: company.id,
    name: company.company_name,
    slug: company.company_slug,
    logo: company.company_logo || '',
    bio: company.company_bio,
    website: company.company_website,
    socials: company.company_socials,
    isSponsor: company.company_is_sponsor,
    isPartner: company.company_is_partner,
    logoHasDarkBg: (() => {
      // The canonical DB column is `logo_background_white` (inverted —
      // `false` = the logo has a dark background and must render on a
      // dark tile). The other names are legacy / aspirational that a few
      // older rows might still carry; checked last as a fallback.
      const c = company as unknown as Record<string, unknown>;
      if (typeof c.logo_background_white === 'boolean') return !c.logo_background_white;
      if (typeof c.company_logo_has_dark_bg === 'boolean') return c.company_logo_has_dark_bg as boolean;
      if (typeof c.logo_has_dark_bg === 'boolean') return c.logo_has_dark_bg as boolean;
      if (typeof c.logo_background_dark === 'boolean') return c.logo_background_dark as boolean;
      return undefined;
    })(),
  };
}

function getSpeakerContentScore(member: Member): number {
  let score = 0;
  if (member.is_speaker_featured) score += 100;
  if (member.speaker_bio || member.person_bio) score += (member.speaker_bio || member.person_bio || '').length / 10;
  if (member.person_companies?.[0]?.person_job_title) score += 20;
  if (member.person_companies?.[0]?.company_name) score += 15;
  if (member.person_socials && Object.values(member.person_socials).some(Boolean)) score += 10;
  if (member.person_photo) score += 5;
  return score;
}

// --- Prefetch functions ---

export async function prefetchSpeakers(): Promise<NormalizedSpeaker[]> {
  // cacheDuration: 0 — same rule as companies/sponsors below: publish/draft
  // flag flips must propagate immediately, no Next data-cache window.
  const members = await fetchFromAPI<Member[]>('/members?is_speaker=true&limit=100', { cacheDuration: 0 });
  if (!members) return [];
  return members
    .filter(m => m.is_speaker_published)
    // Primary order: hand-curated `sort_order` (lower = first; NULL =
    // sort to the end). Tail fallback: content score so empty rows still
    // surface the most-complete profiles first. The dashboard's Reorder
    // dialog writes `sort_order`, and that overrides everything else.
    .sort((a, b) => {
      const ao = (a as unknown as { sort_order?: number | null }).sort_order ?? Number.POSITIVE_INFINITY;
      const bo = (b as unknown as { sort_order?: number | null }).sort_order ?? Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;
      return getSpeakerContentScore(b) - getSpeakerContentScore(a);
    })
    .map(normalizeSpeaker);
}

export async function prefetchSpeakerBySlug(slug: string): Promise<Member | null> {
  return fetchFromAPI<Member>(`/members/${slug}`, { cacheDuration: 0 });
}

export async function prefetchTeam(): Promise<NormalizedSpeaker[]> {
  // Same cacheDuration: 0 rule as speakers — publish/draft flips and Photo
  // Studio saves should propagate immediately.
  const members = await fetchFromAPI<Member[]>('/members?type=team&limit=100', { cacheDuration: 0 });
  if (!members) return [];
  return members.filter(m => m.is_published).map(normalizeSpeaker);
}

// Publish/draft flips must propagate immediately on production — pass
// cacheDuration: 0 so these fetches opt out of the Next data cache.
export async function prefetchCompanies(): Promise<Company[]> {
  // Same paginated `/companies` as prefetchPartners: the default 25-row cap
  // silently drops everything past row 25 before the client-side filter, so
  // request the full set (sitemap + llms.txt rely on this being complete).
  const companies = await fetchFromAPI<Company[]>('/companies?limit=500', { cacheDuration: 0 });
  if (!companies) return [];
  return companies.filter(c => c.company_published);
}

export function isPublishedSponsorCompany(company: Company): boolean {
  return !!(
    company.company_published &&
    company.company_logo &&
    company.company_is_sponsor &&
    company.sponsor_published !== false
  );
}

/** Partner section: companies flagged `company_is_partner` on the company record. */
export function isMarkedPartnerCompany(company: Company): boolean {
  return !!(company.company_published && company.company_logo && company.company_is_partner);
}

export async function prefetchSponsors(): Promise<NormalizedSponsor[]> {
  const companies = await fetchFromAPI<Company[]>('/companies/sponsors', { cacheDuration: 0 });
  if (!companies) return [];
  return companies.filter(isPublishedSponsorCompany).map(normalizeSponsor);
}

export async function prefetchPartners(): Promise<NormalizedSponsor[]> {
  // `/companies` is paginated (default 25). Filter client-side after fetching
  // the full set so partners past row 25 are not silently dropped.
  const companies = await fetchFromAPI<Company[]>('/companies?limit=500', { cacheDuration: 0 });
  if (!companies) return [];
  return companies.filter(isMarkedPartnerCompany).map(normalizeSponsor);
}

export async function prefetchVenues(): Promise<Company[]> {
  const companies = await fetchFromAPI<Company[]>('/companies/venues', { cacheDuration: 0 });
  if (!companies) return [];
  return companies.filter(c => c.company_published && c.venue_published);
}

export async function prefetchCompanyBySlug(slug: string): Promise<Company | null> {
  return fetchFromAPI<Company>(`/companies/${slug}`);
}

export async function prefetchVenueDetailPageData(slug: string) {
  const company = await prefetchCompanyBySlug(slug);
  if (!company) return { company: null, seo: null };
  const seo = await prefetchCompanySEO(company.id);
  return { company, seo };
}

export async function prefetchCompanySEO(companyId: string): Promise<SEOSettings | null> {
  return fetchFromAPI<SEOSettings>(`/companies/${companyId}/seo`);
}

export async function prefetchMemberSEO(memberId: string): Promise<SEOSettings | null> {
  return fetchFromAPI<SEOSettings>(`/members/${memberId}/seo`);
}

export async function prefetchSEOSettings(pageSlug: string): Promise<SEOSettings | null> {
  return fetchFromAPI<SEOSettings>(`/cms/seo/${pageSlug}`, { cacheDuration: 30 });
}

export interface SocialLink {
  key: string;
  label: string;
  url: string;
  icon?: string;
  color?: string;
  category?: string;
}

export async function prefetchSocials(): Promise<SocialLink[]> {
  const socials = await fetchFromAPI<SocialLink[]>('/settings/public/socials', { noAuth: false, cacheDuration: 300 });
  return socials || [];
}

export interface CaptchaConfig {
  provider: string;
  site_key: string;
  /** When true, the tenant has explicitly disabled captcha — skip the widget + verification. */
  disabled?: boolean;
}

export async function prefetchCaptchaConfig(): Promise<CaptchaConfig> {
  const data = await fetchFromAPI<CaptchaConfig>('/settings/public/captcha', { noAuth: false, cacheDuration: 60 });
  return data || { provider: 'recaptcha', site_key: '', disabled: false };
}

export async function prefetchPublicAnalyticsTags(): Promise<PublicAnalyticsTagsResolved> {
  const keyPresent = API_KEY.trim().length > 0;
  const raw = await fetchFromAPI<AnalyticsTagsPartial>(
    '/settings/public/analytics-tags',
    { noAuth: false, cacheDuration: 60 },
  );
  const resolved = resolveAnalyticsTagsFromApi(raw);
  if (
    process.env.NODE_ENV === 'development' &&
    !Object.values(resolved).some(Boolean) &&
    !devWarnedPublicAnalyticsTagsEmpty
  ) {
    devWarnedPublicAnalyticsTagsEmpty = true;
    if (!keyPresent) {
      console.warn(
        '[analytics-tags] All empty — set GCONF_API_KEY (same tenant Website API Key as Dashboard) so /settings/public/analytics-tags can resolve.',
      );
    } else if (raw == null) {
      console.warn(
        '[analytics-tags] All empty — API request failed (see [prefetch] errors above). Often 401 Invalid API key or wrong NEXT_PUBLIC_GCONF_API_URL.',
      );
    } else {
      console.warn(
        '[analytics-tags] API OK but no IDs for this key’s tenant (settings.analytics_tags is {} or values were stripped). If Dashboard shows IDs, the Dashboard session may be another tenant or hitting a different API/DB than NEXT_PUBLIC_GCONF_API_URL. Confirm with: curl -sS -H "Authorization: Bearer <GCONF_API_KEY>" "<API>/settings/public/analytics-tags"',
      );
    }
  }
  return resolved;
}

/** Verifies a captcha token server-side via ep-api, using the tenant's secret. */
export async function verifyCaptchaToken(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (API_KEY) headers['Authorization'] = `Bearer ${API_KEY}`;
    const response = await fetch(`${EXTERNAL_API_URL}/settings/public/captcha/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ token }),
      cache: 'no-store',
    });
    if (!response.ok) return false;
    const json = await response.json() as { data?: { valid?: boolean } };
    return json.data?.valid === true;
  } catch (error) {
    console.error('[verifyCaptchaToken] error:', error);
    return false;
  }
}

export async function prefetchHomePageData() {
  const [speakers, sponsors, partners, socials] = await Promise.all([
    prefetchSpeakers(),
    prefetchSponsors(),
    prefetchPartners(),
    prefetchSocials(),
  ]);
  return { speakers, sponsors, partners, socials };
}

export async function prefetchSpeakerDetailPageData(slug: string) {
  const [member, allSpeakers] = await Promise.all([
    prefetchSpeakerBySlug(slug),
    prefetchSpeakers(),
  ]);

  if (!member) return { member: null, speaker: null, companies: [], colorIndex: 0 };

  // Resolve associated companies
  const companyIds = member.person_companies?.map(c => c.company_id) ?? [];
  const companies = companyIds.length > 0
    ? (await Promise.all(companyIds.map(cid => prefetchCompanyBySlug(cid))))
        .filter((c): c is Company => c != null && c.company_published)
    : [];

  const speaker = normalizeSpeaker(member);
  const colorIndex = allSpeakers.findIndex(s => s.id === member.id);

  return {
    member,
    speaker,
    companies,
    colorIndex: colorIndex >= 0 ? colorIndex : 0,
  };
}

export async function prefetchCompanyDetailPageData(slug: string) {
  const company = await prefetchCompanyBySlug(slug);
  if (!company) return { company: null };

  const seo = await prefetchCompanySEO(company.id);
  return { company, seo };
}

export async function prefetchSponsorDetailPageData(slug: string) {
  return prefetchCompanyDetailPageData(slug);
}

export async function prefetchCMSPage(pageSlug: string): Promise<CMSPageData | null> {
  return fetchFromAPI<CMSPageData>(`/cms/pages/${pageSlug}`, { cacheDuration: 60 });
}

export async function prefetchNavigation(): Promise<NavigationAPIData | null> {
  const nav = await fetchFromAPI<NavigationAPIData>('/settings/public/navigation', { cacheDuration: 60 });
  if (nav) {
    console.log(
      '[prefetch/nav] mainNav:',
      (nav.mainNav || []).map((i) => `${i.slug}${i.published ? '' : '(hidden)'}`).join(', ') || '(empty)',
    );
  } else {
    console.log('[prefetch/nav] null response — nav fallback to siteConfig');
  }
  return nav;
}

export function mapNavigationData(apiNav: NavigationAPIData): NavigationConfig {
  // Filter out 'contact' — the Navbar renders a dedicated Contact button
  const mainItems = (apiNav.mainNav || [])
    .filter(item => item.published && item.slug !== 'contact')
    .map(item => ({
      label: item.label,
      href: `/${item.slug}`,
    }));
  console.log('[mapNavigationData] main items →', mainItems.map(i => `${i.label}→${i.href}`).join(', '));

  const legalItems = (apiNav.footerCol2 || [])
    .filter(item => item.published)
    .map(item => ({
      label: item.label,
      href: `/${item.slug}`,
    }));

  const headerLink = apiNav.footerBuilder?.headerCustomLinks?.[0];

  return {
    main: mainItems,
    legal: legalItems,
    actionButton: {
      label: headerLink?.label || 'Tickets',
      link: headerLink?.url || '#',
      title: headerLink?.label || 'Tickets',
      target: headerLink?.target || undefined,
    },
    contactEmail: 'contact@deaisummit.org',
    socials: {
      twitter: '',
      linkedin: '',
      youtube: '',
    },
  };
}

import { Member, Company, SEOSettings, NormalizedSpeaker, NormalizedSponsor, CMSPageData, NavigationAPIData } from './api-types';
import type { NavigationConfig } from '@/config/types';

const EXTERNAL_API_URL = process.env.NEXT_PUBLIC_GCONF_API_URL || 'http://localhost:3000/api';
const API_KEY = process.env.NEXT_PUBLIC_GCONF_API_KEY || '';

const CACHE_DURATION = 60; // 1 minute

// Request deduplication within same render
const requestCache = new Map<string, Promise<unknown>>();

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

  return {
    id: member.id,
    name,
    title: member.person_title || undefined,
    slug: member.person_slug,
    role: firstCompany?.person_job_title || '',
    company: firstCompany?.company_name || '',
    image: member.person_photo_nobg || member.person_photo || '',
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
    logoHasDarkBg:
      company.company_logo_has_dark_bg ??
      (company as unknown as Record<string, unknown>).logo_has_dark_bg as boolean | undefined ??
      (company as unknown as Record<string, unknown>).logo_background_dark as boolean | undefined,
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
  const members = await fetchFromAPI<Member[]>('/members?is_speaker=true&limit=100');
  if (!members) return [];
  return members
    .filter(m => m.is_speaker_published)
    .sort((a, b) => getSpeakerContentScore(b) - getSpeakerContentScore(a))
    .map(normalizeSpeaker);
}

export async function prefetchSpeakerBySlug(slug: string): Promise<Member | null> {
  return fetchFromAPI<Member>(`/members/${slug}`);
}

// Publish/draft flips must propagate immediately on production — pass
// cacheDuration: 0 so these fetches opt out of the Next data cache.
export async function prefetchCompanies(): Promise<Company[]> {
  const companies = await fetchFromAPI<Company[]>('/companies', { cacheDuration: 0 });
  if (!companies) return [];
  return companies.filter(c => c.company_published);
}

export async function prefetchSponsors(): Promise<NormalizedSponsor[]> {
  const companies = await fetchFromAPI<Company[]>('/companies/sponsors', { cacheDuration: 0 });
  if (!companies) return [];
  return companies
    .filter(c => c.company_published && c.sponsor_published && c.company_logo)
    .map(normalizeSponsor);
}

export async function prefetchPartners(): Promise<NormalizedSponsor[]> {
  const companies = await fetchFromAPI<Company[]>('/companies', { cacheDuration: 0 });
  if (!companies) return [];
  return companies
    .filter(c => c.company_published && c.company_logo && (
      (c.company_is_partner && c.partner_published) || (c.company_is_sponsor && c.sponsor_published)
    ))
    .map(normalizeSponsor);
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

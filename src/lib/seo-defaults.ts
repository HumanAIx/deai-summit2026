import type { Metadata } from 'next';
import type { SEOSettings } from './api-types';

export const SEO_DEFAULTS = {
  siteName: 'DeAI Summit 2026',
  defaultTitle: 'DeAI Summit 2026 - Malta',
  defaultDescription: 'The Global Inflection Point for AI Governance. Where frontier AI, decentralized systems, and global regulators confront the future of intelligence. Malta, Europe — Q4 2026.',
  /** Must exist under `public/` — used when CMS/entity has no og_image. */
  defaultImage: '/whatisdeaiSummit.jpg',
  twitterCard: 'summary_large_image' as const,
  ogType: 'website' as const,
  defaultRobots: 'all',
} as const;

export const PAGE_TITLES: Record<string, string> = {
  home: SEO_DEFAULTS.defaultTitle,
  speakers: `Speakers - ${SEO_DEFAULTS.siteName}`,
  team: `Team - ${SEO_DEFAULTS.siteName}`,
  companies: `Companies - ${SEO_DEFAULTS.siteName}`,
  sponsors: `Sponsors & Partners - ${SEO_DEFAULTS.siteName}`,
  partners: `Sponsors & Partners - ${SEO_DEFAULTS.siteName}`,
  agenda: `Agenda - ${SEO_DEFAULTS.siteName}`,
  schedule: `Schedule - ${SEO_DEFAULTS.siteName}`,
  contact: `Contact - ${SEO_DEFAULTS.siteName}`,
  blog: `Insights - ${SEO_DEFAULTS.siteName}`,
  terms: `Terms & Conditions - ${SEO_DEFAULTS.siteName}`,
  privacy: `Privacy Policy - ${SEO_DEFAULTS.siteName}`,
  'coming-soon': `Coming Soon - ${SEO_DEFAULTS.siteName}`,
};

export const PAGE_DESCRIPTIONS: Record<string, string> = {
  home: SEO_DEFAULTS.defaultDescription,
  speakers: 'Meet the leading voices at DeAI Summit 2026. Speakers from frontier AI, decentralized systems, policy, and academia.',
  team: 'Meet the team behind DeAI Summit 2026.',
  companies: 'Companies participating in DeAI Summit 2026.',
  sponsors: 'Sponsors and partners of DeAI Summit 2026.',
  partners: 'Meet the sponsors and partners powering DeAI Summit 2026. Join leading organizations shaping the future of decentralized AI.',
  agenda: 'DeAI Summit 2026 agenda. High-stakes programming formats including Oxford debates, technical rebuttals, and alignment sessions.',
  schedule: 'Full conference schedule — keynotes, sessions, and speakers at DeAI Malta.',
  contact: 'Get in touch with the DeAI Summit 2026 team for partnerships, sponsorships, speaker applications, and general inquiries.',
  blog: 'Analysis, research, and perspectives on decentralised AI, governance, and the evidence shaping DeAI Summit 2026.',
  terms: 'General terms and conditions for DeAI Summit 2026.',
  privacy: 'Privacy statement for DeAI Summit 2026.',
  'coming-soon': SEO_DEFAULTS.defaultDescription,
};

export const PAGE_CANONICALS: Record<string, string> = {
  home: '/',
  speakers: '/speakers',
  team: '/team',
  companies: '/companies',
  sponsors: '/partners',
  partners: '/partners',
  agenda: '/agenda',
  schedule: '/schedule',
  contact: '/contact',
  blog: '/blog',
  terms: '/terms',
  privacy: '/privacy',
  'coming-soon': '/coming-soon',
};

export function getAbsoluteImageUrl(image: string | undefined | null, baseUrl: string): string | undefined {
  if (!image) return undefined;
  if (image.startsWith('http')) return image;
  return `${baseUrl}${image.startsWith('/') ? '' : '/'}${image}`;
}

const TENANT_SLUG = process.env.TENANT_SLUG || 'deaisummit';
const STORAGE_BUCKET = 'tenants';

/**
 * Rewrite tenant Supabase public storage URLs through the branded `/files/` proxy.
 *
 * Direct supabase.co URLs send `x-robots-tag: none`, which causes Facebook /
 * LinkedIn / Telegram crawlers to refuse the image for link previews.
 * `/files/[...path]` re-serves the same bytes without that header.
 *
 * Appends `?format=jpeg` so the proxy re-encodes WebP/AVIF — Telegram link
 * previews historically fail on WebP og:image.
 */
export function toBrandedFilesUrl(imageUrl: string, baseUrl: string): string {
  if (!baseUrl || !imageUrl.startsWith('http')) return imageUrl;
  try {
    const u = new URL(imageUrl);
    const prefix = `/storage/v1/object/public/${STORAGE_BUCKET}/${TENANT_SLUG}/`;
    if (!u.pathname.startsWith(prefix)) return imageUrl;
    const rest = u.pathname.slice(prefix.length);
    if (!rest) return imageUrl;
    const encoded = rest
      .split('/')
      .filter(Boolean)
      .map((seg) => encodeURIComponent(decodeURIComponent(seg)))
      .join('/');
    const branded = `${baseUrl.replace(/\/+$/, '')}/files/${encoded}`;
    // Always request JPEG for social crawlers (safe for already-JPEG sources too).
    return `${branded}?format=jpeg`;
  } catch {
    return imageUrl;
  }
}

/**
 * Prefer CMS og_image, then an entity/page fallback, then the site default.
 * Always returns an absolute URL suitable for og:image / twitter:image.
 */
export function resolveSocialImage(
  seoOgImage: string | null | undefined,
  fallbackImage: string | null | undefined,
  baseUrl: string,
): string {
  const absolute =
    getAbsoluteImageUrl(seoOgImage, baseUrl) ||
    getAbsoluteImageUrl(fallbackImage, baseUrl) ||
    getAbsoluteImageUrl(SEO_DEFAULTS.defaultImage, baseUrl)!;
  const branded = toBrandedFilesUrl(absolute, baseUrl);
  // Local public assets that are already JPEG/PNG stay as-is; WebP locals get
  // no converter — prefer the site JPEG default in that rare case.
  if (branded === absolute && /\.webp(\?|$)/i.test(absolute)) {
    return getAbsoluteImageUrl(SEO_DEFAULTS.defaultImage, baseUrl)!;
  }
  return branded;
}

function toAbsoluteUrl(pathOrUrl: string, baseUrl: string): string {
  if (pathOrUrl.startsWith('http')) return pathOrUrl;
  if (!baseUrl) return pathOrUrl;
  if (pathOrUrl === '/') return `${baseUrl}/`;
  return `${baseUrl}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

/** Blog storage folder name derived from slug (matches ep-api upload paths). */
export function slugToBlogStorageFolder(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Prefer featured_image when seo.og_image still points at a pre-rename storage folder.
 * Stale og_image URLs break Telegram/Facebook previews (404 on fetch).
 */
export function resolveBlogOgImage(
  featuredImage: string | null | undefined,
  seoOgImage: string | null | undefined,
  slug: string | null | undefined,
): string | null | undefined {
  if (!seoOgImage) return featuredImage;
  if (!featuredImage || !slug) return seoOgImage;
  const folder = slugToBlogStorageFolder(slug);
  if (seoOgImage.includes(`/blog/${folder}/`)) return seoOgImage;
  return featuredImage;
}

type ValidOgType = 'website' | 'article' | 'profile' | 'book' | 'music.song' | 'music.album' | 'music.playlist' | 'music.radio_station' | 'video.movie' | 'video.episode' | 'video.tv_show' | 'video.other';

function getValidOgType(ogType?: string): ValidOgType {
  const valid: ValidOgType[] = ['website', 'article', 'profile', 'book'];
  if (ogType && valid.includes(ogType as ValidOgType)) return ogType as ValidOgType;
  return SEO_DEFAULTS.ogType;
}

export function buildSocialMetadata(options: {
  title: string;
  description: string;
  seo?: SEOSettings | null;
  /** Entity photo/logo or other page-specific fallback when CMS has no og_image. */
  imageFallback?: string | null;
  baseUrl: string;
  ogType?: string;
  imageAlt?: string;
  /** Optional absolute or path URL for og:url */
  url?: string;
  publishedTime?: string;
}): Pick<Metadata, 'openGraph' | 'twitter'> {
  const { title, description, seo, imageFallback, baseUrl, imageAlt, url, publishedTime } = options;
  const ogTitle = seo?.og_title || title;
  const ogDescription = seo?.og_description || description;
  const ogImage = resolveSocialImage(seo?.og_image, imageFallback, baseUrl);
  const type = getValidOgType(seo?.og_type || options.ogType);
  const isJpegSocial = /format=jpeg/i.test(ogImage) || /\.jpe?g(\?|$)/i.test(ogImage);

  return {
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      images: [{
        url: ogImage,
        alt: imageAlt || String(ogTitle),
        ...(isJpegSocial ? { type: 'image/jpeg', width: 1200, height: 630 } : {}),
      }],
      type,
      siteName: SEO_DEFAULTS.siteName,
      ...(url ? { url } : {}),
      ...(publishedTime ? { publishedTime } : {}),
    },
    twitter: {
      card: SEO_DEFAULTS.twitterCard,
      title: ogTitle,
      description: ogDescription,
      images: [ogImage],
    },
  };
}

export function generatePageMetadata(
  seo: SEOSettings | null,
  pageSlug: string,
  baseUrl: string = process.env.NEXT_PUBLIC_SITE_URL || ''
): Metadata {
  const title = seo?.meta_title || PAGE_TITLES[pageSlug] || SEO_DEFAULTS.defaultTitle;
  const description = seo?.meta_description || PAGE_DESCRIPTIONS[pageSlug] || SEO_DEFAULTS.defaultDescription;
  const canonicalPath = seo?.canonical_url || PAGE_CANONICALS[pageSlug] || '/';
  const canonical = toAbsoluteUrl(canonicalPath, baseUrl);

  return {
    title,
    description,
    keywords: seo?.meta_keywords || undefined,
    robots: seo?.robots_tag?.toLowerCase() || SEO_DEFAULTS.defaultRobots,
    ...buildSocialMetadata({ title, description, seo, baseUrl }),
    alternates: {
      canonical,
    },
  };
}

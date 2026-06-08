import type { Metadata } from 'next';
import type { SEOSettings } from './api-types';

export const SEO_DEFAULTS = {
  siteName: 'DeAI Summit 2026',
  defaultTitle: 'DeAI Summit 2026 - Malta',
  defaultDescription: 'The Global Inflection Point for AI Governance. Where frontier AI, decentralized systems, and global regulators confront the future of intelligence. Malta, 28-30 October 2026.',
  defaultImage: '/og-image.png',
  twitterCard: 'summary_large_image' as const,
  ogType: 'website' as const,
  defaultRobots: 'all',
} as const;

export const PAGE_TITLES: Record<string, string> = {
  home: SEO_DEFAULTS.defaultTitle,
  speakers: `Speakers - ${SEO_DEFAULTS.siteName}`,
  companies: `Companies - ${SEO_DEFAULTS.siteName}`,
  sponsors: `Sponsors & Partners - ${SEO_DEFAULTS.siteName}`,
  agenda: `Agenda - ${SEO_DEFAULTS.siteName}`,
  blog: `Insights - ${SEO_DEFAULTS.siteName}`,
  terms: `Terms & Conditions - ${SEO_DEFAULTS.siteName}`,
  privacy: `Privacy Policy - ${SEO_DEFAULTS.siteName}`,
};

export const PAGE_DESCRIPTIONS: Record<string, string> = {
  home: SEO_DEFAULTS.defaultDescription,
  speakers: 'Meet the leading voices at DeAI Summit 2026. Speakers from frontier AI, decentralized systems, policy, and academia.',
  companies: 'Companies participating in DeAI Summit 2026.',
  sponsors: 'Sponsors and partners of DeAI Summit 2026.',
  agenda: 'DeAI Summit 2026 agenda. High-stakes programming formats including Oxford debates, technical rebuttals, and alignment sessions.',
  blog: 'Analysis, research, and perspectives on decentralised AI, governance, and the evidence shaping DeAI Summit 2026.',
};

export const PAGE_CANONICALS: Record<string, string> = {
  home: '/',
  speakers: '/speakers',
  companies: '/companies',
  sponsors: '/partners',
  agenda: '/agenda',
  blog: '/blog',
  terms: '/terms',
  privacy: '/privacy',
};

export function getAbsoluteImageUrl(image: string | undefined | null, baseUrl: string): string | undefined {
  if (!image) return undefined;
  if (image.startsWith('http')) return image;
  return `${baseUrl}${image.startsWith('/') ? '' : '/'}${image}`;
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

export function generatePageMetadata(
  seo: SEOSettings | null,
  pageSlug: string,
  baseUrl: string = process.env.NEXT_PUBLIC_SITE_URL || ''
): Metadata {
  const title = seo?.meta_title || PAGE_TITLES[pageSlug] || SEO_DEFAULTS.defaultTitle;
  const description = seo?.meta_description || PAGE_DESCRIPTIONS[pageSlug] || SEO_DEFAULTS.defaultDescription;
  const ogTitle = seo?.og_title || title;
  const ogDescription = seo?.og_description || description;
  const ogImage = getAbsoluteImageUrl(seo?.og_image, baseUrl) || getAbsoluteImageUrl(SEO_DEFAULTS.defaultImage, baseUrl);
  const canonical = seo?.canonical_url || PAGE_CANONICALS[pageSlug] || '/';

  return {
    title,
    description,
    keywords: seo?.meta_keywords || undefined,
    robots: seo?.robots_tag?.toLowerCase() || SEO_DEFAULTS.defaultRobots,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      ...(ogImage && { images: [{ url: ogImage, alt: String(title) }] }),
      type: getValidOgType(seo?.og_type),
      siteName: SEO_DEFAULTS.siteName,
    },
    twitter: {
      card: SEO_DEFAULTS.twitterCard,
      title: ogTitle,
      description: ogDescription,
      ...(ogImage && { images: [ogImage] }),
    },
    alternates: {
      canonical,
    },
  };
}

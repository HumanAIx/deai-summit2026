import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  prefetchBlogDetailPageData,
  prefetchNavigation,
  prefetchSocials,
  mapNavigationData,
} from '@/lib/prefetch';
import { SEO_DEFAULTS } from '@/lib/seo-defaults';
import { generateArticleSchema, jsonLdSafe } from '@/lib/structured-data';
import { BlogDetailClient } from '@/components/BlogDetailClient';
import type { BlogPost } from '@/lib/api-types';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deaisummit.org';

function getAbsoluteImageUrl(image: string | null | undefined, baseUrl: string): string {
  if (!image) return `${baseUrl}/og-image.png`;
  if (image.startsWith('http://') || image.startsWith('https://')) return image;
  return `${baseUrl}${image.startsWith('/') ? '' : '/'}${image}`;
}

interface BlogDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: BlogDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { post } = await prefetchBlogDetailPageData(slug);

  if (!post) {
    return { title: 'Article Not Found' };
  }

  const blogPost = post as BlogPost;
  const seo = blogPost.seo || null;

  const title = seo?.meta_title || blogPost.meta_title ||
    (blogPost.title ? `${blogPost.title} | ${SEO_DEFAULTS.siteName}` : `Blog | ${SEO_DEFAULTS.siteName}`);

  const description = seo?.meta_description || blogPost.meta_description || SEO_DEFAULTS.defaultDescription;
  const ogTitle = seo?.og_title || title;
  const ogDescription = seo?.og_description || description;
  const ogImage = getAbsoluteImageUrl(seo?.og_image || blogPost.featured_image, BASE_URL);
  const canonicalUrl = seo?.canonical_url || `${BASE_URL}/blog/${blogPost.slug || slug}`;

  return {
    title,
    description,
    keywords: seo?.meta_keywords || undefined,
    robots: seo?.robots_tag?.toLowerCase() || SEO_DEFAULTS.defaultRobots,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      images: [{ url: ogImage, alt: blogPost.title || 'Blog Post' }],
      type: 'article',
      siteName: SEO_DEFAULTS.siteName,
      ...(blogPost.published_at && { publishedTime: blogPost.published_at }),
    },
    twitter: {
      card: SEO_DEFAULTS.twitterCard,
      title: ogTitle,
      description: ogDescription,
      images: [ogImage],
    },
  };
}

export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  const { slug } = await params;

  const [{ post, publishers }, apiNav, socials] = await Promise.all([
    prefetchBlogDetailPageData(slug),
    prefetchNavigation(),
    prefetchSocials(),
  ]);

  if (!post) {
    notFound();
  }

  const navigationData = apiNav ? mapNavigationData(apiNav) : undefined;
  const blogPost = post as BlogPost;

  const autoSchema = generateArticleSchema(blogPost, publishers, BASE_URL);
  const seoOverrides = blogPost.seo?.structured_data as Record<string, unknown> | undefined;

  const { _proDefinitions, _proFaq, _proHowTo, _proRankedList, ...regularOverrides } = (seoOverrides || {}) as Record<string, unknown>;
  const schema = autoSchema && Object.keys(regularOverrides).length > 0
    ? { ...autoSchema, ...regularOverrides }
    : autoSchema;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: blogPost.title },
    ],
  };

  const videoSchemas: Record<string, unknown>[] = [];
  try {
    const blocks = blogPost.content_blocks || JSON.parse(blogPost.content || '[]');
    if (Array.isArray(blocks)) {
      for (const block of blocks) {
        if (block.published !== false && block.type === 'youtube' && block.videoUrl) {
          const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /youtube\.com\/shorts\/([^&\n?#]+)/,
          ];
          let videoId: string | null = null;
          for (const pattern of patterns) {
            const match = block.videoUrl.match(pattern);
            if (match) { videoId = match[1]; break; }
          }
          if (videoId) {
            videoSchemas.push({
              '@context': 'https://schema.org',
              '@type': 'VideoObject',
              name: block.title || blogPost.title,
              embedUrl: `https://www.youtube.com/embed/${videoId}`,
            });
          }
        }
      }
    }
  } catch { /* content is not JSON array */ }

  return (
    <>
      {schema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(schema) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(breadcrumbSchema) }} />
      {_proDefinitions && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe({ '@context': 'https://schema.org', ..._proDefinitions as object }) }} />
      )}
      {_proFaq && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe({ '@context': 'https://schema.org', ..._proFaq as object }) }} />
      )}
      {_proHowTo && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe({ '@context': 'https://schema.org', ..._proHowTo as object }) }} />
      )}
      {_proRankedList && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe({ '@context': 'https://schema.org', ..._proRankedList as object }) }} />
      )}
      {videoSchemas.map((vs, idx) => (
        <script key={`video-${idx}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(vs) }} />
      ))}
      <BlogDetailClient
        post={blogPost}
        publishers={publishers}
        navigationData={navigationData}
        navigationAPIData={apiNav || undefined}
        socials={socials}
      />
    </>
  );
}

import type { Metadata } from 'next';
import { prefetchBlogPageData, prefetchNavigation, prefetchSocials, mapNavigationData } from '@/lib/prefetch';
import { generatePageMetadata } from '@/lib/seo-defaults';
import { BlogListClient } from '@/components/BlogListClient';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deaisummit.org';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { cmsPage } = await prefetchBlogPageData();
  return generatePageMetadata(cmsPage?.seo || null, 'blog', BASE_URL);
}

export default async function BlogPage() {
  const [{ posts, cmsPage }, apiNav, socials] = await Promise.all([
    prefetchBlogPageData(),
    prefetchNavigation(),
    prefetchSocials(),
  ]);

  const navigationData = apiNav ? mapNavigationData(apiNav) : undefined;

  return (
    <BlogListClient
      posts={posts}
      cmsPage={cmsPage}
      navigationData={navigationData}
      navigationAPIData={apiNav || undefined}
      socials={socials}
    />
  );
}

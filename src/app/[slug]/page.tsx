import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LegalPageShell } from '@/components/LegalPageShell';
import { siteConfig } from '@/config/site';
import {
  prefetchCMSPage,
  prefetchNavigation,
  prefetchSocials,
  mapNavigationData,
} from '@/lib/prefetch';
import { generatePageMetadata, SEO_DEFAULTS } from '@/lib/seo-defaults';
import type { CMSBlock, CMSPageData } from '@/lib/api-types';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deaisummit.org';

type PageProps = {
  params: Promise<{ slug: string }>;
};

function parseBlocks(cmsPage: CMSPageData): CMSBlock[] {
  const rawBlocks = cmsPage.content?.blocks;
  let blocks: CMSBlock[] = Array.isArray(rawBlocks)
    ? (rawBlocks as CMSBlock[])
    : rawBlocks
      ? (Object.values(rawBlocks) as CMSBlock[])
      : [];

  const blockOrder = cmsPage.content?.blockOrder;
  if (blockOrder?.length) {
    const map = new Map(blocks.map((b) => [b.id, b]));
    const ordered: CMSBlock[] = [];
    for (const id of blockOrder) {
      const block = map.get(id);
      if (block) ordered.push(block);
    }
    for (const block of blocks) {
      if (!ordered.includes(block)) ordered.push(block);
    }
    blocks = ordered;
  }

  return blocks.filter((b) => (b as { published?: boolean }).published !== false);
}

function blockBody(block: CMSBlock): string {
  const content = typeof block.content === 'string' ? block.content.trim() : '';
  if (content) return content;
  const nodes = block.textNodes;
  if (Array.isArray(nodes) && nodes.length > 0) {
    return nodes
      .map((n) => (typeof n?.text === 'string' ? n.text : ''))
      .filter(Boolean)
      .join('\n\n');
  }
  return '';
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cmsPage = await prefetchCMSPage(slug);
  if (!cmsPage) {
    return { title: SEO_DEFAULTS.defaultTitle };
  }

  return generatePageMetadata(cmsPage.seo || null, slug, BASE_URL, {
    title: `${cmsPage.page_title} - ${SEO_DEFAULTS.siteName}`,
    description: SEO_DEFAULTS.defaultDescription,
  });
}

/**
 * Catch-all for CMS content pages that don't have a dedicated App Router folder
 * (e.g. Partner Hotels → /partner-hotels). Static routes like /speakers win first.
 */
export default async function CmsContentPage({ params }: PageProps) {
  const { slug } = await params;

  const [cmsPage, apiNav, socials] = await Promise.all([
    prefetchCMSPage(slug),
    prefetchNavigation(),
    prefetchSocials(),
  ]);

  if (!cmsPage) {
    notFound();
  }

  const navigationData = apiNav ? mapNavigationData(apiNav) : siteConfig.navigation;
  const blocks = parseBlocks(cmsPage);
  const title =
    blocks.find((b) => typeof b.title === 'string' && b.title.trim())?.title?.trim() ||
    cmsPage.page_title ||
    slug;

  const sections = blocks
    .map((block) => ({
      id: block.id,
      heading: typeof block.title === 'string' ? block.title.trim() : '',
      body: blockBody(block),
    }))
    .filter((s) => s.body || (s.heading && s.heading !== title));

  return (
    <LegalPageShell
      title={title}
      navigationData={navigationData}
      navigationAPIData={apiNav || undefined}
      socials={socials}
    >
      {sections.length > 0 ? (
        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.id}>
              {section.heading && section.heading !== title ? (
                <h2 className="text-2xl font-semibold mb-4">{section.heading}</h2>
              ) : null}
              {section.body ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.body}</ReactMarkdown>
              ) : null}
            </section>
          ))}
        </div>
      ) : (
        <p className="text-slate-500">This page hasn&apos;t been published yet.</p>
      )}
    </LegalPageShell>
  );
}

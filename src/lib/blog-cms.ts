import type { BlogPost, CMSBlock, CMSBlogArticleItem, CMSPageData } from './api-types';

function visibleBlock(b: CMSBlock): boolean {
  if (b.published === false) return false;
  if ((b as { showSection?: boolean }).showSection === false) return false;
  return true;
}

function orderedBlocks(blocks: CMSBlock[], blockOrder?: string[]): CMSBlock[] {
  if (!blockOrder?.length) return blocks;
  const map = new Map(blocks.map(b => [b.id, b]));
  const ordered: CMSBlock[] = [];
  for (const id of blockOrder) {
    const block = map.get(id);
    if (block) ordered.push(block);
  }
  for (const block of blocks) {
    if (!ordered.includes(block)) ordered.push(block);
  }
  return ordered;
}

function parseCmsBlocks(cmsPage: CMSPageData | null): { blocks: CMSBlock[]; blockOrder?: string[] } {
  if (!cmsPage) return { blocks: [] };

  let content: Record<string, unknown> | null = null;
  const rawContent = cmsPage.content;
  if (typeof rawContent === 'string') {
    try {
      content = JSON.parse(rawContent) as Record<string, unknown>;
    } catch {
      content = null;
    }
  } else if (rawContent && typeof rawContent === 'object') {
    content = rawContent as Record<string, unknown>;
  }

  const rawBlocks = (content?.blocks as unknown) ?? [];
  const blockOrder = (content?.blockOrder as string[] | undefined) ?? cmsPage.content?.blockOrder;

  let blocks: CMSBlock[] = [];
  if (Array.isArray(rawBlocks)) {
    blocks = rawBlocks as CMSBlock[];
  } else if (rawBlocks && typeof rawBlocks === 'object') {
    blocks = Object.values(rawBlocks as Record<string, CMSBlock>).filter(Boolean);
  }

  return { blocks, blockOrder };
}

function cmsArticleToPost(article: CMSBlogArticleItem): BlogPost {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    published: true,
    published_at: article.published_at || '',
    featured_image: article.featured_image,
    reading_time: article.reading_time || 0,
    created_at: article.published_at || '',
    last_updated: article.published_at || '',
    author_id: '',
    meta_title: article.title,
    meta_description: article.meta_description || '',
    editors: [],
  };
}

function isBlogListBlock(block: CMSBlock): boolean {
  return block.addon === 'blog-articles-list';
}

function isHeroCandidate(block: CMSBlock): boolean {
  return block.type === 'hero' || block.type === 'heading' || block.type === 'content' || !!block.title;
}

export interface BlogPageModel {
  hasCmsPage: boolean;
  hero: {
    show: boolean;
    subtitle: string;
    title: string;
    content: string;
  };
  list: {
    show: boolean;
    subtitle: string;
    title: string;
  };
  /** Hero and list headings come from the same CMS block (DeAI default layout). */
  isCombinedBlock: boolean;
  posts: BlogPost[];
}

export function buildBlogPageModel(
  cmsPage: CMSPageData | null,
  apiPosts: BlogPost[],
): BlogPageModel {
  const { blocks, blockOrder } = parseCmsBlocks(cmsPage);
  const published = orderedBlocks(blocks, blockOrder).filter(visibleBlock);

  const listBlock = published.find(isBlogListBlock);
  const heroOnlyBlock = published.find(b => isHeroCandidate(b) && !isBlogListBlock(b));
  const heroBlock = heroOnlyBlock ?? listBlock ?? null;

  const cmsArticles = (listBlock?.items as CMSBlogArticleItem[] | undefined) ?? [];
  const posts = cmsArticles.length > 0
    ? cmsArticles.map(cmsArticleToPost)
    : apiPosts;

  const hasCmsPage = published.length > 0;
  const isCombinedBlock = !!listBlock && heroBlock?.id === listBlock.id;

  const heroContent =
    (typeof heroBlock?.content === 'string' ? heroBlock.content : '') ||
    (typeof heroBlock?.description === 'string' ? heroBlock.description : '');

  return {
    hasCmsPage,
    hero: {
      show: hasCmsPage ? !!heroBlock : true,
      subtitle: heroBlock?.subtitle?.trim() || (hasCmsPage ? '' : 'Insights & Analysis'),
      title: heroBlock?.title?.trim() || (hasCmsPage ? '' : 'From the **DeAI Summit** Desk'),
      content: heroContent,
    },
    list: {
      show: hasCmsPage ? !!listBlock : true,
      subtitle: isCombinedBlock
        ? ((listBlock?.description as string)?.trim() || 'Browse')
        : (listBlock?.subtitle?.trim() || (hasCmsPage ? '' : 'Browse')),
      title: isCombinedBlock
        ? 'Latest Articles'
        : (listBlock?.title?.trim() || (hasCmsPage ? '' : 'All Articles')),
    },
    isCombinedBlock,
    posts,
  };
}

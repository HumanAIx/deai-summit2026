import type { CMSBlock } from '@/lib/api-types';

/** CMS may vary casing; treat any `schedule` addon the same. */
function isScheduleAddon(b: CMSBlock): boolean {
  return String(b.addon ?? '').trim().toLowerCase() === 'schedule';
}

function scheduleIdFromBlock(b: CMSBlock): string | undefined {
  const raw = (b as Record<string, unknown>).scheduleId ?? (b as Record<string, unknown>).schedule_id;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

/**
 * Never use a block tied to a schedule as the "hero" row — it would be removed from `bodyBlocks`.
 * Any `scheduleId` counts, even if `addon` was left as something else in stored JSON.
 */
function isScheduleLikeBlock(b: CMSBlock): boolean {
  if (scheduleIdFromBlock(b)) return true;
  return isScheduleAddon(b);
}

function visibleBlock(b: CMSBlock): boolean {
  // Programme blocks must render even if a legacy `published: false` slipped in on save.
  if (scheduleIdFromBlock(b)) return true;
  if (b.published === false) return false;
  if ((b as { showSection?: boolean }).showSection === false) return false;
  return true;
}

function orderedBlocks(blocks: CMSBlock[], blockOrder?: string[]): CMSBlock[] {
  if (!blockOrder?.length) return blocks;
  const map = new Map(blocks.map((b) => [b.id, b]));
  const ordered: CMSBlock[] = [];
  for (const id of blockOrder) {
    const x = map.get(id);
    if (x) ordered.push(x);
  }
  for (const b of blocks) {
    if (!ordered.includes(b)) ordered.push(b);
  }
  return ordered;
}

/** Accept API/DB quirks: content JSON string, blocks only, nested shape. */
function parseCmsPageInput(
  cmsPage: { content?: unknown; blocks?: unknown; blockOrder?: string[] } | null,
): {
  blocks: CMSBlock[];
  blockOrder?: string[];
} {
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

  const rawBlocks =
    (content?.blocks as unknown) ??
    (cmsPage as { blocks?: unknown }).blocks ??
    [];
  const blockOrder =
    (content?.blockOrder as string[] | undefined) ?? cmsPage.blockOrder;

  let blocks: CMSBlock[] = [];
  if (Array.isArray(rawBlocks)) {
    blocks = rawBlocks as CMSBlock[];
  } else if (rawBlocks && typeof rawBlocks === 'object') {
    blocks = Object.values(rawBlocks as Record<string, CMSBlock>).filter(Boolean);
  }

  return { blocks, blockOrder };
}

export function buildSchedulePageModel(
  cmsPage: { content?: unknown; blocks?: unknown; blockOrder?: string[] } | null,
): {
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  bodyBlocks: CMSBlock[];
} {
  const { blocks, blockOrder } = parseCmsPageInput(cmsPage);
  const list = orderedBlocks(blocks, blockOrder).filter(visibleBlock);

  const heroIdx = list.findIndex(
    (b) => b.title && !isScheduleLikeBlock(b) && (b.type === 'content' || b.type === 'hero' || b.type === 'heading'),
  );
  const idx =
    heroIdx >= 0 ? heroIdx : list.findIndex((b) => !!b.title && !isScheduleLikeBlock(b));
  const heroBlock = idx >= 0 ? list[idx] : null;
  const bodyBlocks = idx >= 0 ? list.filter((_, i) => i !== idx) : list;

  const heroTitle = heroBlock?.title || 'Schedule';
  const heroSubtitle =
    (heroBlock?.subtitle as string) || (heroBlock?.type === 'hero' ? (heroBlock?.badge as string) : '') || '';
  const heroDescription =
    (heroBlock?.description as string) ||
    (heroBlock?.content as string) ||
    '';

  return { heroTitle, heroSubtitle, heroDescription, bodyBlocks };
}

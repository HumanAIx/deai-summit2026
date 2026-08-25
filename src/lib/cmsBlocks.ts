import type { CMSBlock, CMSPageData } from '@/lib/api-types';

export function parseCmsBlocks(cmsPage: CMSPageData | null | undefined): CMSBlock[] {
  if (!cmsPage?.content) return [];

  const rawBlocks = cmsPage.content.blocks;
  let blocks: CMSBlock[] = Array.isArray(rawBlocks)
    ? (rawBlocks as CMSBlock[])
    : rawBlocks
      ? (Object.values(rawBlocks) as CMSBlock[])
      : [];

  const blockOrder = cmsPage.content.blockOrder;
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

  return blocks.filter((b) => {
    if ((b as { published?: boolean }).published === false) return false;
    if ((b as { showSection?: boolean }).showSection === false) return false;
    return true;
  });
}

export function blockMarkdownBody(block: CMSBlock): string {
  const content = typeof block.content === 'string' ? block.content.trim() : '';
  if (content) return content;
  const description =
    typeof block.description === 'string' ? (block.description as string).trim() : '';
  if (description) return description;
  const nodes = block.textNodes;
  if (Array.isArray(nodes) && nodes.length > 0) {
    return nodes
      .map((n) => (typeof n?.text === 'string' ? n.text : ''))
      .filter(Boolean)
      .join('\n\n');
  }
  return '';
}

export function blockListType(block: CMSBlock): string | undefined {
  const addonType =
    (block as { companiesListType?: string }).companiesListType ||
    (block as { membersListType?: string }).membersListType ||
    block.listType;
  return typeof addonType === 'string' ? addonType : undefined;
}

export function isCompaniesListBlock(block: CMSBlock): boolean {
  return block.type === 'companies-list' || block.addon === 'companies-list';
}

export function isMembersListBlock(block: CMSBlock): boolean {
  return block.type === 'members-list' || block.addon === 'members-list';
}

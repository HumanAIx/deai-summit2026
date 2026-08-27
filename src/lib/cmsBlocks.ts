import type { CMSBlock, CMSDocument, CMSPageData } from '@/lib/api-types';

const TENANT_SLUG = process.env.TENANT_SLUG || 'deaisummit';
const STORAGE_PUBLIC_PREFIX = `/storage/v1/object/public/tenants/`;

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

export function isDocumentsListBlock(block: CMSBlock): boolean {
  return block.type === 'documents-list' || block.addon === 'documents-list';
}

function basenameFromPath(path: string): string {
  const seg = path.split('/').filter(Boolean).pop() || path;
  return seg;
}

/** Human-readable title from a storage filename. */
export function documentDisplayTitle(doc: Pick<CMSDocument, 'name' | 'title' | 'path'>): string {
  if (doc.title?.trim()) return doc.title.trim();
  const raw = (doc.name || (doc.path ? basenameFromPath(doc.path) : '')).trim();
  // Strip extension, then upload idempotency suffixes like `-f6narzx6` / `-3ugaj0kf`
  // (must contain a digit so real words like `-prospectus` / `-digital` stay).
  const withoutExt = raw.replace(/\.[a-z0-9]+$/i, '');
  const withoutRandomSuffix = withoutExt.replace(/-(?=[a-z0-9]*\d)[a-z0-9]{4,12}$/i, '');
  return withoutRandomSuffix
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Format CMS upload byte sizes for UI (e.g. 2.1 MB). */
export function formatDocumentSize(bytes?: number | string | null): string | null {
  const n = normalizeByteSize(bytes);
  if (n == null) return null;
  if (n < 1024) return `${Math.round(n)} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  const gb = mb / 1024;
  return `${gb < 10 ? gb.toFixed(1) : Math.round(gb)} GB`;
}

/** Format PDF page counts for UI (e.g. 10 pages). */
export function formatDocumentPageCount(pages?: number | string | null): string | null {
  const n = normalizePageCount(pages);
  if (n == null) return null;
  return n === 1 ? '1 page' : `${n} pages`;
}

function normalizeByteSize(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return undefined;
}

function normalizePageCount(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.round(value);
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return Math.round(n);
  }
  return undefined;
}

function storageHostFromSample(url?: string): string | null {
  if (!url?.startsWith('http')) return null;
  try {
    const u = new URL(url);
    const idx = u.pathname.indexOf(STORAGE_PUBLIC_PREFIX);
    if (idx < 0) return null;
    return `${u.origin}${STORAGE_PUBLIC_PREFIX}`;
  } catch {
    return null;
  }
}

function publicUrlForTenantPath(path: string, sampleUrl?: string): string {
  const cleaned = path.replace(/^\/+/, '');
  const host = storageHostFromSample(sampleUrl);
  if (host) return `${host}${cleaned}`;
  // Relative branded proxy — works when opened on the site itself.
  const withoutTenant = cleaned.startsWith(`${TENANT_SLUG}/`)
    ? cleaned.slice(TENANT_SLUG.length + 1)
    : cleaned;
  return `/files/${withoutTenant
    .split('/')
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join('/')}`;
}

function thumbnailUrlForPath(path: string, sampleUrl?: string): string | undefined {
  const cleaned = path.replace(/^\/+/, '');
  const file = basenameFromPath(cleaned);
  const base = file.replace(/\.[a-z0-9]+$/i, '');
  if (!base) return undefined;
  // Uploads live under `{tenant}/uploads/...`; thumbnails under `{tenant}/uploads/.thumbnails/{base}.png`
  const uploadsIdx = cleaned.indexOf('/uploads/');
  if (uploadsIdx < 0) return undefined;
  const tenantPrefix = cleaned.slice(0, uploadsIdx); // e.g. deaisummit
  const thumbPath = `${tenantPrefix}/uploads/.thumbnails/${base}.png`;
  return publicUrlForTenantPath(thumbPath, sampleUrl);
}

/**
 * Resolve the full downloads list from a CMS block.
 * Prefers hydrated `documents`, then fills any missing `documentPaths` entries
 * so every selected upload shows on the page.
 */
export function resolveBlockDocuments(block: CMSBlock): CMSDocument[] {
  const docs = Array.isArray(block.documents) ? block.documents.filter((d) => d && d.url) : [];
  const paths = Array.isArray(block.documentPaths)
    ? block.documentPaths.filter((p): p is string => typeof p === 'string' && p.length > 0)
    : [];

  const byPath = new Map<string, CMSDocument>();
  for (const doc of docs) {
    if (doc.path) byPath.set(doc.path, doc);
  }

  const sampleUrl = docs.find((d) => d.url?.startsWith('http'))?.url;
  const orderedPaths = paths.length > 0 ? paths : docs.map((d) => d.path).filter((p): p is string => !!p);

  if (orderedPaths.length === 0) return docs;

  const result: CMSDocument[] = [];
  const seen = new Set<string>();

  for (const path of orderedPaths) {
    if (seen.has(path)) continue;
    seen.add(path);
    const existing = byPath.get(path);
    if (existing) {
      result.push({
        ...existing,
        size: normalizeByteSize(existing.size),
        pageCount: normalizePageCount(existing.pageCount ?? (existing as { pages?: unknown }).pages),
        thumbnailUrl: existing.thumbnailUrl || thumbnailUrlForPath(path, sampleUrl || existing.url),
      });
      continue;
    }
    const name = basenameFromPath(path);
    const url = publicUrlForTenantPath(path, sampleUrl);
    result.push({
      name,
      path,
      url,
      mimeType: name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : undefined,
      thumbnailUrl: thumbnailUrlForPath(path, sampleUrl),
    });
  }

  // Keep any hydrated docs that were not listed in documentPaths.
  for (const doc of docs) {
    const key = doc.path || doc.url;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      ...doc,
      size: normalizeByteSize(doc.size),
      pageCount: normalizePageCount(doc.pageCount ?? (doc as { pages?: unknown }).pages),
    });
  }

  return result;
}

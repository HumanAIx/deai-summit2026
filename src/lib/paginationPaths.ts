export const PAGINATION_PATH_REGEX = /\/page\/(\d+)\/?$/;

/** Keep in sync with SpeakersListClient. */
export const LISTING_PAGE_SIZES = {
  speakers: 24,
  team: 24,
} as const;

export type PaginatedListingKey = keyof typeof LISTING_PAGE_SIZES;

export function getListingPageCount(
  itemCount: number,
  listing: PaginatedListingKey,
): number {
  const perPage = LISTING_PAGE_SIZES[listing];
  return Math.max(1, Math.ceil(itemCount / perPage));
}

export function parsePageNumber(value: string | number | null | undefined): number {
  const parsed = Number.parseInt(String(value ?? '1'), 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
}

/** Strip a trailing `/page/N` segment to get the listing root path. */
export function getListingBasePath(pathname: string): string {
  const base = pathname.replace(PAGINATION_PATH_REGEX, '');
  return base || '/';
}

export function getPageFromPathname(pathname: string): number {
  const match = pathname.match(PAGINATION_PATH_REGEX);
  return match ? parsePageNumber(match[1]) : 1;
}

/** Build `/listing/page/N`; page 1 returns the listing root without `/page/1`. */
export function buildPaginationPath(basePath: string, page: number): string {
  const normalizedBase = basePath.replace(/\/$/, '') || '/';
  if (page <= 1) return normalizedBase;
  return `${normalizedBase}/page/${page}`;
}

export interface PaginatedListingSpec {
  path: string;
  label: string;
  listing: PaginatedListingKey;
  itemCount: number;
}

/** Markdown lines for llms.txt paginated listing discovery. */
export function formatPaginatedListingMarkdownLines(
  baseUrl: string,
  specs: PaginatedListingSpec[],
): string[] {
  const pageLines: string[] = [];

  for (const spec of specs) {
    const totalPages = getListingPageCount(spec.itemCount, spec.listing);
    for (let page = 2; page <= totalPages; page++) {
      const url = `${baseUrl}${buildPaginationPath(spec.path, page)}`;
      pageLines.push(`- [${spec.label} (page ${page})](${url})`);
    }
  }

  if (pageLines.length === 0) return [];

  return [
    '## Paginated Listing Pages',
    '',
    '> Listings use `/path/page/N` for page 2 and beyond; page 1 is `/path` without `/page/1`.',
    '',
    ...pageLines,
    '',
  ];
}

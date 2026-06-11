'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  buildPaginationPath,
  getListingBasePath,
  getPageFromPathname,
  parsePageNumber,
} from '@/lib/paginationPaths';

export interface UseUrlPaginationOptions {
  /** Element id to scroll into view after a page change */
  scrollTargetId?: string;
}

function getNonPageQueryString(): string {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  params.delete('page');
  return params.toString();
}

export function useUrlPagination(totalPages: number, options: UseUrlPaginationOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { scrollTargetId } = options;

  const basePath = useMemo(() => getListingBasePath(pathname), [pathname]);
  const rawPage = getPageFromPathname(pathname);

  const currentPage = useMemo(() => {
    const maxPage = Math.max(1, totalPages);
    return Math.min(Math.max(1, rawPage), maxPage);
  }, [rawPage, totalPages]);

  const setPageInUrl = useCallback(
    (page: number, { replace = false }: { replace?: boolean } = {}) => {
      const maxPage = Math.max(1, totalPages);
      const clamped = Math.min(Math.max(1, page), maxPage);
      const path = buildPaginationPath(basePath, clamped);
      const query = getNonPageQueryString();
      const url = query ? `${path}?${query}` : path;

      if (replace) {
        router.replace(url, { scroll: false });
      } else {
        router.push(url, { scroll: false });
      }
    },
    [basePath, router, totalPages],
  );

  const goToPage = useCallback(
    (page: number) => {
      setPageInUrl(page);
      if (scrollTargetId) {
        document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: 'smooth' });
      }
    },
    [scrollTargetId, setPageInUrl],
  );

  const resetPage = useCallback(() => {
    setPageInUrl(1, { replace: true });
  }, [setPageInUrl]);

  // Redirect legacy `?page=N` URLs to `/page/N`
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const legacyPage = params.get('page');
    if (!legacyPage) return;

    params.delete('page');
    const path = buildPaginationPath(basePath, parsePageNumber(legacyPage));
    const query = params.toString();
    router.replace(query ? `${path}?${query}` : path, { scroll: false });
  }, [basePath, router]);

  // Clamp invalid `/page/N` values (e.g. page 9 when only 3 pages exist)
  useEffect(() => {
    if (rawPage !== currentPage) {
      setPageInUrl(currentPage, { replace: true });
    }
  }, [rawPage, currentPage, setPageInUrl]);

  return { currentPage, goToPage, resetPage };
}

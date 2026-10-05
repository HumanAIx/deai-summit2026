'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';

const listeners = new Set<(active: boolean) => void>();

/** Show the full-screen page loader. Used when navigation bypasses a normal link click. */
export function startPageLoader() {
  listeners.forEach((listener) => listener(true));
}

function isPageNavigation(anchor: HTMLAnchorElement, event: MouseEvent) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (anchor.target && anchor.target !== '_self') return false;
  if (anchor.hasAttribute('download')) return false;

  const href = anchor.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;

  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return false;
  }

  if (url.origin !== window.location.origin) return false;
  return url.pathname !== window.location.pathname || url.search !== window.location.search;
}

export function NavigationLoader() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  useEffect(() => {
    listeners.add(setActive);
    return () => {
      listeners.delete(setActive);
    };
  }, []);

  useEffect(() => {
    setActive(false);
  }, [pathname]);

  useEffect(() => {
    if (!active) return;
    const timeout = window.setTimeout(() => setActive(false), 8000);
    return () => window.clearTimeout(timeout);
  }, [active]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!isPageNavigation(anchor, event)) return;
      setActive(true);
    };

    const onPopState = () => {
      if (window.location.pathname !== pathname) setActive(true);
    };

    document.addEventListener('click', onClick);
    window.addEventListener('popstate', onPopState);
    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('popstate', onPopState);
    };
  }, [pathname]);

  if (!active || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050A1F]/55"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <i className="ri-loader-4-line animate-spin text-6xl text-white" />
    </div>,
    document.body,
  );
}

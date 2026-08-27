'use client';

import { useEffect, useState } from 'react';
import { documentDisplayTitle, formatDocumentPageCount, formatDocumentSize } from '@/lib/cmsBlocks';
import type { CMSDocument } from '@/lib/api-types';

type DownloadDialogProps = {
  doc: CMSDocument | null;
  open: boolean;
  onClose: () => void;
  /** Kept for callers; email/captcha flow is temporarily disabled. */
  captchaSiteKey?: string;
  captchaDisabled?: boolean;
  captchaProvider?: string;
};

const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG || 'deaisummit';

function sanitizeFilename(name: string): string {
  const trimmed = name.trim() || 'download';
  return trimmed.replace(/[^\w.\-()+ ]+/g, '_');
}

/** Same-origin `/files/…?download=1` so the proxy can force Content-Disposition: attachment. */
function filesDownloadHref(doc: CMSDocument): string | null {
  const fromPath = (() => {
    const raw = doc.path?.replace(/^\/+/, '');
    if (!raw) return null;
    const parts = raw.split('/').filter(Boolean);
    if (!parts.length) return null;
    if (parts[0] === TENANT_SLUG) parts.shift();
    if (!parts.length) return null;
    return `/files/${parts.map(encodeURIComponent).join('/')}?download=1`;
  })();
  if (fromPath) return fromPath;

  try {
    const u = new URL(doc.url);
    const marker = '/storage/v1/object/public/tenants/';
    const idx = u.pathname.indexOf(marker);
    if (idx < 0) return null;
    const after = decodeURIComponent(u.pathname.slice(idx + marker.length));
    const parts = after.split('/').filter(Boolean);
    if (parts[0] === TENANT_SLUG) parts.shift();
    if (!parts.length) return null;
    return `/files/${parts.map(encodeURIComponent).join('/')}?download=1`;
  } catch {
    return null;
  }
}

function triggerBrowserDownload(href: string, filename: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function DownloadDialog({ doc, open, onClose }: DownloadDialogProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const label = doc ? documentDisplayTitle(doc) : '';
  const sizeLabel = doc ? formatDocumentSize(doc.size) : null;
  const pagesLabel = doc ? formatDocumentPageCount(doc.pageCount) : null;
  const isPdf =
    !!doc &&
    (doc.mimeType?.includes('pdf') || doc.name?.toLowerCase().endsWith('.pdf'));

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
      setDownloading(false);
      setErrorMessage('');
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      document.body.style.overflow = 'unset';
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  const handleView = () => {
    if (!doc?.url) return;
    window.open(doc.url, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = async () => {
    if (!doc?.url || downloading) return;

    const filename = sanitizeFilename(
      doc.name || (isPdf ? `${label}.pdf` : label) || 'download',
    );

    setDownloading(true);
    setErrorMessage('');

    const downloadBlob = async (href: string) => {
      const res = await fetch(href);
      if (!res.ok) throw new Error(`Download failed (${res.status}).`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      try {
        triggerBrowserDownload(objectUrl, filename);
      } finally {
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      }
    };

    try {
      // Prefer same-origin /files proxy (Content-Disposition: attachment).
      // Fall back to the public storage URL if the proxy isn't configured locally.
      const proxyHref = filesDownloadHref(doc);
      if (proxyHref) {
        try {
          await downloadBlob(proxyHref);
          return;
        } catch {
          /* try direct URL */
        }
      }
      await downloadBlob(doc.url);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (!isVisible && !open) return null;
  if (!doc) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-300 ${
        open && !isClosing ? 'opacity-100' : 'opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="download-dialog-title"
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={handleClose} />

      <div
        className={`relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-300 ${
          open && !isClosing ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
      >
        <div className="relative px-8 pt-8 pb-6 bg-[#F0F0EF] border-b border-slate-100">
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100"
            aria-label="Close"
          >
            <i className="ri-close-line text-2xl" />
          </button>
          <p className="text-xs font-mono uppercase tracking-widest text-brand-cyan mb-2">Download</p>
          <h2 id="download-dialog-title" className="text-2xl font-display font-bold text-slate-900 mb-2 pr-10">
            {label}
          </h2>
          <p className="text-sm text-slate-500">
            {[isPdf ? 'PDF document' : 'Document', pagesLabel, sizeLabel].filter(Boolean).join(' · ')}
          </p>
        </div>

        <div className="p-8 space-y-3">
          <button
            type="button"
            onClick={handleView}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#050A1F] text-white text-sm font-bold hover:bg-brand-cyan transition-colors"
          >
            <i className="ri-eye-line text-lg" />
            View now
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full border border-[#050A1F] text-[#050A1F] text-sm font-bold hover:bg-[#050A1F] hover:text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {downloading ? (
              <>
                <i className="ri-loader-4-line animate-spin text-lg" />
                Preparing download…
              </>
            ) : (
              <>
                <i className="ri-download-2-line text-lg" />
                Download now
              </>
            )}
          </button>
          {errorMessage ? (
            <p className="text-sm text-red-600 text-center" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

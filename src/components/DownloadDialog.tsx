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

export function DownloadDialog({ doc, open, onClose }: DownloadDialogProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

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

  const handleDownload = () => {
    if (!doc?.url) return;
    window.open(doc.url, '_blank', 'noopener,noreferrer');
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

        <div className="p-8">
          <button
            type="button"
            onClick={handleDownload}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#050A1F] text-white text-sm font-bold hover:bg-brand-cyan transition-colors"
          >
            <i className="ri-download-2-line text-lg" />
            Download now
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { useSearchParams } from 'next/navigation';
import { DetailPageLayout } from '@/components/DetailPageLayout';
import { AnimatedGrid } from '@/components/AnimatedGrid';
import type { CMSBlock, NavigationAPIData } from '@/lib/api-types';
import type { NavigationConfig } from '@/config/types';

interface SocialLinkData {
  key: string;
  label: string;
  url: string;
  icon?: string;
  color?: string;
}

interface ContactClientProps {
  blocks: CMSBlock[];
  inquiryOptions?: string[];
  navigationData?: NavigationConfig;
  navigationAPIData?: NavigationAPIData;
  socials?: SocialLinkData[];
  /** Tenant-scoped reCAPTCHA site key from ep-api. Falls back to the NEXT_PUBLIC env var. */
  captchaSiteKey?: string;
}

function extractHero(blocks: CMSBlock[]) {
  let badge: string | undefined;
  let title: string | undefined;
  let subtitle: string | undefined;
  let bodyHtml: string | undefined;

  for (const block of blocks) {
    if (!badge && typeof block.subtitle === 'string' && block.subtitle.trim()) {
      badge = block.subtitle;
    }
    if (!title && typeof block.title === 'string' && block.title.trim()) {
      title = block.title;
    }
    if (!subtitle && typeof block.description === 'string' && block.description.trim()) {
      subtitle = block.description;
    }
    if (!bodyHtml && typeof block.content === 'string' && block.content.trim()) {
      bodyHtml = block.content;
    }
    if (badge && title && subtitle && bodyHtml) break;
  }

  return { badge, title, subtitle, bodyHtml };
}

const FALLBACK_RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      render: (el: HTMLElement, opts: { sitekey: string; theme?: string }) => number;
      getResponse: (id?: number) => string;
      reset: (id?: number) => void;
    };
  }
}

const FALLBACK_INQUIRY_OPTIONS = [
  'General Inquiry',
  'Sponsorship Opportunities',
  'Media & Press',
  'Speaker Application',
  'Request Sponsorship Deck',
];

export function ContactClient({ blocks, inquiryOptions, navigationData, navigationAPIData, socials, captchaSiteKey }: ContactClientProps) {
  // Prefer tenant key from API; fall back to platform env var for legacy/solo installs.
  const RECAPTCHA_SITE_KEY = captchaSiteKey || FALLBACK_RECAPTCHA_SITE_KEY;
  const hero = extractHero(blocks);
  const options = inquiryOptions && inquiryOptions.length > 0 ? inquiryOptions : FALLBACK_INQUIRY_OPTIONS;
  const searchParams = useSearchParams();
  const inquiryParam = searchParams.get('inquiry') || '';
  const defaultInquiry = options.find(o => o.toLowerCase() === inquiryParam.toLowerCase()) || options[0];

  const [highlightInquiry, setHighlightInquiry] = useState(!!inquiryParam);
  useEffect(() => {
    if (!inquiryParam) return;
    setHighlightInquiry(true);
    const t = setTimeout(() => setHighlightInquiry(false), 6000);
    return () => clearTimeout(t);
  }, [inquiryParam]);

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const recaptchaRef = useRef<HTMLDivElement>(null);
  const captchaWidgetId = useRef<number | null>(null);

  const renderCaptcha = () => {
    if (!RECAPTCHA_SITE_KEY) return;
    if (captchaWidgetId.current !== null) return;
    if (!recaptchaRef.current || !window.grecaptcha?.render) return;
    try {
      recaptchaRef.current.innerHTML = '';
      captchaWidgetId.current = window.grecaptcha.render(recaptchaRef.current, {
        sitekey: RECAPTCHA_SITE_KEY,
        theme: 'light',
      });
    } catch (err) {
      console.error('reCAPTCHA render error:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      company: formData.get('company'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      inquiryType: formData.get('inquiryType'),
      message: formData.get('message'),
    };

    let captchaToken: string | undefined;
    if (RECAPTCHA_SITE_KEY) {
      try {
        captchaToken = window.grecaptcha?.getResponse(captchaWidgetId.current ?? undefined);
      } catch {}
      if (!captchaToken) {
        setStatus('error');
        setErrorMessage('Please complete the captcha verification.');
        return;
      }
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, captchaToken }),
      });

      const result = await response.json();

      if (response.ok) {
        setStatus('success');
        (e.target as HTMLFormElement).reset();
        try { window.grecaptcha?.reset(captchaWidgetId.current ?? undefined); } catch {}
      } else {
        setStatus('error');
        setErrorMessage(result.error || 'Failed to send message. Please try again.');
        try { window.grecaptcha?.reset(captchaWidgetId.current ?? undefined); } catch {}
      }
    } catch {
      setStatus('error');
      setErrorMessage('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <DetailPageLayout navigationData={navigationData} navigationAPIData={navigationAPIData} socials={socials}>
      {/* Hero */}
      <section className="relative -mt-[140px] bg-[#050A1F] text-white overflow-hidden">
        <div className="absolute inset-0 pointer-events-none animated-grid z-10">
          <AnimatedGrid />
        </div>
        <div className="relative z-20 max-w-[1440px] mx-auto px-6 pt-[180px] pb-20 md:pt-[200px] md:pb-28 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 backdrop-blur-sm mb-6">
            <i className="ri-mail-line text-brand-cyan text-sm"></i>
            <span className="text-xs font-mono uppercase tracking-widest text-brand-cyan">
              {hero.badge || 'Contact Us'}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-display font-bold tracking-tight leading-[1.1] mb-5">
            {hero.title || 'Get in touch'}
          </h1>
          {hero.subtitle && (
            <p className="text-xl text-white/70 max-w-2xl mx-auto">{hero.subtitle}</p>
          )}
          {hero.bodyHtml && (
            <div
              className="prose prose-invert max-w-2xl mx-auto mt-6 text-white/80"
              dangerouslySetInnerHTML={{ __html: hero.bodyHtml }}
            />
          )}
        </div>
      </section>

      {/* Form */}
      <section className="bg-[#F0F0EF] py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-6">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 md:p-12">
            {status === 'success' ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto rounded-full bg-brand-cyan/10 flex items-center justify-center mb-6">
                  <i className="ri-check-line text-brand-cyan text-3xl"></i>
                </div>
                <h2 className="text-2xl font-display font-bold text-slate-900 mb-3">
                  Message sent
                </h2>
                <p className="text-slate-600">
                  Thank you for reaching out. Our team will get back to you shortly.
                </p>
                <button
                  onClick={() => setStatus('idle')}
                  className="mt-8 px-6 py-3 rounded-full border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">First Name</label>
                    <input
                      name="firstName"
                      type="text"
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                      placeholder="Jane"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Last Name</label>
                    <input
                      name="lastName"
                      type="text"
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Company</label>
                    <input
                      name="company"
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                      placeholder="Company Name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Phone Number</label>
                    <input
                      name="phone"
                      type="tel"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email Address</label>
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                    placeholder="jane@company.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">What are you interested in?</label>
                  <div className="relative">
                    <select
                      name="inquiryType"
                      key={defaultInquiry}
                      defaultValue={defaultInquiry}
                      className={`w-full px-4 py-3 border rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue appearance-none transition-colors duration-1000 ${
                        highlightInquiry ? 'bg-yellow-50 border-yellow-200' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      {options.map(o => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                    <i className="ri-arrow-down-s-line absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Message</label>
                  <textarea
                    name="message"
                    required
                    rows={5}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all resize-none"
                    placeholder="Tell us how we can help..."
                  />
                </div>

                {RECAPTCHA_SITE_KEY && (
                  <>
                    <Script
                      src="https://www.google.com/recaptcha/api.js?render=explicit"
                      strategy="afterInteractive"
                      onReady={() => {
                        if (window.grecaptcha?.ready) {
                          window.grecaptcha.ready(renderCaptcha);
                        } else {
                          const t = setInterval(() => {
                            if (typeof window.grecaptcha?.render === 'function') {
                              clearInterval(t);
                              renderCaptcha();
                            }
                          }, 200);
                          setTimeout(() => clearInterval(t), 10000);
                        }
                      }}
                    />
                    <div className="flex justify-center pt-2">
                      <div ref={recaptchaRef} />
                    </div>
                  </>
                )}

                {status === 'error' && (
                  <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full py-4 bg-brand-dark text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:bg-slate-800 transform active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <span>{status === 'submitting' ? 'Sending...' : 'Send Message'}</span>
                  {status !== 'submitting' && (
                    <i className="ri-send-plane-fill group-hover:translate-x-1 transition-transform"></i>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </DetailPageLayout>
  );
}

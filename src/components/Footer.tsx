'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { GlitchText } from '@/components/GlitchText';
import type { GlitchTextHandle } from '@/components/GlitchText';
import type { NavigationConfig } from '@/config/types';
import type { NavigationAPIData } from '@/lib/api-types';

interface SocialLinkData {
  key: string;
  label: string;
  url: string;
  icon?: string;
  color?: string;
}

interface FooterProps {
  navData: NavigationConfig;
  navigationAPIData?: NavigationAPIData;
  onShowToast: (message: string) => void;
  onOpenContact?: () => void;
  socials?: SocialLinkData[];
}

const SLUG_TO_ROUTE: Record<string, string> = {
  'terms-and-conditions': '/terms',
  'privacy-statement': '/privacy',
};

function getRemixIcon(key: string): string {
  const map: Record<string, string> = {
    linkedin: 'ri-linkedin-fill',
    x: 'ri-twitter-x-fill',
    twitter: 'ri-twitter-x-fill',
    youtube: 'ri-youtube-fill',
    github: 'ri-github-fill',
    telegram: 'ri-telegram-fill',
    discord: 'ri-discord-fill',
    facebook: 'ri-facebook-circle-fill',
    instagram: 'ri-instagram-fill',
    tiktok: 'ri-tiktok-fill',
    medium: 'ri-medium-fill',
    meetup: 'ri-community-fill',
    luma: 'ri-calendar-event-fill',
  };
  return map[key] || 'ri-link';
}

interface VenueData {
  id: string;
  company_name: string;
  company_address?: string;
  company_logo?: string;
  company_slug: string;
}

const ANIM_DURATION = 1200;
const PAUSE = 1900;

function PoweredByGconf() {
  const glitchRef = useRef<GlitchTextHandle>(null);
  const [zapKey, setZapKey] = useState(0);
  const [isZapping, setIsZapping] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const schedule = (fn: () => void, ms: number) => {
      timers.push(setTimeout(fn, ms));
    };

    const cycle = () => {
      setIsZapping(true);
      setZapKey(k => k + 1);
      schedule(() => {
        setIsZapping(false);
        schedule(() => {
          glitchRef.current?.trigger();
          schedule(cycle, ANIM_DURATION + PAUSE);
        }, PAUSE);
      }, ANIM_DURATION);
    };

    schedule(cycle, 800);
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <svg key={zapKey} className={`w-3 h-3 text-brand-cyan${isZapping ? ' animate-zap' : ''}`} fill="currentColor" viewBox="0 0 24 24">
        <path d="M13 0L0 14h9l-2 10L21 10h-9l2-10z"/>
      </svg>
      <a href="https://gconf.ai" target="_blank" rel="noopener noreferrer"
        className="text-white/40 text-xs hover:text-white/60 transition-colors uppercase tracking-widest">
        <GlitchText ref={glitchRef} autoPlay={false}>Powered by GCONF.AI</GlitchText>
      </a>
    </div>
  );
}

export const Footer: React.FC<FooterProps> = ({ navData, navigationAPIData, onShowToast, onOpenContact, socials }) => {
  const [fetchedSocials, setFetchedSocials] = useState<SocialLinkData[]>([]);
  const [allVenues, setAllVenues] = useState<VenueData[]>([]);
  const [activeVenueIndex, setActiveVenueIndex] = useState(0);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  const fb = (navigationAPIData?.footerBuilder || {}) as Record<string, any>;
  const widgets: any[] = fb.widgets || [];
  const description: string = fb.description || '';
  const collectionItems: any[] = fb.collectionItems || [];
  const footerColLabels: Record<string, string> = fb.footerColLabels || {};
  const bottomBarLinks: any[] = fb.bottomBarLinks || [];
  const venueId: string = fb.venueId || '';

  // Widget helpers
  const topWidgets = (tc: number) => widgets.filter((w: any) => !w.column && w.topCol === tc);
  const colWidgets = (colNum: number) => widgets.filter((w: any) => w.column === colNum);

  // Extract footer columns from API — include empty columns if they have widgets
  const maxCol = Math.max(
    ...Object.keys(navigationAPIData || {}).filter(k => k.startsWith('footerCol')).map(k => parseInt(k.replace('footerCol', '')) || 0),
    ...widgets.filter((w: any) => w.column).map((w: any) => w.column),
    0,
  );
  const footerCols: { key: string; items: { slug: string; label: string; published: boolean }[] }[] = [];
  for (let i = 1; i <= maxCol; i++) {
    const key = `footerCol${i}`;
    const items = navigationAPIData ? ((navigationAPIData as any)[key] || []) : [];
    const hasWidgets = colWidgets(i).length > 0;
    if (items.length > 0 || hasWidgets) {
      footerCols.push({ key, items });
    }
  }

  // Build social links from props or fetched data
  const socialsSource = (socials && socials.length > 0) ? socials : fetchedSocials;
  const socialLinks: { key: string; label: string; url: string; icon: string }[] = [];
  for (const s of socialsSource) {
    if (s.url) socialLinks.push({ key: s.key, label: s.label, url: s.url, icon: getRemixIcon(s.key) });
  }

  // Fetch socials if not passed as props
  useEffect(() => {
    if (socials && socials.length > 0) return;
    fetch('/api/settings/socials')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.data?.length) setFetchedSocials(d.data); })
      .catch(() => {});
  }, [socials]);

  // Fetch venues
  useEffect(() => {
    if (!venueId) return;
    fetch('/api/companies?type=venues')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.data?.length) setAllVenues(d.data); })
      .catch(() => {});
  }, [venueId]);

  // Auto-rotate venues
  useEffect(() => {
    if (allVenues.length <= 1) return;
    const timer = setInterval(() => {
      setActiveVenueIndex(prev => (prev + 1) % allVenues.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [allVenues.length]);

  const handleContactClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onOpenContact) onOpenContact();
  };

  const handleSubscribe = async () => {
    if (!email.trim()) { setSubmitStatus({ type: 'error', message: 'Please enter your email.' }); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setSubmitStatus({ type: 'error', message: 'Please enter a valid email.' }); return; }
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });
    try {
      const apiUrl = process.env.NEXT_PUBLIC_GCONF_API_URL || '';
      const apiKey = process.env.NEXT_PUBLIC_GCONF_API_KEY || '';
      const res = await fetch(`${apiUrl}/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) { setSubmitStatus({ type: 'success', message: 'Successfully subscribed!' }); setEmail(''); }
      else { setSubmitStatus({ type: 'error', message: data.error || 'Failed to subscribe.' }); }
    } catch { setSubmitStatus({ type: 'error', message: 'An error occurred.' }); }
    finally { setIsSubmitting(false); }
  };

  // Render a custom-link widget as a list item or standalone
  function renderCustomLink(w: any) {
    const href = w.linkUrl || '#';
    const isExternal = href.startsWith('http');
    const target = isExternal && w.linkTarget === '_blank' ? '_blank' : undefined;
    const rel = target ? 'noopener noreferrer' : undefined;
    const btnClass = 'inline-block px-6 py-3 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-sm font-semibold text-white transition-all';
    const linkClass = 'text-base text-white/60 hover:text-brand-cyan transition-colors';
    const cls = w.linkStyle === 'button' ? btnClass : linkClass;

    if (isExternal) {
      return (
        <a href={href} target={target} rel={rel} className={cls}>
          {w.linkLabel || 'Link'}
        </a>
      );
    }
    return (
      <Link href={href} target={target} rel={rel} className={cls}>
        {w.linkLabel || 'Link'}
      </Link>
    );
  }

  // Render venue widget
  function renderVenueWidget(w: any) {
    if (allVenues.length === 0) return null;
    return (
      <div key={w.id}>
        <div className="relative overflow-hidden" style={{ height: '120px' }}>
          {allVenues.map((venue, idx) => (
            <div key={venue.id}
              className="absolute inset-0 transition-all duration-500 ease-in-out"
              style={{
                opacity: idx === activeVenueIndex ? 1 : 0,
                transform: idx === activeVenueIndex ? 'translateY(0)' : 'translateY(8px)',
                pointerEvents: idx === activeVenueIndex ? 'auto' : 'none',
              }}>
              {venue.company_logo && (
                <Link href={`/venues/${venue.company_slug}`} className="block mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={venue.company_logo} alt={venue.company_name}
                    className="max-w-[140px] max-h-[50px] object-contain brightness-0 invert hover:opacity-80 transition-opacity" />
                </Link>
              )}
              <p className="text-white text-base font-semibold">{venue.company_name}</p>
              {venue.company_address && (
                <p className="text-white/50 text-sm mt-1">{venue.company_address}</p>
              )}
            </div>
          ))}
        </div>
        {allVenues.length > 1 && (
          <div className="flex gap-1.5 mt-2">
            {allVenues.map((_, idx) => (
              <button key={idx} onClick={() => setActiveVenueIndex(idx)}
                className="transition-all duration-300"
                style={{
                  width: idx === activeVenueIndex ? '16px' : '6px',
                  height: '6px',
                  borderRadius: '3px',
                  background: idx === activeVenueIndex ? '#00B0C2' : 'rgba(255,255,255,0.3)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // If no API data, render fallback footer
  if (!navigationAPIData) {
    return (
      <footer className="relative w-full bg-[#050A1F] text-white overflow-hidden">
        <div className="w-full h-[2px] bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-teal" />
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 pt-20 pb-12">
          <div className="flex flex-col lg:flex-row justify-between gap-16 mb-20">
            <div className="lg:max-w-md">
              <Link href="/" className="flex items-center group mb-6">
                <div className="w-11 h-11 relative flex-shrink-0 mr-2">
                  <Image src="/icontransparent.png" alt="DeAI Summit" fill className="object-contain" />
                </div>
                <div className="flex flex-col leading-none justify-center">
                  <span className="font-bold tracking-tight text-white text-[2rem] leading-none">DeAI</span>
                  <span className="text-[0.65rem] uppercase tracking-[0.35em] text-white/50 leading-none mt-[3px] ml-[1px]">Summit</span>
                </div>
              </Link>
              <p className="text-base text-white/50 leading-relaxed mb-8">
                The premier gathering for the decentralized AI ecosystem. Malta 2026.
              </p>
            </div>
          </div>
          <div className="h-[1px] bg-white/10 mb-12" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 mb-16">
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-widest text-white/30 mb-5">Event</h4>
              <ul className="flex flex-col gap-3">
                {navData.main.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-base text-white/60 hover:text-brand-cyan transition-colors">{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-widest text-white/30 mb-5">Legal</h4>
              <ul className="flex flex-col gap-3">
                {navData.legal.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-base text-white/60 hover:text-brand-cyan transition-colors">{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t border-white/10">
            <PoweredByGconf />
            <span className="text-xs text-white/40 uppercase tracking-widest">&copy; {new Date().getFullYear()} DeAI Summit</span>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="relative w-full bg-[#050A1F] text-white overflow-hidden">

      {/* Top accent line */}
      <div className="w-full h-[2px] bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-teal" />

      {/* Main content */}
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 pt-20 pb-12">

        {/* Top section: Brand (left) + CTA & Newsletter (right) */}
        <div className="flex flex-col lg:flex-row justify-between gap-16 mb-20">

          {/* Left — Widgets from columns 1-2 */}
          <div className="lg:max-w-md flex flex-col gap-6">
            {[1, 2].map(tc => topWidgets(tc).map((w: any) => {
              if (w.type === 'logo') return (
                <Link key={w.id} href="/" className="flex items-center group mb-2">
                  <div className="w-11 h-11 relative flex-shrink-0 mr-2">
                    <Image src="/icontransparent.png" alt="DeAI Summit" fill className="object-contain" />
                  </div>
                  <div className="flex flex-col leading-none justify-center">
                    <span className="font-bold tracking-tight text-white text-[2rem] leading-none">DeAI</span>
                    <span className="text-[0.65rem] uppercase tracking-[0.35em] text-white/50 leading-none mt-[3px] ml-[1px] group-hover:text-brand-cyan transition-colors">Summit</span>
                  </div>
                </Link>
              );
              if (w.type === 'description') return description ? (
                <p key={w.id} className="text-base text-white/50 leading-relaxed">{description}</p>
              ) : null;
              if (w.type === 'collection') {
                if (collectionItems.length === 0) return null;
                return (
                  <div key={w.id} className="flex gap-14 mt-2">
                    {collectionItems.map((ci: any, idx: number) => {
                      const colors = ['#00B0C2', '#0E6FEB'];
                      const color = colors[idx % colors.length];
                      const displayValue = ci.rawCount != null ? String(ci.rawCount) : ci.title || '—';
                      return (
                        <div key={idx} className="relative">
                          <div className="absolute inset-0 blur-2xl opacity-15 rounded-full scale-150" style={{ backgroundColor: color }} />
                          <div className="text-5xl md:text-6xl font-display font-bold relative" style={{ color }}>
                            <AnimatedCounter value={displayValue} duration={2400} delay={idx * 300} />
                          </div>
                          <div className="w-10 h-[3px] rounded-full mt-3 mb-2" style={{ backgroundColor: color }} />
                          <div className="text-sm uppercase tracking-widest text-white/40">{ci.description}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              }
              if (w.type === 'socials') return socialLinks.length > 0 ? (
                <div key={w.id} className="flex flex-wrap gap-4">
                  {socialLinks.map((s) => (
                    <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer"
                      className="text-white/40 hover:text-brand-cyan transition-colors" title={s.label}>
                      <i className={`${s.icon} text-2xl`}></i>
                    </a>
                  ))}
                </div>
              ) : null;
              if (w.type === 'venue') return renderVenueWidget(w);
              if (w.type === 'custom-link') return <div key={w.id}>{renderCustomLink(w)}</div>;
              return null;
            }))}
          </div>

          {/* Right — CTA cards + Newsletter */}
          <div className="flex flex-col gap-5 lg:self-start">
            {/* CTA cards */}
            <div className="flex flex-col sm:flex-row gap-5">
              <Link
                href="/contact?inquiry=Sponsorship+Opportunities"
                className="group relative p-8 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all duration-300 overflow-hidden w-full sm:w-56 text-left"
              >
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-brand-blue to-brand-cyan opacity-0 group-hover:opacity-100 transition-opacity" />
                <i className="ri-vip-diamond-line text-3xl text-brand-blue mb-4 block group-hover:scale-110 transition-transform origin-left"></i>
                <span className="text-base font-semibold text-white block mb-1">Become a Sponsor</span>
                <span className="text-sm text-white/40 group-hover:text-white/60 transition-colors">Partner with us</span>
                <i className="ri-arrow-right-up-line text-lg text-white/30 group-hover:text-brand-cyan absolute top-6 right-6 transition-colors"></i>
              </Link>

              <Link
                href="/contact"
                className="group relative p-8 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all duration-300 overflow-hidden w-full sm:w-56 text-left"
              >
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-brand-cyan to-brand-teal opacity-0 group-hover:opacity-100 transition-opacity" />
                <i className="ri-mail-send-line text-3xl text-brand-cyan mb-4 block group-hover:scale-110 transition-transform origin-left"></i>
                <span className="text-base font-semibold text-white block mb-1">Contact Us</span>
                <span className="text-sm text-white/40 group-hover:text-white/60 transition-colors">Get in touch</span>
                <i className="ri-arrow-right-up-line text-lg text-white/30 group-hover:text-brand-cyan absolute top-6 right-6 transition-colors"></i>
              </Link>
            </div>

            {/* Newsletter (below CTA cards) */}
            {topWidgets(3).some((w: any) => w.type === 'newsletter') && (
              <div className="flex flex-col gap-4 mt-8">
                <h4 className="text-sm font-semibold uppercase tracking-widest text-white/30">Newsletter</h4>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email" value={email}
                    onChange={e => { setEmail(e.target.value); if (submitStatus.type) setSubmitStatus({ type: null, message: '' }); }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSubscribe(); } }}
                    placeholder="Enter your email"
                    disabled={isSubmitting}
                    className="flex-1 bg-transparent text-white border-b border-white/30 pb-2 outline-none placeholder:text-white/40 text-sm focus:border-brand-cyan transition-colors"
                  />
                  <button onClick={handleSubscribe} disabled={isSubmitting}
                    className="px-5 py-2 border border-white/30 text-white text-sm font-semibold hover:bg-white hover:text-[#050A1F] transition-all disabled:opacity-50">
                    {isSubmitting ? 'Subscribing...' : 'Subscribe'}
                  </button>
                </div>
                {submitStatus.type && (
                  <p className={`text-xs ${submitStatus.type === 'success' ? 'text-brand-cyan' : 'text-red-400'}`}>
                    {submitStatus.message}
                  </p>
                )}
              </div>
            )}

            {/* Any remaining column 3 widgets (socials, etc.) */}
            {topWidgets(3).filter((w: any) => w.type !== 'newsletter').map((w: any) => {
              if (w.type === 'socials') return socialLinks.length > 0 ? (
                <div key={w.id} className="flex flex-wrap gap-4 mt-2">
                  {socialLinks.map((s) => (
                    <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer"
                      className="text-white/40 hover:text-brand-cyan transition-colors" title={s.label}>
                      <i className={`${s.icon} text-2xl`}></i>
                    </a>
                  ))}
                </div>
              ) : null;
              if (w.type === 'venue') return renderVenueWidget(w);
              if (w.type === 'custom-link') return <div key={w.id}>{renderCustomLink(w)}</div>;
              return null;
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="h-[1px] bg-white/10 mb-12" />

        {/* Links row — dynamic columns from API + column widgets */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 mb-16">
          {footerCols.map((col) => {
            const colNum = parseInt(col.key.replace('footerCol', ''));
            const publishedItems = col.items.filter(i => i.published);
            const columnWidgets = colWidgets(colNum);
            const label = footerColLabels[col.key] || '';

            return (
              <div key={col.key}>
                {label && (
                  <h4 className="text-sm font-semibold uppercase tracking-widest text-white/30 mb-5">{label}</h4>
                )}
                <ul className="flex flex-col gap-3">
                  {publishedItems.map((item) => {
                    if (item.slug === 'contact') {
                      return (
                        <li key={item.slug}>
                          <button onClick={handleContactClick} className="text-base text-white/60 hover:text-brand-cyan transition-colors">
                            {item.label}
                          </button>
                        </li>
                      );
                    }
                    const href = SLUG_TO_ROUTE[item.slug] || `/${item.slug}`;
                    return (
                      <li key={item.slug}>
                        <Link href={href} className="text-base text-white/60 hover:text-brand-cyan transition-colors">
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                {/* Render column widgets */}
                <div className={publishedItems.length > 0 ? 'mt-4 flex flex-col gap-3' : 'flex flex-col gap-3'}>
                  {columnWidgets.map((w: any) => {
                    if (w.type === 'venue') return renderVenueWidget(w);
                    if (w.type === 'custom-link') return (
                      <div key={w.id}>{renderCustomLink(w)}</div>
                    );
                    if (w.type === 'socials') return socialLinks.length > 0 ? (
                      <ul key={w.id} className="flex flex-col gap-3">
                        {socialLinks.map((s) => (
                          <li key={s.key}>
                            <a href={s.url} target="_blank" rel="noopener noreferrer"
                              className="text-base text-white/60 hover:text-brand-cyan transition-colors flex items-center gap-2">
                              <i className={`${s.icon} text-lg`}></i> {s.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null;
                    if (w.type === 'description') return description ? (
                      <p key={w.id} className="text-sm text-white/50 leading-relaxed">{description}</p>
                    ) : null;
                    if (w.type === 'newsletter') return (
                      <div key={w.id} className="flex flex-col gap-3">
                        <div className="flex flex-col gap-2">
                          <input
                            type="email" value={email}
                            onChange={e => { setEmail(e.target.value); if (submitStatus.type) setSubmitStatus({ type: null, message: '' }); }}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSubscribe(); } }}
                            placeholder="Enter your email" disabled={isSubmitting}
                            className="bg-transparent text-white border-b border-white/30 pb-2 outline-none placeholder:text-white/40 text-sm focus:border-brand-cyan transition-colors"
                          />
                          <button onClick={handleSubscribe} disabled={isSubmitting}
                            className="px-4 py-2 border border-white/30 text-white text-xs font-semibold hover:bg-white hover:text-[#050A1F] transition-all disabled:opacity-50">
                            {isSubmitting ? 'Subscribing...' : 'Subscribe'}
                          </button>
                        </div>
                        {submitStatus.type && (
                          <p className={`text-xs ${submitStatus.type === 'success' ? 'text-brand-cyan' : 'text-red-400'}`}>{submitStatus.message}</p>
                        )}
                      </div>
                    );
                    return null;
                  })}
                </div>
              </div>
            );
          })}

          {/* Social links column — only if not already handled by a column label or socials widget */}
          {socialLinks.length > 0 && !footerCols.some(c => footerColLabels[c.key]?.toLowerCase() === 'connect') && !widgets.some((w: any) => w.type === 'socials' && w.column) && (
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-widest text-white/30 mb-5">Connect</h4>
              <ul className="flex flex-col gap-3">
                {socialLinks.map((s) => (
                  <li key={s.key}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer"
                      className="text-base text-white/60 hover:text-brand-cyan transition-colors flex items-center gap-2">
                      <i className={`${s.icon} text-lg`}></i> {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t border-white/10">
          {/* Left — Powered by */}
          <PoweredByGconf />

          {/* Center — Custom bottom bar links */}
          {bottomBarLinks.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {bottomBarLinks.map((link: any) => (
                <span key={link.id} className="text-white/40 text-xs inline-flex items-center gap-1">
                  {(link.segments || []).map((seg: any, si: number) => {
                    if (seg.type === 'text') return <span key={si}>{seg.value}</span>;
                    if (seg.type === 'icon') return <i key={si} className={`fas ${seg.icon}`} style={{ color: seg.color, fontSize: '0.65rem' }} />;
                    if (seg.type === 'link') return (
                      <a key={si} href={seg.url} target="_blank" rel="noopener noreferrer"
                        className="text-white/60 hover:text-white/80 hover:underline transition-colors">{seg.text}</a>
                    );
                    return null;
                  })}
                </span>
              ))}
            </div>
          )}

          {/* Right — Social icons + Copyright */}
          <div className="flex items-center gap-6">
            <div className="flex gap-4 items-center">
              {socialLinks.map((s) => (
                <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer"
                  className="text-white/30 hover:text-brand-cyan transition-colors" title={s.label}>
                  <i className={`${s.icon} text-xl`}></i>
                </a>
              ))}
            </div>
            <span className="text-xs text-white/40 uppercase tracking-widest">&copy; {new Date().getFullYear()} DeAI Summit</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

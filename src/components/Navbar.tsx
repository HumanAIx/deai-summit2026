'use client';
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { NavigationConfig } from '@/config/types';
import { normalizePublicSocialLinks, type PublicSocialLink } from '@/lib/socialIcons';
import { startPageLoader } from '@/components/NavigationLoader';

interface NavbarProps {
  onShowToast: (message: string) => void;
  onOpenContact?: () => void;
  data: NavigationConfig;
  /** From dashboard Settings → Socials (`/settings/public/socials`). */
  socials?: PublicSocialLink[];
  /** Light pill on dark pages such as tickets. */
  tone?: 'dark' | 'light';
  /** Homepage hero: design-file nav, sized on the 1440 canvas and scaled with the stage. */
  layout?: 'default' | 'hero';
  heroScale?: number;
  /** Unscaled height of the hero nav, so the stage can reserve its slot. */
  onNavHeight?: (height: number) => void;
  /** Visual bottom of the hero nav, so the badge stays below it. */
  onNavBottom?: (bottom: number) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onShowToast, onOpenContact, data, socials, tone = 'dark', layout = 'default', heroScale = 1, onNavHeight, onNavBottom }) => {
  const heroNavRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [fetchedSocials, setFetchedSocials] = useState<PublicSocialLink[]>([]);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (socials && socials.length > 0) return;
    fetch('/api/settings/socials')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.data?.length) setFetchedSocials(d.data); })
      .catch(() => {});
  }, [socials]);

  const socialLinks = normalizePublicSocialLinks(
    socials && socials.length > 0 ? socials : fetchedSocials,
  );

  const isActive = (href: string) => {
    if (!href.startsWith('/')) return false;
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const handleContactClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsMenuOpen(false);
    if (onOpenContact) {
      onOpenContact();
    }
  };

  const light = tone === 'light';
  const actionExternal = /^https?:\/\//i.test(data.actionButton.link);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setIsMenuOpen(false);

    // Page route — navigate via router
    if (href.startsWith('/')) {
      const nextPath = href.split(/[?#]/)[0];
      if (nextPath !== pathname) startPageLoader();
      router.push(href);
      return;
    }

    // Anchor link — smooth scroll
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const links = (
    <>
      {data.main.map((item) => {
        const active = isActive(item.href);
        return (
          <a
            key={item.label}
            href={item.href}
            onClick={(e) => handleNavClick(e, item.href)}
            aria-current={active ? 'page' : undefined}
            className="whitespace-nowrap text-white hover:text-white/80"
          >
            {item.label}
          </a>
        );
      })}
      <Link href="/contact" onClick={() => setIsMenuOpen(false)} className="whitespace-nowrap text-white hover:text-white/80">
        Contact Us
      </Link>
    </>
  );

  const ticketsClass = 'whitespace-nowrap bg-white text-[#0B1222] hover:bg-white';

  // Homepage hero sits above a 125px logo scroller inside the first screen.
  // Size the bar from that same band on every page so it doesn't jump.
  const [menuScale, setMenuScale] = useState(heroScale > 0 ? heroScale : 1);
  useLayoutEffect(() => {
    const fit = () => {
      const width = document.documentElement.clientWidth || window.innerWidth;
      const height = window.innerHeight;
      const band = Math.max(height - 125, 1);
      const next = Math.min(width / 1440, band / 860);
      setMenuScale(next > 0 ? next : 1);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  useLayoutEffect(() => {
    if (layout !== 'hero') return;
    const el = heroNavRef.current;
    if (!el) return;
    const report = () => {
      if (el.offsetHeight > 0) onNavHeight?.(el.offsetHeight);
      const bottom = el.getBoundingClientRect().bottom;
      if (bottom > 0) onNavBottom?.(Math.ceil(bottom));
    };
    report();
    document.fonts?.ready.then(report);
    window.addEventListener('resize', report);
    return () => window.removeEventListener('resize', report);
  }, [layout, heroScale, menuScale, onNavHeight, onNavBottom, data]);

  useLayoutEffect(() => {
    if (layout === 'hero') return;
    const el = barRef.current;
    if (!el) return;
    const report = () => {
      const bottom = el.getBoundingClientRect().bottom;
      if (bottom <= 0) return;
      document.documentElement.style.setProperty('--site-nav-bottom', `${Math.ceil(bottom)}px`);
    };
    report();
    const observer = new ResizeObserver(report);
    observer.observe(el);
    window.addEventListener('resize', report);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', report);
    };
  }, [layout, isMenuOpen]);

  const k = menuScale;
  const heroNav = (
    <nav
      ref={heroNavRef}
      className="fixed z-50 hidden items-center justify-between lg:flex"
      style={{
        top: 28 * k,
        left: '50%',
        width: 720,
        padding: '8px 8px 8px 22px',
        borderRadius: 999,
        background: 'linear-gradient(90deg,#0B1530,#1B3A66)',
        boxShadow: '0 14px 34px -14px rgba(11,21,48,.6)',
        transform: `translateX(-50%) scale(${k})`,
        transformOrigin: 'center top',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        lineHeight: 'normal',
      }}
    >
      <Link href="/" className="flex items-center" style={{ gap: 6 }}>
        <span className="relative block h-6 w-6 shrink-0">
          <Image src="/icontransparent.png" alt="" fill sizes="24px" className="object-contain" />
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <b style={{ fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>DeAI</b>
          <small style={{ fontSize: 6, letterSpacing: '0.3em', color: '#B8BDC8', margin: '2px 0 0', lineHeight: 1 }}>SUMMIT</small>
        </span>
      </Link>
      <div style={{ display: 'flex', gap: 22, fontSize: 12, fontWeight: 500, color: '#fff' }}>{links}</div>
      {actionExternal ? (
        <a
          href={data.actionButton.link}
          title={data.actionButton.title}
          target={data.actionButton.target || undefined}
          rel={data.actionButton.target === '_blank' ? 'noopener noreferrer' : undefined}
          className={ticketsClass}
          style={{ fontSize: 11, fontWeight: 600, padding: '9px 22px', borderRadius: 999 }}
        >
          {data.actionButton.label}
        </a>
      ) : (
        <Link
          href={data.actionButton.link}
          title={data.actionButton.title}
          className={ticketsClass}
          style={{ fontSize: 11, fontWeight: 600, padding: '9px 22px', borderRadius: 999 }}
        >
          {data.actionButton.label}
        </Link>
      )}
    </nav>
  );

  if (layout === 'hero') return heroNav;

  return (
    <>
      {heroNav}
      <nav
        ref={barRef}
        className={`fixed left-1/2 -translate-x-1/2 top-6 md:top-10 z-50 flex lg:hidden items-center justify-between w-[95%] max-w-5xl rounded-full px-5 py-3 md:px-6 md:py-3.5 transition-all duration-300 ${
          light
            ? 'border border-transparent bg-[#F0F0EE]/95 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)]'
            : 'border border-white/10 bg-gradient-to-r from-[#0A1428] via-[#12243F] to-[#1A3A66] shadow-[0_16px_36px_-18px_rgba(10,30,70,0.55)]'
        }`}
      >

        {/* Logo */}
        <Link href="/" className="flex items-center pl-2 group">
          <div className="w-9 h-9 relative flex-shrink-0 mr-1.5">
            <Image src="/icontransparent.png" alt="DeAI Summit" fill sizes="36px" className="object-contain" />
          </div>
          <div className="flex flex-col leading-none justify-center">
            <span className={`font-bold tracking-tight text-[1.65rem] leading-none ${light ? 'text-[#141A2A]' : 'text-white'}`}>DeAI</span>
            <span className={`text-[0.55rem] uppercase tracking-[0.32em] font-semibold leading-none mt-[2px] ml-[1px] ${light ? 'text-[#5A6273]' : 'text-white/80'}`}>Summit</span>
          </div>
        </Link>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-10">
          <div className="flex items-center gap-8">
            {data.main.map((item) => {
              const active = isActive(item.href);
              return (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  aria-current={active ? 'page' : undefined}
                  className={`text-lg font-semibold transition-colors ${
                    light
                      ? active ? 'text-[#1366E8]' : 'text-[#2A3142] hover:text-[#1366E8]'
                      : active ? 'text-white' : 'text-white hover:text-white/80'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}

            {(() => {
              const active = isActive('/contact');
              return (
                <Link
                  href="/contact"
                  onClick={() => setIsMenuOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={`text-lg font-semibold transition-colors ${
                    light
                      ? active ? 'text-[#1366E8]' : 'text-[#2A3142] hover:text-[#1366E8]'
                      : active ? 'text-white' : 'text-white hover:text-white/80'
                  }`}
                >
                  Contact Us
                </Link>
              );
            })()}
          </div>

        </div>

        {/* Action */}
        <div className="flex items-center gap-3">
          {actionExternal ? (
            <a
              href={data.actionButton.link}
              title={data.actionButton.title}
              target={data.actionButton.target || undefined}
              rel={data.actionButton.target === '_blank' ? 'noopener noreferrer' : undefined}
              className={`hidden md:flex text-base font-bold transition-all rounded-full px-8 py-3 ${
                light ? 'bg-[#0B1222] text-white hover:bg-[#1366E8]' : 'text-[#050A1F] bg-white hover:bg-[#E7F7F9]'
              }`}
            >
              {data.actionButton.label}
            </a>
          ) : (
            <Link
              href={data.actionButton.link}
              title={data.actionButton.title}
              className={`hidden md:flex text-base font-bold transition-all rounded-full px-8 py-3 ${
                light ? 'bg-[#0B1222] text-white hover:bg-[#1366E8]' : 'text-[#050A1F] bg-white hover:bg-[#E7F7F9]'
              }`}
            >
              {data.actionButton.label}
            </Link>
          )}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`lg:hidden p-2 transition-colors ${light ? 'text-[#2A3142] hover:text-[#1366E8]' : 'text-white/70 hover:text-white'}`}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          >
            <i className={isMenuOpen ? "ri-close-line text-2xl" : "ri-menu-line text-2xl"}></i>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div
          className={`fixed inset-0 z-40 overflow-y-auto backdrop-blur-xl px-6 lg:hidden flex flex-col items-center gap-8 animate-in fade-in slide-in-from-top-5 duration-200 ${light ? 'bg-[#F0F0EE]/95' : 'bg-[#050A1F]/95'}`}
          style={{ paddingTop: 'calc(var(--site-nav-bottom, 8rem) + 2.5rem)' }}
        >
          <div className="flex flex-col items-center gap-6 w-full max-w-sm">
            {data.main.map((item) => {
              const active = isActive(item.href);
              return (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  aria-current={active ? 'page' : undefined}
                  className={`text-2xl font-medium transition-colors w-full text-center py-2 ${
                    light
                      ? active ? 'text-[#1366E8]' : 'text-[#2A3142] hover:text-[#1366E8]'
                      : active ? 'text-white' : 'text-white/90 hover:text-white'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}

            {(() => {
              const active = isActive('/contact');
              return (
                <Link
                  href="/contact"
                  onClick={() => setIsMenuOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={`text-2xl font-medium transition-colors w-full text-center py-2 ${
                    light
                      ? active ? 'text-[#1366E8]' : 'text-[#2A3142] hover:text-[#1366E8]'
                      : active ? 'text-white' : 'text-white/90 hover:text-white'
                  }`}
                >
                  Contact Us
                </Link>
              );
            })()}

            {socialLinks.length > 0 ? (
              <div className="flex flex-wrap items-center justify-center gap-6 pt-2">
                {socialLinks.map((s) => (
                  <a
                    key={s.key}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`transition-colors ${light ? 'text-[#5A6273] hover:text-[#1366E8]' : 'text-white/60 hover:text-brand-cyan'}`}
                    title={s.label}
                    aria-label={s.label}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <i className={`${s.icon} text-2xl`}></i>
                  </a>
                ))}
              </div>
            ) : null}

            {actionExternal ? (
              <a
                href={data.actionButton.link}
                title={data.actionButton.title}
                target={data.actionButton.target || undefined}
                rel={data.actionButton.target === '_blank' ? 'noopener noreferrer' : undefined}
                onClick={() => setIsMenuOpen(false)}
                className={`mt-4 flex w-full justify-center text-sm font-semibold transition-all rounded-full px-8 py-3 ${
                  light ? 'bg-[#0B1222] text-white hover:bg-[#1366E8]' : 'text-[#050A1F] bg-white hover:bg-white/90'
                }`}
              >
                Get {data.actionButton.label}
              </a>
            ) : (
              <Link
                href={data.actionButton.link}
                title={data.actionButton.title}
                onClick={() => setIsMenuOpen(false)}
                className={`mt-4 flex w-full justify-center text-sm font-semibold transition-all rounded-full px-8 py-3 ${
                  light ? 'bg-[#0B1222] text-white hover:bg-[#1366E8]' : 'text-[#050A1F] bg-white hover:bg-white/90'
                }`}
              >
                Get {data.actionButton.label}
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
};

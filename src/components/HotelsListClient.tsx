'use client';

import React from 'react';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import Image from 'next/image';
import Link from 'next/link';
import { DetailPageLayout } from '@/components/DetailPageLayout';
import { AnimatedGrid } from '@/components/AnimatedGrid';
import { youtubeThumbnail } from '@/lib/utils';
import type { CompanySocials, NormalizedSponsor, NavigationAPIData } from '@/lib/api-types';
import type { NavigationConfig } from '@/config/types';

interface HotelsListClientProps {
  hotels: NormalizedSponsor[];
  heroTitle?: string;
  heroSubtitle?: string;
  heroBadge?: string;
  ctaTitle?: string;
  ctaSubtitle?: string;
  ctaButtons?: { label: string; link?: string }[];
  navigationData?: NavigationConfig;
  navigationAPIData?: NavigationAPIData;
  socials?: { key: string; label: string; url: string; icon?: string; color?: string }[];
}

function highlightTitle(text: string): string {
  if (text.includes('**')) {
    return text.replace(/\*\*(.+?)\*\*/g, '<span class="text-brand-cyan">$1</span>');
  }
  return text
    .replace(/(DeAI Summit)/gi, '<span class="text-brand-cyan">$1</span>')
    .replace(/(Hotels?)/gi, '<span class="text-brand-cyan">$1</span>');
}

function socialIcon(key: string): string {
  const icons: Record<string, string> = {
    linkedin: 'ri-linkedin-box-fill',
    x: 'ri-twitter-x-fill',
    twitter: 'ri-twitter-x-fill',
    facebook: 'ri-facebook-circle-fill',
    instagram: 'ri-instagram-fill',
    youtube: 'ri-youtube-fill',
    telegram: 'ri-telegram-fill',
    website: 'ri-global-line',
  };
  return icons[key] || 'ri-link';
}

function collectSocials(socials?: CompanySocials, website?: string) {
  const links: { key: string; url: string }[] = [];
  if (website?.startsWith('http')) links.push({ key: 'website', url: website });
  if (socials) {
    for (const [key, url] of Object.entries(socials)) {
      if (typeof url === 'string' && url.startsWith('http')) links.push({ key, url });
    }
  }
  return links.slice(0, 5);
}

function HotelCard({ hotel }: { hotel: NormalizedSponsor }) {
  const href = hotel.slug ? `/partner-hotels/${hotel.slug}` : '#';
  const cover = hotel.coverImage || hotel.logo;
  const location = [hotel.city, hotel.country].filter(Boolean).join(', ');
  const videoUrl = hotel.youtubeUrl || hotel.youtubeVideos?.[0];
  const thumb = videoUrl ? youtubeThumbnail(videoUrl) : null;
  const socials = collectSocials(hotel.socials, hotel.website);

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl bg-[#0a1028] border border-white/10 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.65)] transition-all duration-500 hover:-translate-y-1 hover:border-brand-cyan/40 hover:shadow-[0_30px_80px_-24px_rgba(0,176,194,0.35)]">
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden no-underline">
        {cover ? (
          <Image
            src={cover}
            alt={hotel.name}
            fill
            sizes="(max-width:768px) 100vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-[#050A1F] flex items-center justify-center text-white/30 font-display text-2xl font-bold">
            {hotel.name}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050A1F] via-[#050A1F]/20 to-transparent" />
        {thumb ? (
          <div className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-black/55 backdrop-blur-md border border-white/15 px-3 py-1.5 text-white text-[10px] font-mono uppercase tracking-[0.18em]">
            <span className="relative w-5 h-5 rounded-full overflow-hidden border border-white/30">
              <Image src={thumb} alt="" fill sizes="20px" className="object-cover" />
            </span>
            Video
          </div>
        ) : null}
        {location ? (
          <div className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-black/45 backdrop-blur-md border border-white/10 px-3 py-1 text-white/85 text-xs">
            <i className="ri-map-pin-line text-brand-cyan" />
            {location}
          </div>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-4 p-6">
        <div>
          <Link href={href} className="no-underline">
            <h3 className="text-white text-xl font-display font-bold leading-tight group-hover:text-brand-cyan transition-colors">
              {hotel.name}
            </h3>
          </Link>
          {hotel.bio ? (
            <p className="text-white/55 text-sm mt-3 leading-relaxed line-clamp-3">
              {hotel.bio.replace(/<[^>]*>/g, '').replace(/[#*_`>\[\]()]/g, '').replace(/\s+/g, ' ').trim()}
            </p>
          ) : null}
        </div>

        {socials.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {socials.map((link) => (
              <a
                key={`${hotel.id}-${link.key}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="w-9 h-9 rounded-full border border-white/15 bg-white/5 hover:bg-brand-cyan/20 hover:border-brand-cyan/50 flex items-center justify-center transition-colors"
                title={link.key}
                aria-label={link.key}
              >
                <i className={`${socialIcon(link.key)} text-base text-white/75`} />
              </a>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex items-center gap-3 pt-2">
          <Link
            href={href}
            className="flex-1 text-center px-4 py-2.5 rounded-full border border-white/20 text-white text-xs font-bold font-mono uppercase tracking-widest hover:bg-white hover:text-[#050A1F] transition-colors no-underline"
          >
            View details
          </Link>
          {hotel.bookingsUrl ? (
            <a
              href={hotel.bookingsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-1 text-center px-4 py-2.5 rounded-full bg-brand-cyan text-[#050A1F] text-xs font-bold font-mono uppercase tracking-widest hover:bg-white transition-colors no-underline"
            >
              Book
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function HotelsListClient({
  hotels,
  heroTitle,
  heroSubtitle,
  heroBadge,
  ctaTitle,
  ctaSubtitle,
  ctaButtons,
  navigationData,
  navigationAPIData,
  socials,
}: HotelsListClientProps) {
  return (
    <DetailPageLayout navigationData={navigationData} navigationAPIData={navigationAPIData} socials={socials}>
      <section className="relative bg-[#050A1F] text-white pt-16 pb-0">
        <div className="absolute inset-0 pointer-events-none animated-grid">
          <AnimatedGrid />
        </div>

        <div className="relative z-10 max-w-[1440px] mx-auto px-6 text-center">
          <p className="text-brand-cyan text-sm font-mono uppercase tracking-[0.28em] mb-4">
            {heroBadge || 'Stay with us'}
          </p>
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-[1.1] mb-6"
            dangerouslySetInnerHTML={{
              __html: heroTitle
                ? highlightTitle(heroTitle)
                : 'Partner <span class="text-brand-cyan">Hotels</span>',
            }}
          />
          <p className="text-white/60 text-lg max-w-2xl mx-auto mb-12">
            {heroSubtitle ||
              'Curated stays for DeAI Summit 2026 — refined rooms, harbour views, and easy access to the programme.'}
          </p>
        </div>

        {hotels.length > 0 && (
          <div className="relative z-10 max-w-[1440px] mx-auto px-6 pt-8 pb-12">
            <div className="flex items-center justify-center mb-12">
              <div className="text-center relative">
                <div className="absolute inset-0 blur-3xl opacity-20 rounded-full scale-150 bg-brand-cyan" />
                <p className="text-brand-cyan text-6xl md:text-7xl font-display font-bold mb-3 relative">
                  <AnimatedCounter value={String(hotels.length)} duration={2200} />
                </p>
                <div className="w-12 h-[3px] mx-auto mb-3 rounded-full bg-brand-cyan" />
                <p className="text-white/50 text-sm font-mono uppercase tracking-widest">Hotels</p>
              </div>
            </div>
            <div className="h-[1px] bg-gradient-to-r from-transparent via-brand-cyan/40 to-transparent" />
          </div>
        )}
      </section>

      {hotels.length > 0 ? (
        <section className="bg-[#070c22] pt-16 pb-[100px]">
          <div className="max-w-[1440px] mx-auto px-6">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-1 h-8 bg-brand-cyan rounded-full" />
              <h2 className="text-2xl md:text-3xl font-display font-bold text-white">Partner Hotels</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-7">
              {hotels.map((hotel) => (
                <HotelCard key={hotel.id} hotel={hotel} />
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="bg-[#070c22] py-24">
          <div className="max-w-[1440px] mx-auto px-6 text-center">
            <p className="text-white/50 text-lg">No partner hotels available at the moment.</p>
          </div>
        </section>
      )}

      <section className="bg-[#050A1F] py-16 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-4">
            {ctaTitle || 'Need a room recommendation?'}
          </h2>
          <p className="text-white/60 mb-8">
            {ctaSubtitle || 'Reach out and we will help you find the right stay for DeAI Summit 2026.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {ctaButtons && ctaButtons.length > 0 ? (
              ctaButtons.map((btn, i) => (
                <Link
                  key={i}
                  href={btn.link || '#'}
                  className={
                    i === 0
                      ? 'px-8 py-3 rounded-full border border-white bg-white text-[#050A1F] hover:bg-brand-cyan hover:text-white hover:border-brand-cyan transition-all duration-300 text-sm font-bold no-underline'
                      : 'px-8 py-3 rounded-full border border-white/30 text-white hover:bg-white/10 transition-all duration-300 text-sm font-bold no-underline'
                  }
                >
                  {btn.label}
                </Link>
              ))
            ) : (
              <Link
                href="/contact"
                className="px-8 py-3 rounded-full border border-white bg-white text-[#050A1F] hover:bg-brand-cyan hover:text-white hover:border-brand-cyan transition-all duration-300 text-sm font-bold no-underline"
              >
                Contact us
              </Link>
            )}
          </div>
        </div>
      </section>
    </DetailPageLayout>
  );
}

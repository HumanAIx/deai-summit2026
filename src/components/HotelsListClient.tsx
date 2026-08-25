'use client';

import React from 'react';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import Image from 'next/image';
import Link from 'next/link';
import { DetailPageLayout } from '@/components/DetailPageLayout';
import { AnimatedGrid } from '@/components/AnimatedGrid';
import type { NormalizedSponsor, NavigationAPIData } from '@/lib/api-types';
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

/** Convert **text** markers or brand name to cyan-highlighted spans */
function highlightTitle(text: string): string {
  if (text.includes('**')) {
    return text.replace(/\*\*(.+?)\*\*/g, '<span class="text-brand-cyan">$1</span>');
  }
  return text
    .replace(/(DeAI Summit)/gi, '<span class="text-brand-cyan">$1</span>')
    .replace(/(Hotels?)/gi, '<span class="text-brand-cyan">$1</span>');
}

const cardColors = [
  '#00B0C2',
  '#0E6FEB',
  '#050A1F',
  '#00B0C2',
  '#0E6FEB',
  '#050A1F',
  '#00B0C2',
  '#0E6FEB',
];

function HotelCard({ hotel, index }: { hotel: NormalizedSponsor; index: number }) {
  const href = hotel.slug ? `/partner-hotels/${hotel.slug}` : '#';
  const bgColor = cardColors[index % cardColors.length];

  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl no-underline bg-white border border-gray-200 hover:border-gray-300"
    >
      <div
        className={`relative h-[160px] flex items-center justify-center p-8 ${
          hotel.logoHasDarkBg ? 'bg-[#050A1F]' : 'bg-white'
        }`}
      >
        {hotel.logo ? (
          <div className="relative w-full h-full">
            <Image
              src={hotel.logo}
              alt={hotel.name}
              fill
              sizes="280px"
              className="object-contain"
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-gray-300 text-lg font-display font-bold">{hotel.name}</span>
          </div>
        )}
      </div>

      <div className="p-5 h-[130px] flex flex-col justify-between" style={{ backgroundColor: bgColor }}>
        <div>
          <h3 className="text-white text-base font-display font-extrabold group-hover:underline transition-colors leading-tight">
            {hotel.name}
          </h3>
          {hotel.bio && (
            <p className="text-white/70 text-xs font-semibold mt-2 line-clamp-2 leading-relaxed">
              {hotel.bio.replace(/<[^>]*>/g, '').replace(/[#*_`>\[\]()]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 mt-3 text-white/60 text-xs font-bold font-mono uppercase tracking-widest group-hover:text-white transition-colors">
          View Details
          <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
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
          <p className="text-brand-cyan text-sm font-mono uppercase tracking-widest mb-4">
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
              'Official partner hotels for DeAI Summit 2026 — book your stay close to the action in Malta.'}
          </p>
        </div>

        {hotels.length > 0 && (
          <div className="relative z-10 max-w-[1440px] mx-auto px-6 pt-12 pb-12">
            <div className="flex items-center justify-center gap-20 md:gap-28 mb-16">
              <div className="text-center relative">
                <div className="absolute inset-0 blur-3xl opacity-15 rounded-full scale-150 bg-brand-cyan" />
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
        <section className="bg-[#F0F0EF] pt-16 pb-[100px]">
          <div className="max-w-[1440px] mx-auto px-6">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-1 h-8 bg-brand-cyan rounded-full" />
              <h2 className="text-2xl md:text-3xl font-display font-bold text-[#050A1F]">
                Partner Hotels
              </h2>
            </div>
            <div className="flex flex-wrap justify-center gap-6">
              {hotels.map((hotel, index) => (
                <div
                  key={hotel.id}
                  className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] xl:w-[calc(25%-18px)]"
                >
                  <HotelCard hotel={hotel} index={index} />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="bg-[#F0F0EF] py-24">
          <div className="max-w-[1440px] mx-auto px-6 text-center">
            <p className="text-gray-500 text-lg">No partner hotels available at the moment.</p>
          </div>
        </section>
      )}

      <section className="bg-[#050A1F] py-16">
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

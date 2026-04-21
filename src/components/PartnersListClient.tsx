'use client';

import React from 'react';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import Image from 'next/image';
import Link from 'next/link';
import { DetailPageLayout } from '@/components/DetailPageLayout';
import { AnimatedGrid } from '@/components/AnimatedGrid';
import type { NormalizedSponsor, NavigationAPIData } from '@/lib/api-types';
import type { NavigationConfig } from '@/config/types';

interface PartnersListClientProps {
  sponsors: NormalizedSponsor[];
  partners: NormalizedSponsor[];
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

/** Strip `**markers**` (used for hero highlighting) to get a clean plain-text heading. */
function stripHighlightMarkers(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1');
}

/** Convert **text** markers or brand name to cyan-highlighted spans */
function highlightTitle(text: string): string {
  // First, handle explicit **markers**
  if (text.includes('**')) {
    return text.replace(/\*\*(.+?)\*\*/g, '<span class="text-brand-cyan">$1</span>');
  }
  // Auto-highlight brand name or "Partners" keyword
  return text
    .replace(/(DeAI Summit)/gi, '<span class="text-brand-cyan">$1</span>')
    .replace(/(Partners)/gi, '<span class="text-brand-cyan">$1</span>');
}

const cardColors = [
  '#00B0C2',   // digital teal
  '#0E6FEB',   // electric blue
  '#050A1F',   // deep navy
  '#00B0C2',   // digital teal
  '#0E6FEB',   // electric blue
  '#050A1F',   // deep navy
  '#00B0C2',   // digital teal
  '#0E6FEB',   // electric blue
];

function CompanyCard({ company, type, index }: { company: NormalizedSponsor; type: 'sponsor' | 'partner'; index: number }) {
  const href = type === 'sponsor' ? `/partners/${company.slug}` : `/companies/${company.slug}`;
  const bgColor = cardColors[index % cardColors.length];

  return (
    <Link
      href={company.slug ? href : '#'}
      className="group block overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl no-underline bg-white border border-gray-200 hover:border-gray-300"
    >
      {/* Logo section */}
      <div
        className={`relative h-[160px] flex items-center justify-center p-8 ${
          company.logoHasDarkBg ? 'bg-[#050A1F]' : 'bg-white'
        }`}
      >
        {company.logo ? (
          <div className="relative w-full h-full">
            <Image
              src={company.logo}
              alt={company.name}
              fill
              sizes="280px"
              className="object-contain"
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-gray-300 text-lg font-display font-bold">{company.name}</span>
          </div>
        )}
      </div>

      {/* Info section */}
      <div className="p-5 h-[130px] flex flex-col justify-between" style={{ backgroundColor: bgColor }}>
        <div>
          <h3 className="text-white text-base font-display font-extrabold group-hover:underline transition-colors leading-tight">
            {company.name}
          </h3>
          {company.bio && (
            <p className="text-white/70 text-xs font-semibold mt-2 line-clamp-2 leading-relaxed">
              {company.bio.replace(/<[^>]*>/g, '').replace(/[#*_`>\[\]()]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120)}
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

export function PartnersListClient({ sponsors, partners, heroTitle, heroSubtitle, heroBadge, ctaTitle, ctaSubtitle, ctaButtons, navigationData, navigationAPIData, socials }: PartnersListClientProps) {
  const totalCompanies = sponsors.length + partners.length;

  // Merge sponsors + partners into a single list (dedupe by id), preserving sponsor-first order.
  const seenIds = new Set<string>();
  const combined: NormalizedSponsor[] = [];
  for (const item of [...sponsors, ...partners]) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      combined.push(item);
    }
  }

  const sectionHeading = heroTitle ? stripHighlightMarkers(heroTitle) : 'Sponsors & Partners';

  return (
    <DetailPageLayout navigationData={navigationData} navigationAPIData={navigationAPIData} socials={socials}>
      {/* Hero Section */}
      <section className="relative bg-[#050A1F] text-white pt-16 pb-0">
        {/* Grid Overlay */}
        <div className="absolute inset-0 pointer-events-none animated-grid">
          <AnimatedGrid />
        </div>

        <div className="relative z-10 max-w-[1440px] mx-auto px-6 text-center">
          <p className="text-brand-cyan text-sm font-mono uppercase tracking-widest mb-4">
            {heroBadge || 'Our Ecosystem'}
          </p>
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-[1.1] mb-6"
            dangerouslySetInnerHTML={{ __html: heroTitle
              ? highlightTitle(heroTitle)
              : 'Sponsors & <span class="text-brand-cyan">Partners</span>'
            }}
          />
          <p className="text-white/60 text-lg max-w-2xl mx-auto mb-12">
            {heroSubtitle || 'Leading organizations shaping the future of decentralized AI — powering the summit and the movement.'}
          </p>
        </div>

        {/* Stats + Divider */}
        {totalCompanies > 0 && (
          <div className="relative z-10 max-w-[1440px] mx-auto px-6 pt-12 pb-12">
            <div className="flex items-center justify-center gap-20 md:gap-28 mb-16">
              {sponsors.length > 0 && (
                <div className="text-center relative">
                  <div className="absolute inset-0 blur-3xl opacity-15 rounded-full scale-150 bg-brand-cyan" />
                  <p className="text-brand-cyan text-6xl md:text-7xl font-display font-bold mb-3 relative">
                    <AnimatedCounter value={String(sponsors.length)} duration={2200} />
                  </p>
                  <div className="w-12 h-[3px] mx-auto mb-3 rounded-full bg-brand-cyan" />
                  <p className="text-white/50 text-sm font-mono uppercase tracking-widest">
                    Sponsors
                  </p>
                </div>
              )}
              {sponsors.length > 0 && partners.length > 0 && (
                <div className="w-[1px] h-20 bg-white/10" />
              )}
              {partners.length > 0 && (
                <div className="text-center relative">
                  <div className="absolute inset-0 blur-3xl opacity-15 rounded-full scale-150 bg-brand-blue" />
                  <p className="text-brand-blue text-6xl md:text-7xl font-display font-bold mb-3 relative">
                    <AnimatedCounter value={String(partners.length)} duration={2200} delay={300} />
                  </p>
                  <div className="w-12 h-[3px] mx-auto mb-3 rounded-full bg-brand-blue" />
                  <p className="text-white/50 text-sm font-mono uppercase tracking-widest">
                    Partners
                  </p>
                </div>
              )}
            </div>
            <div className="h-[1px] bg-gradient-to-r from-transparent via-brand-cyan/40 to-transparent" />
          </div>
        )}
      </section>

      {/* Combined Sponsors & Partners Section */}
      {combined.length > 0 && (
        <section className="bg-[#F0F0EF] pt-16 pb-[100px]">
          <div className="max-w-[1440px] mx-auto px-6">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-1 h-8 bg-brand-cyan rounded-full" />
              <h2 className="text-2xl md:text-3xl font-display font-bold text-[#050A1F]">
                {sectionHeading}
              </h2>
            </div>
            <div className="flex flex-wrap justify-center gap-6">
              {combined.map((company, index) => (
                <div key={company.id} className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] xl:w-[calc(25%-18px)]">
                  <CompanyCard company={company} type={company.isSponsor ? 'sponsor' : 'partner'} index={index} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty state */}
      {totalCompanies === 0 && (
        <section className="bg-[#F0F0EF] py-24">
          <div className="max-w-[1440px] mx-auto px-6 text-center">
            <p className="text-gray-500 text-lg">
              No sponsors or partners available at the moment.
            </p>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="bg-[#050A1F] py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-4">
            {ctaTitle || 'Interested in Sponsoring?'}
          </h2>
          <p className="text-white/60 mb-8">
            {ctaSubtitle || 'Join leading organizations at the forefront of decentralized AI governance.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {ctaButtons && ctaButtons.length > 0 ? (
              ctaButtons.map((btn, i) => (
                <Link
                  key={i}
                  href={btn.link || '#'}
                  className={i === 0
                    ? 'px-8 py-3 rounded-full border border-white bg-white text-[#050A1F] hover:bg-brand-cyan hover:text-white hover:border-brand-cyan transition-all duration-300 text-sm font-bold no-underline'
                    : 'px-8 py-3 rounded-full border border-white/30 text-white hover:bg-white/10 transition-all duration-300 text-sm font-bold no-underline'
                  }
                >
                  {btn.label}
                </Link>
              ))
            ) : (
              <>
                <Link
                  href="/#sponsors"
                  className="px-8 py-3 rounded-full border border-white bg-white text-[#050A1F] hover:bg-brand-cyan hover:text-white hover:border-brand-cyan transition-all duration-300 text-sm font-bold no-underline"
                >
                  Become a Sponsor
                </Link>
                <Link
                  href="/#sponsors"
                  className="px-8 py-3 rounded-full border border-white/30 text-white hover:bg-white/10 transition-all duration-300 text-sm font-bold no-underline"
                >
                  Request Sponsorship Deck
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </DetailPageLayout>
  );
}

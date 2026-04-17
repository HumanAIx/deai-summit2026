'use client';

import React, { useState } from 'react';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import Link from 'next/link';
import Image from 'next/image';
import { DetailPageLayout } from '@/components/DetailPageLayout';
import { AnimatedGrid } from '@/components/AnimatedGrid';
import type { NormalizedSpeaker, NavigationAPIData } from '@/lib/api-types';
import type { NavigationConfig } from '@/config/types';

/** Convert **text** markers or brand name to cyan-highlighted spans */
function highlightTitle(text: string): string {
  // First, handle explicit **markers**
  if (text.includes('**')) {
    return text.replace(/\*\*(.+?)\*\*/g, '<span class="text-brand-cyan">$1</span>');
  }
  // Auto-highlight brand name
  return text.replace(/(DeAI Summit)/gi, '<span class="text-brand-cyan">$1</span>');
}

const SPEAKERS_PER_PAGE = 24;

// Card accent colors — subtle dark palette matching the site
const cardColors = [
  '#050A1F', // deep navy
  '#0A1530', // dark navy
  '#0C1A35', // navy blue
  '#081228', // midnight
];

interface SpeakerCardProps {
  speaker: NormalizedSpeaker;
  colorIndex: number;
  detailBasePath?: string;
}

function SpeakerCard({ speaker, colorIndex, detailBasePath }: SpeakerCardProps) {
  const color = cardColors[colorIndex % cardColors.length];
  const canLink = !!detailBasePath && !!speaker.slug;

  const inner = (
    <div className="relative h-[340px] p-6 flex flex-col">
      {/* Speaker Info */}
      <div className="flex-1 pr-[180px]">
        <h3 className={`text-white text-xl font-display font-bold leading-tight ${canLink ? 'group-hover:underline' : ''}`}>
          {speaker.name}
        </h3>
        {speaker.company && (
          <p className="text-brand-cyan text-sm mt-2">
            {speaker.company}
          </p>
        )}
        {speaker.role && (
          <p className="text-white/60 text-xs mt-2 font-mono uppercase tracking-widest">
            {speaker.role}
          </p>
        )}
      </div>

      {/* Speaker Image */}
      <div className={`absolute bottom-0 right-0 overflow-hidden ${speaker.slug === 'alexiei-dingli' ? 'w-[360px] h-[468px]' : 'w-[240px] h-[312px]'}`}>
        {speaker.image ? (
          <Image
            src={speaker.image}
            alt={speaker.name}
            fill
            sizes={speaker.slug === 'alexiei-dingli' ? '360px' : '240px'}
            className="object-contain object-bottom"
          />
        ) : (
          <div className="w-full h-full flex items-end justify-center">
            <i className="ri-user-line text-white/20 text-7xl mb-4"></i>
          </div>
        )}
      </div>

      {/* View Profile indicator (only shown when card is linkable) */}
      {canLink && (
        <div className="absolute bottom-4 left-6 text-white/70 text-xs flex items-center gap-1 group-hover:text-white transition-colors font-mono uppercase tracking-widest">
          View Profile
          <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </div>
  );

  if (canLink) {
    return (
      <Link
        href={`${detailBasePath}/${speaker.slug}`}
        className="group block overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl no-underline"
        style={{ backgroundColor: color }}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div
      className="block overflow-hidden rounded-2xl"
      style={{ backgroundColor: color }}
    >
      {inner}
    </div>
  );
}

interface SpeakersListClientProps {
  speakers: NormalizedSpeaker[];
  heroTitle?: string;
  heroSubtitle?: string;
  heroBadge?: string;
  stats?: { label: string; value: string }[];
  ctaTitle?: string;
  ctaSubtitle?: string;
  ctaButtons?: { label: string; link?: string }[];
  navigationData?: NavigationConfig;
  navigationAPIData?: NavigationAPIData;
  socials?: { key: string; label: string; url: string; icon?: string; color?: string }[];
  /** Base path for individual detail pages (e.g. "/speakers"). When omitted, cards are not clickable. */
  detailBasePath?: string;
  /** id + label for anchor scroll-to and the "Showing X of Y" label. */
  gridId?: string;
  itemNoun?: string;
  itemNounPlural?: string;
  /** Default fallback hero/stat copy when no CMS/API value is provided. */
  defaultHeroBadge?: string;
  defaultHeroHtml?: string;
  defaultHeroSubtitle?: string;
  defaultPrimaryStatLabel?: string;
  emptyMessage?: string;
}

export function SpeakersListClient({
  speakers,
  heroTitle,
  heroSubtitle,
  heroBadge,
  stats,
  ctaTitle,
  ctaSubtitle,
  ctaButtons,
  navigationData,
  navigationAPIData,
  socials,
  detailBasePath,
  gridId = 'speakers-grid',
  itemNoun = 'speaker',
  itemNounPlural = 'speakers',
  defaultHeroBadge = 'Meet Our Speakers',
  defaultHeroHtml = 'Leading Voices on the <br class="hidden md:block" /><span class="text-brand-cyan">DeAI Summit</span> Stage',
  defaultHeroSubtitle = 'Speakers from frontier AI, decentralized systems, policy, and academia — shaping the future of intelligence.',
  defaultPrimaryStatLabel = 'Speakers',
  emptyMessage = 'No speakers available at the moment.',
}: SpeakersListClientProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(speakers.length / SPEAKERS_PER_PAGE);
  const startIndex = (currentPage - 1) * SPEAKERS_PER_PAGE;
  const endIndex = startIndex + SPEAKERS_PER_PAGE;
  const paginatedSpeakers = speakers.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    document.getElementById(gridId)?.scrollIntoView({ behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }

    return pages;
  };

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
            {heroBadge || defaultHeroBadge}
          </p>
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-[1.1] mb-6"
            dangerouslySetInnerHTML={{ __html: heroTitle ? highlightTitle(heroTitle) : defaultHeroHtml }}
          />
          <p className="text-white/60 text-lg max-w-2xl mx-auto mb-12">
            {heroSubtitle || defaultHeroSubtitle}
          </p>
        </div>

        {/* Stats + Divider */}
        {speakers.length > 0 && (
          <div className="relative z-10 max-w-[1440px] mx-auto px-6 pt-12 pb-12">
            <div className="flex items-center justify-center gap-20 md:gap-28 mb-16">
              {stats && stats.length > 0 ? (
                stats.map((stat, i) => {
                  const colors = ['bg-brand-cyan', 'bg-brand-blue', 'bg-brand-cyan'];
                  const textColors = ['text-brand-cyan', 'text-brand-blue', 'text-brand-cyan'];
                  const color = colors[i % colors.length];
                  const textColor = textColors[i % textColors.length];
                  return (
                    <React.Fragment key={i}>
                      {i > 0 && <div className="w-[1px] h-20 bg-white/10" />}
                      <div className="text-center relative">
                        <div className={`absolute inset-0 blur-3xl opacity-15 rounded-full scale-150 ${color}`} />
                        <p className={`${textColor} text-6xl md:text-7xl font-display font-bold mb-3 relative`}>
                          <AnimatedCounter value={stat.value} duration={2200} delay={i * 300} />
                        </p>
                        <div className={`w-12 h-[3px] mx-auto mb-3 rounded-full ${color}`} />
                        <p className="text-white/50 text-sm font-mono uppercase tracking-widest">
                          {stat.label}
                        </p>
                      </div>
                    </React.Fragment>
                  );
                })
              ) : (
                <>
                  <div className="text-center relative">
                    <div className="absolute inset-0 blur-3xl opacity-15 rounded-full scale-150 bg-brand-cyan" />
                    <p className="text-brand-cyan text-6xl md:text-7xl font-display font-bold mb-3 relative">
                      <AnimatedCounter value={String(speakers.length)} duration={2200} />
                    </p>
                    <div className="w-12 h-[3px] mx-auto mb-3 rounded-full bg-brand-cyan" />
                    <p className="text-white/50 text-sm font-mono uppercase tracking-widest">
                      {defaultPrimaryStatLabel}
                    </p>
                  </div>
                  <div className="w-[1px] h-20 bg-white/10" />
                  <div className="text-center relative">
                    <div className="absolute inset-0 blur-3xl opacity-15 rounded-full scale-150 bg-brand-blue" />
                    <p className="text-brand-blue text-6xl md:text-7xl font-display font-bold mb-3 relative">
                      <AnimatedCounter value="60+" duration={2200} delay={300} />
                    </p>
                    <div className="w-12 h-[3px] mx-auto mb-3 rounded-full bg-brand-blue" />
                    <p className="text-white/50 text-sm font-mono uppercase tracking-widest">
                      Sessions
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="h-[1px] bg-gradient-to-r from-transparent via-brand-cyan/40 to-transparent" />
          </div>
        )}
      </section>

      {/* People Grid */}
      <section id={gridId} className="bg-[#F0F0EF] py-16">
        <div className="max-w-[1440px] mx-auto px-6">
          {speakers.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">
                {emptyMessage}
              </p>
            </div>
          ) : (
            <>
              {/* Showing count */}
              {speakers.length > SPEAKERS_PER_PAGE && (
                <p className="text-gray-500 text-sm text-center mb-8 font-mono">
                  Showing {startIndex + 1}-{Math.min(endIndex, speakers.length)} of {speakers.length} {speakers.length === 1 ? itemNoun : itemNounPlural}
                </p>
              )}

              {/* Grid — flex-wrap keeps a partial last row centered instead of left-aligned */}
              <div className="flex flex-wrap justify-center gap-6">
                {paginatedSpeakers.map((speaker, index) => (
                  <div
                    key={speaker.id}
                    className="w-full md:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)] xl:w-[calc((100%-4.5rem)/4)]"
                  >
                    <SpeakerCard
                      speaker={speaker}
                      colorIndex={startIndex + index}
                      detailBasePath={detailBasePath}
                    />
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-16">
                  {/* Previous */}
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded-lg border transition-all duration-300 ${
                      currentPage === 1
                        ? 'border-gray-300 text-gray-300 cursor-not-allowed'
                        : 'border-gray-400 text-gray-700 hover:bg-[#050A1F] hover:text-white hover:border-[#050A1F]'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  {/* Page Numbers */}
                  {getPageNumbers().map((page, index) => {
                    const color = cardColors[index % cardColors.length];
                    return typeof page === 'number' ? (
                      <button
                        key={index}
                        onClick={() => goToPage(page)}
                        className={`w-10 h-10 rounded-lg border text-sm font-bold transition-all duration-300 ${
                          currentPage === page
                            ? 'text-white border-transparent'
                            : 'border-gray-400 text-gray-700 hover:text-white hover:border-transparent'
                        }`}
                        style={{
                          ...(currentPage === page
                            ? { backgroundColor: color, borderColor: color }
                            : {}),
                          // Hover handled via onMouseEnter/Leave would be complex, use CSS var approach
                        }}
                        onMouseEnter={(e) => {
                          if (currentPage !== page) {
                            e.currentTarget.style.backgroundColor = color;
                            e.currentTarget.style.borderColor = color;
                            e.currentTarget.style.color = 'white';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (currentPage !== page) {
                            e.currentTarget.style.backgroundColor = '';
                            e.currentTarget.style.borderColor = '';
                            e.currentTarget.style.color = '';
                          }
                        }}
                      >
                        {page}
                      </button>
                    ) : (
                      <span key={index} className="px-2 text-gray-400">
                        {page}
                      </span>
                    );
                  })}

                  {/* Next */}
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 rounded-lg border transition-all duration-300 ${
                      currentPage === totalPages
                        ? 'border-gray-300 text-gray-300 cursor-not-allowed'
                        : 'border-gray-400 text-gray-700 hover:bg-[#050A1F] hover:text-white hover:border-[#050A1F]'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

      </section>

      {/* CTA Section (CMS-driven) */}
      {(ctaTitle || ctaSubtitle || (ctaButtons && ctaButtons.length > 0)) && (
        <section className="bg-[#050A1F] py-16">
          <div className="max-w-3xl mx-auto px-6 text-center">
            {ctaTitle && (
              <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-4">
                {ctaTitle}
              </h2>
            )}
            {ctaSubtitle && (
              <p className="text-white/60 mb-8">
                {ctaSubtitle}
              </p>
            )}
            {ctaButtons && ctaButtons.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {ctaButtons.map((btn, i) => (
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
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </DetailPageLayout>
  );
}

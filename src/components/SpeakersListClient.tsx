'use client';

import React, { useState } from 'react';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import Link from 'next/link';
import Image from 'next/image';
import { DetailPageLayout } from '@/components/DetailPageLayout';
import type { NormalizedSpeaker } from '@/lib/api-types';

const SPEAKERS_PER_PAGE = 24;

// Card accent colors — subtle dark palette matching the site
const cardColors = [
  '#020408', // brand-dark
  '#0a1628', // dark navy
  '#0c1a2e', // deep blue
  '#101820', // charcoal
];

interface SpeakerCardProps {
  speaker: NormalizedSpeaker;
  colorIndex: number;
}

function SpeakerCard({ speaker, colorIndex }: SpeakerCardProps) {
  const color = cardColors[colorIndex % cardColors.length];

  return (
    <Link
      href={speaker.slug ? `/speakers/${speaker.slug}` : '#'}
      className="group block overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl no-underline"
      style={{ backgroundColor: color }}
    >
      <div className="relative h-[340px] p-6 flex flex-col">
        {/* Speaker Info */}
        <div className="flex-1 pr-[180px]">
          <h3 className="text-white text-xl font-display font-bold group-hover:underline leading-tight">
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
        <div className={`absolute bottom-0 right-0 overflow-hidden ${speaker.slug === 'alexiei-dingli' ? 'w-[300px] h-[390px]' : 'w-[200px] h-[260px]'}`}>
          {speaker.image ? (
            <Image
              src={speaker.image}
              alt={speaker.name}
              fill
              sizes={speaker.slug === 'alexiei-dingli' ? '300px' : '200px'}
              className="object-contain object-bottom"
            />
          ) : (
            <div className="w-full h-full flex items-end justify-center">
              <i className="ri-user-line text-white/20 text-7xl mb-4"></i>
            </div>
          )}
        </div>

        {/* View Profile indicator */}
        <div className="absolute bottom-4 left-6 text-white/70 text-xs flex items-center gap-1 group-hover:text-white transition-colors font-mono uppercase tracking-widest">
          View Profile
          <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

interface SpeakersListClientProps {
  speakers: NormalizedSpeaker[];
}

export function SpeakersListClient({ speakers }: SpeakersListClientProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(speakers.length / SPEAKERS_PER_PAGE);
  const startIndex = (currentPage - 1) * SPEAKERS_PER_PAGE;
  const endIndex = startIndex + SPEAKERS_PER_PAGE;
  const paginatedSpeakers = speakers.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    document.getElementById('speakers-grid')?.scrollIntoView({ behavior: 'smooth' });
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
    <DetailPageLayout>
      {/* Hero Section */}
      <section className="relative bg-[#020408] text-white pt-16 pb-0">
        {/* Grid Overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            maskImage: 'radial-gradient(ellipse 80% 70% at center, black 0%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at center, black 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 max-w-[1440px] mx-auto px-6 text-center">
          <p className="text-brand-cyan text-sm font-mono uppercase tracking-widest mb-4">
            Meet Our Speakers
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-[1.1] mb-6">
            Leading Voices on the <br className="hidden md:block" />
            <span className="text-brand-cyan">DeAI Summit</span> Stage
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto mb-12">
            Speakers from frontier AI, decentralized systems, policy, and academia — shaping the future of intelligence.
          </p>
        </div>

        {/* Stats + Divider */}
        {speakers.length > 0 && (
          <div className="relative z-10 max-w-[1440px] mx-auto px-6 pt-8 pb-8">
            <div className="flex items-center justify-center gap-16 mb-12">
              <div className="text-center">
                <p className="text-brand-cyan text-4xl font-display font-bold mb-1">
                  <AnimatedCounter value={String(speakers.length)} duration={1800} />
                </p>
                <div className="w-8 h-[2px] mx-auto mb-2" style={{ backgroundColor: cardColors[0] }} />
                <p className="text-white/50 text-xs font-mono uppercase tracking-widest">
                  Speakers
                </p>
              </div>
              <div className="w-[1px] h-14 bg-white/10" />
              <div className="text-center">
                <p className="text-brand-cyan text-4xl font-display font-bold mb-1">
                  <AnimatedCounter value="60+" duration={1800} delay={200} />
                </p>
                <div className="w-8 h-[2px] mx-auto mb-2" style={{ backgroundColor: cardColors[1] }} />
                <p className="text-white/50 text-xs font-mono uppercase tracking-widest">
                  Sessions
                </p>
              </div>
            </div>
            <div className="h-[1px] bg-brand-cyan/30" />
          </div>
        )}
      </section>

      {/* Speakers Grid */}
      <section id="speakers-grid" className="bg-[#F0F0EF] py-16">
        <div className="max-w-[1440px] mx-auto px-6">
          {speakers.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">
                No speakers available at the moment.
              </p>
            </div>
          ) : (
            <>
              {/* Showing count */}
              {speakers.length > SPEAKERS_PER_PAGE && (
                <p className="text-gray-500 text-sm text-center mb-8 font-mono">
                  Showing {startIndex + 1}-{Math.min(endIndex, speakers.length)} of {speakers.length} speakers
                </p>
              )}

              {/* Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {paginatedSpeakers.map((speaker, index) => (
                  <SpeakerCard
                    key={speaker.id}
                    speaker={speaker}
                    colorIndex={startIndex + index}
                  />
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
                        : 'border-gray-400 text-gray-700 hover:bg-[#020408] hover:text-white hover:border-[#020408]'
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
                        : 'border-gray-400 text-gray-700 hover:bg-[#020408] hover:text-white hover:border-[#020408]'
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
    </DetailPageLayout>
  );
}

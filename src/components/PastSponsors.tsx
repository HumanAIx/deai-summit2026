'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatedGrid } from '@/components/AnimatedGrid';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import type { PartnerItemData } from '@/components/LandingPage';

interface PastSponsorsProps {
  data: PartnerItemData[];
  onOpenContact: () => void;
}

export const PastSponsors: React.FC<PastSponsorsProps> = ({ data, onOpenContact }) => {
  const sponsors = data.filter(d => d.isSponsor);
  const partners = data.filter(d => !d.isSponsor);

  return (
    <section id="sponsors" className="relative w-full overflow-hidden">

      {/* Dark hero header */}
      <div className="relative bg-[#050A1F] text-white py-24 px-6">
        <div className="absolute inset-0 pointer-events-none animated-grid">
          <AnimatedGrid density={2} />
        </div>

        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <p className="text-brand-cyan text-sm font-mono uppercase tracking-widest mb-4">
            Our Ecosystem
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-[1.1] mb-6">
            Sponsors & <span className="text-brand-cyan">Partners</span>
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto mb-14">
            Leading organizations powering the future of decentralized AI governance.
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-20 md:gap-28">
            {data.length > 0 && (
              <div className="text-center relative">
                <div className="absolute inset-0 blur-3xl opacity-15 rounded-full scale-150 bg-brand-cyan" />
                <p className="text-brand-cyan text-5xl md:text-6xl font-display font-bold mb-3 relative">
                  <AnimatedCounter value={String(data.length)} duration={2000} />
                </p>
                <div className="w-10 h-[3px] mx-auto mb-3 rounded-full bg-brand-cyan" />
                <p className="text-white/50 text-sm font-mono uppercase tracking-widest">
                  Organizations
                </p>
              </div>
            )}
            <div className="w-[1px] h-16 bg-white/10" />
            <div className="text-center relative">
              <div className="absolute inset-0 blur-3xl opacity-15 rounded-full scale-150 bg-brand-blue" />
              <p className="text-brand-blue text-5xl md:text-6xl font-display font-bold mb-3 relative">
                <AnimatedCounter value="100+" duration={2000} delay={300} />
              </p>
              <div className="w-10 h-[3px] mx-auto mb-3 rounded-full bg-brand-blue" />
              <p className="text-white/50 text-sm font-mono uppercase tracking-widest">
                Companies
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Logo grid — light section */}
      <div className="bg-[#F0F0EF] py-20 px-6">
        <div className="max-w-[1440px] mx-auto">

          {/* Sponsors */}
          {sponsors.length > 0 && (
            <div className="mb-16">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-1 h-8 bg-brand-cyan rounded-full" />
                <h3 className="text-xl md:text-2xl font-display font-bold text-[#050A1F]">Sponsors</h3>
              </div>
              <div className="flex flex-wrap justify-center gap-5">
                {sponsors.map((sponsor, index) => (
                  <div key={index} className="w-[calc(50%-10px)] sm:w-[calc(33.333%-14px)] lg:w-[calc(25%-15px)] xl:w-[calc(20%-16px)]">
                    <SponsorCard item={sponsor} index={index} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Partners */}
          {partners.length > 0 && (
            <div className="mb-16">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-1 h-8 bg-brand-blue rounded-full" />
                <h3 className="text-xl md:text-2xl font-display font-bold text-[#050A1F]">Partners</h3>
              </div>
              <div className="flex flex-wrap justify-center gap-5">
                {partners.map((partner, index) => (
                  <div key={index} className="w-[calc(50%-10px)] sm:w-[calc(33.333%-14px)] lg:w-[calc(25%-15px)] xl:w-[calc(20%-16px)]">
                    <SponsorCard item={partner} index={index + sponsors.length} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All together if no distinction */}
          {sponsors.length === 0 && partners.length === 0 && data.length > 0 && (
            <div className="flex flex-wrap justify-center gap-5 mb-16">
              {data.map((item, index) => (
                <div key={index} className="w-[calc(50%-10px)] sm:w-[calc(33.333%-14px)] lg:w-[calc(25%-15px)] xl:w-[calc(20%-16px)]">
                  <SponsorCard item={item} index={index} />
                </div>
              ))}
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-5 items-center justify-center pt-8">
            <Link
              href="/contact?inquiry=Sponsorship+Opportunities"
              className="group px-10 py-4 rounded-full bg-[#050A1F] text-white hover:bg-brand-cyan transition-all duration-300 text-sm font-bold shadow-lg hover:shadow-brand-cyan/20 hover:shadow-xl flex items-center gap-3"
            >
              <i className="ri-vip-diamond-line text-lg group-hover:scale-110 transition-transform"></i>
              Become a Sponsor
            </Link>
            <Link
              href="/contact?inquiry=Sponsorship+Opportunities"
              className="group px-10 py-4 rounded-full border-2 border-[#050A1F] text-[#050A1F] hover:bg-[#050A1F] hover:text-white transition-all duration-300 text-sm font-bold flex items-center gap-3"
            >
              <i className="ri-file-download-line text-lg group-hover:scale-110 transition-transform"></i>
              Request Sponsorship Deck
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
};

const tileColors = ['#00B0C2', '#0E6FEB', '#050A1F', '#00B0C2', '#0E6FEB', '#050A1F'];

function SponsorCard({ item, index = 0 }: { item: PartnerItemData; index?: number }) {
  const href = item.isSponsor
    ? `/partners/${item.slug}`
    : `/companies/${item.slug}`;
  const accent = tileColors[index % tileColors.length];

  const card = (
    <div className="group relative h-44 rounded-2xl overflow-hidden transition-all duration-500 hover:scale-[1.04]"
      style={{
        background: `linear-gradient(135deg, #ffffff 0%, #f8f8f8 100%)`,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 0 30px 6px ${accent}20, 0 15px 40px rgba(0,0,0,0.12)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)';
      }}
    >
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] transition-all duration-500 opacity-0 group-hover:opacity-100"
        style={{ backgroundColor: accent }}
      />

      {/* Logo */}
      <div className="relative w-full h-full flex flex-col items-center justify-center px-6 pt-6 pb-4">
        <div className="relative w-full flex-1 max-w-[150px] max-h-[55px]">
          <Image
            src={item.logo}
            alt={item.name}
            fill
            className="object-contain grayscale-[0.6] group-hover:grayscale-0 opacity-60 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110"
          />
        </div>

        {/* Name + arrow */}
        <div className="mt-auto pt-4 flex items-center justify-between w-full border-t border-gray-100 group-hover:border-transparent transition-colors duration-500">
          <p className="text-[11px] font-semibold text-gray-400 group-hover:text-gray-700 transition-colors duration-500 truncate">
            {item.name}
          </p>
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 -translate-x-2 group-hover:translate-x-0 flex-shrink-0"
            style={{ backgroundColor: accent }}
          >
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );

  if (item.slug) {
    return (
      <Link href={href} className="no-underline">
        {card}
      </Link>
    );
  }

  return card;
}

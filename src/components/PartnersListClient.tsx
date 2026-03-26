'use client';

import React from 'react';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import Image from 'next/image';
import Link from 'next/link';
import { DetailPageLayout } from '@/components/DetailPageLayout';
import type { NormalizedSponsor } from '@/lib/api-types';

interface PartnersListClientProps {
  sponsors: NormalizedSponsor[];
  partners: NormalizedSponsor[];
}

function CompanyCard({ company, type }: { company: NormalizedSponsor; type: 'sponsor' | 'partner' }) {
  const href = type === 'sponsor' ? `/sponsors/${company.slug}` : `/companies/${company.slug}`;

  return (
    <Link
      href={company.slug ? href : '#'}
      className="group block overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl no-underline bg-white border border-gray-200 hover:border-gray-300"
    >
      {/* Logo section */}
      <div className="relative h-[160px] flex items-center justify-center p-8 bg-white">
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
      <div className="p-5 bg-[#020408] min-h-[100px] flex flex-col justify-between">
        <div>
          <h3 className="text-white text-base font-display font-bold group-hover:text-brand-cyan transition-colors leading-tight">
            {company.name}
          </h3>
          {company.bio && (
            <p className="text-white/50 text-xs mt-2 line-clamp-2 leading-relaxed">
              {company.bio.replace(/<[^>]*>/g, '').replace(/[#*_`>\[\]()]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 mt-3 text-brand-cyan text-xs font-mono uppercase tracking-widest group-hover:text-white transition-colors">
          View Details
          <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

export function PartnersListClient({ sponsors, partners }: PartnersListClientProps) {
  const totalCompanies = sponsors.length + partners.length;

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
            Our Ecosystem
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-[1.1] mb-6">
            Sponsors & <span className="text-brand-cyan">Partners</span>
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto mb-12">
            Leading organizations shaping the future of decentralized AI — powering the summit and the movement.
          </p>
        </div>

        {/* Stats + Divider */}
        {totalCompanies > 0 && (
          <div className="relative z-10 max-w-[1440px] mx-auto px-6 pt-8 pb-8">
            <div className="flex items-center justify-center gap-16 mb-12">
              {sponsors.length > 0 && (
                <div className="text-center">
                  <p className="text-brand-cyan text-4xl font-display font-bold mb-1">
                    <AnimatedCounter value={String(sponsors.length)} duration={1800} />
                  </p>
                  <div className="w-8 h-[2px] mx-auto mb-2 bg-brand-cyan" />
                  <p className="text-white/50 text-xs font-mono uppercase tracking-widest">
                    Sponsors
                  </p>
                </div>
              )}
              {sponsors.length > 0 && partners.length > 0 && (
                <div className="w-[1px] h-14 bg-white/10" />
              )}
              {partners.length > 0 && (
                <div className="text-center">
                  <p className="text-brand-cyan text-4xl font-display font-bold mb-1">
                    <AnimatedCounter value={String(partners.length)} duration={1800} delay={200} />
                  </p>
                  <div className="w-8 h-[2px] mx-auto mb-2 bg-brand-blue" />
                  <p className="text-white/50 text-xs font-mono uppercase tracking-widest">
                    Partners
                  </p>
                </div>
              )}
            </div>
            <div className="h-[1px] bg-brand-cyan/30" />
          </div>
        )}
      </section>

      {/* Sponsors Section */}
      {sponsors.length > 0 && (
        <section className="bg-[#F0F0EF] pt-16 pb-8">
          <div className="max-w-[1440px] mx-auto px-6">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-1 h-8 bg-brand-cyan rounded-full" />
              <h2 className="text-2xl md:text-3xl font-display font-bold text-[#1a1a1a]">
                Sponsors
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sponsors.map((sponsor) => (
                <CompanyCard key={sponsor.id} company={sponsor} type="sponsor" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Partners Section */}
      {partners.length > 0 && (
        <section className="bg-[#F0F0EF] pt-8 pb-16">
          <div className="max-w-[1440px] mx-auto px-6">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-1 h-8 bg-brand-blue rounded-full" />
              <h2 className="text-2xl md:text-3xl font-display font-bold text-[#1a1a1a]">
                Partners
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {partners.map((partner) => (
                <CompanyCard key={partner.id} company={partner} type="partner" />
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
      <section className="bg-[#020408] py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-4">
            Interested in Sponsoring?
          </h2>
          <p className="text-white/60 mb-8">
            Join leading organizations at the forefront of decentralized AI governance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/#sponsors"
              className="px-8 py-3 rounded-full border border-white bg-white text-[#020408] hover:bg-brand-cyan hover:text-white hover:border-brand-cyan transition-all duration-300 text-sm font-bold no-underline"
            >
              Become a Sponsor
            </Link>
            <Link
              href="/#sponsors"
              className="px-8 py-3 rounded-full border border-white/30 text-white hover:bg-white/10 transition-all duration-300 text-sm font-bold no-underline"
            >
              Request Sponsorship Deck
            </Link>
          </div>
        </div>
      </section>
    </DetailPageLayout>
  );
}

'use client';

import React from 'react';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { FittedCompanyLogo } from '@/components/FittedCompanyLogo';
import Link from 'next/link';
import { DetailPageLayout } from '@/components/DetailPageLayout';
import { AnimatedGrid } from '@/components/AnimatedGrid';
import type { NormalizedSponsor, NavigationAPIData } from '@/lib/api-types';
import type { NavigationConfig } from '@/config/types';
interface PartnersListClientProps {
  sponsors: NormalizedSponsor[];
  partners: NormalizedSponsor[];
  mediaPartners?: MediaPartnerLink[];
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
  // First, handle explicit **markers**
  if (text.includes('**')) {
    return text.replace(/\*\*(.+?)\*\*/g, '<span class="text-brand-cyan">$1</span>');
  }
  // Auto-highlight brand name or "Partners" keyword
  return text
    .replace(/(DeAI Summit)/gi, '<span class="text-brand-cyan">$1</span>')
    .replace(/(Partners)/gi, '<span class="text-brand-cyan">$1</span>');
}

const FOOTER_COLORS = ['#00B0C2', '#0E6FEB'] as const;

function byName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
}

export interface MediaPartnerLink {
  name: string;
  image: string;
  href: string;
  darkBg: boolean;
}

function CompanyCard({ company, type, bgColor }: { company: NormalizedSponsor; type: 'sponsor' | 'partner'; bgColor: string }) {
  const href = type === 'sponsor' ? `/sponsors/${company.slug}` : `/partners/${company.slug}`;

  return (
    <Link
      href={company.slug ? href : '#'}
      className="group block overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl no-underline bg-white border border-gray-200 hover:border-gray-300"
    >
      {/* Logo section */}
      <div
        className={`relative h-[160px] overflow-hidden ${
          company.logoHasDarkBg ? 'bg-[#050A1F]' : 'bg-white'
        }`}
      >
        {company.logo ? (
          <div className="absolute inset-0 p-8">
            <FittedCompanyLogo src={company.logo} alt={company.name} />
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

function MediaPartnerGrid({ partners }: { partners: MediaPartnerLink[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-6">
      {partners.map((partner) => (
        <a
          key={partner.href}
          href={partner.href}
          target="_blank"
          rel="noopener noreferrer"
          className="group block w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] xl:w-[calc(25%-18px)] overflow-hidden rounded-2xl bg-white border border-gray-200 hover:border-gray-300 hover:scale-[1.02] hover:shadow-xl transition-all duration-300 no-underline"
        >
          <div className={`relative h-[160px] overflow-hidden ${partner.darkBg ? 'bg-[#050A1F]' : 'bg-white'}`}>
            <div className="absolute inset-0 p-8">
              <FittedCompanyLogo src={partner.image} alt={partner.name} />
            </div>
          </div>
          <div className="px-5 py-4 flex items-center justify-between gap-3">
            <span className="text-[#050A1F] text-sm font-display font-bold leading-tight">{partner.name}</span>
            <span className="text-[#0E6FEB] text-xs font-bold font-mono uppercase tracking-widest shrink-0 group-hover:underline">
              Visit
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}

function CompanyGrid({ companies, type }: { companies: NormalizedSponsor[]; type: 'sponsor' | 'partner' }) {
  const colors = companies.map((_, index) => FOOTER_COLORS[index % FOOTER_COLORS.length]);
  return (
    <div className="flex flex-wrap justify-center gap-6">
      {companies.map((company, index) => (
        <div key={company.id} className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] xl:w-[calc(25%-18px)]">
          <CompanyCard company={company} type={type} bgColor={colors[index]} />
        </div>
      ))}
    </div>
  );
}

export function PartnersListClient({ sponsors, partners, mediaPartners = [], heroTitle, heroSubtitle, heroBadge, ctaTitle, ctaSubtitle, ctaButtons, navigationData, navigationAPIData, socials }: PartnersListClientProps) {
  const sponsorIds = new Set(sponsors.map(s => s.id));
  const sortedSponsors = [...sponsors].sort(byName);
  const partnerCompanies = partners.filter(p => p.isPartner && !sponsorIds.has(p.id)).sort(byName);
  const sortedMediaPartners = [...mediaPartners].sort(byName);
  const totalCompanies = sortedSponsors.length + partnerCompanies.length;

  return (
    <DetailPageLayout navigationData={navigationData} navigationAPIData={navigationAPIData} socials={socials}>
      {/* Hero Section */}
      <section className="relative bg-[#050A1F] text-white pt-16 pb-0">
        {/* Grid Overlay */}
        <div className="absolute inset-0 pointer-events-none animated-grid">
          <AnimatedGrid />
        </div>

        <div className="relative z-10 max-w-[1440px] mx-auto px-6 text-center">
          <p className="text-brand-cyan text-base md:text-lg font-mono font-bold uppercase tracking-[0.18em] mb-5">
            {heroBadge || 'Our Ecosystem'}
          </p>
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-[1.1] mb-6"
            dangerouslySetInnerHTML={{ __html: heroTitle
              ? highlightTitle(heroTitle)
              : 'Sponsors & <span class="text-brand-cyan">Partners</span>'
            }}
          />
          <p className="text-white/85 text-xl md:text-2xl font-semibold max-w-3xl mx-auto mb-12 leading-relaxed">
            {heroSubtitle || 'Leading organizations shaping the future of decentralized AI — powering the summit and the movement.'}
          </p>
        </div>

        {/* Stats + Divider */}
        {totalCompanies > 0 && (
          <div className="relative z-10 max-w-[1440px] mx-auto px-6 pt-12 pb-12">
            <div className="flex items-center justify-center gap-20 md:gap-28 mb-16">
              {sortedSponsors.length > 0 && (
                <div className="text-center relative">
                  <div className="absolute inset-0 blur-3xl opacity-15 rounded-full scale-150 bg-brand-cyan" />
                  <p className="text-brand-cyan text-6xl md:text-7xl font-display font-bold mb-3 relative">
                    <AnimatedCounter value={String(sortedSponsors.length)} duration={2200} />
                  </p>
                  <div className="w-12 h-[3px] mx-auto mb-3 rounded-full bg-brand-cyan" />
                  <p className="text-white/50 text-sm font-mono uppercase tracking-widest">
                    Sponsors & Supporters
                  </p>
                </div>
              )}
              {sortedSponsors.length > 0 && partnerCompanies.length > 0 && (
                <div className="w-[1px] h-20 bg-white/10" />
              )}
              {partnerCompanies.length > 0 && (
                <div className="text-center relative">
                  <div className="absolute inset-0 blur-3xl opacity-15 rounded-full scale-150 bg-brand-blue" />
                  <p className="text-brand-blue text-6xl md:text-7xl font-display font-bold mb-3 relative">
                    <AnimatedCounter value={String(partnerCompanies.length)} duration={2200} delay={300} />
                  </p>
                  <div className="w-12 h-[3px] mx-auto mb-3 rounded-full bg-brand-blue" />
                  <p className="text-white/50 text-sm font-mono uppercase tracking-widest">
                    Speakers & Partners Organizations
                  </p>
                </div>
              )}
            </div>
            <div className="h-[1px] bg-gradient-to-r from-transparent via-brand-cyan/40 to-transparent" />
          </div>
        )}
      </section>

      {/* Sponsors & Partners — separate sections */}
      {(totalCompanies > 0 || sortedMediaPartners.length > 0) && (
        <section className="bg-[#F0F0EF] pt-16 pb-[100px]">
          <div className="max-w-[1440px] mx-auto px-6 space-y-16">
            {sortedSponsors.length > 0 && (
              <div>
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-1 h-8 bg-brand-cyan rounded-full" />
                  <h2 className="text-2xl md:text-3xl font-display font-bold text-[#050A1F]">
                    Sponsors & Supporters
                  </h2>
                </div>
                <CompanyGrid companies={sortedSponsors} type="sponsor" />
              </div>
            )}
            {partnerCompanies.length > 0 && (
              <div>
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-1 h-8 bg-brand-blue rounded-full" />
                  <h2 className="text-2xl md:text-3xl font-display font-bold text-[#050A1F]">
                    Speakers & Partners Organizations
                  </h2>
                </div>
                <CompanyGrid companies={partnerCompanies} type="partner" />
              </div>
            )}
            {sortedMediaPartners.length > 0 && (
              <div>
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-1 h-8 bg-brand-cyan rounded-full" />
                  <h2 className="text-2xl md:text-3xl font-display font-bold text-[#050A1F]">
                    Media Partners
                  </h2>
                </div>
                <MediaPartnerGrid partners={sortedMediaPartners} />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Empty state */}
      {totalCompanies === 0 && sortedMediaPartners.length === 0 && (
        <section className="bg-[#F0F0EF] py-24">
          <div className="max-w-[1440px] mx-auto px-6 text-center">
            <p className="text-gray-500 text-lg">
              No sponsors or partners available at the moment.
            </p>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="bg-[#050A1F] py-20 md:py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-display font-extrabold text-white mb-5">
            {ctaTitle || 'Interested in Sponsoring?'}
          </h2>
          <p className="text-lg md:text-xl font-medium text-white/85 leading-relaxed mb-10">
            {ctaSubtitle || 'Join leading organizations at the forefront of decentralized AI governance.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {ctaButtons && ctaButtons.length > 0 ? (
              ctaButtons.map((btn, i) => (
                <Link
                  key={i}
                  href={btn.link || '#'}
                  className={i === 0
                    ? 'px-10 py-4 rounded-full border border-white bg-white text-[#050A1F] hover:bg-brand-cyan hover:text-white hover:border-brand-cyan transition-all duration-300 text-base md:text-lg font-bold no-underline'
                    : 'px-10 py-4 rounded-full border border-white/40 text-white hover:bg-white/10 transition-all duration-300 text-base md:text-lg font-bold no-underline'
                  }
                >
                  {btn.label}
                </Link>
              ))
            ) : (
              <>
                <Link
                  href="/#sponsors"
                  className="px-10 py-4 rounded-full border border-white bg-white text-[#050A1F] hover:bg-brand-cyan hover:text-white hover:border-brand-cyan transition-all duration-300 text-base md:text-lg font-bold no-underline"
                >
                  Become a Sponsor
                </Link>
                <Link
                  href="/#sponsors"
                  className="px-10 py-4 rounded-full border border-white/40 text-white hover:bg-white/10 transition-all duration-300 text-base md:text-lg font-bold no-underline"
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

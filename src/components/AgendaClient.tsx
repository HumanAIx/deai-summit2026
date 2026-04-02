'use client';

import React from 'react';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { DetailPageLayout } from '@/components/DetailPageLayout';
import { AnimatedGrid } from '@/components/AnimatedGrid';
import type { NavigationConfig } from '@/config/types';
import type { NavigationAPIData } from '@/lib/api-types';

/** Convert **text** markers or brand name to cyan-highlighted spans */
function highlightTitle(text: string): string {
  if (text.includes('**')) {
    return text.replace(/\*\*(.+?)\*\*/g, '<span class="text-brand-cyan">$1</span>');
  }
  return text.replace(/(DeAI Summit)/gi, '<span class="text-brand-cyan">$1</span>');
}

interface AgendaSection {
  title: string;
  subtitle?: string;
  description: string;
  collectionItems?: { title: string; description: string; rawCount?: number }[];
}

interface AgendaClientProps {
  heroTitle: string;
  heroSubtitle?: string;
  heroDescription: string;
  stats: { label: string; value: string }[];
  sections: AgendaSection[];
  navigationData?: NavigationConfig;
  navigationAPIData?: NavigationAPIData;
  socials?: { key: string; label: string; url: string; icon?: string; color?: string }[];
}

export function AgendaClient({
  heroTitle,
  heroSubtitle,
  heroDescription,
  stats,
  sections,
  navigationData,
  navigationAPIData,
  socials,
}: AgendaClientProps) {
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
            {heroSubtitle || 'Programme'}
          </p>
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-[1.1] mb-6"
            dangerouslySetInnerHTML={{ __html: highlightTitle(heroTitle) }}
          />
          {heroDescription && (
            <p className="text-white/60 text-lg max-w-2xl mx-auto mb-12">
              {heroDescription}
            </p>
          )}
        </div>

        {/* Stats + Divider */}
        {stats.length > 0 && (
          <div className="relative z-10 max-w-[1440px] mx-auto px-6 pt-12 pb-12">
            <div className="flex items-center justify-center gap-20 md:gap-28 mb-16">
              {stats.map((stat, i) => {
                const colors = ['bg-brand-cyan', 'bg-brand-blue'];
                const textColors = ['text-brand-cyan', 'text-brand-blue'];
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
              })}
            </div>
            <div className="h-[1px] bg-gradient-to-r from-transparent via-brand-cyan/40 to-transparent" />
          </div>
        )}
      </section>

      {/* Content Sections */}
      <section className="bg-[#F0F0EF] py-16">
        <div className="max-w-[1440px] mx-auto px-6">
          {sections.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">
                The agenda will be announced soon.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-12">
              {sections.map((section, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-gray-200"
                >
                  <h2 className="text-2xl md:text-3xl font-display font-bold text-[#050A1F] mb-4">
                    {section.title}
                  </h2>
                  {section.subtitle && (
                    <p className="text-brand-cyan text-sm font-mono uppercase tracking-widest mb-4">
                      {section.subtitle}
                    </p>
                  )}
                  {section.description && (
                    <p className="text-gray-600 text-base leading-relaxed max-w-3xl">
                      {section.description}
                    </p>
                  )}

                  {/* Section stats if any */}
                  {section.collectionItems && section.collectionItems.length > 0 && (
                    <div className="flex gap-10 mt-8 pt-6 border-t border-gray-100">
                      {section.collectionItems.map((ci, ciIdx) => {
                        const displayValue = ci.rawCount != null ? String(ci.rawCount) : ci.title;
                        return (
                          <div key={ciIdx} className="text-center">
                            <p className="text-3xl font-display font-bold text-[#050A1F]">
                              {displayValue}
                            </p>
                            <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mt-1">
                              {ci.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </DetailPageLayout>
  );
}

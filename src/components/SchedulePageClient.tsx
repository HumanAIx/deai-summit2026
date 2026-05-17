'use client';

import React from 'react';
import { AnimatedGrid } from '@/components/AnimatedGrid';
import { DetailPageLayout } from '@/components/DetailPageLayout';
import { ScheduleBlockSection, type HydratedSchedule } from '@/components/ScheduleBlockSection';
import type { NavigationConfig } from '@/config/types';
import type { CMSBlock, NavigationAPIData } from '@/lib/api-types';

function isScheduleAddon(block: CMSBlock): boolean {
  return String(block.addon ?? '').trim().toLowerCase() === 'schedule';
}

function scheduleIdFrom(block: CMSBlock): string | undefined {
  const b = block as Record<string, unknown>;
  const raw = b.scheduleId ?? b.schedule_id;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

function isScheduleLikeBlock(block: CMSBlock): boolean {
  if (isScheduleAddon(block)) return true;
  if (scheduleIdFrom(block)) return true;
  return false;
}

/** Convert **text** markers or brand name to cyan-highlighted spans */
function highlightTitle(text: string): string {
  if (text.includes('**')) {
    return text.replace(/\*\*(.+?)\*\*/g, '<span class="text-brand-cyan">$1</span>');
  }
  return text.replace(/(DeAI Summit)/gi, '<span class="text-brand-cyan">$1</span>');
}

export function SchedulePageClient({
  heroTitle,
  heroSubtitle,
  heroDescription,
  blocks,
  navigationData,
  navigationAPIData,
  socials,
}: {
  heroTitle: string;
  heroSubtitle?: string;
  heroDescription: string;
  blocks: CMSBlock[];
  navigationData?: NavigationConfig;
  navigationAPIData?: NavigationAPIData;
  socials?: { key: string; label: string; url: string; icon?: string; color?: string }[];
}) {
  return (
    <DetailPageLayout navigationData={navigationData} navigationAPIData={navigationAPIData} socials={socials}>
      <section className="relative bg-[#050A1F] text-white pt-16 pb-0">
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
            <p className="text-white/60 text-lg max-w-2xl mx-auto mb-12">{heroDescription}</p>
          )}
        </div>
        <div className="h-[1px] bg-gradient-to-r from-transparent via-brand-cyan/40 to-transparent max-w-[1440px] mx-auto mt-8" />
      </section>

      <section className="relative bg-gradient-to-b from-[#EAE7E2] via-[#F2F0EC] to-[#E8E5E0] py-16 md:py-24">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: 'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(14,111,235,0.07), transparent), radial-gradient(ellipse 50% 40% at 100% 50%, rgba(0,176,194,0.05), transparent)',
          }}
        />
        <div className="relative z-[1] max-w-[1400px] mx-auto px-6">
          {blocks.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[#050A1F]/50 text-lg font-light">
                Add a Schedule content block in the CMS to display the programme here.
              </p>
            </div>
          ) : (
            blocks.map((block) => {
              const ext = block as CMSBlock & { schedule?: HydratedSchedule | null; scheduleId?: string };
              if (isScheduleLikeBlock(block)) {
                if (ext.schedule) {
                  return (
                    <ScheduleBlockSection
                      key={block.id}
                      title={block.title}
                      subtitle={block.subtitle}
                      schedule={ext.schedule}
                    />
                  );
                }
                return (
                  <div
                    key={block.id}
                    className="text-center py-16 px-6 rounded-sm border border-amber-900/15 bg-amber-50/90 text-[#050A1F]/80 max-w-3xl mx-auto"
                  >
                    <p className="font-display text-lg font-semibold text-[#050A1F] mb-2">Programme could not be loaded</p>
                    <p className="text-sm leading-relaxed">
                      The schedule block is saved in the CMS, but no programme data came back from the API. Check that the
                      schedule is <strong>published</strong>, has public sessions with dates, and that this site&apos;s API key
                      and tenant can read it.
                    </p>
                  </div>
                );
              }
              if (block.type === 'content' && block.title && !isScheduleLikeBlock(block)) {
                return (
                  <div
                    key={block.id}
                    className="bg-white/90 backdrop-blur-sm rounded-sm p-8 md:p-12 shadow-[0_2px_48px_-12px_rgba(5,10,31,0.12)] border border-[#050A1F]/[0.06] mb-10"
                  >
                    <h2 className="text-2xl md:text-3xl font-display font-bold text-[#050A1F] mb-4">
                      {block.title}
                    </h2>
                    {block.subtitle && (
                      <p className="text-brand-cyan text-sm font-mono uppercase tracking-widest mb-4">
                        {block.subtitle}
                      </p>
                    )}
                    {(block.description || block.content) && (
                      <p className="text-gray-600 text-base leading-relaxed max-w-3xl">
                        {(block.description as string) || (block.content as string) || ''}
                      </p>
                    )}
                  </div>
                );
              }
              return null;
            })
          )}
        </div>
      </section>
    </DetailPageLayout>
  );
}

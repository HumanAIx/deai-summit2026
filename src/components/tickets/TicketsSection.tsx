'use client';

import type { CMSBlock } from '@/lib/api-types';
import { ticketCardsOf } from '@/lib/tickets/cms-section';
import { TicketsBlock } from './TicketsBlock';
import { TICKETS_BACKDROP_STYLE } from './TicketsShell';
import { plexMono } from './ticket-fonts';

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** "Choose your pass" → lead "Choose your" + accent "pass"; the block's `hl` word wins when the title contains it. */
function splitHeading(title: string, hl: string): { lead: string; accent: string; tail: string } {
  if (hl && title.includes(hl)) {
    const at = title.indexOf(hl);
    return { lead: title.slice(0, at).trimEnd(), accent: hl, tail: title.slice(at + hl.length).trimStart() };
  }
  const words = title.split(/\s+/).filter(Boolean);
  const accent = words.length > 1 ? (words.pop() ?? '') : '';
  return { lead: words.join(' '), accent, tail: '' };
}

/**
 * The CMS Tickets section on any DeAI CMS page: the section heading (subtitle = mono kicker, title with its accented
 * word, description = meta line) in the CMS tickets-page look, then GConf.ai's live ticket cards. Prices, stock and
 * sale state are read live from `/api/tickets/types` (on mount and when the tab comes back); a card's Buy button
 * goes to the `/tickets` checkout page with that type preselected and only this section's tickets on offer (never a
 * pop-up). Only picked tickets are shown: no cards, or none of them on sale, and the whole section is left out.
 */
export function TicketsSection({ block }: { block: CMSBlock }) {
  const kicker = text(block.subtitle);
  const title = text(block.title);
  const meta = text(block.description);
  const heading = splitHeading(title, text((block as { hl?: unknown }).hl));

  const cards = ticketCardsOf(block);
  // DeAI (2026-11-23): only tickets picked for sale on this page are shown; a section with none picked is not shown.
  if (cards.length === 0) return null;

  return (
    <TicketsBlock
      cards={cards}
      buyHref="/tickets"
      frame={(content) => (
        <section className={`deai-tickets ${plexMono.variable} relative bg-background py-16 font-body text-text md:py-24`} style={TICKETS_BACKDROP_STYLE}>
          <div className="relative mx-auto flex w-full max-w-[1180px] flex-col gap-10 px-4 sm:px-6 md:gap-14 md:px-14">
            {kicker || title || meta ? (
              <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 text-center">
                {kicker ? (
                  <div className={`${plexMono.className} flex items-center justify-center gap-3.5 text-sm font-medium tracking-[0.22em] text-[#2CC7D9]`}>
                    <span aria-hidden className="h-0.5 w-11 bg-[#2CC7D9]" />
                    {kicker}
                    <span aria-hidden className="h-0.5 w-11 bg-[#2CC7D9]" />
                  </div>
                ) : null}
                {title ? (
                  <h2 className="m-0 font-display text-[clamp(2.25rem,5vw,4rem)] font-normal leading-none tracking-[-0.035em] text-balance">
                    {heading.lead}
                    {heading.accent ? (
                      <>
                        {heading.lead ? ' ' : ''}
                        <span className="bg-gradient-to-r from-[#1E6BF0] to-[#08B5C6] bg-clip-text font-bold text-transparent">{heading.accent}</span>
                      </>
                    ) : null}
                    {heading.tail ? ` ${heading.tail}` : null}
                  </h2>
                ) : null}
                {meta ? <p className={`${plexMono.className} m-0 text-sm tracking-[0.22em] text-[#9AA3B8]`}>{meta}</p> : null}
              </div>
            ) : null}
            {content}
          </div>
        </section>
      )}
    />
  );
}

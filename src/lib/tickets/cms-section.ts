import type { CMSBlock } from '@/lib/api-types';
import { ticketCardsSchema, type TicketCard } from './block-schema';

/** A CMS block that is the Tickets section (dashboard › CMS › add-on Sales › Tickets): `addon: "tickets"`. */
export function isTicketsSectionBlock(block: CMSBlock): boolean {
  return block.addon === 'tickets' || block.type === 'tickets';
}

/** The block's cards, leniently: malformed cards are skipped, at most 12 kept, a missing list is `[]` (all public types). */
export function ticketCardsOf(block: CMSBlock): TicketCard[] {
  const parsed = ticketCardsSchema.safeParse((block as { ticketCards?: unknown }).ticketCards);
  return parsed.success ? (parsed.data ?? []) : [];
}

/**
 * The ticket types the CMS `tickets` page offers: the types picked as cards in its Tickets sections, in card order,
 * without repeats. `null` means "every public type": no Tickets section on the page, or a section with no cards (the
 * add-on's own rule), or sections whose cards name no type. So `/tickets` follows what the organiser placed in the CMS,
 * and never ends up empty just because the section is not set up yet.
 */
export function allowedTypeIdsOf(blocks: readonly CMSBlock[]): string[] | null {
  const sections = blocks.filter(isTicketsSectionBlock);
  if (sections.length === 0) return null;
  const perSection = sections.map(ticketCardsOf);
  if (perSection.some((cards) => cards.length === 0)) return null;
  const ids = [...new Set(perSection.flat().map((card) => card.ticketTypeId).filter((id) => id !== ''))];
  return ids.length > 0 ? ids : null;
}

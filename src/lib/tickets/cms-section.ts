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

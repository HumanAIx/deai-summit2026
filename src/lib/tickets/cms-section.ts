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
 * The ticket types a CMS page offers for sale: the types picked as cards in its Tickets sections, in card order, without
 * repeats. DeAI (2026-11-23): only picked tickets are sold, so no section, a section without cards, or cards naming no
 * type all mean nothing is on offer (`[]`), never "every public type".
 */
export function allowedTypeIdsOf(blocks: readonly CMSBlock[]): string[] {
  const ids = blocks.filter(isTicketsSectionBlock).flatMap(ticketCardsOf).map((card) => card.ticketTypeId).filter((id) => id !== '');
  return [...new Set(ids)];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The `types` list a CMS card's Buy button sends (`?types=a,b`): the tickets that section offers. Only well-formed ids,
 * at most 12 (a section's card limit), no repeats; `null` when the link carries none (then the `tickets` page decides).
 */
export function offeredTypesParam(raw: string | undefined): string[] | null {
  if (!raw) return null;
  const ids = [...new Set(raw.split(',').map((id) => id.trim()).filter((id) => UUID.test(id)))].slice(0, 12);
  return ids.length > 0 ? ids : null;
}

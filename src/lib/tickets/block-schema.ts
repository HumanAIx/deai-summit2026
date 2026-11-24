import { z } from "zod";

/**
 * One card of the `tickets` add-on: copy plus a ticket-type reference only. Prices, stock and sale state are
 * never stored in the block; they are read live from `/api/tickets/types`. Mirrors ep-api's `ticketCardSchema`
 * (hand-ported, no shared package).
 */
export const ticketCardSchema = z.object({
  id: z.string().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/),
  ticketTypeId: z.union([z.string().uuid(), z.literal("")]),
  title: z.string().trim().max(80).default(""),
  hl: z.string().trim().max(40).default(""),
  kicker: z.string().trim().max(40).default(""),
  incl: z.string().trim().max(60).default(""),
  feats: z.array(z.string().trim().max(120)).max(12).default([]),
  btn: z.string().trim().max(30).default(""),
  featured: z.boolean().default(false),
});
export type TicketCard = z.infer<typeof ticketCardSchema>;

export const MAX_TICKET_CARDS = 12;

/**
 * Lenient on read (rule 25): the array is taken as unknown items and only the cards that pass are kept, so one bad
 * card never drops the whole block. At most 12 cards survive.
 */
export const ticketCardsSchema = z
  .unknown()
  .transform((value): TicketCard[] => {
    if (!Array.isArray(value)) return [];
    const cards: TicketCard[] = [];
    for (const item of value) {
      const parsed = ticketCardSchema.safeParse(item);
      if (parsed.success) cards.push(parsed.data);
      if (cards.length >= MAX_TICKET_CARDS) break;
    }
    return cards;
  })
  .optional();

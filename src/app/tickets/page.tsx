import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TicketsPageView } from '@/components/TicketsPageView';
import { TicketsSection } from '@/components/tickets/TicketsSection';
import { TicketsIntro } from '@/components/tickets/TicketsIntro';
import { TicketsPageBody } from '@/components/tickets/TicketsPageBody';
import { allowedTypeIdsOf, isTicketsSectionBlock, offeredTypesParam, ticketCardsOf } from '@/lib/tickets/cms-section';
import { lumaHrefOf } from '@/lib/tickets/luma-fallback';
import { parseCmsBlocks } from '@/lib/cmsBlocks';
import { prefetchCMSPage, prefetchSocials } from '@/lib/prefetch';
import { isLumaTicketUrl } from '@/lib/lumaTicket';
import { parseTicketsPage } from '@/lib/tickets-page';
import { generatePageMetadata, SEO_DEFAULTS } from '@/lib/seo-defaults';

/** Stock and prices are live on every request; the CMS read is no-store too. */
export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deaisummit.org';

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined): string | undefined => (Array.isArray(value) ? value[0] : value);

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const [cmsPage, params] = await Promise.all([prefetchCMSPage('tickets'), searchParams]);
  const base: Metadata = cmsPage
    ? generatePageMetadata(cmsPage.seo || null, 'tickets', BASE_URL, {
        title: `${cmsPage.page_title} - ${SEO_DEFAULTS.siteName}`,
        description: SEO_DEFAULTS.defaultDescription,
      })
    : { title: `Tickets - ${SEO_DEFAULTS.siteName}` };
  // A legacy private link (`?link=`) carries a secret: never indexed, never sent on as a referrer. The middleware
  // already 308s it to `/tickets/l/{token}`; this is the belt to that brace.
  return first(params.link) ? { ...base, robots: { index: false, follow: false }, referrer: 'no-referrer' } : base;
}

/**
 * `/tickets`
 *
 * The CMS `tickets` page decides what this page is, so organisers switch to the live checkout from the dashboard:
 * - No Tickets section on it (dashboard › CMS › block › add-on Sales › Tickets): the CMS page with its Luma links, as
 *   before the live checkout existed.
 * - A Tickets section on it: the same page template (`TicketsPageView`) with the section's live cards where the static
 *   pass tiles were. The cards wear the pass-tile look (so the page "looks the same", DeAI 2026-11-23) but are read from GConf.ai: price, stock and sale state are live, and each card is
 *   the ticket the organiser picked, so nothing has to match by title. DECISION (Vimal, 2026-11-24): no static tile is
 *   ever wired to a ticket. The old static pass blocks are left out (production code before this change still shows
 *   them, so organisers can delete them whenever they like), and Luma stays the second option: the CMS tickets page's
 *   closing tile under the cards, linking to the page's Luma link, else the site's Luma social link.
 * - A filtered or private link, or `?type=` from a card's Buy button: the built-in live list + 4-step checkout, under
 *   the CMS page's heading texts. It offers only the tickets picked for sale: those of the section the buyer's Buy
 *   button sits in (`?types=`), else the cards on this CMS page; none picked = nothing on sale.
 * - No published CMS `tickets` page: 404.
 */
export default async function TicketsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [cmsPage, params, socials] = await Promise.all([prefetchCMSPage('tickets'), searchParams, prefetchSocials()]);

  // DECISION (Vimal, 2026-11-23): no published CMS `tickets` page = no /tickets page (404), like any unpublished page.
  // Only /tickets itself: the private pages under /tickets/* that ticket emails link to keep working.
  if (!cmsPage) notFound();
  const blocks = parseCmsBlocks(cmsPage);
  const legacy = parseTicketsPage(blocks);
  // The CMS page's own Luma link first; once the organiser has removed the Luma blocks there, the site's Luma social
  // link (Settings › Socials), so Luma stays the second option until that is removed too.
  const cmsLumaHref = lumaHrefOf({ content: legacy });
  const siteLumaHref = socials.find((s) => s.key === 'luma' && /^https?:\/\//i.test(s.url) && isLumaTicketUrl(s.url))?.url ?? null;
  const lumaHref = cmsLumaHref ?? siteLumaHref;

  // A filtered or private link, or a card's Buy button (`?type=`), always opens the checkout itself: a CMS page here
  // would send the buyer in a circle.
  const filtered = Boolean(first(params.link) ?? first(params.schedule) ?? first(params.event) ?? first(params.type));
  const hasTicketsSection = blocks.some(isTicketsSectionBlock);

  if (!filtered && !hasTicketsSection) return <TicketsPageView content={legacy} />;

  if (!filtered) {
    // The live cards in the page's own template (heading, backdrop, closing tile, footer line), exactly where the
    // static pass tiles were: those are left out, so the page looks the same and only the cards are live.
    // The closing tile's notice is the CMS page's own ("PRICE INCREASE FROM …"), so it goes when Luma comes from socials.
    return (
      <TicketsPageView
        content={{ ...legacy, notice: cmsLumaHref ? legacy.notice : '', closingHref: lumaHref ?? '' }}
        cards={blocks.filter(isTicketsSectionBlock).map((block) => (
          <TicketsSection key={block.id} block={block} bare />
        ))}
      />
    );
  }

  return (
    <TicketsPageBody
      rawLink={first(params.link)}
      rawSchedule={first(params.schedule)}
      rawEvent={first(params.event)}
      rawType={first(params.type)}
      // The tickets the buyer came for: the section their Buy button sits in (`types`), else the ones picked on this
      // CMS page. Only picked tickets are sold; none picked = nothing on offer.
      allowedTypeIds={offeredTypesParam(first(params.types)) ?? allowedTypeIdsOf(blocks)}
      // A picked ticket ep-api no longer lists (hidden, removed) still gets a "not available" row, under its card title.
      pickedNames={Object.fromEntries(blocks.filter(isTicketsSectionBlock).flatMap(ticketCardsOf).map((card) => [card.ticketTypeId, card.title]))}
      intro={legacy.titleLead || legacy.accentWord ? <TicketsIntro {...legacy} lumaHref={lumaHref} /> : undefined}
    />
  );
}

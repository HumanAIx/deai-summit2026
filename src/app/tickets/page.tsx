import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CmsPageRenderer } from '@/components/cms/CmsPageRenderer';
import { ClosingBanner, TicketsPageView } from '@/components/TicketsPageView';
import { TicketsIntro } from '@/components/tickets/TicketsIntro';
import { TicketsPageBody } from '@/components/tickets/TicketsPageBody';
import { allowedTypeIdsOf, isTicketsSectionBlock, offeredTypesParam, ticketCardsOf } from '@/lib/tickets/cms-section';
import { lumaHrefOf } from '@/lib/tickets/luma-fallback';
import { parseCmsBlocks } from '@/lib/cmsBlocks';
import { prefetchCaptchaConfig, prefetchCMSPage, prefetchDocumentsGateForms, prefetchSocials } from '@/lib/prefetch';
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
 * - A Tickets section on it and the CMS pass tiles still there: the page as it was (the same tiles and the Luma banner),
 *   with each tile's button opening the live checkout for its ticket (matched to the section's card by title, else by
 *   order). The Luma banner stays the second option. DECISION (DeAI, 2026-11-23): "it should look the same, but just
 *   the top two tiles should start the ticketing flow of GConf".
 * - A Tickets section and no pass tiles: that CMS page with live cards. The old Luma pass blocks are left out (production code
 *   before this change still shows them, so organisers never have to unpublish them first), and a "Prefer Luma?" line
 *   keeps Luma as the second option: the CMS tickets page's closing tile under the cards, linking to the page's Luma link, else
 *   the site's Luma social link.
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

  if (!filtered && legacy.passes.length > 0) {
    const cards = blocks.filter(isTicketsSectionBlock).flatMap(ticketCardsOf).filter((card) => card.ticketTypeId !== '');
    const offered = allowedTypeIdsOf(blocks);
    const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
    const passes = legacy.passes.map((pass, index) => {
      const card = cards.find((c) => sameName(c.title, pass.title)) ?? cards[index];
      // Same address as a live card's Buy button: this ticket preselected, only the page's picked tickets on offer.
      return card ? { ...pass, buttonHref: `/tickets?type=${encodeURIComponent(card.ticketTypeId)}&types=${offered.map(encodeURIComponent).join(',')}` } : pass;
    });
    return <TicketsPageView content={{ ...legacy, passes }} />;
  }

  if (!filtered) {
    const lumaPassIds = new Set(legacy.passes.map((pass) => pass.id));
    const liveBlocks = blocks.filter((block) => !lumaPassIds.has(block.id));
    const [captchaConfig, formConfigs] = await Promise.all([
      prefetchCaptchaConfig(),
      prefetchDocumentsGateForms(liveBlocks, cmsPage?.content?.formConfigs || null),
    ]);
    return (
      <div className="-mt-[140px] bg-[#040A1E] pt-[140px]">
        <CmsPageRenderer
          blocks={liveBlocks}
          pageTitle={cmsPage?.page_title}
          formConfigs={formConfigs}
          captchaSiteKey={captchaConfig.site_key}
          captchaDisabled={captchaConfig.disabled === true}
          captchaProvider={captchaConfig.provider}
        />
        {lumaHref ? (
          // The same closing tile as the CMS tickets page, under the live cards. Its notice is the CMS page's own
          // ("PRICE INCREASE FROM …"), so it is left out when the Luma link comes from the site's socials.
          <div className="mx-auto w-full max-w-[1180px] px-4 pb-20 sm:px-6 md:px-14 md:pb-24">
            <ClosingBanner notice={cmsLumaHref ? legacy.notice : ''} title={legacy.closingTitle} label={legacy.closingLabel} href={lumaHref} />
          </div>
        ) : null}
      </div>
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
      intro={legacy.titleLead || legacy.accentWord ? <TicketsIntro {...legacy} lumaHref={lumaHref} /> : undefined}
    />
  );
}

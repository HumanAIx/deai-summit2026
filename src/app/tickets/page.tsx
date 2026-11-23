import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CmsPageRenderer } from '@/components/cms/CmsPageRenderer';
import { TicketsPageView } from '@/components/TicketsPageView';
import { LumaLine, TicketsIntro } from '@/components/tickets/TicketsIntro';
import { TicketsPageBody } from '@/components/tickets/TicketsPageBody';
import { allowedTypeIdsOf, isTicketsSectionBlock, offeredTypesParam } from '@/lib/tickets/cms-section';
import { lumaHrefOf } from '@/lib/tickets/luma-fallback';
import { parseCmsBlocks } from '@/lib/cmsBlocks';
import { prefetchCaptchaConfig, prefetchCMSPage, prefetchDocumentsGateForms } from '@/lib/prefetch';
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
 * - A Tickets section on it: that CMS page with live cards. The old Luma pass blocks are left out (production code
 *   before this change still shows them, so organisers never have to unpublish them first), and a "Prefer Luma?" line
 *   keeps Luma as the second option while the page still has a Luma link.
 * - A filtered or private link, or `?type=` from a card's Buy button: the built-in live list + 4-step checkout, under
 *   the CMS page's heading texts. It offers only the tickets picked for sale: those of the section the buyer's Buy
 *   button sits in (`?types=`), else the cards on this CMS page; none picked = nothing on sale.
 * - No published CMS `tickets` page: 404.
 */
export default async function TicketsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [cmsPage, params] = await Promise.all([prefetchCMSPage('tickets'), searchParams]);

  // DECISION (Vimal, 2026-11-23): no published CMS `tickets` page = no /tickets page (404), like any unpublished page.
  // Only /tickets itself: the private pages under /tickets/* that ticket emails link to keep working.
  if (!cmsPage) notFound();
  const blocks = parseCmsBlocks(cmsPage);
  const legacy = parseTicketsPage(blocks);
  const lumaHref = lumaHrefOf({ content: legacy });

  // A filtered or private link, or a card's Buy button (`?type=`), always opens the checkout itself: a CMS page here
  // would send the buyer in a circle.
  const filtered = Boolean(first(params.link) ?? first(params.schedule) ?? first(params.event) ?? first(params.type));
  const hasTicketsSection = blocks.some(isTicketsSectionBlock);

  if (!filtered && !hasTicketsSection) return <TicketsPageView content={legacy} />;

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
          <div className="flex justify-center px-4 pb-20 text-center">
            <LumaLine href={lumaHref} />
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

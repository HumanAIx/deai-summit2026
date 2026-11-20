import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CmsPageRenderer } from '@/components/cms/CmsPageRenderer';
import { TicketsPageView } from '@/components/TicketsPageView';
import { TicketsIntro } from '@/components/tickets/TicketsIntro';
import { TicketsPageBody } from '@/components/tickets/TicketsPageBody';
import { isTicketsSectionBlock } from '@/lib/tickets/cms-section';
import { lumaHrefOf } from '@/lib/tickets/luma-fallback';
import { ticketsCheckoutEnabled } from '@/lib/tickets/feature-flag';
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
 * - Checkout off (`TICKETS_CHECKOUT_ENABLED` not `true`): the CMS `tickets` page with its Luma links, as before.
 * - Checkout on, and the CMS `tickets` page has a Tickets section (dashboard › CMS › block › add-on Sales › Tickets):
 *   that page is rendered, so organisers design it; its cards read live prices and link to this page's checkout with the type preselected.
 * - Checkout on otherwise (or a filtered / private link, or `?type=` from a card's Buy button): the built-in live list +
 *   4-step checkout, under the CMS page's heading texts.
 */
export default async function TicketsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [cmsPage, params] = await Promise.all([prefetchCMSPage('tickets'), searchParams]);
  const blocks = cmsPage ? parseCmsBlocks(cmsPage) : [];

  if (!ticketsCheckoutEnabled()) {
    if (!cmsPage) notFound();
    return <TicketsPageView content={parseTicketsPage(blocks)} />;
  }

  // A filtered or private link, or a card's Buy button (`?type=`), always opens the checkout itself: a CMS page here
  // would send the buyer in a circle.
  const filtered = Boolean(first(params.link) ?? first(params.schedule) ?? first(params.event) ?? first(params.type));
  if (!filtered && blocks.some(isTicketsSectionBlock)) {
    const [captchaConfig, formConfigs] = await Promise.all([
      prefetchCaptchaConfig(),
      prefetchDocumentsGateForms(blocks, cmsPage?.content?.formConfigs || null),
    ]);
    return (
      <div className="-mt-[140px] bg-[#040A1E] pt-[140px]">
        <CmsPageRenderer
          blocks={blocks}
          pageTitle={cmsPage?.page_title}
          formConfigs={formConfigs}
          captchaSiteKey={captchaConfig.site_key}
          captchaDisabled={captchaConfig.disabled === true}
          captchaProvider={captchaConfig.provider}
        />
      </div>
    );
  }

  const heading = cmsPage ? parseTicketsPage(blocks) : null;
  return (
    <TicketsPageBody
      rawLink={first(params.link)}
      rawSchedule={first(params.schedule)}
      rawEvent={first(params.event)}
      rawType={first(params.type)}
      intro={heading?.titleLead || heading?.accentWord ? <TicketsIntro {...heading} lumaHref={lumaHrefOf({ content: heading })} /> : undefined}
    />
  );
}

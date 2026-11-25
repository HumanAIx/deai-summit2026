import { beforeEach, describe, expect, it, vi } from "vitest";

const { prefetchCMSPage, prefetchCaptchaConfig, prefetchDocumentsGateForms, prefetchSocials, notFound, fetchPublicTypes } = vi.hoisted(() => ({
  fetchPublicTypes: vi.fn(),
  prefetchCMSPage: vi.fn(),
  prefetchSocials: vi.fn(),
  prefetchCaptchaConfig: vi.fn(),
  prefetchDocumentsGateForms: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("react/jsx-dev-runtime", async () => (await import("../../helpers/jsx-stub")).jsxStub);
vi.mock("react/jsx-runtime", async () => (await import("../../helpers/jsx-stub")).jsxStub);
vi.mock("next/navigation", () => ({ notFound }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/tickets/api", () => ({ fetchPublicTypes }));
vi.mock("@/lib/tickets/i18n-server", () => ({ getLocale: async () => "en", getTranslations: async () => (key: string) => `t:${key}` }));
vi.mock("@/lib/prefetch", () => ({ prefetchCMSPage, prefetchCaptchaConfig, prefetchDocumentsGateForms, prefetchSocials }));
vi.mock("@/components/tickets/TicketsPageBody", () => ({ TicketsPageBody: function TicketsPageBody() { return null; } }));
vi.mock("@/components/TicketsPageView", () => ({ TicketsPageView: function TicketsPageView() { return null; }, ClosingBanner: function ClosingBanner() { return null; } }));
vi.mock("@/components/tickets/TicketsSection", () => ({ TicketsSection: function TicketsSection() { return null; } }));
vi.mock("@/components/tickets/TicketsIntro", () => ({ TicketsIntro: function TicketsIntro() { return null; } }));

const page = await import("../../../app/tickets/page");
const { TicketsPageBody } = await import("../../../components/tickets/TicketsPageBody");
const { TicketsPageView } = await import("../../../components/TicketsPageView");
const { TicketsIntro } = await import("../../../components/tickets/TicketsIntro");
const { TicketsSection } = await import("../../../components/tickets/TicketsSection");

type El = { type: unknown; props: Record<string, unknown> };
const render = async (params: Record<string, string | string[] | undefined> = {}) => (await page.default({ searchParams: Promise.resolve(params) })) as unknown as El;

const heroBlock = { id: "hero", type: "section", title: "Tickets for DeAI Summit", subtitle: "TICKETS" };
const ticketsBlock = { id: "tk", type: "section", addon: "tickets", title: "Choose your pass" };
const cms = (blocks: unknown[]) => ({ page_title: "Tickets", content: { blocks }, seo: null });

beforeEach(() => {
  prefetchCMSPage.mockReset();
  prefetchCaptchaConfig.mockReset();
  prefetchDocumentsGateForms.mockReset();
  prefetchSocials.mockReset();
  prefetchSocials.mockResolvedValue([]);
  notFound.mockClear();
  fetchPublicTypes.mockReset();
  fetchPublicTypes.mockRejectedValue(new Error("ep-api not reachable"));
  prefetchCaptchaConfig.mockResolvedValue({ site_key: "cap-key", disabled: false, provider: "turnstile" });
  prefetchDocumentsGateForms.mockResolvedValue({ f1: { id: "f1" } });
});

const luma = "https://luma.com/phjit31c";
const lumaPass = { id: "p", type: "simple", title: "VIP Pass", description: "€189.00", buttons: [{ id: "b", text: "Buy Ticket", link: luma }] };


describe("/tickets page", () => {
  it("is dynamic", () => {
    expect(page.dynamic).toBe("force-dynamic");
  });

  it("without a Tickets section on the CMS page: the Luma view, as before the live checkout", async () => {
    prefetchCMSPage.mockResolvedValue(cms([heroBlock, lumaPass]));
    const el = await render();
    expect(el.type).toBe(TicketsPageView);
    expect(el.props.content).toMatchObject({ passes: [{ id: "p" }] });
    expect(prefetchCMSPage).toHaveBeenCalledWith("tickets");
  });

  // DeAI (2026-11-23): "it should look the same". The page template stays; the section's live cards take the tiles' place.
  it("a Tickets section (addon: tickets) puts its live cards in the tickets page template, in place of the static tiles", async () => {
    const premiumPass = { ...lumaPass, id: "p0", title: "Premium Pass", description: "€99.00" };
    const section = { ...ticketsBlock, ticketCards: [{ id: "c1", ticketTypeId: "90c1b772-ea99-4f9c-b91e-2dfd7f6ff153", title: "Conference Pass" }] };
    prefetchCMSPage.mockResolvedValue(cms([heroBlock, premiumPass, lumaPass, section]));
    const el = await render();
    expect(el.type).toBe(TicketsPageView);
    const cards = el.props.cards as El[];
    expect(cards).toHaveLength(1);
    expect(cards[0]?.type).toBe(TicketsSection);
    expect(cards[0]?.props).toMatchObject({ bare: true, block: { id: "tk" } });
    // Luma stays the second option: the CMS page's own closing tile, notice included
    expect(el.props.content).toMatchObject({ closingHref: luma, notice: expect.any(String) });
    // nothing is matched by title and no catalogue is read on the server
    expect(fetchPublicTypes).not.toHaveBeenCalled();
  });

  it("with a Tickets section and no Luma link on the CMS page, the site's Luma social link gets the closing Luma tile, without the page's notice", async () => {
    prefetchSocials.mockResolvedValue([{ key: "luma", label: "Luma", url: luma }]);
    prefetchCMSPage.mockResolvedValue(cms([heroBlock, ticketsBlock]));
    const el = await render();
    expect(el.type).toBe(TicketsPageView);
    expect(el.props.content).toMatchObject({ closingHref: luma, notice: "" });
  });

  it("no Luma link anywhere (or a 'luma' social that is not Luma): no closing Luma tile", async () => {
    prefetchSocials.mockResolvedValue([{ key: "luma", label: "Luma", url: "https://example.com/x" }]);
    prefetchCMSPage.mockResolvedValue(cms([heroBlock, ticketsBlock]));
    expect((await render()).props.content).toMatchObject({ closingHref: "" });
  });

  it("a block of type `tickets` counts as a Tickets section too", async () => {
    prefetchCMSPage.mockResolvedValue(cms([{ id: "tk", type: "tickets" }]));
    const el = await render();
    expect((el.props.cards as El[])[0]?.type).toBe(TicketsSection);
  });

  it("?schedule= shows the built-in checkout even with a Tickets block", async () => {
    prefetchCMSPage.mockResolvedValue(cms([heroBlock, ticketsBlock]));
    const el = await render({ schedule: "s1" });
    expect(el.type).toBe(TicketsPageBody);
    expect(el.props).toMatchObject({ rawSchedule: "s1" });
    expect(prefetchCaptchaConfig).not.toHaveBeenCalled();
  });

  // A card's Buy button links to `/tickets?type=…`: showing the CMS page again would send the buyer in a circle.
  it("?type= from a card's Buy button opens the built-in checkout even with a Tickets block, with that type", async () => {
    prefetchCMSPage.mockResolvedValue(cms([heroBlock, ticketsBlock]));
    const el = await render({ type: "t1" });
    expect(el.type).toBe(TicketsPageBody);
    expect(el.props).toMatchObject({ rawType: "t1" });
  });

  it.each([{ link: "tok" }, { event: "e1" }])("a filtered/private request %j also shows the built-in checkout", async (params) => {
    prefetchCMSPage.mockResolvedValue(cms([ticketsBlock]));
    expect((await render(params)).type).toBe(TicketsPageBody);
  });

  it("passes link, schedule, event and type through to TicketsPageBody (first value of an array)", async () => {
    prefetchCMSPage.mockResolvedValue(cms([heroBlock]));
    const el = await render({ link: ["a", "b"], schedule: "s", event: "e", type: "t" });
    expect(el.type).toBe(TicketsPageBody);
    expect(el.props).toMatchObject({ rawLink: "a", rawSchedule: "s", rawEvent: "e", rawType: "t" });
  });

  it("the built-in checkout gets an intro built from the CMS heading", async () => {
    prefetchCMSPage.mockResolvedValue(cms([{ id: "h", type: "section", subtitle: "TICKETS", title: "Get your pass", description: "25-26 NOV" }]));
    const el = await render({ schedule: "s" });
    expect(el.type).toBe(TicketsPageBody);
    const intro = el.props.intro as El;
    expect(intro.type).toBe(TicketsIntro);
    expect(intro.props).toMatchObject({ eyebrow: expect.any(String), titleLead: expect.any(String) });
  });

  it("passes the CMS page's Luma link to the intro as the 'Buy on Luma' option; none without a Luma link", async () => {
    prefetchCMSPage.mockResolvedValue(cms([{ id: "h", type: "simple", subtitle: "TICKETS", title: "Get your pass" }, lumaPass]));
    expect(((await render({ schedule: "s" })).props.intro as El).props.lumaHref).toBe(luma);

    prefetchCMSPage.mockResolvedValue(cms([{ id: "h", type: "simple", subtitle: "TICKETS", title: "Get your pass" }]));
    expect(((await render({ schedule: "s" })).props.intro as El).props.lumaHref).toBeNull();
  });

  it("offers only the ticket types picked on the CMS page; none picked = nothing on sale", async () => {
    const A = "11111111-1111-4111-8111-111111111111";
    const picked = { id: "tk", type: "content", addon: "tickets", title: "Choose", ticketCards: [{ id: "c1", ticketTypeId: A, title: "VIP" }] };
    prefetchCMSPage.mockResolvedValue(cms([heroBlock, picked]));
    expect((await render({ type: A })).props.allowedTypeIds).toEqual([A]);
    prefetchCMSPage.mockResolvedValue(cms([heroBlock]));
    expect((await render({ schedule: "s" })).props.allowedTypeIds).toEqual([]);
  });

  it("a card's Buy button (?types=) offers that section's tickets, whatever the tickets page picks", async () => {
    const A = "11111111-1111-4111-8111-111111111111";
    const B = "22222222-2222-4222-8222-222222222222";
    const picked = { id: "tk", type: "content", addon: "tickets", title: "Choose", ticketCards: [{ id: "c1", ticketTypeId: A, title: "VIP" }] };
    prefetchCMSPage.mockResolvedValue(cms([heroBlock, picked]));
    expect((await render({ type: B, types: `${B},${A}` })).props.allowedTypeIds).toEqual([B, A]);
    // A list with nothing usable falls back to the tickets page's own picks.
    expect((await render({ type: A, types: "nope" })).props.allowedTypeIds).toEqual([A]);
  });

  // DECISION (Vimal, 2026-11-23): an unpublished or missing CMS `tickets` page means no /tickets page.
  it.each([{}, { type: "11111111-1111-4111-8111-111111111111" }, { schedule: "s1" }, { link: "tok" }])(
    "without a published CMS page /tickets is a 404, also with %j",
    async (params) => {
      prefetchCMSPage.mockResolvedValue(null);
      await expect(render(params)).rejects.toThrow();
      expect(notFound).toHaveBeenCalled();
    },
  );
});

describe("/tickets generateMetadata", () => {
  it("uses the CMS page title when there is one, else a default title", async () => {
    prefetchCMSPage.mockResolvedValue(cms([heroBlock]));
    expect(((await page.generateMetadata({ searchParams: Promise.resolve({}) })).title as string).startsWith("Tickets")).toBe(true);
    prefetchCMSPage.mockResolvedValue(null);
    expect(String((await page.generateMetadata({ searchParams: Promise.resolve({}) })).title)).toMatch(/^Tickets - /);
  });

  it("a legacy ?link= page is noindex and sends no referrer", async () => {
    prefetchCMSPage.mockResolvedValue(null);
    expect(await page.generateMetadata({ searchParams: Promise.resolve({ link: "abc" }) })).toMatchObject({ robots: { index: false, follow: false }, referrer: "no-referrer" });
  });
});

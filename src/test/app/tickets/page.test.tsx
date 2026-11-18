import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { prefetchCMSPage, prefetchCaptchaConfig, prefetchDocumentsGateForms, notFound } = vi.hoisted(() => ({
  prefetchCMSPage: vi.fn(),
  prefetchCaptchaConfig: vi.fn(),
  prefetchDocumentsGateForms: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("react/jsx-dev-runtime", async () => (await import("../../helpers/jsx-stub")).jsxStub);
vi.mock("react/jsx-runtime", async () => (await import("../../helpers/jsx-stub")).jsxStub);
vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/lib/prefetch", () => ({ prefetchCMSPage, prefetchCaptchaConfig, prefetchDocumentsGateForms }));
vi.mock("@/components/tickets/TicketsPageBody", () => ({ TicketsPageBody: function TicketsPageBody() { return null; } }));
vi.mock("@/components/TicketsPageView", () => ({ TicketsPageView: function TicketsPageView() { return null; } }));
vi.mock("@/components/cms/CmsPageRenderer", () => ({ CmsPageRenderer: function CmsPageRenderer() { return null; } }));
vi.mock("@/components/tickets/TicketsIntro", () => ({ TicketsIntro: function TicketsIntro() { return null; } }));

const page = await import("../../../app/tickets/page");
const { TicketsPageBody } = await import("../../../components/tickets/TicketsPageBody");
const { TicketsPageView } = await import("../../../components/TicketsPageView");
const { CmsPageRenderer } = await import("../../../components/cms/CmsPageRenderer");
const { TicketsIntro } = await import("../../../components/tickets/TicketsIntro");

type El = { type: unknown; props: Record<string, unknown> };
const render = async (params: Record<string, string | string[] | undefined> = {}) => (await page.default({ searchParams: Promise.resolve(params) })) as unknown as El;

const heroBlock = { id: "hero", type: "section", title: "Tickets for DeAI Summit", subtitle: "TICKETS" };
const ticketsBlock = { id: "tk", type: "section", addon: "tickets", title: "Choose your pass" };
const cms = (blocks: unknown[]) => ({ page_title: "Tickets", content: { blocks }, seo: null });

beforeEach(() => {
  prefetchCMSPage.mockReset();
  prefetchCaptchaConfig.mockReset();
  prefetchDocumentsGateForms.mockReset();
  notFound.mockClear();
  prefetchCaptchaConfig.mockResolvedValue({ site_key: "cap-key", disabled: false, provider: "turnstile" });
  prefetchDocumentsGateForms.mockResolvedValue({ f1: { id: "f1" } });
});
afterEach(() => vi.unstubAllEnvs());

describe("/tickets page, checkout OFF", () => {
  beforeEach(() => vi.stubEnv("TICKETS_CHECKOUT_ENABLED", ""));

  it("is dynamic", () => {
    expect(page.dynamic).toBe("force-dynamic");
  });

  it("renders the Luma view for the CMS page", async () => {
    prefetchCMSPage.mockResolvedValue(cms([heroBlock]));
    const el = await render();
    expect(el.type).toBe(TicketsPageView);
    expect(el.props.content).toMatchObject({ passes: [] });
    expect(prefetchCMSPage).toHaveBeenCalledWith("tickets");
  });

  it("stays on the Luma view even when the CMS page has a Tickets section or a private link", async () => {
    prefetchCMSPage.mockResolvedValue(cms([heroBlock, ticketsBlock]));
    expect((await render()).type).toBe(TicketsPageView);
    expect((await render({ link: "abc" })).type).toBe(TicketsPageView);
  });

  it("is a 404 when there is no CMS page", async () => {
    prefetchCMSPage.mockResolvedValue(null);
    await expect(render()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });
});

describe("/tickets page, checkout ON", () => {
  beforeEach(() => vi.stubEnv("TICKETS_CHECKOUT_ENABLED", "true"));

  it("a CMS page with a Tickets section (addon: tickets) renders through CmsPageRenderer with the captcha config", async () => {
    prefetchCMSPage.mockResolvedValue(cms([heroBlock, ticketsBlock]));
    const wrapper = await render();
    const el = wrapper.props.children as El;
    expect(el.type).toBe(CmsPageRenderer);
    expect((el.props.blocks as { id: string }[]).map((b) => b.id)).toEqual(["hero", "tk"]);
    expect(el.props).toMatchObject({ pageTitle: "Tickets", captchaSiteKey: "cap-key", captchaDisabled: false, captchaProvider: "turnstile", formConfigs: { f1: { id: "f1" } } });
  });

  it("a block of type `tickets` counts as a Tickets section too", async () => {
    prefetchCMSPage.mockResolvedValue(cms([{ id: "tk", type: "tickets" }]));
    expect(((await render()).props.children as El).type).toBe(CmsPageRenderer);
  });

  it("?schedule= shows the built-in checkout even with a Tickets block", async () => {
    prefetchCMSPage.mockResolvedValue(cms([heroBlock, ticketsBlock]));
    const el = await render({ schedule: "s1" });
    expect(el.type).toBe(TicketsPageBody);
    expect(el.props).toMatchObject({ rawSchedule: "s1" });
    expect(prefetchCaptchaConfig).not.toHaveBeenCalled();
  });

  it.each([{ link: "tok" }, { event: "e1" }])("a filtered/private request %j also shows the built-in checkout", async (params) => {
    prefetchCMSPage.mockResolvedValue(cms([ticketsBlock]));
    expect((await render(params)).type).toBe(TicketsPageBody);
  });

  it("passes link, schedule, event and type through to TicketsPageBody (first value of an array)", async () => {
    prefetchCMSPage.mockResolvedValue(null);
    const el = await render({ link: ["a", "b"], schedule: "s", event: "e", type: "t" });
    expect(el.type).toBe(TicketsPageBody);
    expect(el.props).toMatchObject({ rawLink: "a", rawSchedule: "s", rawEvent: "e", rawType: "t" });
  });

  it("without a Tickets section: TicketsPageBody with an intro built from the CMS heading", async () => {
    prefetchCMSPage.mockResolvedValue(cms([{ id: "h", type: "section", subtitle: "TICKETS", title: "Get your pass", description: "25-26 NOV" }]));
    const el = await render();
    expect(el.type).toBe(TicketsPageBody);
    const intro = el.props.intro as El;
    expect(intro.type).toBe(TicketsIntro);
    expect(intro.props).toMatchObject({ eyebrow: expect.any(String), titleLead: expect.any(String) });
  });

  it("without a CMS page there is no intro, and no 404 (the checkout is still sold)", async () => {
    prefetchCMSPage.mockResolvedValue(null);
    const el = await render();
    expect(el.type).toBe(TicketsPageBody);
    expect(el.props.intro).toBeUndefined();
    expect(notFound).not.toHaveBeenCalled();
  });
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

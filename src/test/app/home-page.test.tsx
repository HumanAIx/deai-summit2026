import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { prefetchCMSPage } = vi.hoisted(() => ({ prefetchCMSPage: vi.fn() }));
vi.mock("react/jsx-dev-runtime", async () => (await import("../helpers/jsx-stub")).jsxStub);
vi.mock("react/jsx-runtime", async () => (await import("../helpers/jsx-stub")).jsxStub);
vi.mock("@/lib/prefetch", () => ({
  prefetchCMSPage,
  prefetchHomePageData: vi.fn().mockResolvedValue({ speakers: [], sponsors: [], partners: [], socials: [] }),
  prefetchNavigation: vi.fn().mockResolvedValue(null),
  prefetchPublicAnalyticsTags: vi.fn().mockResolvedValue([]),
  prefetchOrganizers: vi.fn().mockResolvedValue([]),
  mapNavigationData: vi.fn(),
}));
vi.mock("@/components/LandingPage", () => ({ LandingPage: function LandingPage() { return null; } }));

const home = await import("../../app/page");
const { LandingPage } = await import("../../components/LandingPage");

type El = { type: unknown; props: { children?: unknown } };
type Rendered = El & { props: { ticketPasses: unknown[] } };

/** A tickets-page block that `parseTicketsPage` reads as a pass (price in the description). */
const passBlock = { id: "p1", type: "simple", title: "Full pass", description: "€150.00", collectionItems: [{ title: "Both days" }], buttons: [{ text: "Buy", link: "https://luma.example/x" }] };
const ticketsSectionBlock = { id: "tk", type: "simple", addon: "tickets", title: "Choose your pass" };
const cms = (blocks: unknown[]) => ({ page_title: "x", content: { blocks }, seo: null });

async function renderHome(): Promise<Rendered> {
  const tree = (await home.default()) as unknown as El;
  const children = (Array.isArray(tree.props.children) ? tree.props.children : [tree.props.children]) as (El | false)[];
  const landing = children.find((child): child is El => Boolean(child) && (child as El).type === LandingPage);
  if (!landing) throw new Error("LandingPage not rendered");
  return landing as Rendered;
}

function pages({ home: homeBlocks, tickets }: { home: unknown[]; tickets: unknown[] }) {
  prefetchCMSPage.mockImplementation(async (slug: string) => (slug === "home" ? cms(homeBlocks) : slug === "tickets" ? cms(tickets) : null));
}

beforeEach(() => {
  prefetchCMSPage.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("home page ticket passes", () => {
  it("flag on + a tickets section among the home blocks: LandingPage gets ticketPasses = []", async () => {
    vi.stubEnv("TICKETS_CHECKOUT_ENABLED", "true");
    pages({ home: [ticketsSectionBlock], tickets: [passBlock] });
    expect((await renderHome()).props.ticketPasses).toEqual([]);
  });

  it("flag off: the passes still come from the tickets page, as before (and the tickets section block stays in the plan)", async () => {
    vi.stubEnv("TICKETS_CHECKOUT_ENABLED", "");
    pages({ home: [ticketsSectionBlock], tickets: [passBlock] });
    const landing = await renderHome();
    expect(landing.props.ticketPasses).toHaveLength(1);
    expect(landing.props.ticketPasses[0]).toMatchObject({ title: "Full pass", href: "/tickets" });
  });

  it("flag on but no tickets section on the home page: passes stay", async () => {
    vi.stubEnv("TICKETS_CHECKOUT_ENABLED", "true");
    pages({ home: [{ id: "a", type: "simple", title: "About the summit" }], tickets: [passBlock] });
    expect((await renderHome()).props.ticketPasses).toHaveLength(1);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMyOverview } = vi.hoisted(() => ({ fetchMyOverview: vi.fn() }));
vi.mock("@/lib/tickets/api", () => ({ fetchMyOverview }));
vi.mock("react/jsx-dev-runtime", async () => (await import("../../../../helpers/jsx-stub")).jsxStub);
vi.mock("react/jsx-runtime", async () => (await import("../../../../helpers/jsx-stub")).jsxStub);
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }) }));
vi.mock("@/components/tickets/MyTicketsView", () => ({ MyTicketsView: function MyTicketsView() { return null; } }));
vi.mock("@/components/tickets/InvalidLinkState", () => ({ InvalidLinkState: function InvalidLinkState() { return null; } }));

const page = await import("../../../../../app/tickets/me/[token]/page");
const { MyTicketsView } = await import("../../../../../components/tickets/MyTicketsView");
const { InvalidLinkState } = await import("../../../../../components/tickets/InvalidLinkState");

const TOKEN = "m".repeat(43);
const TICKET_TOKEN = "t".repeat(43);
const ORDER_TOKEN = "o".repeat(43);
const overview = {
  email: "priya@example.com",
  expiresAt: "2026-11-24T10:00:00.000Z",
  tickets: [{ token: TICKET_TOKEN, code: "T-1", holderName: "Priya", typeName: "VIP Pass", source: { name: "DeAI", startDate: null, endDate: null } }],
  orders: [{ token: ORDER_TOKEN, orderNo: 7, status: "paid", paidAt: null, totalCents: 0, currency: "EUR", lines: [], source: { name: null, startDate: null, endDate: null } }],
};

beforeEach(() => fetchMyOverview.mockReset());

describe("/tickets/me/[token] page", () => {
  it("is private: force-dynamic, noindex/nofollow, no referrer (the token is in the URL)", async () => {
    expect(page.dynamic).toBe("force-dynamic");
    expect(await page.generateMetadata()).toMatchObject({ robots: { index: false, follow: false }, referrer: "no-referrer" });
  });

  it("a valid list link: ONE ep-api call; every ticket and order gets its localized page link", async () => {
    fetchMyOverview.mockResolvedValue({ state: "ok", data: overview });
    const element = await page.default({ params: Promise.resolve({ token: TOKEN }) });
    expect(fetchMyOverview).toHaveBeenCalledTimes(1);
    expect(fetchMyOverview).toHaveBeenCalledWith({ token: TOKEN, locale: "en", ip: "203.0.113.9" });
    expect(element.type).toBe(MyTicketsView);
    expect(element.props.ticketHrefs).toEqual({ [TICKET_TOKEN]: `/tickets/t/${TICKET_TOKEN}` });
    expect(element.props.orderHrefs).toEqual({ [ORDER_TOKEN]: `/tickets/order/${ORDER_TOKEN}` });
    expect(element.props.lostLinkHref).toBe("/tickets/lost");
  });

  it("an unknown or expired link is the opaque invalid state; a malformed one makes no ep-api call", async () => {
    fetchMyOverview.mockResolvedValue({ state: "invalid" });
    expect((await page.default({ params: Promise.resolve({ token: TOKEN }) })).type).toBe(InvalidLinkState);
    fetchMyOverview.mockReset();
    expect((await page.default({ params: Promise.resolve({ token: "bad!" }) })).type).toBe(InvalidLinkState);
    expect(fetchMyOverview).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMyTicket } = vi.hoisted(() => ({ fetchMyTicket: vi.fn() }));
vi.mock("@/lib/tickets/api", () => ({ fetchMyTicket }));
vi.mock("react/jsx-dev-runtime", async () => (await import("../../../../helpers/jsx-stub")).jsxStub);
vi.mock("react/jsx-runtime", async () => (await import("../../../../helpers/jsx-stub")).jsxStub);
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }) }));
// Components are stubbed: the pages are asserted by WHICH component they pick and with WHAT props; their
// own rendering is covered under src/test/components/tickets. (They also pull client-only modules that
// the server project's `react-server` condition cannot load.)
vi.mock("@/components/tickets/TicketView", () => ({ TicketView: function TicketView() { return null; } }));
vi.mock("@/components/tickets/InvalidLinkState", () => ({ InvalidLinkState: function InvalidLinkState() { return null; } }));

const page = await import("../../../../../app/tickets/t/[token]/page");
const { TicketView } = await import("../../../../../components/tickets/TicketView");
const { InvalidLinkState } = await import("../../../../../components/tickets/InvalidLinkState");

const TOKEN = "h".repeat(43);
const ticket = { code: "T-1", status: "valid" };

beforeEach(() => fetchMyTicket.mockReset());

describe("/tickets/t/[token] page", () => {
  it("is private: force-dynamic, noindex/nofollow, no referrer (the token is in the URL)", async () => {
    expect(page.dynamic).toBe("force-dynamic");
    expect(await page.generateMetadata()).toMatchObject({ robots: { index: false, follow: false }, referrer: "no-referrer" });
  });

  it("a valid link: ONE ep-api call with the token, locale and buyer IP; renders the ticket with a calendar link", async () => {
    fetchMyTicket.mockResolvedValue({ state: "ok", data: ticket });
    const element = await page.default({ params: Promise.resolve({ token: TOKEN }) });
    expect(fetchMyTicket).toHaveBeenCalledTimes(1);
    expect(fetchMyTicket).toHaveBeenCalledWith({ token: TOKEN, locale: "en", ip: "203.0.113.9" });
    expect(element.type).toBe(TicketView);
    expect(element.props.ticket).toBe(ticket);
    expect(element.props.calendarHref).toBe(`/tickets/t/${TOKEN}/calendar.ics`);
    // The holder's own forms (correct my name, pass on) need the token for their handler calls.
    expect(element.props.token).toBe(TOKEN);
  });

  it("links the order (localized) only when ep-api sends the holder's own order token", async () => {
    fetchMyTicket.mockResolvedValue({ state: "ok", data: ticket });
    let element = await page.default({ params: Promise.resolve({ token: TOKEN }) });
    expect(element.props.orderHref).toBeNull();
    fetchMyTicket.mockResolvedValue({ state: "ok", data: { ...ticket, orderToken: "o".repeat(43) } });
    element = await page.default({ params: Promise.resolve({ token: TOKEN }) });
    expect(element.props.orderHref).toBe(`/tickets/order/${"o".repeat(43)}`);
  });

  it("a wrong / foreign / expired token is the opaque invalid state with a localized lost-link link", async () => {
    fetchMyTicket.mockResolvedValue({ state: "invalid" });
    const element = await page.default({ params: Promise.resolve({ token: TOKEN }) });
    expect(element.type).toBe(InvalidLinkState);
    expect(element.props.lostLinkHref).toBe("/tickets/lost");
  });

  it("a malformed token is the same invalid state and makes no ep-api call", async () => {
    const element = await page.default({ params: Promise.resolve({ token: "nope" }) });
    expect(element.type).toBe(InvalidLinkState);
    expect(fetchMyTicket).not.toHaveBeenCalled();
  });
});

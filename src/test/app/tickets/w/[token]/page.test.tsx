import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchWaitlistOffer, FakeEpApiError } = vi.hoisted(() => {
  class FakeEpApiError extends Error {
    constructor(readonly status: number) {
      super("x");
    }
  }
  return { fetchWaitlistOffer: vi.fn(), FakeEpApiError };
});
vi.mock("@/lib/tickets/ep-client", () => ({ EpApiError: FakeEpApiError }));
vi.mock("@/lib/tickets/api", () => ({ fetchWaitlistOffer }));
vi.mock("react/jsx-dev-runtime", async () => (await import("../../../../helpers/jsx-stub")).jsxStub);
vi.mock("react/jsx-runtime", async () => (await import("../../../../helpers/jsx-stub")).jsxStub);
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }) }));
vi.mock("@/components/tickets/TicketTypeList", () => ({ TicketTypeList: function TicketTypeList() { return null; } }));
vi.mock("@/components/tickets/TicketOfferEnded", () => ({ TicketOfferEnded: function TicketOfferEnded() { return null; } }));

const page = await import("../../../../../app/tickets/w/[token]/page");
const { TicketTypeList } = await import("../../../../../components/tickets/TicketTypeList");
const { TicketOfferEnded } = await import("../../../../../components/tickets/TicketOfferEnded");

const TOKEN = "W".repeat(40);
const type = { id: "t1", name: "Full pass", description: null, priceCents: 100, currency: "EUR", bookingFeeCents: 0, status: "sold_out", left: 0, maxPerOrder: 10, waitlistEnabled: true, source: { kind: "event", id: "e1", name: "Summit", timeZone: "Europe/Malta" } };
const checkout = { salesOpen: true, testMode: false, feePayer: "buyer" };

type Rendered = { type: unknown; props: Record<string, unknown> & { data?: { types: Record<string, unknown>[] }; offer?: Record<string, unknown> } };
const resolveBody = async (el: { type: (props: unknown) => Promise<Rendered>; props: unknown }): Promise<Rendered> => el.type(el.props);
const render = async (token: string) => resolveBody((await page.default({ params: Promise.resolve({ token }) })) as never);

beforeEach(() => fetchWaitlistOffer.mockReset());

describe("/tickets/w/[token] (waitlist offer)", () => {
  it("is dynamic, never indexed and never leaks its token as a referrer", async () => {
    expect(page.dynamic).toBe("force-dynamic");
    expect(await page.generateMetadata()).toMatchObject({ robots: { index: false, follow: false }, referrer: "no-referrer" });
  });

  it("reads the offer (one call, locale + buyer IP) and limits the checkout to that one type and quantity, with the token", async () => {
    fetchWaitlistOffer.mockResolvedValue({ state: "ok", data: { type, checkout, quantity: 2, offerExpiresAt: "2030-03-01T10:30:00.000Z" } });
    const element = await render(TOKEN);

    expect(fetchWaitlistOffer).toHaveBeenCalledTimes(1);
    expect(fetchWaitlistOffer).toHaveBeenCalledWith({ token: TOKEN, locale: "en", ip: "203.0.113.9" });
    expect(element.type).toBe(TicketTypeList);
    expect(element.props).toMatchObject({ locale: "en", localePrefix: "" });
    // One type, buyable for exactly the held quantity, even though the public catalogue reads it as sold out.
    expect(element.props.data?.types).toEqual([{ ...type, status: "on_sale", left: 2, maxPerOrder: 2 }]);
    expect(element.props.offer).toEqual({ token: TOKEN, quantity: 2, expiresAt: "2030-03-01T10:30:00.000Z", timeZone: "Europe/Malta" });
  });

  it("caps the quantity by the type's per-order maximum", async () => {
    fetchWaitlistOffer.mockResolvedValue({ state: "ok", data: { type: { ...type, maxPerOrder: 3 }, checkout, quantity: 8, offerExpiresAt: "2030-03-01T10:30:00.000Z" } });
    const element = await render(TOKEN);
    expect(element.props.offer).toMatchObject({ quantity: 3 });
    expect(element.props.data?.types[0]).toMatchObject({ left: 3, maxPerOrder: 3 });
  });

  it("an ended, used or unknown offer is the themed 'offer has ended' state linking to /tickets", async () => {
    fetchWaitlistOffer.mockResolvedValue({ state: "invalid" });
    const element = await render(TOKEN);
    expect(element.type).toBe(TicketOfferEnded);
    expect(element.props.ticketsHref).toBe("/tickets");
  });

  it("a malformed token is the same state and costs no ep-api call", async () => {
    const element = await render("bad token!");
    expect(element.type).toBe(TicketOfferEnded);
    expect(fetchWaitlistOffer).not.toHaveBeenCalled();
  });

  it("an outage reaches the themed error boundary instead of claiming the offer ended", async () => {
    fetchWaitlistOffer.mockRejectedValueOnce(new FakeEpApiError(502));
    let caught: unknown = "none";
    try {
      await render(TOKEN);
    } catch (error) {
      caught = error;
    }
    expect(caught instanceof FakeEpApiError).toBe(true);
    expect((caught as { status: number }).status).toBe(502);
  });
});

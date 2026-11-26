import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMySession, cookieValue, redirect } = vi.hoisted(() => ({
  fetchMySession: vi.fn(),
  cookieValue: { current: undefined as string | undefined },
  redirect: vi.fn((to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  }),
}));
vi.mock("@/lib/tickets/api", () => ({ fetchMySession }));
vi.mock("react/jsx-dev-runtime", async () => (await import("../../../helpers/jsx-stub")).jsxStub);
vi.mock("react/jsx-runtime", async () => (await import("../../../helpers/jsx-stub")).jsxStub);
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }),
  cookies: async () => ({ get: (name: string) => (name === "tk_session" && cookieValue.current ? { name, value: cookieValue.current } : undefined) }),
}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/components/tickets/MyTicketsView", () => ({ MyTicketsView: function MyTicketsView() { return null; } }));
vi.mock("@/components/tickets/SignInRequired", () => ({ SignInRequired: function SignInRequired() { return null; } }));

const page = await import("../../../../app/tickets/me/page");
const { MyTicketsView } = await import("../../../../components/tickets/MyTicketsView");
const { SignInRequired } = await import("../../../../components/tickets/SignInRequired");

const TICKET_TOKEN = "t".repeat(43);
const ORDER_TOKEN = "o".repeat(43);
const overview = {
  email: "priya@example.com",
  expiresAt: "2026-11-24T10:00:00.000Z",
  tickets: [{ token: TICKET_TOKEN, code: "T-1", holderName: "Priya", typeName: "VIP Pass", source: { name: "DeAI", startDate: null, endDate: null } }],
  orders: [{ token: ORDER_TOKEN, orderNo: 7, status: "paid", paidAt: null, totalCents: 0, currency: "EUR", lines: [], source: { name: null, startDate: null, endDate: null } }],
};

beforeEach(() => {
  fetchMySession.mockReset();
  redirect.mockClear();
  cookieValue.current = undefined;
});

describe("/tickets/me page (signed in with a cookie)", () => {
  it("is private: force-dynamic, noindex, no referrer", async () => {
    expect(page.dynamic).toBe("force-dynamic");
    expect(await page.generateMetadata()).toMatchObject({ robots: { index: false, follow: false }, referrer: "no-referrer" });
  });

  it("a valid cookie: ONE ep-api call with the cookie value, then the list with item links and the sign-out action", async () => {
    cookieValue.current = "sess-abc";
    fetchMySession.mockResolvedValue({ state: "ok", data: overview });
    const element = await page.default({});
    expect(fetchMySession).toHaveBeenCalledTimes(1);
    expect(fetchMySession).toHaveBeenCalledWith({ sessionToken: "sess-abc", locale: "en", ip: "203.0.113.9" });
    expect(element.type).toBe(MyTicketsView);
    expect(element.props.overview).toEqual(overview);
    expect(element.props.ticketHrefs).toEqual({ [TICKET_TOKEN]: `/tickets/t/${TICKET_TOKEN}` });
    expect(element.props.orderHrefs).toEqual({ [ORDER_TOKEN]: `/tickets/order/${ORDER_TOKEN}` });
    expect(element.props.signOutAction).toBe("/api/tickets/sign-out");
  });

  it("no cookie: the sign-in form and no ep-api call; ?ended=1 says the session ended", async () => {
    const element = await page.default({});
    expect(element.type).toBe(SignInRequired);
    expect(element.props.ended).toBe(false);
    expect((await page.default({ searchParams: Promise.resolve({ ended: "1" }) })).props.ended).toBe(true);
    expect(fetchMySession).not.toHaveBeenCalled();
  });

  it("an expired session (401): clears the dead cookie through the session route", async () => {
    cookieValue.current = "dead";
    fetchMySession.mockResolvedValue({ state: "invalid" });
    await expect(page.default({})).rejects.toThrow("NEXT_REDIRECT /api/tickets/session");
    expect(redirect).toHaveBeenCalledWith("/api/tickets/session");
  });
});

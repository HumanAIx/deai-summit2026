import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMyOrder, fetchMyTicket } = vi.hoisted(() => ({ fetchMyOrder: vi.fn(), fetchMyTicket: vi.fn() }));
vi.mock("@/lib/tickets/api", () => ({ fetchMyOrder, fetchMyTicket }));
vi.mock("react/jsx-dev-runtime", async () => (await import("../../../../helpers/jsx-stub")).jsxStub);
vi.mock("react/jsx-runtime", async () => (await import("../../../../helpers/jsx-stub")).jsxStub);
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }) }));
// Components are stubbed: the pages are asserted by WHICH component they pick and with WHAT props; their
// own rendering is covered under src/test/components/tickets. (They also pull client-only modules that
// the server project's `react-server` condition cannot load.)
vi.mock("@/components/tickets/OrderView", () => ({ OrderView: function OrderView() { return null; } }));
vi.mock("@/components/tickets/OrderConfirming", () => ({ OrderConfirming: function OrderConfirming() { return null; } }));
vi.mock("@/components/tickets/InvalidLinkState", () => ({ InvalidLinkState: function InvalidLinkState() { return null; } }));
vi.mock("@/components/tickets/TicketsShell", () => ({ TicketsShell: function TicketsShell() { return null; } }));

const page = await import("../../../../../app/tickets/order/[token]/page");
const { OrderView } = await import("../../../../../components/tickets/OrderView");
const { OrderConfirming } = await import("../../../../../components/tickets/OrderConfirming");
const { InvalidLinkState } = await import("../../../../../components/tickets/InvalidLinkState");

const TOKEN = "b".repeat(43);
const ORDER_ID = "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11";
const order = { orderNo: 7 };

function call({ token = TOKEN, o }: { token?: string; o?: string | string[] | undefined } = {}) {
  return page.default({ params: Promise.resolve({ token }), searchParams: Promise.resolve({ ...(o === undefined ? {} : { o }) }) });
}
function findByType(node: unknown, type: unknown): { props: Record<string, unknown> } | null {
  if (!node || typeof node !== "object") return null;
  const element = node as { type?: unknown; props?: { children?: unknown } };
  if (element.type === type) return element as { props: Record<string, unknown> };
  const children = element.props?.children;
  for (const child of Array.isArray(children) ? children : [children]) {
    const found = findByType(child, type);
    if (found) return found;
  }
  return null;
}

beforeEach(() => {
  fetchMyOrder.mockReset();
  fetchMyTicket.mockReset();
});

describe("/tickets/order/[token] page", () => {
  it("is private: force-dynamic, noindex/nofollow, no referrer", async () => {
    expect(page.dynamic).toBe("force-dynamic");
    expect(await page.generateMetadata()).toMatchObject({ robots: { index: false, follow: false }, referrer: "no-referrer" });
  });

  it("a paid order: ONE ep-api call, renders the order", async () => {
    fetchMyOrder.mockResolvedValue({ state: "ok", data: order });
    const element = await call();
    expect(fetchMyOrder).toHaveBeenCalledTimes(1);
    expect(fetchMyOrder).toHaveBeenCalledWith({ token: TOKEN, locale: "en", ip: "203.0.113.9" });
    expect(element.type).toBe(OrderView);
    expect(element.props).toMatchObject({ order, token: TOKEN });
  });

  it("a paid order reached from the checkout's return URL (?o=) says so (justPaid); a bookmarked link does not", async () => {
    fetchMyOrder.mockResolvedValue({ state: "ok", data: order });
    expect((await call({ o: ORDER_ID })).props).toMatchObject({ justPaid: true });
    expect((await call()).props).toMatchObject({ justPaid: false });
  });

  it("404 WITH ?o={orderId} is the 'confirming your payment' state, with localized links", async () => {
    fetchMyOrder.mockResolvedValue({ state: "invalid" });
    const confirming = findByType(await call({ o: ORDER_ID }), OrderConfirming);
    expect(confirming?.props).toMatchObject({ orderId: ORDER_ID, token: TOKEN, ticketsHref: "/tickets", lostLinkHref: "/tickets/lost" });
  });

  it("404 without ?o, or with a malformed ?o, is the opaque invalid state", async () => {
    fetchMyOrder.mockResolvedValue({ state: "invalid" });
    for (const o of [undefined, "nope", "../x"]) {
      const element = await call({ o });
      expect(element.type).toBe(InvalidLinkState);
      expect(element.props.lostLinkHref).toBe("/tickets/lost");
    }
  });

  it("uses the first value when ?o is repeated", async () => {
    fetchMyOrder.mockResolvedValue({ state: "invalid" });
    expect(findByType(await call({ o: [ORDER_ID, "x"] }), OrderConfirming)?.props.orderId).toBe(ORDER_ID);
  });

  it("a malformed token makes no ep-api call and is the invalid state", async () => {
    const element = await call({ token: "short", o: ORDER_ID });
    expect(element.type).toBe(InvalidLinkState);
    expect(fetchMyOrder).not.toHaveBeenCalled();
  });

  it("the subtitle's event comes from the buyer's own ticket: one extra read, its source passed as eventSource", async () => {
    const OWN = "c".repeat(43);
    const source = { kind: "schedule", id: "s1", name: "DeAI Summit 2026", startDate: "2026-11-25", endDate: "2026-11-26", timeZone: "Europe/Malta", startsAt: null, venue: { name: "MFCC Malta", city: "Ta' Qali", label: null } };
    fetchMyOrder.mockResolvedValue({ state: "ok", data: { orderNo: 7, holders: [{ ticketCode: "T-0", name: "Other", ticketToken: undefined }, { ticketCode: "T-1", name: "Buyer", ticketToken: OWN }] } });
    fetchMyTicket.mockResolvedValue({ state: "ok", data: { source } });
    const element = await call();
    expect(fetchMyTicket).toHaveBeenCalledTimes(1);
    expect(fetchMyTicket).toHaveBeenCalledWith({ token: OWN, locale: "en", ip: "203.0.113.9" });
    expect(element.props.eventSource).toEqual(source);
  });

  it("no own ticket: no extra read and no event; a failed or invalid ticket read leaves the event out", async () => {
    fetchMyOrder.mockResolvedValue({ state: "ok", data: { orderNo: 7, holders: [{ ticketCode: "T-0", name: "Other" }] } });
    expect((await call()).props.eventSource).toBeNull();
    expect(fetchMyTicket).not.toHaveBeenCalled();

    fetchMyOrder.mockResolvedValue({ state: "ok", data: { orderNo: 7, holders: [{ ticketCode: "T-1", ticketToken: "c".repeat(43) }] } });
    fetchMyTicket.mockRejectedValue(new Error("down"));
    expect((await call()).props.eventSource).toBeNull();
    fetchMyTicket.mockResolvedValue({ state: "invalid" });
    expect((await call()).props.eventSource).toBeNull();
  });
});

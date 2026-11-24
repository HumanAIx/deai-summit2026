import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axeViolations, describeViolations } from "../../helpers/axe";
import { render, screen } from "../../test-utils";

const refresh = vi.fn();
const replace = vi.fn();
// A STABLE router object, like Next's: a new one per render would restart the polling effect.
const router = { refresh, replace };
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/tickets/order/abc" }));

const { OrderConfirming } = await import("../../../components/tickets/OrderConfirming");

const ORDER_ID = "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11";
const TOKEN = "b".repeat(43);

function answer(status: string) {
  return new Response(JSON.stringify({ success: true, data: { status } }), { status: 200 });
}
function mountComponent() {
  return render(<OrderConfirming orderId={ORDER_ID} token={TOKEN} ticketsHref="/tickets" contactHref="/contact" />);
}
/** Lets the in-flight fetch + state updates settle, then advances the poll timer. */
async function tickFor(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  refresh.mockReset();
  replace.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("OrderConfirming", () => {
  it("polls our status handler with the order token in a header (never the URL) and shows 'confirming' while pending", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => answer("pending"));
    vi.stubGlobal("fetch", fetchMock);
    const { container } = mountComponent();
    await tickFor(0);

    expect(screen.getByRole("heading", { level: 1, name: "Confirming your payment…" })).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/tickets/orders/${ORDER_ID}/status`);
    expect(url).not.toContain(TOKEN);
    expect((init.headers as Record<string, string>)["x-order-token"]).toBe(TOKEN);
    expect(init.cache).toBe("no-store");
    vi.useRealTimers(); // axe-core schedules with real timers
    const violations = await axeViolations({ container });
    expect(describeViolations(violations)).toEqual([]);
  });

  it("polls every 2 seconds", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => answer("pending"));
    vi.stubGlobal("fetch", fetchMock);
    mountComponent();
    await tickFor(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await tickFor(2000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await tickFor(2000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("shows the confirmed state once the order is paid, then opens the order with the 'just paid' note", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => answer("paid"));
    vi.stubGlobal("fetch", fetchMock);
    const { container } = mountComponent();
    await tickFor(0);
    expect(screen.getByRole("heading", { level: 1, name: "You’re going to DeAI Summit" })).toBeInTheDocument();
    expect(screen.getAllByText("Done")).toHaveLength(3);
    expect(replace).not.toHaveBeenCalled();
    await tickFor(1500);
    expect(replace).toHaveBeenCalledExactlyOnceWith("/tickets/order/abc?paid=1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.useRealTimers(); // axe-core schedules with real timers
    const violations = await axeViolations({ container });
    expect(describeViolations(violations)).toEqual([]);
  });

  it("'View your order' opens the order right away", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => answer("paid")));
    mountComponent();
    await tickFor(0);
    await act(async () => screen.getByRole("button", { name: /View your order/ }).click());
    expect(replace).toHaveBeenCalledExactlyOnceWith("/tickets/order/abc?paid=1");
  });

  it("already paid on arrival: the confirmed screen straight away, no polling, then the order", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<OrderConfirming orderId={ORDER_ID} token={TOKEN} ticketsHref="/tickets" contactHref="/contact" paid />);
    expect(screen.getByRole("heading", { level: 1, name: "You’re going to DeAI Summit" })).toBeInTheDocument();
    expect(screen.getAllByText("Done")).toHaveLength(3);
    await tickFor(1500);
    expect(replace).toHaveBeenCalledExactlyOnceWith("/tickets/order/abc?paid=1");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("walks the steps: payment received, then issuing the tickets", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => answer("pending")));
    mountComponent();
    await tickFor(0);
    expect(screen.getByText("In progress").closest("li")).toHaveTextContent("Payment received");
    await tickFor(1500);
    expect(screen.getByText("Done").closest("li")).toHaveTextContent("Payment received");
    expect(screen.getByText("In progress").closest("li")).toHaveTextContent("Issuing your tickets");
  });

  it("after 15 seconds says it is taking longer, keeps polling, and offers the order status and contact", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => answer("pending"));
    vi.stubGlobal("fetch", fetchMock);
    mountComponent();
    await tickFor(0);
    expect(screen.getByText("Please don’t close or refresh this page")).toBeInTheDocument();
    await tickFor(15_000);
    expect(screen.getByRole("heading", { level: 1, name: "This is taking longer than usual" })).toBeInTheDocument();
    expect(screen.getByText("You won’t be charged twice. Please don’t pay again.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contact us about this order" })).toHaveAttribute("href", "/contact");
    const calls = fetchMock.mock.calls.length;
    await tickFor(2000);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(calls);
    await act(async () => screen.getByRole("button", { name: "View order status" }).click());
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("an expired order stops polling and links back to the tickets", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => answer("expired"));
    vi.stubGlobal("fetch", fetchMock);
    const { container } = mountComponent();
    await tickFor(0);

    expect(screen.getByText("Your reservation expired")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to tickets" })).toHaveAttribute("href", "/tickets");
    await tickFor(10_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
    vi.useRealTimers(); // axe-core schedules with real timers
    const violations = await axeViolations({ container });
    expect(describeViolations(violations)).toEqual([]);
  });

  it("any other final status, or an unknown order (404), is the 'not completed' message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => answer("cancelled")));
    const first = mountComponent();
    await tickFor(0);
    expect(screen.getByText("Your order was not completed")).toBeInTheDocument();
    first.unmount();

    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response("{}", { status: 404 })));
    mountComponent();
    await tickFor(0);
    expect(screen.getByText("Your order was not completed")).toBeInTheDocument();
  });

  it("gives up after 60 seconds with 'not confirmed yet'; 'Check again' starts polling again", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => answer("pending"));
    vi.stubGlobal("fetch", fetchMock);
    const { container } = mountComponent();
    await tickFor(0);
    await tickFor(60_000);

    expect(screen.getByRole("heading", { level: 1, name: "We couldn’t confirm your payment yet" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contact us about this order" })).toHaveAttribute("href", "/contact");
    const calls = fetchMock.mock.calls.length;
    expect(calls).toBeLessThanOrEqual(32);
    await tickFor(10_000);
    expect(fetchMock).toHaveBeenCalledTimes(calls);

    await act(async () => screen.getByRole("button", { name: "Check again" }).click());
    await tickFor(0);
    expect(fetchMock).toHaveBeenCalledTimes(calls + 1);
    expect(screen.getByRole("heading", { level: 1, name: "Confirming your payment…" })).toBeInTheDocument();
    vi.useRealTimers(); // axe-core schedules with real timers
    const violations = await axeViolations({ container });
    expect(describeViolations(violations)).toEqual([]);
  });

  it("keeps trying through network errors and says so", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError("offline")).mockImplementation(async () => answer("pending"));
    vi.stubGlobal("fetch", fetchMock);
    mountComponent();
    await tickFor(0);
    expect(screen.getByText("We could not check your payment just now. We will keep trying.")).toBeInTheDocument();
    await tickFor(2000);
    expect(screen.queryByText("We could not check your payment just now. We will keep trying.")).not.toBeInTheDocument();
  });

  it("stops polling when it unmounts", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => answer("pending"));
    vi.stubGlobal("fetch", fetchMock);
    const { unmount } = mountComponent();
    await tickFor(0);
    unmount();
    await tickFor(10_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

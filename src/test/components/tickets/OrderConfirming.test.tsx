import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axeViolations, describeViolations } from "../../helpers/axe";
import { render, screen } from "../../test-utils";

const refresh = vi.fn();
// A STABLE router object, like Next's: a new one per render would restart the polling effect.
const router = { refresh };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { OrderConfirming } = await import("../../../components/tickets/OrderConfirming");

const ORDER_ID = "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11";
const TOKEN = "b".repeat(43);

function answer(status: string) {
  return new Response(JSON.stringify({ success: true, data: { status } }), { status: 200 });
}
function mountComponent() {
  return render(<OrderConfirming orderId={ORDER_ID} token={TOKEN} ticketsHref="/tickets" lostLinkHref="/tickets/lost" />);
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

  it("refreshes the server page as soon as the order is paid", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => answer("paid")));
    mountComponent();
    await tickFor(0);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Payment confirmed")).toBeInTheDocument();
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
    expect(refresh).not.toHaveBeenCalled();
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

  it("gives up after 60 seconds with a 'still confirming' message and a lost-link option", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => answer("pending"));
    vi.stubGlobal("fetch", fetchMock);
    mountComponent();
    await tickFor(0);
    await tickFor(60_000);

    expect(screen.getByText("We are still confirming your payment")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Send my links again" })).toHaveAttribute("href", "/tickets/lost");
    const calls = fetchMock.mock.calls.length;
    expect(calls).toBeLessThanOrEqual(32);
    await tickFor(10_000);
    expect(fetchMock).toHaveBeenCalledTimes(calls);
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

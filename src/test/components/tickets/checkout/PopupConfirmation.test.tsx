import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "../../../test-utils";
import { PopupConfirmation } from "@/components/tickets/checkout/PopupConfirmation";
import type { CheckoutDone } from "@/components/tickets/checkout/types";

const done = {
  orderId: "11111111-1111-4111-8111-111111111111",
  buyerToken: "tok_buyer_aaaaaaaaaaaaaaaaaaaaaaaa",
  free: false,
  holders: [{ name: "Ada", email: "ada@example.org" }],
  eventName: "Summit",
  startDate: "2026-11-25",
  endDate: "2026-11-26",
} as unknown as CheckoutDone;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ success: true, data: { status: "pending", orderNo: 9 } }), { status: 200 })),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("PopupConfirmation — still confirming after a minute", () => {
  it("offers the order page in a new tab (it keeps checking) as well as Back to the site", async () => {
    render(<PopupConfirmation done={done} orderHref="/tickets/order/tok_buyer_aaaaaaaaaaaaaaaaaaaaaaaa" onClose={vi.fn()} />);
    expect(await screen.findByRole("heading", { name: "Confirming payment…" })).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(62_000);
    });
    expect(await screen.findByRole("heading", { name: "We are still confirming your payment" })).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /View your order/ });
    expect(link).toHaveAttribute("href", "/tickets/order/tok_buyer_aaaaaaaaaaaaaaaaaaaaaaaa");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("button", { name: "Back to the site" })).toBeInTheDocument();
  });
});

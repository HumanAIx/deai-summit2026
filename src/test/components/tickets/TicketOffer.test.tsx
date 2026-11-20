import { afterEach, describe, expect, it, vi } from "vitest";
import { axeViolations, describeViolations } from "../../helpers/axe";
import { TYPE_A_ID, fillDetails, fillHolder, installFakeApi, typeA, waitForQuote } from "../../helpers/checkout-harness";
import { resolveServerElement } from "../../helpers/resolve-server";
import { fireEvent, render, screen, waitFor } from "../../test-utils";
import type { PublicTypes } from "../../../lib/tickets/schemas";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("../../../lib/tickets/private-navigation", () => ({ openPrivateTicketPage: vi.fn() }));
vi.mock("@stripe/stripe-js", () => ({ loadStripe: vi.fn(async () => ({})) }));
vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PaymentElement: () => <div data-testid="payment-element" />,
  ExpressCheckoutElement: () => null,
  useStripe: () => ({}),
  useElements: () => ({}),
}));

const { TicketTypeList } = await import("../../../components/tickets/TicketTypeList");

const TOKEN = "W".repeat(40);
// ep-api holds the offered tickets for the holder: the public type reads sold out while the offer is live.
const data: PublicTypes = {
  types: [{ ...typeA, status: "on_sale", left: 3, maxPerOrder: 3, source: { ...typeA.source, timeZone: "Europe/Malta" } }],
  checkout: { salesOpen: true, testMode: false, feePayer: "buyer", questions: { invoice: true, terms: true } },
};
const offer = { token: TOKEN, quantity: 3, expiresAt: "2030-03-01T10:30:00.000Z", timeZone: "Europe/Malta" };

async function renderOffer() {
  const ui = await resolveServerElement(<TicketTypeList data={data} locale="en" localePrefix="" offer={offer} />);
  return render(<>{ui}</>);
}

afterEach(() => vi.unstubAllGlobals());

describe("a waitlist offer in the checkout", () => {
  it("shows when the offer is held until, in the event's time zone", async () => {
    await renderOffer();
    // 10:30 UTC is 11:30 in Malta in March
    expect(screen.getByText(/Your offer is held until/)).toHaveTextContent("Your offer is held until Friday, March 1, 2030 at 11:30 AM (Europe/Malta).");
  });

  it("opens the checkout limited to the one offered type, pre-selected at the offered quantity and capped by it", async () => {
    installFakeApi();
    const { container } = await renderOffer();
    expect(screen.getAllByRole("heading", { level: 4 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 4, name: "Full pass" })).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add one Full pass" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Remove one Full pass" }));
    expect(screen.getByRole("button", { name: "Add one Full pass" })).toBeEnabled();
    const violations = await axeViolations({ container });
    expect(describeViolations(violations)).toEqual([]);
  });

  it("sends the offer token with the quote and with the order, and never puts it in a URL", async () => {
    const api = installFakeApi();
    await renderOffer();
    await waitForQuote();

    expect(api.callsTo("/api/tickets/quote")[0]?.body).toEqual({ lines: [{ ticketTypeId: TYPE_A_ID, quantity: 3 }], newsletter: false, offerToken: TOKEN });

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fillDetails();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { level: 2, name: "Ticket holders" });
    for (let i = 0; i < 3; i += 1) fillHolder({ index: i, name: `Holder ${i + 1}`, email: `h${i + 1}@example.com` });
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    await waitFor(() => expect(api.callsTo("/api/tickets/orders")).toHaveLength(1));

    const order = api.callsTo("/api/tickets/orders")[0];
    expect(order?.body).toMatchObject({ offerToken: TOKEN, lines: [{ ticketTypeId: TYPE_A_ID, quantity: 3 }] });
    expect(order?.body).not.toHaveProperty("linkToken");
    for (const call of api.calls) expect(call.url).not.toContain(TOKEN);
  });

  it("an offer refused at order time ends in the translated message, not raw text", async () => {
    const api = installFakeApi();
    api.order = () => ({ status: 409, body: { success: false, error: "raw upstream text", code: "offerInUse" } });
    await renderOffer();
    await waitForQuote();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fillDetails();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { level: 2, name: "Ticket holders" });
    for (let i = 0; i < 3; i += 1) fillHolder({ index: i, name: `Holder ${i + 1}`, email: `h${i + 1}@example.com` });
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    expect(await screen.findByText(/Another order for this offer is already in progress/)).toBeInTheDocument();
    expect(screen.queryByText("raw upstream text")).not.toBeInTheDocument();
  });
});

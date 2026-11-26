import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addTickets, config, fillDetails, fillHolder, installFakeApi, refusal, typeA, waitForQuote, type FakeApi } from "../../helpers/checkout-harness";
import { fireEvent, render, screen, waitFor } from "../../test-utils";

const { push, refresh, stripe } = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), stripe: { confirmPayment: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock("../../../lib/tickets/private-navigation", () => ({ openPrivateTicketPage: vi.fn() }));
vi.mock("@stripe/stripe-js", () => ({ loadStripe: vi.fn(async () => stripe) }));
vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PaymentElement: () => <div data-testid="payment-element" />,
  ExpressCheckoutElement: () => <div data-testid="express-element" />,
  useStripe: () => stripe,
  useElements: () => ({}),
}));

const { TicketCheckout } = await import("../../../components/tickets/checkout/TicketCheckout");

let api: FakeApi;

function mount({ contact }: { contact?: "off" | "optional" | "required" }) {
  return render(<TicketCheckout types={[typeA]} config={contact === undefined ? config : { ...config, contact }} locale="en" localePrefix="" />);
}

const phone = () => screen.queryByLabelText("Phone number");
const country = () => document.querySelector<HTMLSelectElement>('[id$="-buyer-country"]');
const street = () => document.querySelector<HTMLInputElement>('[id$="-buyer-street"]');
const city = () => document.querySelector<HTMLInputElement>('[id$="-buyer-city"]');

function fillAddress() {
  fireEvent.change(phone() as HTMLElement, { target: { value: "+356 2123 4567" } });
  fireEvent.change(street() as HTMLElement, { target: { value: "1 Republic St" } });
  fireEvent.change(city() as HTMLElement, { target: { value: "Valletta" } });
  fireEvent.change(country() as HTMLElement, { target: { value: "MT" } });
}

async function reachContinue() {
  addTickets({ name: "Full pass" });
  await waitForQuote();
  fillDetails();
  fillHolder({ index: 0, name: "Ada", email: "ada@example.com" });
}

const submit = () => fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));

beforeEach(() => {
  api = installFakeApi();
});
afterEach(() => vi.unstubAllGlobals());

describe("checkout contact details (API-267)", () => {
  it.each([undefined, "off" as const])("contact %s: no phone or address fields, and none of them in the order body", async (contact) => {
    mount({ contact });
    await reachContinue();
    expect(phone()).not.toBeInTheDocument();
    expect(street()).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Same address as me")).not.toBeInTheDocument();
    submit();
    await screen.findByTestId("payment-element");
    const body = api.callsTo("/api/tickets/orders")[0]?.body as { buyer: Record<string, unknown>; holders: Record<string, unknown>[] };
    expect(body.buyer).toEqual({ name: "Ada Lovelace", email: "ada@example.com" });
    expect(body.holders[0]).not.toHaveProperty("sameAddressAsBuyer");
  });

  it("optional: shows the fields, lets the buyer skip them, and sends only what was entered", async () => {
    mount({ contact: "optional" });
    await reachContinue();
    expect(phone()).toBeInTheDocument();
    expect(screen.getByText("Optional. The organiser may use these to reach you about your order.")).toBeInTheDocument();
    submit();
    await screen.findByTestId("payment-element");
    expect((api.callsTo("/api/tickets/orders")[0]?.body as { buyer: object }).buyer).toEqual({ name: "Ada Lovelace", email: "ada@example.com" });
  });

  it("optional: a half-typed address is refused until street, city and country are all there", async () => {
    mount({ contact: "optional" });
    await reachContinue();
    fireEvent.change(street() as HTMLElement, { target: { value: "1 Republic St" } });
    submit();
    expect(await screen.findAllByText("This field is required.")).not.toHaveLength(0);
    expect(api.callsTo("/api/tickets/orders")).toHaveLength(0);
  });

  it("required: validates phone and address before submit", async () => {
    mount({ contact: "required" });
    await reachContinue();
    expect(screen.getByText("Required by the organiser.")).toBeInTheDocument();
    submit();
    expect((await screen.findAllByText("This field is required.")).length).toBeGreaterThanOrEqual(4);
    expect(api.callsTo("/api/tickets/orders")).toHaveLength(0);
  });

  it("required: sends phone, address and the holder's 'same address' flag", async () => {
    mount({ contact: "required" });
    await reachContinue();
    expect(screen.queryByLabelText("Same address as me")).not.toBeInTheDocument(); // not before an address is entered
    fillAddress();
    fireEvent.click(await screen.findByLabelText("Same address as me"));
    submit();
    await screen.findByTestId("payment-element");
    const body = api.callsTo("/api/tickets/orders")[0]?.body as { buyer: Record<string, unknown>; holders: Record<string, unknown>[] };
    expect(body.buyer).toEqual({
      name: "Ada Lovelace",
      email: "ada@example.com",
      phone: "+356 2123 4567",
      address: { street: "1 Republic St", city: "Valletta", countryCode: "MT" },
    });
    expect(body.holders[0]?.sameAddressAsBuyer).toBe(true);
  });

  it("a holder who did not tick 'Same address as me' sends no flag", async () => {
    mount({ contact: "optional" });
    await reachContinue();
    fillAddress();
    submit();
    await screen.findByTestId("payment-element");
    expect((api.callsTo("/api/tickets/orders")[0]?.body as { holders: Record<string, unknown>[] }).holders[0]).not.toHaveProperty("sameAddressAsBuyer");
  });

  it("maps ep-api's 400 tickets.contactRequired to a clear message", async () => {
    api.order = () => refusal({ code: "contactRequired", status: 400 });
    mount({ contact: "optional" });
    await reachContinue();
    submit();
    await waitFor(() => expect(screen.getByText("Please enter your phone number and address to continue.")).toBeInTheDocument());
  });
});

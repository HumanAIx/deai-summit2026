import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axeViolations, describeViolations } from "../../helpers/axe";
import {
  BUYER_TOKEN,
  ORDER_ID,
  TYPE_A_ID,
  TYPE_B_ID,
  TYPE_C_ID,
  addTickets,
  config,
  fillDetails,
  fillHolder,
  installFakeApi,
  orderAnswer,
  quoteAnswer,
  refusal,
  typeA,
  typeB,
  typeC,
  waitForQuote,
  type FakeApi,
} from "../../helpers/checkout-harness";
import { fireEvent, render, screen, waitFor, within } from "../../test-utils";

/** Checkout field ids are prefixed with a per-checkout useId; match the stable suffix. */
const fieldById = (id: string): HTMLElement | null => document.querySelector<HTMLElement>(`[id="${id}"], [id$="-${id}"]`);

const { push, refresh, stripe, expressProps, openPage } = vi.hoisted(() => ({
  push: vi.fn(),
  openPage: vi.fn(),
  refresh: vi.fn(),
  stripe: { confirmPayment: vi.fn() },
  expressProps: { current: null as null | { onConfirm: (event: { paymentFailed: () => void }) => Promise<void> } },
}));
const router = { push, refresh };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
// The order page is a private URL: the checkout opens it with a full page load, never `router.push`, so a pixel loaded
// on /tickets never reports the token (private-navigation.ts).
vi.mock("../../../lib/tickets/private-navigation", () => ({ openPrivateTicketPage: ({ path }: { path: string }) => openPage(path) }));
// Stripe is mocked at the module boundary: the SDK never loads, the elements are stubs.
vi.mock("@stripe/stripe-js", () => ({ loadStripe: vi.fn(async () => stripe) }));
vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PaymentElement: () => <div data-testid="payment-element" />,
  ExpressCheckoutElement: (props: { onReady?: (event: { availablePaymentMethods: object }) => void; onConfirm: (event: { paymentFailed: () => void }) => Promise<void> }) => {
    expressProps.current = props;
    return <div data-testid="express-element" />;
  },
  useStripe: () => stripe,
  useElements: () => ({}),
}));
vi.mock("../../../components/tickets/checkout/stripe-appearance", () => ({ buildStripeAppearance: () => ({ theme: "stripe" }) }));

const { TicketCheckout } = await import("../../../components/tickets/checkout/TicketCheckout");
const { loadStripe } = await import("@stripe/stripe-js");

let api: FakeApi;

function mountCheckout({ types = [typeA, typeC, typeB], linkToken }: { types?: typeof typeA[]; linkToken?: string } = {}) {
  return render(<TicketCheckout types={types} config={config} linkToken={linkToken} locale="en" localePrefix="" />);
}

async function toDetails({ count = 1 }: { count?: number } = {}) {
  addTickets({ name: "Full pass", count });
  await waitForQuote();
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
}
async function toHolders({ count = 1 }: { count?: number } = {}) {
  await toDetails({ count });
  fillDetails();
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByRole("heading", { level: 2, name: "Ticket holders" });
}
async function placeOrder({ count = 1 }: { count?: number } = {}) {
  await toHolders({ count });
  for (let i = 0; i < count; i += 1) fillHolder({ index: i, name: `Holder ${i + 1}`, email: `h${i + 1}@example.com` });
  fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
}
async function reachPayStep({ count = 1 }: { count?: number } = {}) {
  await placeOrder({ count });
  return screen.findByTestId("payment-element");
}

beforeEach(() => {
  api = installFakeApi();
  push.mockReset();
  openPage.mockReset();
  refresh.mockReset();
  stripe.confirmPayment.mockReset();
  stripe.confirmPayment.mockResolvedValue({});
  vi.mocked(loadStripe).mockClear();
});
afterEach(() => vi.unstubAllGlobals());

describe("step 01 — tickets and the live quote", () => {
  it("shows the cards with steppers, the step list, and an empty summary", () => {
    mountCheckout();
    expect(screen.getByRole("list", { name: "Checkout steps" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Tickets" })).toBeInTheDocument();
    expect(screen.getByText("Choose at least one ticket.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("re-quotes (debounced) on a change and shows ep-api's totals exactly, with no money maths in the browser", async () => {
    mountCheckout();
    addTickets({ name: "Full pass", count: 2 });
    await waitForQuote();

    // one request for the two clicks (debounce), with the cart lines
    expect(api.callsTo("/api/tickets/quote")).toHaveLength(1);
    expect(api.callsTo("/api/tickets/quote")[0]?.body).toEqual({ lines: [{ ticketTypeId: TYPE_A_ID, quantity: 2 }], newsletter: false });
    // 12345 cents is NOT 2 x 150 + fees: whatever ep-api answers is what is shown
    const summary = screen.getByRole("region", { name: "Order summary" });
    expect(within(summary).getByText("€123.45")).toBeInTheDocument();
    expect(within(summary).getByText("€300")).toBeInTheDocument(); // subtotal 30000, whole amounts lose the decimals
    expect(within(summary).getByText("€22.22")).toBeInTheDocument(); // VAT
    expect(within(summary).getByText("€5")).toBeInTheDocument(); // booking fees 500
  });

  it("the newsletter box is offered by ep-api and re-quotes with newsletter=true; a discount code is applied on request", async () => {
    mountCheckout();
    addTickets({ name: "Full pass" });
    await waitForQuote();
    fireEvent.click(screen.getByRole("checkbox", { name: "Subscribe to the newsletter and get 5% off this order." }));
    await waitFor(() => expect(api.callsTo("/api/tickets/quote").at(-1)?.body).toMatchObject({ newsletter: true }));

    fireEvent.change(screen.getByLabelText("Discount code"), { target: { value: " early-bird " } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(api.callsTo("/api/tickets/quote").at(-1)?.body).toMatchObject({ discountCode: "EARLY-BIRD", newsletter: true }));
    expect(await screen.findByText("Discount code EARLY-BIRD applied.")).toBeInTheDocument();
    expect(screen.getByText("−€7.77")).toBeInTheDocument();
  });

  it("an invalid code says so and is NOT sent with the order later", async () => {
    mountCheckout();
    addTickets({ name: "Full pass" });
    await waitForQuote();
    fireEvent.change(screen.getByLabelText("Discount code"), { target: { value: "badcode" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(await screen.findByText("That discount code cannot be used.")).toBeInTheDocument();
    await waitForQuote();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fillDetails();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { level: 2, name: "Ticket holders" });
    fillHolder({ index: 0, name: "Ada", email: "ada@example.com" });
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    await screen.findByTestId("payment-element");
    expect(api.callsTo("/api/tickets/orders")[0]?.body).not.toHaveProperty("discountCode");
  });

  it("a code that is not even the right shape is refused locally, with no request", async () => {
    mountCheckout();
    addTickets({ name: "Full pass" });
    await waitForQuote();
    const before = api.callsTo("/api/tickets/quote").length;
    fireEvent.change(screen.getByLabelText("Discount code"), { target: { value: "no spaces!" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(await screen.findByText("That discount code cannot be used.")).toBeInTheDocument();
    expect(api.callsTo("/api/tickets/quote")).toHaveLength(before);
  });

  it("shows a refused quote's message and keeps Continue disabled; the named card is marked", async () => {
    api.quote = () => refusal({ code: "oneEventPerOrder", status: 400, ticketTypeId: TYPE_A_ID });
    mountCheckout();
    addTickets({ name: "Full pass" });
    expect(await screen.findAllByText("Tickets for different events cannot be ordered together. Please order them separately.")).not.toHaveLength(0);
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("never goes past the per-order maximum or the stock", () => {
    mountCheckout({ types: [{ ...typeA, left: 2 }] });
    addTickets({ name: "Full pass", count: 5 });
    expect(screen.getByRole("button", { name: "Add one Full pass" })).toBeDisabled();
    expect(screen.getByText("2", { selector: "span[aria-live]" })).toBeInTheDocument();
  });
});

describe("one source per order", () => {
  it("choosing a type from another source asks to clear the cart; 'Keep my cart' changes nothing", async () => {
    mountCheckout();
    addTickets({ name: "Full pass" });
    await waitForQuote();
    fireEvent.click(screen.getByRole("button", { name: "Add one Workshop seat" }));

    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText("Your cart has tickets for DeAI Summit")).toBeInTheDocument();
    expect(within(dialog).getByText(/Clear your cart to add tickets for Workshops/)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Clear my cart and add these" })).toHaveFocus();
    fireEvent.click(within(dialog).getByRole("button", { name: "Keep my cart" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await waitFor(() => expect(api.callsTo("/api/tickets/quote").at(-1)?.body?.lines).toEqual([{ ticketTypeId: TYPE_A_ID, quantity: 1 }]));
  });

  it("'Clear my cart and add these' swaps the cart for the new type, and the quote follows", async () => {
    mountCheckout();
    addTickets({ name: "Full pass", count: 2 });
    await waitForQuote();
    fireEvent.click(screen.getByRole("button", { name: "Add one Workshop seat" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear my cart and add these" }));
    await waitFor(() => expect(api.callsTo("/api/tickets/quote").at(-1)?.body?.lines).toEqual([{ ticketTypeId: TYPE_B_ID, quantity: 1 }]));
  });

  it("two types of the same source mix without a question", async () => {
    mountCheckout();
    addTickets({ name: "Full pass" });
    addTickets({ name: "Student pass" });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await waitFor(() => expect(api.callsTo("/api/tickets/quote").at(-1)?.body?.lines).toEqual([{ ticketTypeId: TYPE_A_ID, quantity: 1 }, { ticketTypeId: TYPE_C_ID, quantity: 1 }]));
  });
});

describe("step 02 — your details", () => {
  it("moves focus to the step heading; required fields, email and terms are validated in plain words", async () => {
    mountCheckout();
    await toDetails();
    const heading = screen.getByRole("heading", { level: 2, name: "Your details" });
    expect(heading).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Please accept the terms to continue.")).toBeInTheDocument();
    expect(screen.getAllByText("This field is required.")).not.toHaveLength(0);
    expect(screen.getByLabelText("Full name")).toHaveAttribute("aria-invalid", "true");
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "nope" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
  });

  it("terms and privacy are links only when they are plain http(s); javascript: URLs are never rendered", async () => {
    const { unmount } = mountCheckout();
    await toDetails();
    expect(screen.getByRole("link", { name: /Terms and conditions/ })).toHaveAttribute("href", "https://acme.example/terms");
    expect(screen.getByRole("link", { name: /Privacy policy/ })).toHaveAttribute("rel", "noopener noreferrer");
    unmount();
    render(<TicketCheckout types={[typeA]} config={{ ...config, termsUrl: "javascript:alert(1)", privacyUrl: null }} locale="en" localePrefix="" />);
    addTickets({ name: "Full pass" });
    await waitForQuote();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.queryByRole("link", { name: /Terms/ })).not.toBeInTheDocument();
  });

  it("the invoice and terms checkboxes are named by their visible text and toggle from it, but not from the links", async () => {
    mountCheckout();
    await toDetails();
    const invoice = screen.getByRole("checkbox", { name: "I need an invoice for a company" });
    const terms = screen.getByRole("checkbox", { name: "I accept the terms and conditions and the privacy policy." });
    expect(invoice).not.toBeChecked();
    fireEvent.click(screen.getByText("I need an invoice for a company"));
    expect(invoice).toBeChecked();
    fireEvent.click(screen.getByText("I accept the terms and conditions and the privacy policy."));
    expect(terms).toBeChecked();
    fireEvent.click(screen.getByRole("link", { name: /Terms and conditions/ }));
    expect(terms).toBeChecked();
  });

  it("a company invoice reveals required fields; the VAT number is normalised and sent only when given", async () => {
    mountCheckout();
    await toDetails();
    fillDetails();
    fireEvent.click(screen.getByLabelText("I need an invoice for a company"));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findAllByText("This field is required.")).not.toHaveLength(0);

    fireEvent.change(screen.getByLabelText("Company name"), { target: { value: "Acme Ltd" } });
    fireEvent.change(screen.getByLabelText("VAT number (optional)"), { target: { value: "mt 12.34-5678" } });
    fireEvent.change(screen.getByLabelText("Street and number"), { target: { value: "1 Main St" } });
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Valletta" } });
    fireEvent.change(screen.getByLabelText("Country"), { target: { value: "MT" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { level: 2, name: "Ticket holders" });
    fillHolder({ index: 0, name: "Ada", email: "ada@example.com" });
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    await screen.findByTestId("payment-element");
    expect(api.callsTo("/api/tickets/orders")[0]?.body?.company).toEqual({ name: "Acme Ltd", vatNumber: "MT12345678", street: "1 Main St", city: "Valletta", countryCode: "MT" });
  });

  it("Back keeps what was typed", async () => {
    mountCheckout();
    await toDetails();
    fillDetails({ name: "Grace Hopper", email: "grace@example.com" });
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await screen.findByRole("heading", { level: 2, name: "Tickets" });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByDisplayValue("Grace Hopper")).toBeInTheDocument();
  });
});

describe("step 03 — ticket holders", () => {
  it("asks for one name + email per ticket (10+ stays usable), each in its own numbered fieldset", async () => {
    mountCheckout();
    await toHolders({ count: 10 });
    const fieldsets = screen.getAllByRole("group").filter((el) => el.tagName === "FIELDSET");
    expect(fieldsets).toHaveLength(10);
    expect(screen.getByText("Ticket 10 — Full pass")).toBeInTheDocument();
    for (const input of screen.getAllByRole("textbox")) expect(input.className).toContain("min-h-11");
  });

  it("'Same as buyer' fills the first ticket", async () => {
    mountCheckout();
    await toHolders({ count: 2 });
    fireEvent.click(screen.getByRole("button", { name: "Same as buyer" }));
    await waitFor(() => expect(fieldById("holder-0-name")).toHaveValue("Ada Lovelace"));
    expect(fieldById("holder-0-email")).toHaveValue("ada@example.com");
    expect(fieldById("holder-1-name")).toHaveValue("");
  });

  it("every holder needs a valid name and email before an order is created", async () => {
    mountCheckout();
    await toHolders({ count: 2 });
    fillHolder({ index: 0, name: "Ada", email: "ada@example.com" });
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    expect(await screen.findAllByText("This field is required.")).not.toHaveLength(0);
    expect(api.callsTo("/api/tickets/orders")).toHaveLength(0);
  });
});

describe("creating the order", () => {
  it("sends the full order (buyer, one holder per ticket, terms, a random key of 32+ characters) and mounts the payment step", async () => {
    mountCheckout({ linkToken: "L".repeat(24) });
    await reachPayStep({ count: 2 });

    const body = api.callsTo("/api/tickets/orders")[0]?.body as Record<string, unknown> & { idempotencyKey: string };
    expect(body).toMatchObject({
      lines: [{ ticketTypeId: TYPE_A_ID, quantity: 2 }],
      buyer: { name: "Ada Lovelace", email: "ada@example.com" },
      holders: [
        { ticketTypeId: TYPE_A_ID, name: "Holder 1", email: "h1@example.com" },
        { ticketTypeId: TYPE_A_ID, name: "Holder 2", email: "h2@example.com" },
      ],
      newsletter: false,
      acceptTerms: true,
      linkToken: "L".repeat(24),
    });
    expect(body.idempotencyKey.length).toBeGreaterThanOrEqual(32);
    expect(screen.getByRole("heading", { level: 2, name: "Pay" })).toHaveFocus();
    // the Pay button carries the ORDER answer's total
    expect(screen.getByRole("button", { name: "Pay €123.45" })).toBeEnabled();
    expect(screen.getByRole("timer")).toHaveTextContent(/^(09:5\d|10:00)$/);
  });

  it("uses the publishable key from the order answer (never env) and the buyer's language for Stripe", async () => {
    mountCheckout();
    await reachPayStep();
    expect(loadStripe).toHaveBeenCalledWith("pk_test_order", { locale: "en" });
  });

  it("a free order (total 0) goes straight to the order page: no Stripe, no payment step", async () => {
    api.quote = (body) => ({ status: 200, body: { success: true, data: quoteAnswer({ body: body as never, total: 0 }) } });
    api.order = () => ({ status: 201, body: { success: true, data: orderAnswer({ free: true }) } });
    mountCheckout();
    addTickets({ name: "Full pass" });
    await waitForQuote();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fillDetails();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { level: 2, name: "Ticket holders" });
    fillHolder({ index: 0, name: "Ada", email: "ada@example.com" });
    expect(screen.getByRole("button", { name: "Place order" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Place order" }));

    await waitFor(() => expect(openPage).toHaveBeenCalledWith(`/tickets/order/${BUYER_TOKEN}`));
    expect(push).not.toHaveBeenCalled(); // a client-side route change would hand the token to the site's analytics
    expect(screen.queryByTestId("payment-element")).not.toBeInTheDocument();
    expect(loadStripe).not.toHaveBeenCalled();
    expect(api.callsTo(`/api/tickets/orders/${ORDER_ID}/extend`)).toHaveLength(0);
  });

  it("the order link stays in the buyer's language", async () => {
    render(<TicketCheckout types={[typeA]} config={config} locale="de" localePrefix="/de" />);
    addTickets({ name: "Full pass" });
    await waitForQuote();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fillDetails();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { level: 2, name: "Ticket holders" });
    fillHolder({ index: 0, name: "Ada", email: "ada@example.com" });
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    await screen.findByTestId("payment-element");
    api.extend = () => ({ status: 200, body: { success: true, data: { holdExpiresAt: new Date(Date.now() + 600_000).toISOString() } } });
    fireEvent.click(screen.getByRole("button", { name: "Pay €123.45" }));
    await waitFor(() => expect(stripe.confirmPayment).toHaveBeenCalled());
    expect(stripe.confirmPayment.mock.calls[0]?.[0].confirmParams.return_url).toBe(`${window.location.origin}/de/tickets/order/${BUYER_TOKEN}?o=${ORDER_ID}`);
  });

  it("a sold-out refusal goes back to step 01, marks the named card, and refreshes the catalogue", async () => {
    api.order = () => refusal({ code: "soldOut", ticketTypeId: TYPE_A_ID });
    mountCheckout();
    await placeOrder();
    expect(await screen.findByRole("heading", { level: 2, name: "Tickets" })).toBeInTheDocument();
    expect(screen.getAllByText("Sorry, those tickets are sold out.").length).toBeGreaterThan(0);
    expect(refresh).toHaveBeenCalled();
  });

  it("a code refusal returns to step 01 with the code's own message and drops the code", async () => {
    api.order = () => refusal({ code: "codeUsedUp" });
    mountCheckout();
    addTickets({ name: "Full pass" });
    await waitForQuote();
    fireEvent.change(screen.getByLabelText("Discount code"), { target: { value: "VIP10" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await screen.findByText("Discount code VIP10 applied.");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fillDetails();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { level: 2, name: "Ticket holders" });
    fillHolder({ index: 0, name: "Ada", email: "ada@example.com" });
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    expect(await screen.findByText("That discount code has been used up.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Tickets" })).toBeInTheDocument();
  });
});

describe("idempotency", () => {
  it("a double click sends ONE order request", async () => {
    let release: () => void = () => undefined;
    let orderRequests = 0;
    const original = api.fetch.getMockImplementation() as (url: string, init?: RequestInit) => Promise<Response>;
    api.fetch.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "/api/tickets/orders") {
        orderRequests += 1;
        await new Promise<void>((resolve) => (release = resolve));
      }
      return original(url, init);
    });
    mountCheckout();
    await toHolders();
    fillHolder({ index: 0, name: "Ada", email: "ada@example.com" });
    const form = screen.getByRole("button", { name: "Continue to payment" }).closest("form") as HTMLFormElement;
    fireEvent.submit(form);
    await waitFor(() => expect(orderRequests).toBe(1));
    fireEvent.submit(form);
    fireEvent.submit(form);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(orderRequests).toBe(1);
    release();
    await screen.findByTestId("payment-element");
    expect(api.callsTo("/api/tickets/orders")).toHaveLength(1);
  });

  it("a retry after a lost answer (network failure) replays the SAME key", async () => {
    let attempt = 0;
    const original = api.fetch.getMockImplementation() as (url: string, init?: RequestInit) => Promise<Response>;
    api.fetch.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "/api/tickets/orders" && attempt++ === 0) {
        api.calls.push({ url, body: JSON.parse(String(init?.body)), headers: {} });
        throw new TypeError("offline");
      }
      return original(url, init);
    });
    mountCheckout();
    await placeOrder();
    expect(await screen.findByText("We could not reach the ticket service. Please try again in a moment.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    await screen.findByTestId("payment-element");

    const keys = api.callsTo("/api/tickets/orders").map((call) => call.body?.idempotencyKey);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
  });

  it("after a definite refusal the next attempt gets a NEW key; an unchanged request after success is not sent again", async () => {
    let attempt = 0;
    const original = api.order;
    api.order = (body) => (attempt++ === 0 ? refusal({ code: "tooManyOpenOrders" }) : original(body));
    mountCheckout();
    await placeOrder();
    expect(await screen.findByText("You already have open orders. Finish or wait for them to expire first.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    await screen.findByTestId("payment-element");
    const keys = api.callsTo("/api/tickets/orders").map((call) => call.body?.idempotencyKey);
    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toBe(keys[1]);

    // Back, then Continue with nothing changed: the pending order is kept, no second request
    fireEvent.click(screen.getByRole("button", { name: "Back to ticket holders" }));
    await screen.findByRole("heading", { level: 2, name: "Ticket holders" });
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    await screen.findByTestId("payment-element");
    expect(api.callsTo("/api/tickets/orders")).toHaveLength(2);
  });

  it("changing the cart after an order was created makes a NEW request with a new key", async () => {
    mountCheckout();
    await reachPayStep();
    fireEvent.click(screen.getByRole("button", { name: "Back to ticket holders" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    addTickets({ name: "Full pass" });
    await waitFor(() => expect(api.callsTo("/api/tickets/quote").at(-1)?.body?.lines).toEqual([{ ticketTypeId: TYPE_A_ID, quantity: 2 }]));
    await waitForQuote();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(await screen.findByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { level: 2, name: "Ticket holders" });
    fillHolder({ index: 0, name: "Ada", email: "ada@example.com" });
    fillHolder({ index: 1, name: "Bob", email: "bob@example.com" });
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    await waitFor(() => expect(api.callsTo("/api/tickets/orders")).toHaveLength(2));
    const [first, second] = api.callsTo("/api/tickets/orders").map((call) => call.body?.idempotencyKey);
    expect(first).not.toBe(second);
  });
});

describe("the pay step: order summary and hold extension", () => {
  const orderWith = ({ holdMs, holdMaxMs }: { holdMs: number; holdMaxMs?: number }) => () => {
    const order = orderAnswer({ holdMs });
    return { status: 201, body: { success: true, data: { ...order, ...(holdMaxMs ? { holdMaxAt: new Date(Date.now() + holdMaxMs).toISOString() } : {}) } } };
  };

  it("shows the price summary from the order answer's totals (not Pay € alone) above the payment", async () => {
    mountCheckout();
    const payment = await reachPayStep();
    const heading = screen.getByRole("heading", { name: "Order summary" });
    expect(heading.compareDocumentPosition(payment) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("€22.22")).toBeInTheDocument(); // the order vatCents, as given
  });

  it("no warning with plenty of hold time left", async () => {
    mountCheckout();
    await reachPayStep();
    expect(screen.queryByRole("button", { name: "Extend" })).not.toBeInTheDocument();
  });

  it("in the last 2 minutes Extend asks ep-api with the buyer token and the hold restarts from the new end", async () => {
    api.order = orderWith({ holdMs: 90_000, holdMaxMs: 30 * 60_000 });
    mountCheckout();
    await reachPayStep();
    expect(screen.getByText("Your reservation ends soon. Need more time?")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Extend" }));
    await waitFor(() => expect(api.callsTo(`/api/tickets/orders/${ORDER_ID}/extend`)).toHaveLength(1));
    expect(api.callsTo(`/api/tickets/orders/${ORDER_ID}/extend`)[0]?.headers["x-order-token"]).toBe(BUYER_TOKEN);
    await waitFor(() => expect(screen.queryByRole("button", { name: "Extend" })).not.toBeInTheDocument());
    expect(screen.getByRole("timer")).toHaveTextContent(/^(09|10):\d\d$/);
  });

  it("a refused extend keeps the warning and tells the buyer", async () => {
    api.order = orderWith({ holdMs: 90_000, holdMaxMs: 30 * 60_000 });
    api.extend = () => refusal({ code: "holdEnded" });
    mountCheckout();
    await reachPayStep();
    fireEvent.click(await screen.findByRole("button", { name: "Extend" }));
    expect(await screen.findByText(/couldn't extend your reservation/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Extend" })).toBeEnabled();
  });

  it("a hold already at holdMaxAt offers no Extend, only the 'any further' note", async () => {
    api.order = () => {
      const order = orderAnswer({ holdMs: 90_000 });
      return { status: 201, body: { success: true, data: { ...order, holdMaxAt: order.holdExpiresAt } } };
    };
    mountCheckout();
    await reachPayStep();
    expect(screen.getByText(/can't be extended any further/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Extend" })).not.toBeInTheDocument();
  });
});

describe("paying", () => {
  it("asks for more hold time and confirms with redirect 'if_required' and the order return URL; success navigates to the order", async () => {
    mountCheckout();
    await reachPayStep();
    fireEvent.click(screen.getByRole("button", { name: "Pay €123.45" }));

    await waitFor(() => expect(openPage).toHaveBeenCalledWith(`/tickets/order/${BUYER_TOKEN}?o=${ORDER_ID}`));
    expect(push).not.toHaveBeenCalled();
    const extend = api.callsTo(`/api/tickets/orders/${ORDER_ID}/extend`);
    expect(extend).toHaveLength(1);
    expect(extend[0]?.headers["x-order-token"]).toBe(BUYER_TOKEN);
    expect(stripe.confirmPayment).toHaveBeenCalledTimes(1);
    expect(stripe.confirmPayment.mock.calls[0]?.[0]).toMatchObject({
      redirect: "if_required",
      confirmParams: { return_url: `${window.location.origin}/tickets/order/${BUYER_TOKEN}?o=${ORDER_ID}` },
    });
    // Regression (live test 2026-11-12): Elements is created WITH the client secret, so passing it again to
    // confirmPayment switches Stripe to the deferred-intent flow, which throws without elements.submit() — every
    // payment failed with "did not go through", even Stripe's 4242 test card.
    expect(stripe.confirmPayment.mock.calls[0]?.[0]).not.toHaveProperty("clientSecret");
  });

  it("does not ask for more hold time once the hold has reached holdMaxAt, but still pays", async () => {
    api.order = () => {
      const order = orderAnswer({ holdMs: 10 * 60_000 });
      return { status: 201, body: { success: true, data: { ...order, holdMaxAt: order.holdExpiresAt } } };
    };
    mountCheckout();
    await reachPayStep();
    fireEvent.click(screen.getByRole("button", { name: "Pay €123.45" }));
    await waitFor(() => expect(stripe.confirmPayment).toHaveBeenCalledTimes(1));
    expect(api.callsTo(`/api/tickets/orders/${ORDER_ID}/extend`)).toHaveLength(0);
  });

  it("still asks while the hold can go further (holdMaxAt later than the hold)", async () => {
    api.order = () => {
      const order = orderAnswer({ holdMs: 10 * 60_000 });
      return { status: 201, body: { success: true, data: { ...order, holdMaxAt: new Date(Date.now() + 30 * 60_000).toISOString() } } };
    };
    mountCheckout();
    await reachPayStep();
    fireEvent.click(screen.getByRole("button", { name: "Pay €123.45" }));
    await waitFor(() => expect(api.callsTo(`/api/tickets/orders/${ORDER_ID}/extend`)).toHaveLength(1));
  });

  it("the Express Checkout wallets pay through the same path", async () => {
    mountCheckout();
    await reachPayStep();
    await expressProps.current?.onConfirm({ paymentFailed: vi.fn() });
    expect(api.callsTo(`/api/tickets/orders/${ORDER_ID}/extend`)).toHaveLength(1);
    expect(stripe.confirmPayment).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(openPage).toHaveBeenCalled());
  });

  it("a decline stays on the payment step, shows Stripe's message, and allows a retry", async () => {
    stripe.confirmPayment.mockResolvedValueOnce({ error: { type: "card_error", message: "Your card was declined." } });
    mountCheckout();
    await reachPayStep();
    fireEvent.click(screen.getByRole("button", { name: "Pay €123.45" }));

    expect(await screen.findByText("Your card was declined.")).toBeInTheDocument();
    expect(screen.getByText("Your card was declined.").closest("[role=alert]")).not.toBeNull();
    expect(openPage).not.toHaveBeenCalled();
    expect(screen.getByTestId("payment-element")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Pay €123.45" })).toBeEnabled());

    fireEvent.click(screen.getByRole("button", { name: "Pay €123.45" }));
    await waitFor(() => expect(openPage).toHaveBeenCalledTimes(1));
    expect(stripe.confirmPayment).toHaveBeenCalledTimes(2);
  });

  it("a double click on Pay confirms once", async () => {
    let finish: (value: object) => void = () => undefined;
    stripe.confirmPayment.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    mountCheckout();
    await reachPayStep();
    const pay = screen.getByRole("button", { name: "Pay €123.45" });
    fireEvent.submit(pay.closest("form") as HTMLFormElement);
    fireEvent.submit(pay.closest("form") as HTMLFormElement);
    await waitFor(() => expect(stripe.confirmPayment).toHaveBeenCalledTimes(1));
    finish({});
    await waitFor(() => expect(openPage).toHaveBeenCalledTimes(1));
  });

  // Develop test 2026-11-12: awaiting the extend made Pay wait 11.8 s on a cold start. The extend now runs in the
  // background; ep-api settles a payment that lands after its hold (paid while stock is free, else refunded).
  it("does not wait for the hold extension: a slow or hanging extend never delays the payment", async () => {
    api.extend = () => new Promise(() => undefined);
    mountCheckout();
    await reachPayStep();
    fireEvent.click(screen.getByRole("button", { name: "Pay €123.45" }));

    await waitFor(() => expect(stripe.confirmPayment).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(openPage).toHaveBeenCalledWith(`/tickets/order/${BUYER_TOKEN}?o=${ORDER_ID}`));
    expect(api.callsTo(`/api/tickets/orders/${ORDER_ID}/extend`)).toHaveLength(1);
  });

  it("an extend refused while the card is being confirmed does not interrupt the payment", async () => {
    api.extend = () => refusal({ code: "holdEnded" });
    mountCheckout();
    await reachPayStep();
    fireEvent.click(screen.getByRole("button", { name: "Pay €123.45" }));

    await waitFor(() => expect(openPage).toHaveBeenCalledWith(`/tickets/order/${BUYER_TOKEN}?o=${ORDER_ID}`));
    expect(stripe.confirmPayment).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Your reservation expired")).not.toBeInTheDocument();
  });

  it("the hold timer reaching zero does the same, without any click", async () => {
    api.order = () => ({ status: 201, body: { success: true, data: orderAnswer({ holdMs: 1500 }) } });
    mountCheckout();
    await reachPayStep();
    expect(await screen.findByText("Your reservation expired", {}, { timeout: 4000 })).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
    expect(screen.queryByTestId("payment-element")).not.toBeInTheDocument();
  });

  it("test mode shows the 'no real payment' notice on the payment step", async () => {
    render(<TicketCheckout types={[typeA]} config={{ ...config, testMode: true }} locale="en" localePrefix="" />);
    addTickets({ name: "Full pass" });
    await waitForQuote();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fillDetails();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { level: 2, name: "Ticket holders" });
    fillHolder({ index: 0, name: "Ada", email: "ada@example.com" });
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    expect(await screen.findByText(/Test mode — no real payment/)).toBeInTheDocument();
  });
});

describe("a11y", () => {
  it("each step has no axe violations", async () => {
    const { container } = mountCheckout();
    expect(describeViolations(await axeViolations({ container }))).toEqual([]);

    addTickets({ name: "Full pass", count: 2 });
    await waitForQuote();
    expect(describeViolations(await axeViolations({ container }))).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(await screen.findByLabelText("I need an invoice for a company"));
    expect(describeViolations(await axeViolations({ container }))).toEqual([]);
    fireEvent.click(screen.getByLabelText("I need an invoice for a company"));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(describeViolations(await axeViolations({ container }))).toEqual([]); // with validation errors showing

    fillDetails();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { level: 2, name: "Ticket holders" });
    expect(describeViolations(await axeViolations({ container }))).toEqual([]);

    fillHolder({ index: 0, name: "Ada", email: "ada@example.com" });
    fillHolder({ index: 1, name: "Bob", email: "bob@example.com" });
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    await screen.findByTestId("payment-element");
    expect(describeViolations(await axeViolations({ container }))).toEqual([]);
  });

  it("the source-conflict question has no axe violations", async () => {
    const { container } = mountCheckout();
    addTickets({ name: "Full pass" });
    await waitForQuote();
    fireEvent.click(screen.getByRole("button", { name: "Add one Workshop seat" }));
    expect(describeViolations(await axeViolations({ container }))).toEqual([]);
  });
});

describe("keeping the cart: links that leave the checkout open in a new tab", () => {
  let header: HTMLAnchorElement;
  beforeEach(() => {
    header = document.createElement("a");
    header.setAttribute("href", "/speakers");
    header.textContent = "Speakers";
    document.body.append(header);
  });
  afterEach(() => {
    header.remove();
  });
  /** The target the header link had when the browser followed it ("_blank" = new tab); jsdom navigation is stopped. */
  function clickHeader(): string | null {
    let target: string | null = null;
    const probe = (event: Event) => {
      target = header.getAttribute("target");
      event.preventDefault();
    };
    document.addEventListener("click", probe);
    fireEvent.click(header);
    document.removeEventListener("click", probe);
    header.removeAttribute("target");
    header.removeAttribute("rel");
    return target;
  }

  it("is untouched before anything is selected, then opens a new tab once a ticket is in the cart", async () => {
    mountCheckout();
    expect(clickHeader()).toBeNull();
    addTickets({ name: "Full pass" });
    expect(clickHeader()).toBe("_blank");
    await waitForQuote();
  });

  it("goes back to normal when the cart is emptied", async () => {
    mountCheckout();
    addTickets({ name: "Full pass" });
    await waitForQuote();
    fireEvent.click(screen.getByRole("button", { name: "Remove one Full pass" }));
    expect(clickHeader()).toBeNull();
  });

  it("is over once the buyer is sent to the order page (full page load): nothing is intercepted", async () => {
    mountCheckout();
    await reachPayStep();
    expect(clickHeader()).toBe("_blank"); // an order is pending: still protected
    fireEvent.click(screen.getByRole("button", { name: "Pay €123.45" }));
    await waitFor(() => expect(openPage).toHaveBeenCalledWith(`/tickets/order/${BUYER_TOKEN}?o=${ORDER_ID}`));
    expect(clickHeader()).toBeNull();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axeViolations, describeViolations } from "../../helpers/axe";
import { addTickets, config, fillDetails, fillHolder, installFakeApi, typeA, waitForQuote, type FakeApi } from "../../helpers/checkout-harness";
import { fireEvent, render, screen, waitFor, within } from "../../test-utils";
import { extraQuestionsOf } from "../../../lib/tickets/checkout-questions";
import type { CheckoutConfig } from "../../../components/tickets/checkout/types";
import type { PublicQuestion } from "../../../lib/tickets/schemas";

/** Checkout field ids are prefixed with a per-checkout useId; match the stable suffix. */
const fieldById = (id: string): HTMLElement | null => document.querySelector<HTMLElement>(`[id="${id}"], [id$="-${id}"]`);

const { push, refresh } = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock("@stripe/stripe-js", () => ({ loadStripe: vi.fn(async () => ({})) }));
vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PaymentElement: () => <div data-testid="payment-element" />,
  ExpressCheckoutElement: () => <div data-testid="express-element" />,
  useStripe: () => ({ confirmPayment: vi.fn() }),
  useElements: () => ({}),
}));

const { TicketCheckout } = await import("../../../components/tickets/checkout/TicketCheckout");

const options = (name: string, values: string[]) => ({ name, kind: "select", required: true, options: values.map((value) => ({ value, label: `api-${value}` })) });
const LIST: PublicQuestion[] = [
  { key: "job", id: "companyJob", scope: "holder", fields: [{ name: "company", kind: "text" }, { name: "jobTitle", kind: "text" }] },
  { key: "diet", id: "dietary", scope: "holder", fields: [options("dietary", ["none", "vegetarian", "vegan", "gluten_free", "halal", "kosher", "other"])] },
  { key: "shirt", id: "tshirt", scope: "holder", fields: [options("tshirt", ["S", "M", "L", "XL", "XXL"])] },
  { key: "source", id: "heardFrom", scope: "order", fields: [options("value", ["social", "search", "friend", "newsletter", "partner", "other"])] },
];
const withQuestions = (list: PublicQuestion[]): CheckoutConfig => ({ ...config, extraQuestions: extraQuestionsOf({ questionList: list }) });

let api: FakeApi;
const mount = (cfg: CheckoutConfig) => render(<TicketCheckout types={[typeA]} config={cfg} locale="en" localePrefix="" />);

/** One page: "02 · Your details" shows once the cart holds a ticket and the quote landed. */
async function toDetails({ count = 1 }: { count?: number } = {}) {
  addTickets({ name: "Full pass", count });
  await waitForQuote();
  await screen.findByRole("heading", { level: 3, name: "02 · Your details" });
}
async function toHolders({ count = 1 }: { count?: number } = {}) {
  await toDetails({ count });
  fillDetails();
  await screen.findByRole("heading", { level: 3, name: "03 · Ticket holders" });
}
const choose = ({ id, value }: { id: string; value: string }) => fireEvent.change(fieldById(id) as HTMLElement, { target: { value } });
const orderBody = () => api.callsTo("/api/tickets/orders")[0]?.body as { holders: Array<Record<string, unknown>>; heardFrom?: unknown };

beforeEach(() => {
  api = installFakeApi();
  push.mockReset();
  refresh.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe("a site that asks no extra question", () => {
  it("shows only name and email per holder, no heard-from box, and sends no answers", async () => {
    mount(config);
    await toDetails();
    expect(fieldById("heard-from")).toBeNull();
    fillDetails();
    await screen.findByRole("heading", { level: 3, name: "03 · Ticket holders" });
    expect(fieldById("holder-0-company")).toBeNull();
    expect(fieldById("holder-0-dietary")).toBeNull();
    expect(fieldById("holder-0-tshirt")).toBeNull();
    fillHolder({ index: 0, name: "Ada", email: "ada@example.com" });
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    await waitFor(() => expect(api.callsTo("/api/tickets/orders")).toHaveLength(1));
    expect(orderBody().holders[0]).not.toHaveProperty("answers");
    expect(orderBody()).not.toHaveProperty("heardFrom");
  });
});

describe("02 · your details — how did you hear about us", () => {
  it("asks it (optional) when the site does, with the option labels in the visitor's language, and a text only for 'other'", async () => {
    mount(withQuestions(LIST));
    await toDetails();
    const select = fieldById("heard-from") as HTMLSelectElement;
    expect(screen.getByLabelText("How did you hear about us? (optional)")).toBe(select);
    expect([...select.options].map((option) => option.textContent)).toEqual(["Choose…", "Social media", "Search engine", "A friend or colleague", "Newsletter", "A partner or sponsor", "Other"]);
    expect(fieldById("heard-from-text")).toBeNull();
    choose({ id: "heard-from", value: "other" });
    expect(await screen.findByLabelText("Tell us where")).toBeInTheDocument();
  });

  it("is optional: leaving it empty continues and sends no heardFrom", async () => {
    mount(withQuestions([LIST[3] as PublicQuestion]));
    await toHolders();
    fillHolder({ index: 0, name: "Ada", email: "ada@example.com" });
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    await waitFor(() => expect(api.callsTo("/api/tickets/orders")).toHaveLength(1));
    expect(orderBody()).not.toHaveProperty("heardFrom");
  });

  it("sends the choice, and the text only with 'other' (a text typed before switching back is dropped)", async () => {
    mount(withQuestions([LIST[3] as PublicQuestion]));
    await toDetails();
    fillDetails();
    choose({ id: "heard-from", value: "other" });
    fireEvent.change(await screen.findByLabelText("Tell us where"), { target: { value: "a podcast" } });
    choose({ id: "heard-from", value: "friend" });
    fillHolder({ index: 0, name: "Ada", email: "ada@example.com" });
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    await waitFor(() => expect(api.callsTo("/api/tickets/orders")).toHaveLength(1));
    expect(orderBody().heardFrom).toEqual({ value: "friend" });
  });

  it("sends 'other' with its text", async () => {
    mount(withQuestions([LIST[3] as PublicQuestion]));
    await toDetails();
    fillDetails();
    choose({ id: "heard-from", value: "other" });
    fireEvent.change(await screen.findByLabelText("Tell us where"), { target: { value: "  a podcast " } });
    fillHolder({ index: 0, name: "Ada", email: "ada@example.com" });
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    await waitFor(() => expect(api.callsTo("/api/tickets/orders")).toHaveLength(1));
    expect(orderBody().heardFrom).toEqual({ value: "other", text: "a podcast" });
  });

  it("refuses a text over 200 characters", async () => {
    mount(withQuestions([LIST[3] as PublicQuestion]));
    await toDetails();
    fillDetails();
    choose({ id: "heard-from", value: "other" });
    fireEvent.change(await screen.findByLabelText("Tell us where"), { target: { value: "x".repeat(201) } });
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    expect(await screen.findByText("This is too long.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Your tickets" })).toBeInTheDocument();
    expect(api.callsTo("/api/tickets/orders")).toHaveLength(0);
  });
});

describe("03 · ticket holders — per-holder questions", () => {
  it("asks company and job title (optional), dietary needs and T-shirt size under each holder, with data-driven options", async () => {
    mount(withQuestions(LIST));
    await toHolders({ count: 2 });
    for (const index of [0, 1]) {
      expect(fieldById(`holder-${index}-company`)).not.toBeNull();
      // Prefixed per checkout (useId): two checkouts on one page never share a field id.
      expect(document.getElementById(`holder-${index}-company`)).toBeNull();
      expect(fieldById(`holder-${index}-jobTitle`)).not.toBeNull();
      const dietary = fieldById(`holder-${index}-dietary`) as HTMLSelectElement;
      expect([...dietary.options].map((option) => option.textContent)).toEqual(["Choose…", "No dietary needs", "Vegetarian", "Vegan", "Gluten free", "Halal", "Kosher", "Other"]);
      const shirt = fieldById(`holder-${index}-tshirt`) as HTMLSelectElement;
      expect([...shirt.options].map((option) => option.textContent)).toEqual(["Choose…", "api-S", "api-M", "api-L", "api-XL", "api-XXL"]); // sizes carry no wording of ours: ep-api's label is shown
    }
    expect(screen.getByLabelText("Dietary needs", { selector: '[id$="-holder-0-dietary"]' })).toBeInTheDocument();
  });

  it("requires dietary needs and T-shirt size for every holder, and not company / job title", async () => {
    mount(withQuestions(LIST));
    await toHolders({ count: 2 });
    fillHolder({ index: 0, name: "Ada", email: "ada@example.com" });
    fillHolder({ index: 1, name: "Bo", email: "bo@example.com" });
    choose({ id: "holder-0-dietary", value: "none" });
    choose({ id: "holder-0-tshirt", value: "M" });
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    await waitFor(() => expect(screen.getAllByText("This field is required.")).toHaveLength(2)); // holder 2: dietary + size
    expect(fieldById("holder-1-dietary")).toHaveAttribute("aria-invalid", "true");
    expect(fieldById("holder-1-tshirt")).toHaveAttribute("aria-invalid", "true");
    expect(fieldById("holder-0-dietary")).not.toHaveAttribute("aria-invalid");
    expect(api.callsTo("/api/tickets/orders")).toHaveLength(0);
  });

  it("limits company and job title to 120 characters and 'other' text to 200", async () => {
    mount(withQuestions(LIST));
    await toHolders();
    fillHolder({ index: 0, name: "Ada", email: "ada@example.com" });
    choose({ id: "holder-0-dietary", value: "other" });
    choose({ id: "holder-0-tshirt", value: "S" });
    fireEvent.change(fieldById("holder-0-company") as HTMLElement, { target: { value: "c".repeat(121) } });
    fireEvent.change(await screen.findByLabelText("Tell us more"), { target: { value: "d".repeat(201) } });
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    await waitFor(() => expect(screen.getAllByText("This is too long.")).toHaveLength(2));
    expect(api.callsTo("/api/tickets/orders")).toHaveLength(0);
  });

  it("shows the free text only with 'other'", async () => {
    mount(withQuestions(LIST));
    await toHolders();
    expect(screen.queryByLabelText("Tell us more")).toBeNull();
    choose({ id: "holder-0-dietary", value: "other" });
    expect(await screen.findByLabelText("Tell us more")).toBeInTheDocument();
    choose({ id: "holder-0-dietary", value: "vegan" });
    await waitFor(() => expect(screen.queryByLabelText("Tell us more")).toBeNull());
  });

  it("sends each holder's own answers with the order (empty company / job title left out, other-text only with other)", async () => {
    mount(withQuestions(LIST));
    await toHolders({ count: 2 });
    fillHolder({ index: 0, name: "Ada", email: "ada@example.com" });
    fillHolder({ index: 1, name: "Bo", email: "bo@example.com" });
    fireEvent.change(fieldById("holder-0-company") as HTMLElement, { target: { value: " Quantia " } });
    fireEvent.change(fieldById("holder-0-jobTitle") as HTMLElement, { target: { value: "CTO" } });
    choose({ id: "holder-0-dietary", value: "vegan" });
    choose({ id: "holder-0-tshirt", value: "L" });
    choose({ id: "holder-1-dietary", value: "other" });
    fireEvent.change(await screen.findByLabelText("Tell us more"), { target: { value: "no nuts" } });
    choose({ id: "holder-1-tshirt", value: "XXL" });
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    await waitFor(() => expect(api.callsTo("/api/tickets/orders")).toHaveLength(1));
    expect(orderBody().holders[0]).toMatchObject({ name: "Ada", answers: { company: "Quantia", jobTitle: "CTO", dietary: "vegan", tshirt: "L" } });
    expect(orderBody().holders[1]?.answers).toEqual({ dietary: "other", dietaryOther: "no nuts", tshirt: "XXL" });
  });

  it("keeps the answers when going Back from the payment and Continue again, and creates no second order", async () => {
    mount(withQuestions(LIST));
    await toHolders();
    fillHolder({ index: 0, name: "Ada", email: "ada@example.com" });
    choose({ id: "holder-0-dietary", value: "halal" });
    choose({ id: "holder-0-tshirt", value: "M" });
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    await screen.findByRole("heading", { level: 2, name: "Payment" });
    fireEvent.click(screen.getByRole("button", { name: "Back to tickets" }));
    await screen.findByRole("heading", { level: 2, name: "Your tickets" });
    expect(fieldById("holder-0-dietary")).toHaveValue("halal");
    expect(fieldById("holder-0-tshirt")).toHaveValue("M");
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    await screen.findByRole("heading", { level: 2, name: "Payment" });
    expect(api.callsTo("/api/tickets/orders")).toHaveLength(1);
  });
});

describe("ten holders on a phone", () => {
  it("every holder is its own numbered fieldset, every field is full width and 44 px tall, and the page has no wide element", async () => {
    mount(withQuestions(LIST));
    await toHolders({ count: 10 });
    const fieldsets = screen.getAllByRole("group").filter((el) => el.tagName === "FIELDSET");
    expect(fieldsets).toHaveLength(10);
    for (const [index, set] of fieldsets.entries()) {
      expect(within(set).getByText(new RegExp(`^Ticket ${index + 1} `))).toBeInTheDocument();
      for (const control of within(set).getAllByRole("textbox").concat(within(set).getAllByRole("combobox"))) {
        // The shared input class: 44 px minimum, as wide as its column, 16 px text (no iOS zoom).
        expect(control.className).toContain("min-h-11");
        expect(control.className).toContain("w-full");
        expect(control.className).toContain("text-base");
      }
    }
    // One column by default (two only from `sm`), so nothing is wider than a 375 px screen.
    const pair = fieldById("holder-0-company")?.closest(".grid");
    expect(pair?.className).toContain("grid-cols-1");
    expect(pair?.className).toContain("sm:grid-cols-2");
  });

  it("passes the accessibility check with all questions on", async () => {
    const { container } = mount(withQuestions(LIST));
    await toHolders({ count: 3 });
    expect(describeViolations(await axeViolations({ container }))).toEqual([]);
  });
});

describe("details on the ticket page (ep-api T7)", () => {
  it("with detailsLater, step 03 says the holders add their details on their ticket page; without it, nothing is said", async () => {
    const off = mount(config);
    await toHolders();
    expect(screen.queryByText(/adds their job title, company and dietary needs on their own ticket page/)).not.toBeInTheDocument();
    off.unmount();
    mount({ ...withQuestions([LIST[2] as PublicQuestion]), detailsLater: true });
    await toHolders();
    expect(screen.getByRole("note")).toHaveTextContent("Each ticket holder adds their job title, company and dietary needs on their own ticket page after the purchase.");
    // The questions ep-api still sends (here the T-shirt size) are asked as before.
    expect(fieldById("holder-0-tshirt")).not.toBeNull();
  });
});

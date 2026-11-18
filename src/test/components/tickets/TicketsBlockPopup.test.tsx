import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BUYER_TOKEN,
  ORDER_ID,
  TYPE_A_ID,
  TYPE_B_ID,
  TYPE_C_ID,
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
import type { TicketCard } from "@/lib/tickets/block-schema";
import type { BlockTypes, PublicType } from "@/lib/tickets/schemas";

const { push, refresh, stripe, openPage } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  openPage: vi.fn(),
  stripe: { confirmPayment: vi.fn() },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock("../../../lib/tickets/private-navigation", () => ({ openPrivateTicketPage: ({ path }: { path: string }) => openPage(path) }));
vi.mock("@stripe/stripe-js", () => ({ loadStripe: vi.fn(async () => stripe) }));
vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PaymentElement: () => <div data-testid="payment-element" />,
  ExpressCheckoutElement: () => <div data-testid="express-element" />,
  useStripe: () => stripe,
  useElements: () => ({}),
}));
vi.mock("../../../components/tickets/checkout/stripe-appearance", () => ({ buildStripeAppearance: () => ({ theme: "stripe" }) }));

const { TicketsBlock } = await import("../../../components/tickets/TicketsBlock");

const EVENT = { kind: "event", id: "e1", name: "DeAI Summit", startDate: "2026-11-25", endDate: "2026-11-26" };
const full: PublicType = { ...typeA, source: EVENT };
const student: PublicType = { ...typeC, source: EVENT };
const workshop: PublicType = typeB;

const card = ({ id, ticketTypeId, btn }: { id: string; ticketTypeId: string; btn: string }): TicketCard => ({ id, ticketTypeId, title: "", hl: "", kicker: "", incl: "", feats: [], btn, featured: false });
const CARDS = [card({ id: "c1", ticketTypeId: TYPE_A_ID, btn: "Buy full" }), card({ id: "c2", ticketTypeId: TYPE_C_ID, btn: "Buy student" }), card({ id: "c3", ticketTypeId: TYPE_B_ID, btn: "Buy workshop" })];

let api: FakeApi;
let types: PublicType[];
let typesCalls: number;
let status: () => { status: string; orderNo: number };
let documents: { id: string; kind: string; number: string }[];
let docCalls: { url: string; body: Record<string, unknown> }[];
const json = (data: unknown, status = 200) => new Response(JSON.stringify(status === 200 ? { success: true, data } : data), { status });

function live(): BlockTypes {
  return { types, checkout: { salesOpen: true, testMode: false, feePayer: "buyer", termsUrl: "https://acme.example/terms", privacyUrl: "https://acme.example/privacy", questions: { invoice: true, terms: true }, newsletterOffer: { on: false, pct: 0 } } };
}

// jsdom delivers `history.back()`'s popstate asynchronously: let the previous test's pop land before this one mounts.
const settleHistory = () => new Promise((resolve) => setTimeout(resolve, 25));

beforeEach(async () => {
  await settleHistory();
  api = installFakeApi();
  types = [full, student, workshop];
  typesCalls = 0;
  status = () => ({ status: "paid", orderNo: 4821 });
  documents = [{ id: "5b1d1c33-7e5a-4f6b-8c1d-3a4b5c6d7e8f", kind: "invoice", number: "INV-77" }];
  docCalls = [];
  const harnessFetch = api.fetch as unknown as (url: string, init?: RequestInit) => Promise<Response>;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      if (url.startsWith("/api/tickets/types")) {
        typesCalls += 1;
        return json(live());
      }
      if (url.endsWith("/status")) return json(status());
      if (url === "/api/tickets/my/order/documents" || url === "/api/tickets/my/order/document") {
        docCalls.push({ url, body: JSON.parse(String(init.body)) as Record<string, unknown> });
        return url.endsWith("/documents") ? json({ documents }) : new Response("%PDF-1.4", { status: 200, headers: { "Content-Disposition": 'attachment; filename="INV-77.pdf"' } });
      }
      return harnessFetch(url, init);
    }),
  );
  push.mockReset();
  refresh.mockReset();
  openPage.mockReset();
  stripe.confirmPayment.mockReset();
  stripe.confirmPayment.mockResolvedValue({});
});
afterEach(async () => {
  await settleHistory();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const show = ({ editable = false }: { editable?: boolean } = {}) => render(<TicketsBlock cards={CARDS} buyHref="/fr/tickets" editable={editable} />);
const dialog = () => screen.findByRole("dialog", { name: "Buy tickets" });

async function openFor({ label }: { label: string }) {
  const link = await screen.findByRole("link", { name: new RegExp(label) });
  fireEvent.click(link);
  return dialog();
}

async function toPayStep({ free = false }: { free?: boolean } = {}) {
  await waitForQuote();
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fillDetails();
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByRole("heading", { level: 2, name: "Ticket holders" });
  fillHolder({ index: 0, name: "Ada Lovelace", email: "ada.holder@example.com" });
  fireEvent.click(screen.getByRole("button", { name: free ? "Place order" : "Continue to payment" }));
  if (!free) await screen.findByTestId("payment-element");
}

describe("Buy opens the pop-up", () => {
  it("keeps a real link to the locale-prefixed /tickets for no-JS, middle-click and modifier clicks", async () => {
    show();
    const link = await screen.findByRole("link", { name: /Buy full/ });
    expect(link).toHaveAttribute("href", "/fr/tickets");
    // The preview-mode link rewrite must leave it alone, or it navigates instead of opening the pop-up.
    expect(link).toHaveAttribute("data-opens-dialog");
    fireEvent.click(link, { ctrlKey: true });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens with the clicked type at 1 and offers ONLY the block's cards of the same event", async () => {
    show();
    const box = within(await openFor({ label: "Buy student" }));
    // Student pass pre-selected at 1, Full pass (same event) offered at 0
    expect(within(box.getByRole("group", { name: "Student pass" })).getByText("1")).toBeInTheDocument();
    expect(within(box.getByRole("group", { name: "Full pass" })).getByText("0")).toBeInTheDocument();
    // the workshop card belongs to another schedule: not offered here
    expect(box.queryByText("Workshop seat")).not.toBeInTheDocument();
    await waitFor(() => expect(api.callsTo("/api/tickets/quote").at(-1)?.body?.lines).toEqual([{ ticketTypeId: TYPE_C_ID, quantity: 1 }]));
  });

  it("a card of another event opens its own pop-up with only its own types", async () => {
    show();
    const box = within(await openFor({ label: "Buy workshop" }));
    expect(box.getByText("Workshop seat")).toBeInTheDocument();
    expect(box.queryByText("Full pass")).not.toBeInTheDocument();
  });

  it("editor mode: nothing opens, nothing is pushed", async () => {
    const pushState = vi.spyOn(window.history, "pushState");
    show({ editable: true });
    const buttons = await screen.findAllByRole("button", { name: /Buy full/ });
    fireEvent.click(buttons[0] as HTMLElement);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(pushState).not.toHaveBeenCalled();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("sold-out cards", () => {
  it("with a waitlist: Join the waitlist opens the waitlist dialog", async () => {
    types = [{ ...full, status: "sold_out", left: 0, waitlistEnabled: true }];
    render(<TicketsBlock cards={[CARDS[0] as TicketCard]} buyHref="/tickets" />);
    fireEvent.click(await screen.findByRole("button", { name: /Join the waitlist/ }));
    expect(await screen.findByRole("dialog", { name: "Join the waitlist for Full pass" })).toBeInTheDocument();
  });

  it("without a waitlist: the disabled Sold out stays", async () => {
    types = [{ ...full, status: "sold_out", left: 0 }];
    render(<TicketsBlock cards={[CARDS[0] as TicketCard]} buyHref="/tickets" />);
    expect(await screen.findByRole("button", { name: "Sold out" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Join the waitlist/ })).not.toBeInTheDocument();
  });
});

describe("history and closing", () => {
  it("pushes ONE entry with the same URL on open; the phone back button closes; the URL never changes", async () => {
    const before = window.location.href;
    const pushState = vi.spyOn(window.history, "pushState");
    show();
    await openFor({ label: "Buy full" });
    expect(pushState).toHaveBeenCalledTimes(1);
    expect(pushState.mock.calls[0]?.[2]).toBe(before);
    expect(window.location.href).toBe(before);
    expect(JSON.stringify(window.history.state)).not.toContain(BUYER_TOKEN);

    window.history.back(); // the phone back button
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(window.location.href).toBe(before);
  });

  it("closing with the close button pops the entry again (history stays clean) and releases scroll lock + inert", async () => {
    const back = vi.spyOn(window.history, "back");
    show();
    await openFor({ label: "Buy full" });
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(back).toHaveBeenCalledTimes(1);
    expect(document.body.style.overflow).not.toBe("hidden");
    expect(document.querySelector("[inert]")).toBeNull();
  });

  it("Esc closes it when nothing is held; the backdrop closes it on step 01", async () => {
    show();
    await openFor({ label: "Buy full" });
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await settleHistory();

    const box = await openFor({ label: "Buy full" });
    fireEvent.click(box.parentElement as HTMLElement);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("the leave guard appears only once an order exists, and says how long the tickets stay held", async () => {
    show();
    await openFor({ label: "Buy full" });
    await toPayStep();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    const guard = await screen.findByRole("alertdialog", { name: "Leave checkout?" });
    expect(within(guard).getByText(/Your tickets stay held for 1\d min\./)).toBeInTheDocument();
    // stay: the checkout is still there
    fireEvent.click(within(guard).getByRole("button", { name: "Keep checking out" }));
    expect(screen.queryByRole("alertdialog", { name: "Leave checkout?" })).not.toBeInTheDocument();
    expect(screen.getByTestId("payment-element")).toBeInTheDocument();
  });

  it("no guard before an order: closing on step 02 just closes", async () => {
    show();
    await openFor({ label: "Buy full" });
    await waitForQuote();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("the backdrop is ignored on the pay step", async () => {
    show();
    const box = await openFor({ label: "Buy full" });
    await toPayStep();
    fireEvent.click(box.parentElement as HTMLElement);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Buy tickets" })).toBeInTheDocument();
  });

  it("leaving with a hold keeps the checkout mounted: reopening resumes on the pay step", async () => {
    show();
    await openFor({ label: "Buy full" });
    await toPayStep();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(await screen.findByRole("button", { name: "Leave checkout" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(document.body.style.overflow).not.toBe("hidden");
    expect(document.querySelector("[inert]")).toBeNull();
    await settleHistory(); // the pop of the closed entry lands before a person could reopen

    await openFor({ label: "Buy full" });
    expect(screen.getByTestId("payment-element")).toBeInTheDocument();
    expect(api.callsTo("/api/tickets/orders")).toHaveLength(1); // no second order
  });

  it("the phone back button with a hold asks first and keeps the dialog open", async () => {
    show();
    await openFor({ label: "Buy full" });
    await toPayStep();
    window.history.back();
    expect(await screen.findByRole("alertdialog", { name: "Leave checkout?" })).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Buy tickets" })).toBeInTheDocument();
  });
});

describe("no router refresh inside the pop-up", () => {
  it("a refused card re-reads the types through the block, never router.refresh()", async () => {
    show();
    await openFor({ label: "Buy full" });
    await waitForQuote();
    const before = typesCalls;
    api.order = () => refusal({ code: "soldOut", ticketTypeId: TYPE_A_ID });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fillDetails();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { level: 2, name: "Ticket holders" });
    fillHolder({ index: 0, name: "Ada", email: "ada@example.com" });
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    await waitFor(() => expect(typesCalls).toBeGreaterThan(before));
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("confirmation", () => {
  it("a paid order shows the confirmation inside the pop-up: event, order number, holders, actions, no redirect, no token in the URL", async () => {
    const before = window.location.href;
    show();
    await openFor({ label: "Buy full" });
    await toPayStep();
    fireEvent.click(screen.getByRole("button", { name: "Pay €123.45" }));

    expect(await screen.findByRole("heading", { name: "You're going to DeAI Summit" })).toBeInTheDocument();
    expect(screen.getByText("Order #4821")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Sent to ada.holder@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add to calendar" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Download invoice" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to the site" })).toBeInTheDocument();

    const view = screen.getByRole("link", { name: /View your order/ });
    expect(view).toHaveAttribute("target", "_blank");
    expect(view).toHaveAttribute("rel", "noopener noreferrer");
    expect(view).toHaveAttribute("href", `/fr/tickets/order/${BUYER_TOKEN}`);

    expect(openPage).not.toHaveBeenCalled();
    expect(window.location.href).toBe(before);
    expect(window.location.href).not.toContain(BUYER_TOKEN);
    expect(JSON.stringify(window.history.state) ?? "").not.toContain(BUYER_TOKEN);
    expect(window.location.href).not.toContain(ORDER_ID);
  });

  it("while the webhook has not landed (status pending) it says Confirming payment… and never paid", async () => {
    status = () => ({ status: "pending", orderNo: 4821 });
    show();
    await openFor({ label: "Buy full" });
    await toPayStep();
    fireEvent.click(screen.getByRole("button", { name: "Pay €123.45" }));

    expect(await screen.findByRole("heading", { name: "Confirming payment…" })).toBeInTheDocument();
    expect(screen.queryByText(/You're going to/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Download invoice" })).not.toBeInTheDocument();
  });

  it("a free order confirms in place too", async () => {
    api.quote = (body) => ({ status: 200, body: { success: true, data: quoteAnswer({ body: body as never, total: 0 }) } });
    api.order = () => ({ status: 201, body: { success: true, data: orderAnswer({ free: true }) } });
    show();
    await openFor({ label: "Buy full" });
    await toPayStep({ free: true });
    expect(await screen.findByRole("heading", { name: "You're going to DeAI Summit" })).toBeInTheDocument();
    expect(openPage).not.toHaveBeenCalled();
    expect(loadStripeNeverCalled()).toBe(true);
  });

  it("no invoice yet: the Download invoice button is not shown", async () => {
    documents = [];
    show();
    await openFor({ label: "Buy full" });
    await toPayStep();
    fireEvent.click(screen.getByRole("button", { name: "Pay €123.45" }));
    await screen.findByRole("heading", { name: "You're going to DeAI Summit" });
    await waitFor(() => expect(docCalls).toHaveLength(1));
    expect(screen.queryByRole("button", { name: "Download invoice" })).not.toBeInTheDocument();
  });

  it("Download invoice POSTs the token in the BODY, never in a URL", async () => {
    const createObjectURL = vi.fn(() => "blob:invoice");
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
    show();
    await openFor({ label: "Buy full" });
    await toPayStep();
    fireEvent.click(screen.getByRole("button", { name: "Pay €123.45" }));
    fireEvent.click(await screen.findByRole("button", { name: "Download invoice" }));
    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());

    const calls = vi.mocked(fetch).mock.calls.filter(([url]) => String(url).startsWith("/api/tickets/my/order/"));
    expect(calls.length).toBeGreaterThanOrEqual(2);
    for (const [url, init] of calls) {
      expect(String(url)).not.toContain(BUYER_TOKEN);
      expect(init?.method).toBe("POST");
      expect(JSON.parse(String(init?.body))).toMatchObject({ token: BUYER_TOKEN });
    }
    expect(docCalls.at(-1)).toMatchObject({ url: "/api/tickets/my/order/document", body: { token: BUYER_TOKEN, documentId: "5b1d1c33-7e5a-4f6b-8c1d-3a4b5c6d7e8f" } });
  });

  it("Back to the site closes the pop-up; the next Buy starts a fresh checkout", async () => {
    show();
    await openFor({ label: "Buy full" });
    await toPayStep();
    fireEvent.click(screen.getByRole("button", { name: "Pay €123.45" }));
    fireEvent.click(await screen.findByRole("button", { name: "Back to the site" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await settleHistory();

    const box = within(await openFor({ label: "Buy student" }));
    expect(box.getByRole("heading", { level: 2, name: "Tickets" })).toBeInTheDocument();
    expect(within(box.getByRole("group", { name: "Student pass" })).getByText("1")).toBeInTheDocument();
  });
});

function loadStripeNeverCalled(): boolean {
  return screen.queryByTestId("payment-element") === null;
}

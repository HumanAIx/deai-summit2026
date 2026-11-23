import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "../../test-utils";
import { TicketsBlock } from "@/components/tickets/TicketsBlock";
import type { TicketCard } from "@/lib/tickets/block-schema";
import type { BlockTypes, PublicType } from "@/lib/tickets/schemas";

const A = "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11";
const B = "6d2f8b2f-3a5b-4b64-8b4f-1f7a7b5d2c22";
const card = (over: Partial<TicketCard> = {}): TicketCard => ({ id: "c1", ticketTypeId: A, title: "", hl: "", kicker: "", incl: "", feats: [], btn: "", featured: false, ...over });
const type = (over: Partial<PublicType> = {}): PublicType => ({
  id: A,
  name: "Full pass",
  description: null,
  priceCents: 15000,
  currency: "EUR",
  bookingFeeCents: 0,
  status: "on_sale",
  left: null,
  maxPerOrder: 10,
  source: { kind: "schedule", id: "s1", name: "Summit", startDate: "2026-11-25", endDate: "2026-11-26" },
  ...over,
});
const live = (types: PublicType[], checkout: Partial<BlockTypes["checkout"]> = {}): BlockTypes => ({ types, checkout: { salesOpen: true, testMode: false, feePayer: "buyer", ...checkout } });

const fetchMock = vi.fn();
function answer(data: BlockTypes) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true, data }), { status: 200 }));
}
function fail(code = "unavailable", status = 502) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: false, code }), { status }));
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const show = (cards: TicketCard[], editable = false) => render(<TicketsBlock cards={cards} buyHref="/fr/tickets" editable={editable} />);

describe("TicketsBlock — status to button", () => {
  it("on sale: the card's label (or Buy ticket) links to the /tickets checkout page with that type preselected", async () => {
    answer(live([type()]));
    show([card({ btn: "Get in" })]);
    const link = await screen.findByRole("link", { name: /Get in/ });
    expect(link).toHaveAttribute("href", `/fr/tickets?type=${type().id}&types=${type().id}`);
  });

  it("each Buy link names the section's tickets on sale (picked and public), so the checkout offers only those", async () => {
    const second = "8f3c1b2a-6d4e-4f5a-9b8c-7d6e5f4a3b2c";
    answer(live([type(), type({ id: second, name: "Second pass" })]));
    show([card({ btn: "First" }), card({ id: "c2", ticketTypeId: second, btn: "Second" }), card({ id: "c3", ticketTypeId: "11111111-2222-4333-8444-555555555555", btn: "Gone" })]);
    const link = await screen.findByRole("link", { name: /First/ });
    expect(link.getAttribute("href")).toBe(`/fr/tickets?type=${type().id}&types=${type().id},${second}`);
  });

  it("buying never opens a pop-up: a plain click is a normal navigation (no dialog, nothing prevented)", async () => {
    answer(live([type()]));
    show([card({ btn: "Get in" })]);
    const link = await screen.findByRole("link", { name: /Get in/ });
    const probe = (event: Event) => event.preventDefault();
    document.addEventListener("click", probe);
    const notPreventedByTheCard = fireEvent.click(link);
    document.removeEventListener("click", probe);
    expect(notPreventedByTheCard).toBe(false); // only the probe prevented it (jsdom cannot navigate)
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(link).not.toHaveAttribute("data-opens-dialog");
  });

  it("defaults the label to Buy ticket", async () => {
    answer(live([type()]));
    show([card()]);
    expect(await screen.findByRole("link", { name: /Buy ticket/ })).toBeInTheDocument();
  });

  it("not yet on sale: a disabled button with the date", async () => {
    answer(live([type({ status: "not_yet", saleFrom: "2026-12-01T09:00:00.000Z" })]));
    show([card()]);
    const button = await screen.findByRole("button", { name: /On sale/ });
    expect(button).toBeDisabled();
    expect(button.textContent).toMatch(/2026/);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("paused and ended: disabled Sales closed", async () => {
    answer(live([type({ id: A, status: "paused" }), type({ id: B, status: "ended" })]));
    show([card(), card({ id: "c2", ticketTypeId: B })]);
    const buttons = await screen.findAllByRole("button", { name: "Sales closed" });
    expect(buttons).toHaveLength(2);
    buttons.forEach((b) => expect(b).toBeDisabled());
  });

  it("sold out: disabled Sold out", async () => {
    answer(live([type({ status: "sold_out", left: 0 })]));
    show([card()]);
    expect(await screen.findByRole("button", { name: "Sold out" })).toBeDisabled();
    expect(screen.queryByText(/Only/)).toBeNull();
  });

  it("sales not open on the site disables every card, whatever its status", async () => {
    answer(live([type({ id: A }), type({ id: B, status: "sold_out" })], { salesOpen: false }));
    show([card(), card({ id: "c2", ticketTypeId: B })]);
    const buttons = await screen.findAllByRole("button", { name: "Sales not open yet" });
    expect(buttons).toHaveLength(2);
    buttons.forEach((b) => expect(b).toBeDisabled());
  });
});

describe("TicketsBlock — price", () => {
  it("shows Free at zero, with no fee line", async () => {
    answer(live([type({ priceCents: 0, bookingFeeCents: 200 })]));
    show([card()]);
    expect(await screen.findByText("Free")).toBeInTheDocument();
    expect(screen.queryByText(/booking fee/)).toBeNull();
  });

  it("formats whole and cents parts in the type's currency", async () => {
    answer(live([type({ priceCents: 9950 })]));
    const { container } = show([card()]);
    await screen.findByRole("link");
    expect(container.textContent).toContain("€99.50");
  });

  it("shows the booking fee only when the buyer pays a positive fee", async () => {
    answer(live([type({ bookingFeeCents: 250 })], { feePayer: "buyer" }));
    const first = show([card()]);
    expect(await screen.findByText(/booking fee/)).toBeInTheDocument();
    first.unmount();

    answer(live([type({ bookingFeeCents: 250 })], { feePayer: "organizer" }));
    show([card()]);
    await screen.findByRole("link");
    expect(screen.queryByText(/booking fee/)).toBeNull();
  });

  it("shows Only n left under the price when ep-api sends a low-stock count", async () => {
    answer(live([type({ left: 3 })]));
    show([card()]);
    expect(await screen.findByText("Only 3 left")).toBeInTheDocument();
  });
});

describe("TicketsBlock — which cards show", () => {
  it("leaves out a card with no ticket type, and one whose type is not in the public list", async () => {
    answer(live([type({ id: A })]));
    show([card({ title: "Kept" }), card({ id: "c2", ticketTypeId: "", title: "Empty" }), card({ id: "c3", ticketTypeId: B, title: "Gone" })]);
    await screen.findByRole("link");
    expect(screen.getByText("Kept")).toBeInTheDocument();
    expect(screen.queryByText("Empty")).toBeNull();
    expect(screen.queryByText("Gone")).toBeNull();
  });

  it("renders nothing when every card is hidden (the block's base content stays)", async () => {
    answer(live([]));
    const { container } = show([card()]);
    await waitFor(() => expect(container.querySelector("article")).toBeNull());
    expect(container.textContent).toBe("");
  });

  it("renders nothing at all when no card has a type, without calling the API result", () => {
    answer(live([type()]));
    const { container } = show([card({ ticketTypeId: "" })]);
    expect(container.querySelector("article")).toBeNull();
  });

  it("renders both cards when the same type is on two cards", async () => {
    answer(live([type()]));
    show([card({ title: "One" }), card({ id: "c2", title: "Two" })]);
    await screen.findAllByRole("link");
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("treats a site that sells no tickets as no cards, not an error", async () => {
    fail("salesClosed", 409);
    const { container } = show([card()]);
    await waitFor(() => expect(container.querySelector("article")).toBeNull());
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("TicketsBlock — loading and failure", () => {
  it("server-renders the card text at once, with price and button as a skeleton", () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    const { container } = show([card({ title: "VIP Pass", incl: "Includes", feats: ["Lounge", "Priority seating"] })]);
    expect(screen.getByRole("heading", { level: 3, name: "VIP Pass" })).toBeInTheDocument();
    expect(screen.getByText("Lounge")).toBeInTheDocument();
    expect(container.querySelector("ul[aria-busy='true']")).not.toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
    expect(container.textContent).not.toMatch(/€/);
  });

  it("on failure keeps the card text, disables the button as Tickets unavailable and offers Retry", async () => {
    fail();
    show([card({ title: "VIP Pass" })]);
    expect(await screen.findByRole("button", { name: "Tickets unavailable" })).toBeDisabled();
    expect(screen.getByText("VIP Pass")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText(/€/)).toBeNull();

    answer(live([type()]));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("link", { name: /Buy ticket/ })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("refetches when the tab regains focus, and shows the new state", async () => {
    answer(live([type({ left: null })]));
    show([card()]);
    await screen.findByRole("link", { name: /Buy ticket/ });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    answer(live([type({ status: "sold_out" })]));
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(await screen.findByRole("button", { name: "Sold out" })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps the last good answer when a refocus refresh fails", async () => {
    answer(live([type()]));
    show([card()]);
    await screen.findByRole("link", { name: /Buy ticket/ });
    fail();
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("link", { name: /Buy ticket/ })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("reads from our own handler, never ep-api, with the page locale", async () => {
    answer(live([type()]));
    show([card()]);
    await screen.findByRole("link");
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("/api/tickets/types?locale=en");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ cache: "no-store" });
  });
});

describe("TicketsBlock — card content", () => {
  it("draws the accent word only on its first exact match; an unmatched word is ignored", async () => {
    answer(live([type(), type({ id: B })]));
    const { container } = show([card({ title: "VIP Pass VIP", hl: "VIP" }), card({ id: "c2", ticketTypeId: B, title: "Student Pass", hl: "VIP" })]);
    await screen.findAllByRole("link");
    const headings = screen.getAllByRole("heading", { level: 3 });
    const accents = within(headings[0] as HTMLElement).getByText("VIP", { selector: "span" });
    expect(accents.className).toContain("bg-clip-text");
    expect(headings[0]?.textContent).toBe("VIP Pass VIP");
    expect(headings[0]?.querySelectorAll("span")).toHaveLength(1);
    expect(headings[1]?.querySelectorAll("span")).toHaveLength(0);
    expect(headings[1]?.textContent).toBe("Student Pass");
    expect(container.querySelector("h1")).toBeNull();
  });

  it("falls back to the type name when the title is empty", async () => {
    answer(live([type({ name: "Full pass" })]));
    show([card()]);
    expect(await screen.findByRole("heading", { level: 3, name: "Full pass" })).toBeInTheDocument();
  });

  it("highlights only the first featured card", async () => {
    answer(live([type(), type({ id: B })]));
    show([card({ featured: true }), card({ id: "c2", ticketTypeId: B, featured: true })]);
    await screen.findAllByRole("link");
    const articles = screen.getAllByRole("article");
    expect(articles[0]?.querySelector("span.bg-linear-to-r")).not.toBeNull();
    expect(articles[1]?.querySelector("span.bg-linear-to-r")).toBeNull();
  });

  it("uses the card's own label above the title, else builds one from the real type", async () => {
    answer(live([type({ scope: { mode: "all" } }), type({ id: B, scope: { mode: "sessions", sessions: ["a", "b", "c"] } })]));
    show([card({ kicker: "Early bird" }), card({ id: "c2", ticketTypeId: B })]);
    expect(await screen.findByText("Early bird")).toBeInTheDocument();
    expect(screen.getByText("Ticket · 3 sessions")).toBeInTheDocument();
  });

  it("builds the label from the days of a whole-schedule pass, a day pass and an event date", async () => {
    const C = "7e3f9c30-4b6c-4c75-9c5f-2a8b8c6e3d33";
    answer(
      live([
        type({ scope: { mode: "all" } }),
        type({ id: B, scope: { mode: "days", days: ["2026-11-25"] } }),
        type({ id: C, source: { kind: "event", id: "e1", name: "E", startDate: "2026-12-01" } }),
      ]),
    );
    show([card(), card({ id: "c2", ticketTypeId: B }), card({ id: "c3", ticketTypeId: C })]);
    expect(await screen.findByText("Ticket · 2 days")).toBeInTheDocument();
    expect(screen.getByText("Ticket · 1 day")).toBeInTheDocument();
    expect(screen.getByText(/^Ticket · .*2026/)).toBeInTheDocument();
  });

  it("lists the feature lines and the list heading", async () => {
    answer(live([type()]));
    show([card({ incl: "VIP ticket includes", feats: ["Lounge", "", "After party"] })]);
    await screen.findByRole("link");
    expect(screen.getByText("VIP ticket includes")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").map((li) => li.textContent).filter((x) => x === "Lounge" || x === "After party")).toEqual(["Lounge", "After party"]);
  });
});

describe("TicketsBlock — editor mode", () => {
  it("renders the buy button inert: no link, and a click does nothing", async () => {
    answer(live([type()]));
    show([card()], true);
    const button = await screen.findByRole("button", { name: /Buy ticket/ });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByRole("link")).toBeNull();
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    button.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
  });
});

describe("TicketsBlock — layout", () => {
  it("lays cards out with the column logic's grid (never narrower than 260px)", async () => {
    answer(live([type()]));
    const { container } = show([card()]);
    await screen.findByRole("link");
    const grid = container.querySelector("ul") as HTMLElement;
    expect(grid.style.gridTemplateColumns).toContain("260px");
    expect(grid.style.maxWidth).toBe("380px");
  });
});

describe("TicketsBlock — editor placeholders", () => {
  const empty = card({ id: "c2", ticketTypeId: "", title: "Draft" });
  const gone = card({ id: "c3", ticketTypeId: B, title: "Old pass" });

  it("shows a card with no ticket type, and one the site no longer sells, as placeholders in the editor", async () => {
    answer(live([type()]));
    show([card(), empty, gone], true);
    await waitFor(() => expect(screen.getAllByTestId("ticket-card-placeholder")).toHaveLength(2));
    expect(screen.getByText("Choose a ticket type in the settings")).toBeInTheDocument();
    expect(screen.getByText("This ticket type is no longer on sale on this site")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Draft" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Old pass" })).toBeInTheDocument();
  });

  it("a card with no type is a placeholder straight away, before the live types arrive", () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    show([empty], true);
    expect(screen.getByTestId("ticket-card-placeholder")).toBeInTheDocument();
  });

  it("the public site leaves both out", async () => {
    answer(live([type()]));
    show([card(), empty, gone], false);
    await screen.findByRole("link", { name: /Buy ticket/ });
    expect(screen.queryByTestId("ticket-card-placeholder")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Draft" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Old pass" })).toBeNull();
  });
});

describe("TicketsBlock — colours follow the page it sits on", () => {
  it("prefers a template site's own palette (accent text, primary text, button pair) and falls back to the block's tokens", async () => {
    answer(live([type()]));
    const { container } = show([card()]);
    const root = container.querySelector("[data-tickets-block]");
    const cls = root?.getAttribute("class") ?? "";
    expect(cls).toContain("[--tb-accent:var(--t-accent-text,var(--color-ticket-accent,");
    expect(cls).toContain("[--tb-accent-2:var(--t-primary-text,var(--color-ticket-accent-2,");
    expect(cls).toContain("[--tb-btn:var(--t-btn,var(--ticket-btn-bg,");
    expect(cls).toContain("[--tb-on-btn:var(--t-on-btn,var(--color-ticket-on-btn,");
  });
});

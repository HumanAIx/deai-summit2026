import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axeViolations, describeViolations } from "../../helpers/axe";
import { fireEvent, render, screen, waitFor, within } from "../../test-utils";

const router = { push: vi.fn(), refresh: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { RefundRequestForm } = await import("../../../components/tickets/RefundRequestForm");

const TOKEN = "b".repeat(43);
const T1 = "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11";
const T2 = "6d2f8b2f-3a5b-4b64-8b4f-1f7a7b5d2c22";
const TICKETS = [
  { id: T1, label: "Ada Lovelace", code: "T-1" },
  { id: T2, label: "Grace Hopper", code: "T-2" },
];

function respond(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
}
const OK = { success: true, data: { refundRequest: { status: "open", createdAt: "2026-11-12T10:00:00.000Z", ticketCount: 1, reason: "cant_attend", reply: null } } };

beforeEach(() => router.refresh.mockReset());
afterEach(() => vi.unstubAllGlobals());

/** The card shows "Ask for a refund" first ("My Ticket" design); the form opens on click. */
function renderOpen(ui: React.ReactElement) {
  const view = render(ui);
  fireEvent.click(screen.getByRole("button", { name: "Ask for a refund" }));
  return view;
}

describe("RefundRequestForm", () => {
  it("starts closed: the intro and an 'Ask for a refund' button, no form", () => {
    render(<RefundRequestForm token={TOKEN} tickets={TICKETS} />);
    expect(screen.getByText("Ask the organiser to refund some or all of your tickets.")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("says it only asks the organiser and lists a checkbox per ticket, reason chips and a message", async () => {
    const { container } = renderOpen(<RefundRequestForm token={TOKEN} tickets={TICKETS} />);
    expect(screen.getByText(/Nothing is refunded until they approve it/)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Ada Lovelace/ })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Grace Hopper/ })).not.toBeChecked();
    expect(screen.getAllByRole("radio").map((radio) => radio.closest("label")?.textContent)).toEqual(["I can't attend", "I was charged twice", "The event changed", "I bought it by mistake", "Another reason"]);
    expect(screen.getByRole("textbox", { name: /Message/ })).toHaveAttribute("maxlength", "1000");
    expect(screen.getByText("Fill in your request above.")).toBeInTheDocument();
    expect(describeViolations(await axeViolations({ container }))).toEqual([]);
  });

  it("'Select all' picks every ticket and turns into 'Clear all'; the summary counts them and names the reason", () => {
    renderOpen(<RefundRequestForm token={TOKEN} tickets={TICKETS} />);
    const summary = screen.getByRole("complementary", { name: "Your request" });
    expect(within(summary).getByText("0 of 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    expect(screen.getByRole("checkbox", { name: /Ada Lovelace/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Grace Hopper/ })).toBeChecked();
    expect(within(summary).getByText("2 of 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "The event changed" }));
    expect(within(summary).getByText("The event changed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(within(summary).getByText("0 of 2")).toBeInTheDocument();
  });

  it("Cancel, the close button and Escape close the form and give the focus back to 'Ask for a refund'", () => {
    renderOpen(<RefundRequestForm token={TOKEN} tickets={TICKETS} />);
    expect(screen.getByRole("heading", { name: "Request a refund" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ask for a refund" }));
    fireEvent.click(screen.getByRole("button", { name: "Close the refund request" }));
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ask for a refund" }));
    fireEvent.keyDown(screen.getByRole("checkbox", { name: /Ada Lovelace/ }), { key: "Escape" });
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("pre-selects the only ticket of a one-ticket order", () => {
    renderOpen(<RefundRequestForm token={TOKEN} tickets={[TICKETS[0] as (typeof TICKETS)[number]]} />);
    expect(screen.getByRole("checkbox", { name: /Ada Lovelace/ })).toBeChecked();
  });

  it("asks for a ticket and a reason before posting anything", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderOpen(<RefundRequestForm token={TOKEN} tickets={TICKETS} />);
    fireEvent.click(screen.getByRole("button", { name: "Send refund request" }));
    expect(await screen.findByText("Choose at least one ticket.")).toBeInTheDocument();
    const reasonError = screen.getByText("Choose a reason.");
    for (const radio of screen.getAllByRole("radio")) expect(radio).toHaveAttribute("aria-describedby", reasonError.id);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the chosen tickets, reason and trimmed message with the order token in a header, then confirms and refreshes", async () => {
    const fetchMock = respond(OK, 201);
    vi.stubGlobal("fetch", fetchMock);
    renderOpen(<RefundRequestForm token={TOKEN} tickets={TICKETS} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /Grace Hopper/ }));
    fireEvent.click(screen.getByRole("radio", { name: "I can't attend" }));
    fireEvent.change(screen.getByRole("textbox", { name: /Message/ }), { target: { value: "  I am ill  " } });
    fireEvent.click(screen.getByRole("button", { name: "Send refund request" }));
    expect(await screen.findByText("Refund request sent")).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string>; body: string }];
    expect(url).toBe("/api/tickets/my/order/refund-request");
    expect(init.headers["x-order-token"]).toBe(TOKEN);
    expect(JSON.parse(init.body)).toEqual({ ticketIds: [T2], reason: "cant_attend", message: "I am ill" });
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it("unchecking a ticket removes it, and an empty message is not sent", async () => {
    const fetchMock = respond(OK, 201);
    vi.stubGlobal("fetch", fetchMock);
    renderOpen(<RefundRequestForm token={TOKEN} tickets={TICKETS} />);
    const ada = screen.getByRole("checkbox", { name: /Ada Lovelace/ });
    fireEvent.click(ada);
    fireEvent.click(screen.getByRole("checkbox", { name: /Grace Hopper/ }));
    fireEvent.click(ada);
    fireEvent.click(screen.getByRole("radio", { name: "Another reason" }));
    fireEvent.click(screen.getByRole("button", { name: "Send refund request" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse((fetchMock.mock.calls[0] as [string, { body: string }])[1].body)).toEqual({ ticketIds: [T2], reason: "other" });
  });

  it("a second request is refused with a translated message and the form stays", async () => {
    vi.stubGlobal("fetch", respond({ success: false, error: "api text", code: "refundRequestOpen" }, 409));
    renderOpen(<RefundRequestForm token={TOKEN} tickets={[TICKETS[0] as (typeof TICKETS)[number]]} />);
    fireEvent.click(screen.getByRole("radio", { name: "Another reason" }));
    fireEvent.click(screen.getByRole("button", { name: "Send refund request" }));
    expect(await screen.findByText("You already have a refund request waiting for an answer.")).toBeInTheDocument();
    expect(screen.queryByText("api text")).not.toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });
});

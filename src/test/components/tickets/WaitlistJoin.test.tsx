import { afterEach, describe, expect, it, vi } from "vitest";
import { axeViolations, describeViolations } from "../../helpers/axe";
import { config, typeA } from "../../helpers/checkout-harness";
import { fireEvent, render, screen, waitFor } from "../../test-utils";
import { TicketCards } from "../../../components/tickets/checkout/TicketCards";
import type { PublicType } from "../../../lib/tickets/schemas";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const soldOut = (overrides: Partial<PublicType> = {}): PublicType => ({ ...typeA, status: "sold_out", left: 0, maxPerOrder: 4, ...overrides });
const cards = (types: PublicType[], salesOpen = true) =>
  render(<TicketCards types={types} config={{ ...config, salesOpen }} cart={{}} flagged={{}} onQuantity={() => undefined} />);

afterEach(() => vi.unstubAllGlobals());

describe("the waitlist button on a sold-out card", () => {
  it("shows 'Join the waitlist' only for a sold-out type with the waitlist on", () => {
    cards([soldOut({ waitlistEnabled: true })]);
    expect(screen.getByRole("button", { name: /Join the waitlist/ })).toBeInTheDocument();
    expect(screen.getByText(/Sold out/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add one/ })).not.toBeInTheDocument();
  });

  it("a sold-out type without a waitlist keeps the plain disabled 'Sold out' (no button at all)", () => {
    for (const waitlistEnabled of [false, undefined]) {
      const { unmount } = cards([soldOut(waitlistEnabled === undefined ? {} : { waitlistEnabled })]);
      expect(screen.getByText(/Sold out/)).toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      unmount();
    }
  });

  it("an on-sale type, a paused type or closed sales never offer the waitlist, whatever the flag says", () => {
    cards([soldOut({ id: "a", status: "on_sale", left: 5, waitlistEnabled: true }), soldOut({ id: "b", status: "paused", waitlistEnabled: true }), soldOut({ id: "c", status: "not_yet", waitlistEnabled: true })]);
    expect(screen.queryByRole("button", { name: /Join the waitlist/ })).not.toBeInTheDocument();
  });

  it("closed sales do not offer it either", () => {
    cards([soldOut({ waitlistEnabled: true })], false);
    expect(screen.queryByRole("button", { name: /Join the waitlist/ })).not.toBeInTheDocument();
  });
});

describe("the join form", () => {
  function open(overrides: Partial<PublicType> = {}) {
    const view = cards([soldOut({ waitlistEnabled: true, ...overrides })]);
    fireEvent.click(screen.getByRole("button", { name: /Join the waitlist/ }));
    return view;
  }
  const fill = ({ name = "Ada Lovelace", email = "ada@example.com", quantity = "2" } = {}) => {
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: name } });
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: email } });
    fireEvent.change(screen.getByLabelText(/Number of tickets/), { target: { value: quantity } });
  };
  const submit = () => fireEvent.click(screen.getByRole("button", { name: "Join the waitlist" }));

  it("opens an accessible dialog with the three labelled fields, the name focused", async () => {
    const { baseElement } = open();
    const dialog = screen.getByRole("dialog", { name: "Join the waitlist for Full pass" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByLabelText("Your name")).toHaveFocus();
    expect(screen.getByLabelText("Email address")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Number of tickets (up to 4)")).toHaveAttribute("max", "4");
    const violations = await axeViolations({ container: baseElement });
    expect(describeViolations(violations)).toEqual([]);
  });

  it("closes with Cancel or Escape", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Join the waitlist/ }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("validates before posting: required name, a real email, a whole quantity from 1 to the per-order maximum", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    open();

    submit();
    expect(await screen.findByText("Enter your name.")).toBeInTheDocument();
    expect(screen.getByText("Enter your email address.")).toBeInTheDocument();

    fill({ email: "not-an-email" });
    submit();
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toHaveAttribute("aria-invalid", "true");

    for (const quantity of ["0", "5", "1.5", ""]) {
      fill({ quantity });
      submit();
      expect(await screen.findByText("Enter a whole number of tickets within the limit.")).toBeInTheDocument();
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the type, name, email and quantity to our own handler and shows the neutral success text", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { joined: true } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    open();
    fill({ quantity: "4" });
    submit();

    expect(await screen.findByText("You're on the list. If a place frees up, we'll email you.")).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/tickets/waitlist");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ ticketTypeId: typeA.id, name: "Ada Lovelace", email: "ada@example.com", quantity: 4 });
    // The answer never says whether the address was already listed, and never repeats it.
    expect(screen.queryByText(/already/i)).not.toBeInTheDocument();
    expect(screen.queryByText("ada@example.com")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the translated message of an opaque error code and keeps the form", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, error: "raw upstream text", code: "waitlistClosed" }), { status: 409 })));
    open();
    fill();
    submit();
    expect(await screen.findByText("The waitlist for these tickets is closed.")).toBeInTheDocument();
    expect(screen.queryByText("raw upstream text")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Your name")).toHaveValue("Ada Lovelace");
    expect(screen.queryByText(/on the list/)).not.toBeInTheDocument();
  });

  it("asking for more places than the type has shows the translated waitlistTooMany message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, error: "raw upstream text", code: "waitlistTooMany" }), { status: 400 })));
    open();
    fill();
    submit();
    expect(await screen.findByText("This ticket type doesn't have that many places. Ask for fewer tickets.")).toBeInTheDocument();
    expect(screen.queryByText("raw upstream text")).not.toBeInTheDocument();
  });

  it("a network failure reads as the service being unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    open();
    fill();
    submit();
    await waitFor(() => expect(screen.getByText("We could not reach the ticket service. Please try again in a moment.")).toBeInTheDocument());
  });
});

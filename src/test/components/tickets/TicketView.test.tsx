import { describe, expect, it, vi } from "vitest";
import { axeViolations, describeViolations } from "../../helpers/axe";
import { resolveServerElement } from "../../helpers/resolve-server";
import { fireEvent, render, screen } from "../../test-utils";
import type { MyTicket } from "../../../lib/tickets/schemas";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const { TicketView } = await import("../../../components/tickets/TicketView");

const TICKET: MyTicket = {
  code: "DEAI-T-4F2A-91",
  status: "valid",
  holder: { name: "Ada Lovelace", email: "ada@example.com" },
  ticketType: { name: "Full pass", scope: { mode: "all" } },
  source: { kind: "event", name: "DeAI Summit", startDate: "2026-11-25", endDate: "2026-11-25", timeZone: "Europe/Malta", startsAt: "2026-11-25T08:00:00.000Z" },
  qrImageUrl: "https://api.example.com/api/tickets/qr/abc.sig.png",
  seller: { name: "Acme Events Ltd", vatNumber: "MT12345678", replyTo: "hello@acme.example" },
};

function withoutQr(ticket: MyTicket): MyTicket {
  const copy = { ...ticket };
  delete copy.qrImageUrl;
  return copy;
}

async function renderTicket(ticket: MyTicket, token?: string, orderHref?: string) {
  const ui = await resolveServerElement(<TicketView ticket={ticket} calendarHref="/tickets/t/tok/calendar.ics" {...(token ? { token } : {})} {...(orderHref ? { orderHref } : {})} />);
  return render(<>{ui}</>);
}

const PROFILE: NonNullable<MyTicket["profile"]> = {
  values: { company: "Quantia", jobTitle: "", diet: [], dietNote: "", street: "", postcode: "", city: "", country: "", phone: "", linkedin: "", website: "", telegram: "", x: "", instagram: "" },
  required: ["name", "company", "jobTitle", "diet"],
  missing: ["jobTitle", "diet"],
  deadline: "2026-11-18T00:00:00.000Z",
  frozen: false,
  saved: false,
};

describe("TicketView", () => {
  it("shows the ticket card: type as the heading, holder, event, date in the event's time zone, access, code", async () => {
    await renderTicket(TICKET);
    expect(screen.getByRole("heading", { level: 1, name: "Full pass" })).toBeInTheDocument();
    expect(screen.getByText("Ticket · 1 day")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByText("DeAI Summit")).toBeInTheDocument();
    expect(screen.getByText(/Wednesday, November 25, 2026/)).toHaveTextContent("9:00");
    expect(screen.getByText("Europe/Malta")).toBeInTheDocument();
    expect(screen.getByText("All days and sessions")).toBeInTheDocument();
    expect(screen.getByText("DEAI-T-4F2A-91")).toBeInTheDocument();
  });

  it("shows the venue under Where (name, then city), and no Where when the venue is null or absent", async () => {
    const withVenue: MyTicket = { ...TICKET, source: { ...TICKET.source, venue: { name: "Hilton Malta", city: "St Julian's", label: "Hilton Malta, St Julian's" } } };
    const first = await renderTicket(withVenue);
    expect(screen.getByText("Where")).toBeInTheDocument();
    expect(screen.getByText("Hilton Malta")).toBeInTheDocument();
    expect(screen.getByText("St Julian's")).toBeInTheDocument();
    first.unmount();
    await renderTicket({ ...TICKET, source: { ...TICKET.source, venue: null } });
    expect(screen.queryByText("Where")).not.toBeInTheDocument();
  });

  it("renders the QR as a plain <img> that never sends the page URL as referrer, and an add-to-calendar link", async () => {
    await renderTicket(TICKET);
    const qr = screen.getByRole("img", { name: "QR code for ticket DEAI-T-4F2A-91" });
    expect(qr).toHaveAttribute("src", TICKET.qrImageUrl);
    expect(qr).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(screen.getByRole("link", { name: "Add to calendar" })).toHaveAttribute("href", "/tickets/t/tok/calendar.ics");
  });

  it("never shows price, order or buyer data (and the footer shows the seller)", async () => {
    const { container } = await renderTicket(TICKET);
    expect(container.textContent).not.toMatch(/€|\$|order|buyer|price|invoice/i);
    expect(screen.getByText("Sold by Acme Events Ltd")).toBeInTheDocument();
    expect(screen.getByText("VAT no. MT12345678")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "hello@acme.example" })).toHaveAttribute("href", "mailto:hello@acme.example");
  });

  it("links back to the order only when ep-api says the holder bought it", async () => {
    const own = await renderTicket(TICKET, undefined, "/tickets/order/buyer-token-xxxxxxxxxxxxxxxx");
    expect(screen.getByRole("link", { name: "Back to your order" })).toHaveAttribute("href", "/tickets/order/buyer-token-xxxxxxxxxxxxxxxx");
    own.unmount();
    await renderTicket(TICKET);
    expect(screen.queryByRole("link", { name: "Back to your order" })).not.toBeInTheDocument();
  });

  it("offers Save as PDF next to Add to calendar, which opens the print dialog", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    await renderTicket(TICKET);
    fireEvent.click(screen.getByRole("button", { name: "Save as PDF" }));
    expect(print).toHaveBeenCalledTimes(1);
    print.mockRestore();
  });

  it("shows the test badge beside the back link only for a test ticket", async () => {
    const plain = await renderTicket(TICKET);
    expect(screen.queryByText("Test ticket — not a real purchase")).not.toBeInTheDocument();
    plain.unmount();
    await renderTicket({ ...TICKET, isTest: true });
    expect(screen.getByText("Test ticket — not a real purchase")).toBeInTheDocument();
  });

  it("a refunded ticket shows the refunded banner and no QR and no calendar link", async () => {
    await renderTicket({ ...withoutQr(TICKET), status: "refunded" });
    expect(screen.getByRole("status")).toHaveTextContent("This ticket was refunded and can no longer be used.");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Add to calendar" })).not.toBeInTheDocument();
    expect(screen.getByText("Refunded")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save as PDF" })).not.toBeInTheDocument();
  });

  it("a void ticket the organiser blocked says blocked; one the holder cancelled says cancelled", async () => {
    const blocked = await renderTicket({ ...withoutQr(TICKET), status: "void", blocked: true });
    expect(screen.getByRole("status")).toHaveTextContent("This ticket was blocked by the organiser and can no longer be used.");
    blocked.unmount();
    await renderTicket({ ...withoutQr(TICKET), status: "void", blocked: false });
    expect(screen.getByRole("status")).toHaveTextContent("This ticket was cancelled and can no longer be used.");
  });

  it("void, checked-in and an unknown status each get a clear banner", async () => {
    for (const [status, text] of [
      ["void", "This ticket was cancelled and can no longer be used."],
      ["checked_in", "This ticket has already been scanned at the entrance."],
      ["brand_new_state", "This ticket cannot be used."],
    ] as const) {
      const { unmount } = await renderTicket({ ...withoutQr(TICKET), status });
      expect(screen.getByRole("status")).toHaveTextContent(text);
      unmount();
    }
  });

  it("a passed-on ticket is one card saying who has it now (with and without a name), without the ticket", async () => {
    const named = await renderTicket({ ...withoutQr(TICKET), status: "passed_on", passedOnTo: { name: "Grace" } });
    expect(screen.getByRole("heading", { level: 1, name: "This ticket now belongs to Grace" })).toBeInTheDocument();
    expect(screen.getByText(/Grace has received a new ticket by email/)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "hello@acme.example" }).length).toBeGreaterThan(0);
    expect(screen.queryByText("DEAI-T-4F2A-91")).not.toBeInTheDocument();
    named.unmount();
    await renderTicket({ ...withoutQr(TICKET), status: "passed_on" });
    expect(screen.getByRole("heading", { level: 1, name: "This ticket was passed on" })).toBeInTheDocument();
  });

  it("describes day and session access as ep-api gives it", async () => {
    const days = await renderTicket({ ...TICKET, ticketType: { name: "Day pass", scope: { mode: "days", days: ["2026-11-25", "2026-11-26"] } } });
    expect(screen.getByText("Days: November 25, 2026, November 26, 2026")).toBeInTheDocument();
    expect(screen.getByText("Ticket · 2 days")).toBeInTheDocument();
    days.unmount();
    await renderTicket({ ...TICKET, ticketType: { name: "Workshop", scope: { mode: "sessions", sessions: ["a", "b", "c"] } } });
    expect(screen.getByText("3 sessions")).toBeInTheDocument();
    expect(screen.getByText("Selected sessions")).toBeInTheDocument();
  });

  it("lists what the ticket includes from the type description, one line per item; a long paragraph stays text", async () => {
    const list = await renderTicket({ ...TICKET, ticketType: { ...TICKET.ticketType, description: "- Keynotes\n- VIP lounge\n\n• After party" } });
    expect(screen.getByText("Full pass ticket includes")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").map((item) => item.textContent?.replace("✓", "").trim())).toEqual(["Keynotes", "VIP lounge", "After party"]);
    list.unmount();
    const long = "Access to every talk, workshop and the expo floor on both days of the summit, with lunch and coffee included.";
    await renderTicket({ ...TICKET, ticketType: { ...TICKET.ticketType, description: long } });
    expect(screen.getByText(long).tagName).toBe("P");
  });

  it("has no axe violations (valid and refunded)", async () => {
    const valid = await renderTicket(TICKET);
    let violations = await axeViolations({ container: valid.container });
    expect(describeViolations(violations)).toEqual([]);
    valid.unmount();
    const refunded = await renderTicket({ ...withoutQr(TICKET), status: "refunded" });
    violations = await axeViolations({ container: refunded.container });
    expect(describeViolations(violations)).toEqual([]);
  });

  it("marks the ticket card for printing (Save as PDF prints it alone) and hides the buttons in print", async () => {
    const { container } = await renderTicket(TICKET);
    const card = container.querySelector("[data-ticket-card]");
    expect(card).not.toBeNull();
    expect(card?.contains(screen.getByRole("img", { name: "QR code for ticket DEAI-T-4F2A-91" }))).toBe(true);
    expect(screen.getByRole("link", { name: "Add to calendar" }).parentElement?.className).toContain("print:hidden");
    expect(container.querySelector("[data-ticket-print]")).not.toBeNull();
  });

  describe("Your details (DASH-205 T5)", () => {
    const TOKEN = "h".repeat(43);

    it("shows the banner with what is missing and the deadline, the details form and the badge line", async () => {
      await renderTicket({ ...TICKET, profile: { ...PROFILE, values: { ...PROFILE.values, jobTitle: "CTO" }, missing: ["diet"] } }, TOKEN);
      expect(screen.getByText("1 detail missing for your badge")).toBeInTheDocument();
      expect(screen.getByText(/Add your dietary requirements before Nov 18, 2026/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Complete my details" })).toBeInTheDocument();
      expect(screen.getByText("CTO · Quantia")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Your details" })).toBeInTheDocument();
    });

    it("no banner when nothing is missing or after the cut-off; no form without a token or a profile", async () => {
      const done = await renderTicket({ ...TICKET, profile: { ...PROFILE, missing: [] } }, TOKEN);
      expect(screen.queryByRole("button", { name: "Complete my details" })).not.toBeInTheDocument();
      done.unmount();
      const frozen = await renderTicket({ ...TICKET, profile: { ...PROFILE, frozen: true } }, TOKEN);
      expect(screen.queryByRole("button", { name: "Complete my details" })).not.toBeInTheDocument();
      frozen.unmount();
      const noToken = await renderTicket({ ...TICKET, profile: PROFILE });
      expect(screen.queryByRole("heading", { name: "Your details" })).not.toBeInTheDocument();
      noToken.unmount();
      await renderTicket(TICKET, TOKEN);
      expect(screen.queryByRole("heading", { name: "Your details" })).not.toBeInTheDocument();
    });

    it("no details form on a ticket that no longer admits anyone", async () => {
      await renderTicket({ ...withoutQr(TICKET), status: "refunded", profile: PROFILE }, TOKEN);
      expect(screen.queryByRole("heading", { name: "Your details" })).not.toBeInTheDocument();
    });

    it("has no axe violations with the banner and the form", async () => {
      const { container } = await renderTicket({ ...TICKET, canCorrectName: true, canPassOn: true, profile: PROFILE }, TOKEN);
      expect(describeViolations(await axeViolations({ container }))).toEqual([]);
    });
  });

  describe("holder self-service (DASH-205 F1)", () => {
    const TOKEN = "h".repeat(43);
    const OPEN: MyTicket = { ...TICKET, canCorrectName: true, canPassOn: true, changesCloseAt: "2026-11-18T08:00:00.000Z" };

    it("without a details form: both cards and when changes close in the event's time zone", async () => {
      await renderTicket(OPEN, TOKEN);
      expect(screen.getByRole("heading", { name: "Correct my name" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Pass this ticket on" })).toBeInTheDocument();
      expect(screen.getByText(/You can change this ticket until Wednesday, November 18, 2026 at 9:00/)).toHaveTextContent("(Europe/Malta)");
    });

    it("with a details form the name is edited there: no separate name card", async () => {
      await renderTicket({ ...OPEN, profile: PROFILE }, TOKEN);
      expect(screen.queryByRole("heading", { name: "Correct my name" })).not.toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: /Full name/ })).not.toBeDisabled();
      expect(screen.getByRole("heading", { name: "Pass this ticket on" })).toBeInTheDocument();
    });

    it("shows only the allowed card", async () => {
      const { unmount } = await renderTicket({ ...OPEN, canPassOn: false }, TOKEN);
      expect(screen.getByRole("heading", { name: "Correct my name" })).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Pass this ticket on" })).not.toBeInTheDocument();
      unmount();
      await renderTicket({ ...OPEN, canCorrectName: false }, TOKEN);
      expect(screen.queryByRole("heading", { name: "Correct my name" })).not.toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Pass this ticket on" })).toBeInTheDocument();
    });

    it("shows no card and no close time when neither is allowed, when ep-api sent no flags, or without a token", async () => {
      const closed = await renderTicket({ ...OPEN, canCorrectName: false, canPassOn: false }, TOKEN);
      expect(screen.queryByRole("heading", { name: /Correct my name|Pass this ticket on/ })).not.toBeInTheDocument();
      expect(screen.queryByText(/You can change this ticket until/)).not.toBeInTheDocument();
      closed.unmount();
      const old = await renderTicket(TICKET, TOKEN);
      expect(screen.queryByRole("heading", { name: /Correct my name|Pass this ticket on/ })).not.toBeInTheDocument();
      old.unmount();
      await renderTicket(OPEN);
      expect(screen.queryByRole("heading", { name: /Correct my name|Pass this ticket on/ })).not.toBeInTheDocument();
    });

    it("a ticket that is no longer valid never offers a change, even if the flags say so", async () => {
      await renderTicket({ ...withoutQr(OPEN), status: "void" }, TOKEN);
      expect(screen.queryByRole("heading", { name: /Correct my name|Pass this ticket on/ })).not.toBeInTheDocument();
    });

    it("hides the cards when printing", async () => {
      await renderTicket(OPEN, TOKEN);
      expect(screen.getByRole("heading", { name: "Correct my name" }).closest("div.print\\:hidden")).not.toBeNull();
    });
  });
});

describe("TicketView — test badge and cancel (DASH-236)", () => {
  it("shows a 'Test ticket' badge only when ep-api says the ticket is a test ticket", async () => {
    const first = await renderTicket({ ...TICKET, isTest: true });
    expect(screen.getByText("Test ticket — not a real purchase")).toBeInTheDocument();
    first.unmount();
    await renderTicket(TICKET);
    expect(screen.queryByText(/Test ticket/)).not.toBeInTheDocument();
  });

  it("offers 'Cancel my ticket' only for a valid ticket that ep-api says can be cancelled, with the holder token", async () => {
    const first = await renderTicket({ ...TICKET, canCancel: true }, "h".repeat(43));
    expect(screen.getByRole("button", { name: "Cancel ticket" })).toBeInTheDocument();
    first.unmount();
    const second = await renderTicket({ ...TICKET, canCancel: false }, "h".repeat(43));
    expect(screen.queryByRole("button", { name: "Cancel ticket" })).not.toBeInTheDocument();
    second.unmount();
    const third = await renderTicket({ ...TICKET, canCancel: true });
    expect(screen.queryByRole("button", { name: "Cancel ticket" })).not.toBeInTheDocument();
    third.unmount();
    await renderTicket({ ...withoutQr(TICKET), status: "void", canCancel: true }, "h".repeat(43));
    expect(screen.queryByRole("button", { name: "Cancel ticket" })).not.toBeInTheDocument();
  });
});

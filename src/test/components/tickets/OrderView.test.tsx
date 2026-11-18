import { describe, expect, it, vi } from "vitest";
import { axeViolations, describeViolations } from "../../helpers/axe";
import { resolveServerElement } from "../../helpers/resolve-server";
import { fireEvent, render, screen, within } from "../../test-utils";
import type { MyOrder, MyTicket } from "../../../lib/tickets/schemas";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const { OrderView } = await import("../../../components/tickets/OrderView");

const TOKEN = "b".repeat(43);
const DOC_ID = "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11";
const CREDIT_ID = "6d2f8b2f-3a5b-4b64-8b4f-1f7a7b5d2c22";
const ORDER: MyOrder = {
  orderNo: 42,
  status: "paid",
  paidAt: "2026-11-12T10:00:00.000Z",
  currency: "EUR",
  lines: [{ name: "Full pass", quantity: 2, unitCents: 10000, discountCents: 500, feeCents: 150, vatRate: 18, grossCents: 19300 }],
  totals: { totalCents: 19300, vatCents: 2944, feeCents: 300 },
  holders: [
    { name: "Ada Lovelace", email: "ada@example.com", status: "valid", ticketCode: "T-1" },
    { name: null, email: null, status: "refunded", ticketCode: "T-2" },
  ],
  documents: [
    { id: DOC_ID, kind: "invoice", number: "INV-2026-0001", issueDate: "2026-11-12", grossCents: 19300 },
    { id: CREDIT_ID, kind: "credit_note", number: "CN-2026-0001", issueDate: "2026-11-13", grossCents: -9650 },
  ],
  seller: { name: "Acme Events Ltd", vatNumber: "MT12345678", replyTo: null },
};

async function renderOrder(order: MyOrder, ticketHrefs: Record<string, string> = {}, eventSource: MyTicket["source"] | null = null) {
  const ui = await resolveServerElement(<OrderView order={order} token={TOKEN} ticketHrefs={ticketHrefs} eventSource={eventSource} />);
  return render(<>{ui}</>);
}

describe("OrderView holder answers", () => {
  const withAnswers = (answers: MyOrder["holders"][number]["answers"]): MyOrder => ({ ...ORDER, holders: [{ ...(ORDER.holders[0] as MyOrder["holders"][number]), answers }, ORDER.holders[1] as MyOrder["holders"][number]] });

  it("shows each holder's checkout answers read-only, in the visitor's language, under that holder only", async () => {
    await renderOrder(withAnswers({ company: "Quantia", jobTitle: "CTO", dietary: "gluten_free", tshirt: "L" }));
    const holders = screen.getByRole("heading", { name: "Ticket holders" }).closest("section") as HTMLElement;
    const [ada, second] = within(holders).getAllByRole("listitem");
    const rows = within(ada as HTMLElement).getAllByRole("term").map((term) => [term.textContent, term.nextElementSibling?.textContent]);
    expect(rows).toEqual([["Company", "Quantia"], ["Job title", "CTO"], ["Dietary needs", "Gluten free"], ["T-shirt size", "L"]]);
    expect(within(second as HTMLElement).queryByRole("term")).toBeNull();
    expect(within(ada as HTMLElement).queryByRole("textbox")).toBeNull();
  });

  it("shows the 'other' dietary text with its label, and an unknown value as it is", async () => {
    await renderOrder(withAnswers({ dietary: "other", dietaryOther: "no nuts", tshirt: "XXXL" }));
    expect(screen.getByText("Other: no nuts")).toBeInTheDocument();
    expect(screen.getByText("XXXL")).toBeInTheDocument();
    await renderOrder(withAnswers({ dietary: "future_value" }));
    expect(screen.getByText("future_value")).toBeInTheDocument();
  });

  it("shows nothing for an empty or missing answers object, and escapes what a buyer typed (it is text, never markup)", async () => {
    await renderOrder(withAnswers({}));
    const holders = screen.getByRole("heading", { name: "Ticket holders" }).closest("section") as HTMLElement;
    expect(holders.querySelector("dl")).toBeNull();
    await renderOrder(withAnswers({ company: "<img src=x onerror=alert(1)>" }));
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });
});

describe("OrderView", () => {
  it("shows the order number, status, what was bought, and the paid amount and date", async () => {
    await renderOrder(ORDER);
    expect(screen.getByRole("heading", { level: 1, name: "Your order: 2 × Full pass" })).toBeInTheDocument();
    expect(screen.getByText("Order #42 · Paid")).toBeInTheDocument();
    expect(screen.getByText("Paid €193 on November 12, 2026")).toBeInTheDocument();
  });

  it("with the event known, the subtitle reads like the prototype: event · dates · venue · paid amount on date", async () => {
    const source: MyTicket["source"] = { kind: "schedule", id: "s1", name: "DeAI Summit 2026", startDate: "2026-11-25", endDate: "2026-11-26", timeZone: "Europe/Malta", startsAt: null, venue: { name: "MFCC Malta", city: "Ta' Qali", label: null } } as MyTicket["source"];
    await renderOrder(ORDER, {}, source);
    expect(screen.getByText(/^DeAI Summit 2026 · November 25\s?–\s?26, 2026 · MFCC Malta · paid €193 on November 12, 2026$/)).toBeInTheDocument();
  });

  it("an event without dates or venue keeps only what it has", async () => {
    const source = { kind: "event", id: "e1", name: "DeAI Summit 2026", startDate: null, endDate: null, timeZone: "Europe/Malta", startsAt: null, venue: null } as MyTicket["source"];
    await renderOrder(ORDER, {}, source);
    expect(screen.getByText("DeAI Summit 2026 · paid €193 on November 12, 2026")).toBeInTheDocument();
  });

  it("several lines make a combined title", async () => {
    await renderOrder({ ...ORDER, lines: [...ORDER.lines, { name: "Dinner", quantity: 1, unitCents: 5000, discountCents: 0, feeCents: 0, vatRate: 18, grossCents: 5000 }] });
    expect(screen.getByRole("heading", { level: 1, name: "Your order: 2 × Full pass · 1 × Dinner" })).toBeInTheDocument();
  });

  it("lists each line with quantity x price, VAT rate, per-ticket discount and booking fee, and the line total", async () => {
    await renderOrder(ORDER);
    const lines = screen.getByRole("heading", { name: "Order summary" }).closest("section") as HTMLElement;
    expect(within(lines).getByText("Full pass")).toBeInTheDocument();
    expect(within(lines).getByText(/2 × €100 /)).toBeInTheDocument();
    expect(within(lines).getByText(/incl\. 18% VAT/)).toBeInTheDocument();
    expect(within(lines).getByText(/Discount: −€5 per ticket/)).toBeInTheDocument();
    expect(within(lines).getByText(/Booking fee: €1.50 per ticket/)).toBeInTheDocument();
    expect(within(lines).getAllByText("€193")).toHaveLength(2);
  });

  it("shows the totals from ep-api (booking fees, VAT, total)", async () => {
    await renderOrder(ORDER);
    const summary = screen.getByRole("heading", { name: "Order summary" }).closest("section") as HTMLElement;
    const totals = summary.querySelector("dl") as HTMLElement;
    expect(within(totals).getByText("€3")).toBeInTheDocument();
    expect(within(totals).getByText("€29.44")).toBeInTheDocument();
    expect(within(totals).getByText("€193")).toBeInTheDocument();
  });

  it("lists holders with a pill per ticket and the named count", async () => {
    await renderOrder(ORDER);
    const holders = screen.getByRole("heading", { name: "Ticket holders" }).closest("section") as HTMLElement;
    expect(within(holders).getByText("1 of 2 named")).toBeInTheDocument();
    expect(within(holders).getByText("Ada Lovelace")).toBeInTheDocument();
    expect(within(holders).getByText("Ticket sent")).toBeInTheDocument();
    expect(within(holders).getByText("Not named yet")).toBeInTheDocument();
    expect(within(holders).getByText("Refunded")).toBeInTheDocument();
  });

  it("an unnamed valid ticket waits for a name; the buyer's own ticket says (you) and links to its page", async () => {
    await renderOrder(
      {
        ...ORDER,
        holders: [
          { name: "Ada Lovelace", email: "ada@example.com", status: "valid", ticketCode: "T-1", isBuyer: true, ticketToken: "h".repeat(43) },
          { name: null, email: null, status: "valid", ticketCode: "T-2" },
        ],
      },
      { "T-1": "/tickets/t/hhh" },
    );
    expect(screen.getByText("(you)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open my ticket" })).toHaveAttribute("href", "/tickets/t/hhh");
    expect(screen.getByText("Waiting for a name")).toBeInTheDocument();
    expect(screen.getByText(/Add a name and email so we can send this ticket/)).toBeInTheDocument();
  });

  it("offers 'Ask us' about wrong invoice details only with an invoice and a contact address", async () => {
    const none = await renderOrder(ORDER);
    expect(screen.queryByRole("link", { name: "Ask us" })).not.toBeInTheDocument();
    none.unmount();
    await renderOrder({ ...ORDER, seller: { ...ORDER.seller, replyTo: "help@acme.example" } });
    expect(screen.getByRole("link", { name: "Ask us" })).toHaveAttribute("href", "mailto:help@acme.example");
  });

  it("links each document to our own download route handler (never to ep-api), with an accessible name", async () => {
    await renderOrder(ORDER);
    const invoice = screen.getByRole("link", { name: "Download PDF for Invoice INV-2026-0001" });
    expect(invoice).toHaveAttribute("href", `/tickets/order/${TOKEN}/documents/${DOC_ID}`);
    expect(invoice).toHaveAttribute("download");
    expect(screen.getByRole("link", { name: "Download PDF for Credit note CN-2026-0001" })).toHaveAttribute("href", `/tickets/order/${TOKEN}/documents/${CREDIT_ID}`);
  });

  it("says so when there are no documents yet", async () => {
    await renderOrder({ ...ORDER, documents: [] });
    expect(screen.getByText("No documents yet.")).toBeInTheDocument();
  });

  it("shows the test-order badge only when ep-api flags the order as a test", async () => {
    const plain = await renderOrder(ORDER);
    expect(screen.queryByText("Test order — no real payment")).not.toBeInTheDocument();
    plain.unmount();
    await renderOrder({ ...ORDER, isTest: true });
    expect(screen.getByText("Test order — no real payment")).toBeInTheDocument();
  });

  it("shows the seller footer and a refunded order status", async () => {
    await renderOrder({ ...ORDER, status: "refunded" });
    expect(screen.getByText("Order #42 · Refunded")).toBeInTheDocument();
    expect(screen.getByText("Sold by Acme Events Ltd")).toBeInTheDocument();
  });

  it("uses stacked cards, not a table (no horizontal scroll at 375 px)", async () => {
    const { container } = await renderOrder(ORDER);
    expect(container.querySelector("table")).toBeNull();
  });

  it("has no axe violations", async () => {
    const { container } = await renderOrder(ORDER);
    const violations = await axeViolations({ container });
    expect(describeViolations(violations)).toEqual([]);
  });

  describe("holder edit and refund request (DASH-205 F1)", () => {
    const T1 = "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11";
    const T2 = "6d2f8b2f-3a5b-4b64-8b4f-1f7a7b5d2c22";
    const WITH: MyOrder = {
      ...ORDER,
      holders: [
        { id: T1, name: "Ada Lovelace", email: "ada@example.com", status: "valid", ticketCode: "T-1", canEdit: true, canEditName: true, canEditEmail: true },
        { id: T2, name: "Grace Hopper", email: null, status: "valid", ticketCode: "T-2", canEdit: false, canEditName: false, canEditEmail: false },
      ],
      changesCloseAt: "2026-11-18T08:00:00.000Z",
      timeZone: "Europe/Malta",
      canRequestRefund: true,
      refundRequest: null,
    };

    it("offers Edit only on holders ep-api marks editable, and says when changes close", async () => {
      await renderOrder(WITH);
      expect(screen.getByRole("button", { name: "Edit Ada Lovelace" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Edit Grace Hopper" })).not.toBeInTheDocument();
      expect(screen.getByText(/Holder changes close on/)).toBeInTheDocument();
    });

    // Regression (live test 2026-11-12): dateStyle + timeZoneName made Intl throw and the raw Date string was printed
    // ("Wed Nov 18 2026 22:30:00 GMT+0530 (India Standard Time)"). It is now the event's local time with its zone.
    it("shows the cut-off in the event's time zone, readably", async () => {
      await renderOrder(WITH);
      const line = screen.getByText(/Holder changes close on/).textContent ?? "";
      expect(line).toContain("(Europe/Malta)");
      expect(line).toMatch(/9:00/);
      expect(line).not.toMatch(/GMT[+-]/);
    });

    it("never offers Edit on a refunded holder, on an older ep-api without ids, or when nothing is editable", async () => {
      await renderOrder({ ...WITH, holders: [{ id: T1, name: "Ada", email: null, status: "refunded", ticketCode: "T-1", canEdit: true }, { name: "Old", email: null, status: "valid", ticketCode: "T-2", canEdit: true }] });
      expect(screen.queryByRole("button", { name: /^Edit/ })).not.toBeInTheDocument();
    });

    it("shows the refund request form for the valid tickets when a request may be sent", async () => {
      await renderOrder(WITH);
      const section = screen.getByRole("heading", { name: "Refunds" }).closest("section") as HTMLElement;
      fireEvent.click(within(section).getByRole("button", { name: "Ask for a refund" }));
      expect(within(section).getByRole("heading", { name: "Request a refund" })).toBeInTheDocument();
      expect(within(section).getAllByRole("checkbox")).toHaveLength(2);
    });

    it("shows an open request's status instead of the form", async () => {
      await renderOrder({ ...WITH, canRequestRefund: false, refundRequest: { status: "open", createdAt: "2026-11-13T10:00:00.000Z", ticketCount: 2, reason: "cant_attend", reply: null } });
      const section = screen.getByRole("heading", { name: "Refunds" }).closest("section") as HTMLElement;
      expect(within(section).getByText("Refund requested on November 13, 2026: waiting for the organiser's answer.")).toBeInTheDocument();
      expect(within(section).getByText("2 tickets")).toBeInTheDocument();
      expect(within(section).queryByRole("checkbox")).not.toBeInTheDocument();
    });

    it("shows a declined request with the organiser's message, and lets the buyer ask again", async () => {
      await renderOrder({ ...WITH, canRequestRefund: true, refundRequest: { status: "declined", createdAt: "2026-11-13T10:00:00.000Z", ticketCount: 1, reason: "other", reply: "The sale is final." } });
      const section = screen.getByRole("heading", { name: "Refunds" }).closest("section") as HTMLElement;
      expect(within(section).getByText("The refund request of November 13, 2026 was declined.")).toBeInTheDocument();
      expect(within(section).getByText("Message from the organiser: The sale is final.")).toBeInTheDocument();
      expect(within(section).getByRole("button", { name: "Ask for a refund" })).toBeInTheDocument();
    });

    it("has no refunds section when there is nothing to request or show, and for an approved request shows only the status", async () => {
      const none = await renderOrder({ ...WITH, canRequestRefund: false, refundRequest: null });
      expect(screen.queryByRole("heading", { name: "Refunds" })).not.toBeInTheDocument();
      none.unmount();
      await renderOrder({ ...WITH, canRequestRefund: false, refundRequest: { status: "approved", createdAt: "2026-11-13T10:00:00.000Z", ticketCount: 1, reason: "other", reply: null } });
      expect(screen.getByText("The refund request of November 13, 2026 was approved.")).toBeInTheDocument();
    });

    it("has no axe violations with the editors and the form", async () => {
      const { container } = await renderOrder(WITH);
      expect(describeViolations(await axeViolations({ container }))).toEqual([]);
    });
  });
});

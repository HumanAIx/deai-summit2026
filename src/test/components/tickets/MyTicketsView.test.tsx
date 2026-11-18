import { describe, expect, it } from "vitest";
import { axeViolations, describeViolations } from "../../helpers/axe";
import { resolveServerElement } from "../../helpers/resolve-server";
import { render, screen } from "../../test-utils";
import type { MyOverview } from "../../../lib/tickets/schemas";


const { MyTicketsView } = await import("../../../components/tickets/MyTicketsView");

const T1 = "t".repeat(43);
const O1 = "o".repeat(43);
const OVERVIEW: MyOverview = {
  email: "priya@example.com",
  expiresAt: "2026-11-24T10:00:00.000Z",
  tickets: [{ token: T1, code: "DEAI-T-1", holderName: "Priya Nair", typeName: "VIP Pass", source: { name: "DeAI Summit", startDate: "2026-11-25", endDate: "2026-11-26" } }],
  orders: [{ token: O1, orderNo: 12, status: "paid", paidAt: "2026-11-01T10:00:00.000Z", totalCents: 56700, currency: "EUR", lines: [{ name: "VIP Pass", quantity: 3 }], source: { name: "DeAI Summit", startDate: null, endDate: null } }],
};

async function renderView(overview: MyOverview) {
  const ui = await resolveServerElement(<MyTicketsView overview={overview} ticketHrefs={{ [T1]: "/tickets/t/x" }} orderHrefs={{ [O1]: "/tickets/order/y" }} lostLinkHref="/tickets/lost" />);
  return render(<>{ui}</>);
}

describe("MyTicketsView", () => {
  it("names the address and the link's expiry, lists the tickets held and the orders bought, each with its own link", async () => {
    await renderView(OVERVIEW);
    expect(screen.getByRole("heading", { level: 1, name: "Your tickets and orders" })).toBeInTheDocument();
    expect(screen.getByText(/For priya@example.com\. This link works until/)).toBeInTheDocument();
    expect(screen.getByText("VIP Pass")).toBeInTheDocument();
    expect(screen.getByText(/DeAI Summit · November 25 – 26, 2026|DeAI Summit · November 25–26, 2026/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open ticket DEAI-T-1" })).toHaveAttribute("href", "/tickets/t/x");
    expect(screen.getByText("Order #12 · Paid")).toBeInTheDocument();
    expect(screen.getByText("3 × VIP Pass")).toBeInTheDocument();
    expect(screen.getByText(/Paid €567 on November 1, 2026/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open order 12" })).toHaveAttribute("href", "/tickets/order/y");
  });

  it("shows the link's expiry in UTC with the zone named, whatever the server's zone", async () => {
    await renderView({ ...OVERVIEW, expiresAt: "2026-11-24T23:30:00.000Z" });
    expect(screen.getByText(/This link works until Nov 24, 2026, 11:30 PM UTC\./)).toBeInTheDocument();
  });

  it("a buyer without a ticket of their own sees only their orders", async () => {
    await renderView({ ...OVERVIEW, tickets: [] });
    expect(screen.queryByRole("link", { name: /Open ticket/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open order 12" })).toBeInTheDocument();
  });

  it("an empty list offers to look again", async () => {
    await renderView({ ...OVERVIEW, tickets: [], orders: [] });
    expect(screen.getByText("There are no tickets or orders on this address any more.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Find my tickets again" })).toHaveAttribute("href", "/tickets/lost");
  });

  it("has no axe violations", async () => {
    const { container } = await renderView(OVERVIEW);
    expect(describeViolations(await axeViolations({ container }))).toEqual([]);
  });
});

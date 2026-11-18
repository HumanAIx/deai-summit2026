import { describe, expect, it } from "vitest";
import { OrderSummary } from "../../../components/tickets/checkout/OrderSummary";
import { axeViolations, describeViolations } from "../../helpers/axe";
import { typeA } from "../../helpers/checkout-harness";
import { render, screen } from "../../test-utils";

const totals = {
  lines: [{ ticketTypeId: typeA.id, quantity: 3, unitCents: 15000, discountCents: 0, feeCents: 0, grossCents: 1 }],
  subtotalCents: 11111,
  discountCents: 0,
  feeCents: 0,
  totalCents: 22222,
  vatCents: 3333,
};

describe("OrderSummary", () => {
  it("prints ep-api's numbers as given (the total is not the sum of anything shown) and hides zero discount / fee rows", async () => {
    const { container } = render(<OrderSummary totals={totals} currency="EUR" types={[typeA]} busy={false} />);
    expect(screen.getByText("3 × Full pass")).toBeInTheDocument();
    expect(screen.getByText("€150 each")).toBeInTheDocument();
    expect(screen.getByText("€111.11")).toBeInTheDocument();
    expect(screen.getByText("€222.22")).toBeInTheDocument();
    expect(screen.getByText("€33.33")).toBeInTheDocument();
    expect(screen.queryByText("Discount")).not.toBeInTheDocument();
    expect(screen.queryByText("Booking fees")).not.toBeInTheDocument();
    expect(describeViolations(await axeViolations({ container }))).toEqual([]);
  });

  it("shows discount and booking fees when ep-api charges them, 'Free' for a zero total, and dims while a new quote loads", () => {
    const { container } = render(<OrderSummary totals={{ ...totals, discountCents: 500, feeCents: 250, totalCents: 0 }} currency="EUR" types={[typeA]} busy />);
    expect(screen.getByText("−€5")).toBeInTheDocument();
    expect(screen.getByText("€2.50")).toBeInTheDocument();
    expect(screen.getByText("Free", { selector: "dd" })).toBeInTheDocument();
    expect(container.querySelector("section")).toHaveAttribute("aria-busy", "true");
  });

  it("with no quote yet it asks for a ticket", () => {
    render(<OrderSummary totals={null} currency="EUR" types={[typeA]} busy={false} />);
    expect(screen.getByText("Choose at least one ticket.")).toBeInTheDocument();
  });
});

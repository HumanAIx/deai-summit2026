import { describe, expect, it } from "vitest";
import { axeViolations, describeViolations } from "../../helpers/axe";
import { resolveServerElement } from "../../helpers/resolve-server";
import { render, screen } from "../../test-utils";


const { TicketOfferEnded } = await import("../../../components/tickets/TicketOfferEnded");

describe("TicketOfferEnded", () => {
  it("says the offer has ended, explains what happens next and links to the site's tickets", async () => {
    const ui = await resolveServerElement(<TicketOfferEnded ticketsHref="/de/tickets" />);
    const { container } = render(<>{ui}</>);
    expect(screen.getByRole("heading", { level: 1, name: "This offer has ended" })).toBeInTheDocument();
    expect(screen.getByText(/the next person on the waitlist is offered them/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See all tickets" })).toHaveAttribute("href", "/de/tickets");
    const violations = await axeViolations({ container });
    expect(describeViolations(violations)).toEqual([]);
  });
});

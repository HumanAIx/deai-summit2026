import { describe, expect, it } from "vitest";
import { axeViolations, describeViolations } from "../../helpers/axe";
import { resolveServerElement } from "../../helpers/resolve-server";
import { render, screen } from "../../test-utils";


const { TicketLinkInvalid } = await import("../../../components/tickets/TicketLinkInvalid");

describe("TicketLinkInvalid", () => {
  it("is one opaque state with a way back to the ticket list, in the buyer's language", async () => {
    const ui = await resolveServerElement(<TicketLinkInvalid ticketsHref="/de/tickets" />);
    const { container } = render(<>{ui}</>);
    expect(screen.getByRole("heading", { level: 1, name: "This ticket link is not valid" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See all tickets" })).toHaveAttribute("href", "/de/tickets");
    expect(describeViolations(await axeViolations({ container }))).toEqual([]);
  });
});

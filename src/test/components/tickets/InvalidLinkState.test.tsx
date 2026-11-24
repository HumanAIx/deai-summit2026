import { describe, expect, it } from "vitest";
import { axeViolations, describeViolations } from "../../helpers/axe";
import { resolveServerElement } from "../../helpers/resolve-server";
import { render, screen } from "../../test-utils";


const { InvalidLinkState } = await import("../../../components/tickets/InvalidLinkState");

describe("InvalidLinkState", () => {
  it("is the one opaque state: a heading, no detail about what was wrong, and a link to the lost-link form", async () => {
    const ui = await resolveServerElement(<InvalidLinkState lostLinkHref="/de/tickets/lost" />);
    const { container } = render(<>{ui}</>);
    expect(screen.getByRole("heading", { level: 1, name: "This link is not valid" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Send my links again" })).toHaveAttribute("href", "/de/tickets/lost");
    const violations = await axeViolations({ container });
    expect(describeViolations(violations)).toEqual([]);
  });
});

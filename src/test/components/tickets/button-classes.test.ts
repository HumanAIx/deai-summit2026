import { describe, expect, it } from "vitest";
import { MT_BUTTON, MT_BUTTON_LG } from "../../../components/tickets/my-ticket-classes";
import { TICKETS_BUTTON } from "../../../components/tickets/tickets-classes";

/** DeAI's primary ticket buttons follow the "My Ticket" prototype: the blue → cyan gradient pill (`--ticket-btn-bg`). */
describe("primary ticket buttons", () => {
  it.each([
    ["MT_BUTTON", MT_BUTTON],
    ["MT_BUTTON_LG", MT_BUTTON_LG],
    ["TICKETS_BUTTON", TICKETS_BUTTON],
  ])("%s paints the gradient token with a solid-primary fallback, as a pill", (_name, classes) => {
    expect(classes).toContain("[background:var(--ticket-btn-bg,var(--color-primary))]");
    expect(classes).toContain("rounded-full");
    expect(classes).toContain("text-on-primary");
    expect(classes).not.toMatch(/(^|\s)bg-primary(\s|$)/);
  });
});

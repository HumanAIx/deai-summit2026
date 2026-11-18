import { describe, expect, it, vi } from "vitest";
import { openPrivateTicketPage } from "../../../lib/tickets/private-navigation";

describe("openPrivateTicketPage", () => {
  it("opens the private page with a full page load (location.assign), so no loaded pixel sees a route change", () => {
    const location = { assign: vi.fn() };
    openPrivateTicketPage({ path: "/de/tickets/order/tok?o=1", location });
    expect(location.assign).toHaveBeenCalledWith("/de/tickets/order/tok?o=1");
  });
});

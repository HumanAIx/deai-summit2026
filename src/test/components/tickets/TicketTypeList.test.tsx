import { describe, expect, it, vi } from "vitest";
import { axeViolations, describeViolations } from "../../helpers/axe";
import { installFakeApi } from "../../helpers/checkout-harness";
import { resolveServerElement } from "../../helpers/resolve-server";
import { fireEvent, render, screen, waitFor } from "../../test-utils";
import type { PublicTypes } from "../../../lib/tickets/schemas";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const { TicketTypeList } = await import("../../../components/tickets/TicketTypeList");

const type = (overrides: Partial<PublicTypes["types"][number]> = {}): PublicTypes["types"][number] => ({
  id: "t1",
  name: "Full pass",
  description: "Both days",
  priceCents: 15000,
  currency: "EUR",
  bookingFeeCents: 250,
  status: "on_sale",
  left: null,
  maxPerOrder: 10,
  source: { kind: "event", id: "e1", name: "DeAI Summit" },
  ...overrides,
});
const data = (overrides: Partial<PublicTypes> = {}, types = [type()]): PublicTypes => ({
  types,
  checkout: { salesOpen: true, testMode: false, feePayer: "buyer", ...overrides.checkout },
});

async function renderList(value: PublicTypes) {
  const ui = await resolveServerElement(<TicketTypeList data={value} locale="en" localePrefix="" />);
  return render(<>{ui}</>);
}

describe("TicketTypeList", () => {
  it("a site with no ticket types shows the themed 'not on sale here' state", async () => {
    const { container } = await renderList(data({}, []));
    expect(screen.getByRole("heading", { level: 1, name: "Tickets are not on sale here" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    const violations = await axeViolations({ container });
    expect(describeViolations(violations)).toEqual([]);
  });

  it("lists on-sale types with price, booking fee, max per order and a quantity stepper", async () => {
    const { container } = await renderList(data({}, [type({ maxPerOrder: 4 })]));
    expect(screen.getByRole("heading", { level: 1, name: "Tickets" })).toBeInTheDocument();
    // the cart step has its own h2 and "01 · Tickets" h3; one source repeats no heading, so ticket names are h5
    expect(screen.getByRole("heading", { level: 2, name: "Your tickets" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "01 · Tickets" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 4, name: "DeAI Summit" })).toBeNull();
    expect(screen.getByRole("heading", { level: 5, name: "Full pass" })).toBeInTheDocument();
    expect(screen.getByText(/€150(?!\.)/)).toBeInTheDocument();
    expect(screen.getByText(/\+ €2\.50 booking fee/)).toBeInTheDocument(); // one subline: price + fee · …
    expect(screen.getByText(/Max 4 per order/)).toBeInTheDocument();
    expect(screen.queryByText(/On sale/)).toBeNull(); // the usual status is not repeated on every row
    expect(screen.getByRole("button", { name: "Add one Full pass" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Remove one Full pass" })).toBeDisabled();
    expect(screen.queryByText("Coming soon")).not.toBeInTheDocument();
    const violations = await axeViolations({ container });
    expect(describeViolations(violations)).toEqual([]);
  });

  it("shows no booking fee when the organiser pays it, 'Free' for 0, and the exact stock when ep-api gives it", async () => {
    await renderList({ types: [type({ priceCents: 0, bookingFeeCents: 0, left: 3 })], checkout: { salesOpen: true, testMode: false, feePayer: "organiser" } });
    expect(screen.getByText(/^Free/)).toBeInTheDocument();
    expect(screen.queryByText(/booking fee/)).not.toBeInTheDocument();
    expect(screen.getByText(/3 left/)).toBeInTheDocument();
  });

  it("groups types by source, in ep-api's order", async () => {
    const { container } = await renderList(data({}, [type({ id: "a", name: "A" }), type({ id: "b", name: "B", source: { kind: "schedule", id: "s1", name: "Workshops" } }), type({ id: "c", name: "C" })]));
    const headings = [...container.querySelectorAll('[id^="tickets-source-"]')].map((h) => h.textContent);
    expect(headings).toEqual(["DeAI Summit", "Workshops"]);
  });

  it("non-sellable statuses get a label and no way to buy; a not-yet type shows its open date", async () => {
    await renderList(data({}, [type({ status: "sold_out" }), type({ id: "t2", name: "Late", status: "not_yet", saleFrom: "2030-03-01T10:00:00.000Z" })]));
    expect(screen.getByText(/Sold out/)).toBeInTheDocument();
    expect(screen.getByText(/Sales open on March 1, 2030/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("closed sales say so and offer no buy button; test mode shows the banner", async () => {
    await renderList({ types: [type()], checkout: { salesOpen: false, testMode: true, feePayer: "buyer" } });
    expect(screen.getByText("Sales are closed")).toBeInTheDocument();
    expect(screen.getByText("Test mode — no real payment")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("TicketTypeList extra questions", () => {
  it("hands the site's enabled questions to the checkout: the heard-from box appears in 02 · Your details", async () => {
    installFakeApi();
    const list = [{ key: "source", id: "heardFrom", scope: "order", fields: [{ name: "value", kind: "select", required: false, options: [{ value: "social", label: "Social" }, { value: "other", label: "Other" }] }] }];
    await renderList(data({ checkout: { salesOpen: true, testMode: false, feePayer: "buyer", questionList: list } }));
    fireEvent.click(screen.getByRole("button", { name: /^Add one Full pass/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Continue to payment" })).toBeEnabled());
    await screen.findByRole("heading", { level: 3, name: "02 · Your details" });
    expect(await screen.findByLabelText("How did you hear about us? (optional)")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("a site on an older ep-api (no list) asks nothing extra in 02 · Your details", async () => {
    installFakeApi();
    await renderList(data());
    fireEvent.click(screen.getByRole("button", { name: /^Add one Full pass/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Continue to payment" })).toBeEnabled());
    await screen.findByRole("heading", { level: 3, name: "02 · Your details" });
    expect(await screen.findByLabelText("Full name")).toBeInTheDocument();
    expect(screen.queryByLabelText("How did you hear about us? (optional)")).toBeNull();
    vi.unstubAllGlobals();
  });
});

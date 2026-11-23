import { describe, expect, it, vi } from "vitest";
import type { CMSBlock } from "../../../lib/api-types";
import { render, screen } from "../../test-utils";

// The stub renders its cards inside the section's frame (heading + cards), as the real block does when it has cards to show.
const { TicketsBlock } = vi.hoisted(() => ({
  TicketsBlock: vi.fn((props: { cards: unknown[]; buyHref: string; frame?: (content: unknown) => unknown }) => {
    const content = <div data-testid="tickets-block" data-count={props.cards.length} data-buy={props.buyHref} />;
    return (props.frame ? props.frame(content) : content) as never;
  }),
}));
vi.mock("@/components/tickets/TicketsBlock", () => ({ TicketsBlock }));

const { TicketsSection } = await import("../../../components/tickets/TicketsSection");

const block = (extra: Record<string, unknown> = {}) => ({ id: "b1", type: "section", addon: "tickets", ...extra }) as CMSBlock;
const card = (id: string) => ({ id, ticketTypeId: "", title: `Card ${id}` });
/** A section with one picked card (a section with none is not shown at all). */
const withCard = (extra: Record<string, unknown>) => block({ ticketCards: [card("c1")], ...extra });

describe("TicketsSection", () => {
  it("renders the kicker, the title with its accented last word and the meta line", () => {
    render(<TicketsSection block={withCard({ subtitle: "TICKETS", title: "Choose your pass", description: "Nov 25 · Malta" })} />);
    expect(screen.getByText("TICKETS")).toBeInTheDocument();
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent("Choose your pass");
    expect(heading.querySelector("span")).toHaveTextContent("pass");
    expect(screen.getByText("Nov 25 · Malta")).toBeInTheDocument();
  });

  it("accents the block's `hl` word when the title contains it", () => {
    render(<TicketsSection block={withCard({ title: "Get your summit ticket today", hl: "summit" })} />);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading.querySelector("span")).toHaveTextContent("summit");
    expect(heading).toHaveTextContent("Get your summit ticket today");
  });

  it("falls back to the last word when `hl` is not in the title", () => {
    render(<TicketsSection block={withCard({ title: "Get tickets", hl: "missing" })} />);
    expect(screen.getByRole("heading", { level: 2 }).querySelector("span")).toHaveTextContent("tickets");
  });

  it("does not accent a one-word title", () => {
    render(<TicketsSection block={withCard({ title: "Tickets" })} />);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent("Tickets");
    expect(heading.querySelector("span")).toBeNull();
  });

  it("renders no heading area when kicker, title and meta are all empty", () => {
    render(<TicketsSection block={withCard({ title: "  ", subtitle: "" })} />);
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.getByTestId("tickets-block")).toBeInTheDocument();
  });

  it("hands TicketsBlock the parsed cards (malformed ones skipped) and the /tickets buy link", () => {
    TicketsBlock.mockClear();
    render(<TicketsSection block={block({ ticketCards: [card("a"), { id: "bad id" }, card("b")] })} />);
    const props = TicketsBlock.mock.calls[0]?.[0] as { cards: { id: string }[]; buyHref: string };
    expect(props.cards.map((c) => c.id)).toEqual(["a", "b"]);
    expect(props.buyHref).toBe("/tickets");
    expect(screen.getByTestId("tickets-block")).toHaveAttribute("data-count", "2");
  });

  it("shows nothing at all when no tickets are picked (no cards, or only malformed ones)", () => {
    TicketsBlock.mockClear();
    const empty = render(<TicketsSection block={block({ title: "Choose your pass" })} />);
    expect(empty.container).toBeEmptyDOMElement();
    empty.unmount();
    const bad = render(<TicketsSection block={block({ title: "Choose your pass", ticketCards: [{ id: "bad id" }] })} />);
    expect(bad.container).toBeEmptyDOMElement();
    expect(TicketsBlock).not.toHaveBeenCalled();
  });

  it("the heading lives inside the block's frame, so a block with nothing on sale removes the heading too", () => {
    TicketsBlock.mockClear();
    TicketsBlock.mockImplementationOnce(() => null as never);
    const view = render(<TicketsSection block={withCard({ title: "Choose your pass" })} />);
    expect(view.container).toBeEmptyDOMElement();
  });
});

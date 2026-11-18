import { describe, expect, it, vi } from "vitest";
import type { CMSBlock } from "../../../lib/api-types";
import { render, screen } from "../../test-utils";

vi.mock("@/components/tickets/TicketsSection", () => ({ TicketsSection: ({ block }: { block: CMSBlock }) => <div data-testid="tickets-section" data-id={block.id} /> }));

const { CmsPageRenderer } = await import("../../../components/cms/CmsPageRenderer");

const blk = (extra: Record<string, unknown>) => ({ id: "b1", type: "simple", ...extra }) as unknown as CMSBlock;

describe("CmsPageRenderer CTA buttons", () => {
  it("a hero block's button shows `text` (what the CMS editor saves)", () => {
    render(<CmsPageRenderer blocks={[blk({ type: "hero", title: "DeAI Summit", buttons: [{ text: "Buy tickets", link: "/tickets" }] })]} />);
    const link = screen.getByRole("link", { name: "Buy tickets" });
    expect(link).toHaveAttribute("href", "/tickets");
  });

  it("falls back to `label` for older content", () => {
    render(<CmsPageRenderer blocks={[blk({ type: "hero", title: "DeAI Summit", buttons: [{ label: "Legacy label", link: "/x" }] })]} />);
    expect(screen.getByRole("link", { name: "Legacy label" })).toBeInTheDocument();
  });

  it("`text` wins over `label` when both are present", () => {
    render(<CmsPageRenderer blocks={[blk({ type: "hero", title: "DeAI Summit", buttons: [{ text: "New", label: "Old", link: "/x" }] })]} />);
    expect(screen.getByRole("link", { name: "New" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Old" })).not.toBeInTheDocument();
  });

  it("CTA and content sections use the same caption", () => {
    render(<CmsPageRenderer blocks={[blk({ id: "c", type: "cta", title: "Join", buttons: [{ text: "Register", link: "/r" }] })]} />);
    expect(screen.getByRole("link", { name: "Register" })).toHaveAttribute("href", "/r");
  });
});

describe("CmsPageRenderer Tickets section routing", () => {
  it("an addon: tickets block placed FIRST on a page renders TicketsSection, not the page hero", () => {
    render(<CmsPageRenderer blocks={[blk({ id: "first", addon: "tickets", title: "Choose your pass" }), blk({ id: "second", title: "About" })]} />);
    expect(screen.getByTestId("tickets-section")).toHaveAttribute("data-id", "first");
    expect(screen.queryByRole("heading", { level: 1, name: /Choose your pass/ })).not.toBeInTheDocument();
  });

  it("a tickets block further down renders TicketsSection too, once", () => {
    render(<CmsPageRenderer blocks={[blk({ id: "a", title: "Intro" }), blk({ id: "t", addon: "tickets" })]} />);
    expect(screen.getAllByTestId("tickets-section")).toHaveLength(1);
    expect(screen.getByTestId("tickets-section")).toHaveAttribute("data-id", "t");
  });

  it("a type: tickets block is a Tickets section as well", () => {
    render(<CmsPageRenderer blocks={[blk({ id: "t", type: "tickets" })]} />);
    expect(screen.getByTestId("tickets-section")).toBeInTheDocument();
  });
});

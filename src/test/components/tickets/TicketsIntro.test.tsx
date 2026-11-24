import { describe, expect, it } from "vitest";
import { render, screen } from "../../test-utils";
import { TicketsIntro } from "@/components/tickets/TicketsIntro";

const base = { eyebrow: "TICKETS · 2 DAYS", titleLead: "Choose your", accentWord: "pass", meta: "25–26 NOV 2026 · VALLETTA" };

describe("TicketsIntro", () => {
  it("renders the CMS heading as the page's h1", () => {
    render(<TicketsIntro {...base} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Choose your pass");
    expect(screen.getByText("25–26 NOV 2026 · VALLETTA")).toBeInTheDocument();
  });

  it("offers 'Buy on Luma' in a new tab, no referrer, tracked as a Luma ticket click", () => {
    render(<TicketsIntro {...base} lumaHref="https://luma.com/phjit31c" />);
    expect(screen.getByText(/Prefer Luma\?/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Buy your ticket on Luma/ });
    expect(link).toHaveAttribute("href", "https://luma.com/phjit31c");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAttribute("data-luma-ticket");
    expect(link).toHaveAccessibleName(/opens in a new tab/);
  });

  it("shows no Luma line without a Luma link", () => {
    render(<TicketsIntro {...base} lumaHref={null} />);
    expect(screen.queryByText(/Prefer Luma/)).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});

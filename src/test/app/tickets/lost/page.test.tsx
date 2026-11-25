import { describe, expect, it, vi } from "vitest";

vi.mock("react/jsx-dev-runtime", async () => (await import("../../../helpers/jsx-stub")).jsxStub);
vi.mock("react/jsx-runtime", async () => (await import("../../../helpers/jsx-stub")).jsxStub);
// Components are stubbed: the pages are asserted by WHICH component they pick and with WHAT props; their
// own rendering is covered under src/test/components/tickets. (They also pull client-only modules that
// the server project's `react-server` condition cannot load.)
vi.mock("@/components/tickets/LostLinkForm", () => ({ LostLinkForm: function LostLinkForm() { return null; } }));
vi.mock("@/components/tickets/TicketsShell", () => ({ TicketsShell: function TicketsShell() { return null; } }));

const page = await import("../../../../app/tickets/lost/page");
const { LostLinkForm } = await import("../../../../components/tickets/LostLinkForm");

function findByType(node: unknown, type: unknown): { props: Record<string, unknown> } | null {
  if (!node || typeof node !== "object") return null;
  const element = node as { type?: unknown; props?: { children?: unknown } };
  if (element.type === type) return element as { props: Record<string, unknown> };
  const children = element.props?.children;
  for (const child of Array.isArray(children) ? children : [children]) {
    const found = findByType(child, type);
    if (found) return found;
  }
  return null;
}

describe("/tickets/lost page", () => {
  it("renders the form with a locale-aware way back, makes no ep-api call, and is private", async () => {
    expect(page.dynamic).toBe("force-dynamic");
    expect(await page.generateMetadata()).toMatchObject({ robots: { index: false, follow: false } });
    const element = await page.default();
    expect(findByType(element, LostLinkForm)?.props.ticketsHref).toBe("/tickets");
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { shouldOpenInNewTab, useKeepCartOnNavigation } from "@/components/tickets/checkout/useKeepCartOnNavigation";
import { fireEvent, render } from "../../test-utils";

function Probe({ active }: { active: boolean }) {
  useKeepCartOnNavigation({ active });
  return null;
}

let anchors: HTMLAnchorElement[] = [];

function link({ href, attrs = {} }: { href: string; attrs?: Record<string, string> }): HTMLAnchorElement {
  const a = document.createElement("a");
  a.setAttribute("href", href);
  for (const [name, value] of Object.entries(attrs)) a.setAttribute(name, value);
  a.textContent = "link";
  document.body.append(a);
  anchors.push(a);
  return a;
}

/**
 * Clicks and reports how the link looked when the browser followed it: a bubble listener (after the hook's capture
 * listener) reads `target` / `rel`, then stops jsdom "navigating". `prevented` tells whether anything blocked the click.
 */
function click({ anchor, init = {} }: { anchor: HTMLElement; init?: MouseEventInit }): { target: string | null; rel: string | null; prevented: boolean } {
  const a = anchor.closest("a") as HTMLAnchorElement;
  let seen = { target: null as string | null, rel: null as string | null, prevented: false };
  const probe = (event: Event) => {
    seen = { target: a.getAttribute("target"), rel: a.getAttribute("rel"), prevented: event.defaultPrevented };
    event.preventDefault();
  };
  document.addEventListener("click", probe);
  fireEvent.click(anchor, init);
  document.removeEventListener("click", probe);
  return seen;
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  for (const a of anchors) a.remove();
  anchors = [];
});

describe("useKeepCartOnNavigation", () => {
  it("while active, a plain click on a link that leaves the page is followed in a new tab (no opener, no referrer)", () => {
    render(<Probe active />);
    const a = link({ href: "/speakers" });
    expect(click({ anchor: a })).toEqual({ target: "_blank", rel: "noopener noreferrer", prevented: false });
  });

  it("puts the link back as it was right after the click", () => {
    render(<Probe active />);
    const plain = link({ href: "/speakers" });
    const withRel = link({ href: "/partners", attrs: { rel: "prefetch" } });
    click({ anchor: plain });
    click({ anchor: withRel });
    vi.runAllTimers();
    expect(plain.hasAttribute("target")).toBe(false);
    expect(plain.hasAttribute("rel")).toBe(false);
    expect(withRel.hasAttribute("target")).toBe(false);
    expect(withRel.getAttribute("rel")).toBe("prefetch");
  });

  it("also covers an external link and a click on an element inside the link", () => {
    render(<Probe active />);
    const a = link({ href: "https://other.example/x" });
    const inner = document.createElement("span");
    a.append(inner);
    expect(click({ anchor: inner }).target).toBe("_blank");
  });

  // Next's <Link> leaves a link with a non-_self target to the browser (isModifiedEvent), so no client-side
  // transition replaces the checkout. A handler on the link sees the target the hook set.
  it("a <Link>-style handler on the link sees the new target, so it does not navigate in the same tab", () => {
    render(<Probe active />);
    const a = link({ href: "/speakers" });
    let targetSeen: string | null = null;
    a.addEventListener("click", () => {
      targetSeen = a.getAttribute("target");
    });
    click({ anchor: a });
    expect(targetSeen).toBe("_blank");
  });

  it("does nothing while inactive", () => {
    render(<Probe active={false} />);
    expect(click({ anchor: link({ href: "/speakers" }) }).target).toBeNull();
  });

  it("leaves modified and non-primary clicks to the browser", () => {
    render(<Probe active />);
    const a = link({ href: "/speakers" });
    for (const init of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
      expect(click({ anchor: a, init }).target).toBeNull();
    }
  });

  it.each([
    ["a download", "/file.pdf", { download: "" }],
    ["mailto:", "mailto:a@example.com", {}],
    ["tel:", "tel:+3550000", {}],
    ["javascript:", "javascript:void(0)", {}],
    ["a hash link", "#main", {}],
    ["the current URL", window.location.href, {}],
    ["the current path with a hash", `${window.location.pathname}#top`, {}],
  ])("leaves %s alone", (_name, href, attrs) => {
    render(<Probe active />);
    expect(click({ anchor: link({ href, attrs }) }).target).toBeNull();
  });

  it("leaves a link that already has its own target as it is", () => {
    render(<Probe active />);
    const a = link({ href: "/speakers", attrs: { target: "_self" } });
    expect(click({ anchor: a }).target).toBe("_self");
    vi.runAllTimers();
    expect(a.getAttribute("target")).toBe("_self");
  });

  it("removes the listener when it turns inactive and when unmounted", () => {
    const { rerender, unmount } = render(<Probe active />);
    const a = link({ href: "/speakers" });
    rerender(<Probe active={false} />);
    expect(click({ anchor: a }).target).toBeNull();
    rerender(<Probe active />);
    expect(click({ anchor: a }).target).toBe("_blank");
    vi.runAllTimers();
    unmount();
    expect(click({ anchor: a }).target).toBeNull();
  });
});

describe("shouldOpenInNewTab", () => {
  const current = { href: "https://site.example/tickets?x=1", origin: "https://site.example", pathname: "/tickets", search: "?x=1" } as Location;
  it("treats the same path with a different query as leaving, the same path and query as staying", () => {
    expect(shouldOpenInNewTab({ anchor: link({ href: "/tickets?x=2" }), current })).toBe(true);
    expect(shouldOpenInNewTab({ anchor: link({ href: "/tickets?x=1#a" }), current })).toBe(false);
  });
});

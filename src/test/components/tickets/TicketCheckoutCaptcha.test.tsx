import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { addTickets, config, fillDetails, fillHolder, installFakeApi, orderAnswer, quoteAnswer, typeA, waitForQuote, type FakeApi } from "../../helpers/checkout-harness";
import { fireEvent, render, screen, waitFor } from "../../test-utils";

const { openPage, widget } = vi.hoisted(() => ({
  openPage: vi.fn(),
  widget: { props: null as null | { provider: string; onToken: (token: string | null) => void; onUnavailable: () => void }, mounts: 0 },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("../../../lib/tickets/private-navigation", () => ({ openPrivateTicketPage: ({ path }: { path: string }) => openPage(path) }));
// The widget loads a third-party script: stubbed at the module boundary (the real one is covered by the forms block).
vi.mock("../../../components/tickets/CaptchaWidget", async () => {
  const { useEffect } = await import("react");
  return {
    CaptchaWidget: (props: { provider: string; onToken: (token: string | null) => void; onUnavailable: () => void }) => {
      widget.props = props;
      useEffect(() => {
        widget.mounts += 1;
      }, []);
      return <div data-testid="captcha-widget" />;
    },
  };
});

const { TicketCheckout } = await import("../../../components/tickets/checkout/TicketCheckout");

let api: FakeApi;

/** The harness answers every unknown URL with 404, which reads as "no captcha": wrap it for the site-key route. */
function withSiteKey(body: { provider: string; site_key: string; disabled: boolean } | null) {
  const original = api.fetch.getMockImplementation() as (url: string, init?: RequestInit) => Promise<Response>;
  api.fetch.mockImplementation(async (url: string, init?: RequestInit) => {
    if (url === "/api/captcha-site-key") {
      api.calls.push({ url, body: undefined, headers: {} });
      return new Response(JSON.stringify(body ?? {}), { status: body ? 200 : 404 });
    }
    return original(url, init);
  });
}

async function toHolders() {
  render(<TicketCheckout types={[typeA]} config={config} locale="en" localePrefix="" />);
  addTickets({ name: "Full pass" });
  await waitForQuote();
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fillDetails();
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByRole("heading", { level: 2, name: "Ticket holders" });
  fillHolder({ index: 0, name: "Ada", email: "ada@example.com" });
}

function freeOrder() {
  api.quote = (body) => ({ status: 200, body: { success: true, data: quoteAnswer({ body: body as never, total: 0 }) } });
  api.order = () => ({ status: 201, body: { success: true, data: orderAnswer({ free: true }) } });
}

beforeEach(() => {
  api = installFakeApi();
  openPage.mockReset();
  widget.props = null;
  widget.mounts = 0;
});
afterEach(() => vi.unstubAllGlobals());

describe("checkout captcha — site without a captcha", () => {
  it("asks nothing about the captcha before the details step", () => {
    withSiteKey(null);
    render(<TicketCheckout types={[typeA]} config={config} locale="en" localePrefix="" />);
    expect(api.callsTo("/api/captcha-site-key")).toHaveLength(0);
  });

  it("places the order with the plain body (the current API rejects unknown fields)", async () => {
    withSiteKey({ provider: "recaptcha", site_key: "", disabled: true });
    freeOrder();
    await toHolders();
    expect(screen.queryByTestId("captcha-widget")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Place order" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Place order" }));
    await waitFor(() => expect(api.callsTo("/api/tickets/orders")).toHaveLength(1));
    expect(api.callsTo("/api/tickets/orders")[0]?.body).not.toHaveProperty("captchaToken");
  });
});

describe("checkout captcha — site with a captcha", () => {
  beforeEach(() => withSiteKey({ provider: "hcaptcha", site_key: "site-key", disabled: false }));

  it("shows the widget with a hint, keeps the button disabled until solved, then sends the token (free order too)", async () => {
    freeOrder();
    await toHolders();
    expect(await screen.findByTestId("captcha-widget")).toBeInTheDocument();
    expect(widget.props?.provider).toBe("hcaptcha");
    expect(screen.getByText("Please solve the check above to continue.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Place order" })).toBeDisabled();

    act(() => widget.props?.onToken("tok-123"));
    expect(screen.queryByText("Please solve the check above to continue.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Place order" }));
    await waitFor(() => expect(api.callsTo("/api/tickets/orders")).toHaveLength(1));
    expect(api.callsTo("/api/tickets/orders")[0]?.body).toMatchObject({ captchaToken: "tok-123" });
    await waitFor(() => expect(openPage).toHaveBeenCalled());
  });

  it("an expired token disables the button again", async () => {
    await toHolders();
    await screen.findByTestId("captcha-widget");
    act(() => widget.props?.onToken("tok"));
    expect(screen.getByRole("button", { name: "Continue to payment" })).toBeEnabled();
    act(() => widget.props?.onToken(null));
    expect(screen.getByRole("button", { name: "Continue to payment" })).toBeDisabled();
  });

  it.each([
    ["tickets.captchaFailed", "captchaFailed", "The security check did not pass. Please try again."],
    ["tickets.captchaRequired", "captchaRequired", "The security check was not completed. Please complete it and try again."],
  ])("%s resets the widget and shows a friendly message, never the code", async (_apiCode, code, message) => {
    api.order = () => ({ status: 400, body: { success: false, code } });
    await toHolders();
    await screen.findByTestId("captcha-widget");
    const mountsBefore = widget.mounts;
    act(() => widget.props?.onToken("tok-1"));
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByText(code)).not.toBeInTheDocument();
    await waitFor(() => expect(widget.mounts).toBeGreaterThan(mountsBefore)); // a fresh widget
    expect(screen.getByRole("button", { name: "Continue to payment" })).toBeDisabled(); // solve again
  });

  it("a widget that cannot load fails open: no token is sent and the button works", async () => {
    freeOrder();
    await toHolders();
    await screen.findByTestId("captcha-widget");
    act(() => widget.props?.onUnavailable());
    expect(screen.queryByTestId("captcha-widget")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Place order" }));
    await waitFor(() => expect(api.callsTo("/api/tickets/orders")).toHaveLength(1));
    expect(api.callsTo("/api/tickets/orders")[0]?.body).not.toHaveProperty("captchaToken");
  });
});

describe("checkout captcha — provider mapping and reCAPTCHA v3", () => {
  it.each([
    ["recaptcha-v3", "recaptcha-v3"],
    ["hcaptcha", "hcaptcha"],
    ["recaptcha", "recaptcha"],
  ])("the stored provider %j reaches the widget as %j", async (stored, expected) => {
    withSiteKey({ provider: stored, site_key: "site-key", disabled: false });
    await toHolders();
    await screen.findByTestId("captcha-widget");
    expect(widget.props?.provider).toBe(expected);
  });

  it.each(["turnstile", ""])("an unknown stored provider %j is 'no captcha': no widget, and no token is sent", async (stored) => {
    withSiteKey({ provider: stored, site_key: "site-key", disabled: false });
    freeOrder();
    await toHolders();
    expect(screen.queryByTestId("captcha-widget")).toBeNull();
  });

  it("v3: no captcha card and no 'solve the check' hint, but Place order still waits for the token and sends it", async () => {
    withSiteKey({ provider: "recaptcha-v3", site_key: "site-key", disabled: false });
    freeOrder();
    await toHolders();
    expect(await screen.findByTestId("captcha-widget")).toBeInTheDocument();
    expect(screen.getByTestId("captcha-widget").parentElement?.className ?? "").not.toContain("flex-col gap-3");
    expect(screen.queryByText("Please solve the check above to continue.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Place order" })).toBeDisabled();

    act(() => widget.props?.onToken("v3-token"));
    expect(screen.getByRole("button", { name: "Place order" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Place order" }));
    await waitFor(() => expect(api.callsTo("/api/tickets/orders")).toHaveLength(1));
    expect(api.callsTo("/api/tickets/orders")[0]?.body).toMatchObject({ captchaToken: "v3-token" });
  });

  it("v3 that cannot run fails open: the button works and no token is sent", async () => {
    withSiteKey({ provider: "recaptcha-v3", site_key: "site-key", disabled: false });
    freeOrder();
    await toHolders();
    await screen.findByTestId("captcha-widget");
    act(() => widget.props?.onUnavailable());
    fireEvent.click(screen.getByRole("button", { name: "Place order" }));
    await waitFor(() => expect(api.callsTo("/api/tickets/orders")).toHaveLength(1));
    expect(api.callsTo("/api/tickets/orders")[0]?.body).not.toHaveProperty("captchaToken");
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axeViolations, describeViolations } from "../../helpers/axe";
import { fireEvent, render, screen, waitFor } from "../../test-utils";

const router = { push: vi.fn(), refresh: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { TicketSelfService } = await import("../../../components/tickets/TicketSelfService");

const TOKEN = "h".repeat(43);

function respond(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

/** A fetch fake routing the two pass-on endpoints: the pre-check and the irreversible pass-on. */
function passOnApi({ check = { status: 200, body: { success: true, data: { ok: true } } }, passOn = { status: 200, body: { success: true, data: { passedOnTo: { name: "Grace Hopper" }, emailSent: true } } } }: { check?: { status: number; body: unknown }; passOn?: { status: number; body: unknown } } = {}) {
  const fetchMock = vi.fn(async (url: string) => {
    const reply = url.endsWith("/pass-on/check") ? check : passOn;
    return new Response(JSON.stringify(reply.body), { status: reply.status });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
const urls = (fetchMock: ReturnType<typeof vi.fn>) => fetchMock.mock.calls.map((call) => call[0] as string);

beforeEach(() => router.refresh.mockReset());
afterEach(() => vi.unstubAllGlobals());

describe("TicketSelfService", () => {
  it("renders nothing when ep-api allows neither action", () => {
    const { container } = render(<TicketSelfService token={TOKEN} holderName="Ada" canCorrectName={false} canPassOn={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows only the forms ep-api allows", () => {
    const { unmount } = render(<TicketSelfService token={TOKEN} holderName="Ada" canCorrectName canPassOn={false} />);
    expect(screen.getByRole("heading", { name: "Correct my name" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Pass this ticket on" })).not.toBeInTheDocument();
    unmount();
    render(<TicketSelfService token={TOKEN} holderName="Ada" canCorrectName={false} canPassOn />);
    expect(screen.queryByRole("heading", { name: "Correct my name" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pass this ticket on" })).toBeInTheDocument();
  });

  it("has labelled fields, no axe violations, and the name field starts with the current name", async () => {
    const { container } = render(<TicketSelfService token={TOKEN} holderName="Ada Lovelace" canCorrectName canPassOn />);
    expect(screen.getByLabelText("Name")).toHaveValue("Ada Lovelace");
    fireEvent.click(screen.getByRole("button", { name: "Pass on" }));
    expect(screen.getByLabelText("New holder's name")).toBeInTheDocument();
    expect(screen.getByLabelText("New holder's email")).toHaveAttribute("type", "email");
    expect(describeViolations(await axeViolations({ container }))).toEqual([]);
  });

  describe("correct my name", () => {
    it("an empty name says so and posts nothing", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      render(<TicketSelfService token={TOKEN} holderName="Ada" canCorrectName canPassOn={false} />);
      fireEvent.change(screen.getByLabelText("Name"), { target: { value: "  " } });
      fireEvent.click(screen.getByRole("button", { name: "Save name" }));
      expect(await screen.findByText("This field is required.")).toBeInTheDocument();
      expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("posts the new name with the token in a header, confirms, and refreshes the page", async () => {
      const fetchMock = respond({ success: true, data: { holder: { name: "Ada K" } } });
      vi.stubGlobal("fetch", fetchMock);
      render(<TicketSelfService token={TOKEN} holderName="Ada" canCorrectName canPassOn={false} />);
      fireEvent.change(screen.getByLabelText("Name"), { target: { value: " Ada K " } });
      fireEvent.click(screen.getByRole("button", { name: "Save name" }));
      expect(await screen.findByText("Your name was updated.")).toBeInTheDocument();
      const [url, init] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string>; body: string }];
      expect(url).toBe("/api/tickets/my/ticket/name");
      expect(init.headers["x-ticket-token"]).toBe(TOKEN);
      expect(JSON.parse(init.body)).toEqual({ name: "Ada K" });
      await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    });

    it("shows a translated message for a closed window, never the API text, and does not refresh", async () => {
      vi.stubGlobal("fetch", respond({ success: false, error: "api text", code: "changesClosed" }, 409));
      render(<TicketSelfService token={TOKEN} holderName="Ada" canCorrectName canPassOn={false} />);
      fireEvent.click(screen.getByRole("button", { name: "Save name" }));
      expect(await screen.findByText("Changes to this ticket are closed.")).toBeInTheDocument();
      expect(screen.queryByText("api text")).not.toBeInTheDocument();
      expect(router.refresh).not.toHaveBeenCalled();
    });
  });

  describe("pass this ticket on", () => {
    function fill({ name = "Grace Hopper", email = "Grace@Example.com" } = {}) {
      if (!screen.queryByLabelText("New holder's name")) fireEvent.click(screen.getByRole("button", { name: "Pass on" }));
      fireEvent.change(screen.getByLabelText("New holder's name"), { target: { value: name } });
      fireEvent.change(screen.getByLabelText("New holder's email"), { target: { value: email } });
      fireEvent.click(screen.getByRole("button", { name: "Pass ticket on" }));
    }

    it("the card shows the intro and a 'Pass on' button; the form opens with focus on the name and the can't-undo warning", async () => {
      render(<TicketSelfService token={TOKEN} holderName="Ada" canCorrectName={false} canPassOn />);
      expect(screen.getByText(/Can't come\? Give the ticket to a colleague/)).toBeInTheDocument();
      expect(screen.queryByLabelText("New holder's name")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Pass on" }));
      await waitFor(() => expect(screen.getByLabelText("New holder's name")).toHaveFocus());
      expect(screen.getByText("You can't undo this. The buyer gets an email about it.")).toBeInTheDocument();
      // Nothing to send until both fields hold something valid.
      expect(screen.getByRole("button", { name: "Pass ticket on" })).toBeDisabled();
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      await waitFor(() => expect(screen.getByRole("button", { name: "Pass on" })).toHaveFocus());
    });

    it("validates name and email before the confirm step and posts nothing", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      render(<TicketSelfService token={TOKEN} holderName="Ada" canCorrectName={false} canPassOn />);
      fill({ name: "Grace", email: "nope" });
      expect(screen.getByRole("button", { name: "Pass ticket on" })).toBeDisabled();
      fireEvent.submit(screen.getByLabelText("New holder's email").closest("form") as HTMLFormElement);
      expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
      expect(screen.queryByRole("group")).not.toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("submitting calls the pre-check FIRST (e-mail only, holder token in a header), then asks to confirm, and only Confirm posts the pass-on", async () => {
      const fetchMock = passOnApi();
      const { container } = render(<TicketSelfService token={TOKEN} holderName="Ada" canCorrectName={false} canPassOn />);
      fill();
      const heading = await screen.findByRole("heading", { name: "Pass this ticket to Grace Hopper?" });
      // Focus moves in an effect after the heading renders: wait for it (a slow CI runner asserted too early).
      await waitFor(() => expect(heading).toHaveFocus());
      expect(screen.getByText("Grace Hopper (grace@example.com) will receive this ticket by email.")).toBeInTheDocument();
      expect(screen.getByText("Your QR code stops working as soon as you confirm. This cannot be undone.")).toBeInTheDocument();
      // Only the pre-check has gone out so far.
      expect(urls(fetchMock)).toEqual(["/api/tickets/my/ticket/pass-on/check"]);
      const [, checkInit] = fetchMock.mock.calls[0] as unknown as [string, { headers: Record<string, string>; body: string }];
      expect(checkInit.headers["x-ticket-token"]).toBe(TOKEN);
      expect(JSON.parse(checkInit.body)).toEqual({ email: "grace@example.com" });
      expect(describeViolations(await axeViolations({ container }))).toEqual([]);

      fireEvent.click(screen.getByRole("button", { name: "Yes, pass it on" }));
      await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
      expect(urls(fetchMock)).toEqual(["/api/tickets/my/ticket/pass-on/check", "/api/tickets/my/ticket/pass-on"]);
      const [, init] = fetchMock.mock.calls[1] as unknown as [string, { headers: Record<string, string>; body: string }];
      expect(init.headers["x-ticket-token"]).toBe(TOKEN);
      expect(JSON.parse(init.body)).toEqual({ name: "Grace Hopper", email: "grace@example.com" });
    });

    it("a pre-check refusal (passOnSameEmail) shows the error on the form; the confirm question never appears and nothing is passed on", async () => {
      const fetchMock = passOnApi({ check: { status: 409, body: { success: false, error: "api text", code: "passOnSameEmail" } } });
      render(<TicketSelfService token={TOKEN} holderName="Ada" canCorrectName={false} canPassOn />);
      fill();
      expect(await screen.findByText("Enter a different email address: this ticket already belongs to that one.")).toBeInTheDocument();
      expect(screen.queryByText(/cannot be undone/)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Yes, pass it on" })).not.toBeInTheDocument();
      expect(screen.getByLabelText("New holder's name")).toBeInTheDocument();
      expect(screen.queryByText("api text")).not.toBeInTheDocument();
      expect(urls(fetchMock)).toEqual(["/api/tickets/my/ticket/pass-on/check"]);
      expect(router.refresh).not.toHaveBeenCalled();
    });

    it("'Go back' returns to the form; the pass-on is never posted", async () => {
      const fetchMock = passOnApi();
      render(<TicketSelfService token={TOKEN} holderName="Ada" canCorrectName={false} canPassOn />);
      fill();
      fireEvent.click(await screen.findByRole("button", { name: "Go back" }));
      expect(await screen.findByLabelText("New holder's name")).toBeInTheDocument();
      expect(urls(fetchMock)).toEqual(["/api/tickets/my/ticket/pass-on/check"]);
    });

    it("a refusal at the final step (race: window closed meanwhile) goes back to the form with a translated message and no refresh", async () => {
      passOnApi({ passOn: { status: 409, body: { success: false, error: "api text", code: "changesClosed" } } });
      render(<TicketSelfService token={TOKEN} holderName="Ada" canCorrectName={false} canPassOn />);
      fill();
      fireEvent.click(await screen.findByRole("button", { name: "Yes, pass it on" }));
      expect(await screen.findByText("Changes to this ticket are closed.")).toBeInTheDocument();
      expect(screen.getByLabelText("New holder's name")).toBeInTheDocument();
      expect(router.refresh).not.toHaveBeenCalled();
    });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axeViolations, describeViolations } from "../../helpers/axe";
import { fireEvent, render, screen, waitFor } from "../../test-utils";

const router = { push: vi.fn(), refresh: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { CancelTicket } = await import("../../../components/tickets/CancelTicket");

const TOKEN = "h".repeat(43);
const respond = (body: unknown, status = 200) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));

beforeEach(() => router.refresh.mockReset());
afterEach(() => vi.unstubAllGlobals());

describe("CancelTicket", () => {
  it("asks first: opening shows the confirm dialog, focus on 'Keep my ticket', nothing is posted", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<CancelTicket token={TOKEN} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel ticket" }));
    expect(screen.getByRole("dialog", { name: "Cancel this ticket?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep my ticket" })).toHaveFocus();
    expect(describeViolations(await axeViolations({ container: document.body }))).toEqual([]);
    expect(container).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Keep my ticket" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("confirming posts to the cancel route with the token in a header and shows the success state", async () => {
    const fetchMock = respond({ success: true, data: { status: "void" } });
    vi.stubGlobal("fetch", fetchMock);
    render(<CancelTicket token={TOKEN} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel ticket" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, cancel my ticket" }));
    expect(await screen.findByText("Your ticket is cancelled. Your place is free again.")).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/tickets/my/cancel".replace("my/cancel", "my/ticket/cancel"));
    expect(init).toMatchObject({ method: "POST", headers: { "x-ticket-token": TOKEN } });
    expect(screen.queryByRole("button", { name: "Cancel ticket" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show updated ticket" }));
    expect(router.refresh).toHaveBeenCalled();
  });

  it("a refusal shows its own message, closes the dialog and keeps the button", async () => {
    vi.stubGlobal("fetch", respond({ success: false, error: "x", code: "cancelNotAllowed" }, 409));
    render(<CancelTicket token={TOKEN} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel ticket" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, cancel my ticket" }));
    expect(await screen.findByText("This ticket can no longer be cancelled.")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Cancel ticket" })).toBeInTheDocument();
  });

  it("an unreachable server shows the generic or unavailable text", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<CancelTicket token={TOKEN} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel ticket" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, cancel my ticket" }));
    await waitFor(() => expect(screen.getByRole("alert")).not.toBeEmptyDOMElement());
  });
});

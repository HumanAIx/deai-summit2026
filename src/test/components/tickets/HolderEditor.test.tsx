import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axeViolations, describeViolations } from "../../helpers/axe";
import { fireEvent, render, screen, waitFor } from "../../test-utils";

const router = { push: vi.fn(), refresh: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { HolderEditor } = await import("../../../components/tickets/HolderEditor");

const TOKEN = "b".repeat(43);
const TICKET_ID = "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11";

function editor(props: Partial<Parameters<typeof HolderEditor>[0]> = {}) {
  return <HolderEditor token={TOKEN} ticketId={TICKET_ID} holderName="Ada Lovelace" holderEmail="ada@example.com" canEditName canEditEmail label="Ada Lovelace" {...props} />;
}
function respond(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

beforeEach(() => router.refresh.mockReset());
afterEach(() => vi.unstubAllGlobals());

describe("HolderEditor", () => {
  it("starts as one button with an accessible name that says whose ticket it is", () => {
    render(editor());
    expect(screen.getByRole("button", { name: "Edit Ada Lovelace" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
  });

  it("shows only the fields ep-api allows", () => {
    const { unmount } = render(editor({ canEditEmail: false }));
    fireEvent.click(screen.getByRole("button", { name: "Edit Ada Lovelace" }));
    expect(screen.getByLabelText("Name")).toHaveValue("Ada Lovelace");
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    unmount();
    render(editor({ canEditName: false }));
    fireEvent.click(screen.getByRole("button", { name: "Edit Ada Lovelace" }));
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.com");
    expect(screen.getByText(/the old QR code and link stop working/)).toBeInTheDocument();
  });

  it("has no axe violations when open", async () => {
    const { container } = render(editor());
    fireEvent.click(screen.getByRole("button", { name: "Edit Ada Lovelace" }));
    expect(describeViolations(await axeViolations({ container }))).toEqual([]);
  });

  it("sends only what changed, with the order token in a header, then refreshes and confirms", async () => {
    const fetchMock = respond({ success: true, data: { holder: { name: "Ada K", email: "ada@example.com" }, nameChanged: true, emailChanged: false, emailSent: false } });
    vi.stubGlobal("fetch", fetchMock);
    render(editor());
    fireEvent.click(screen.getByRole("button", { name: "Edit Ada Lovelace" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ada K" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, { method: string; headers: Record<string, string>; body: string }];
    expect(url).toBe(`/api/tickets/my/order/holders/${TICKET_ID}`);
    expect(init.method).toBe("PATCH");
    expect(init.headers["x-order-token"]).toBe(TOKEN);
    expect(JSON.parse(init.body)).toEqual({ name: "Ada K" });
    expect(await screen.findByText("The ticket holder was updated.")).toBeInTheDocument();
  });

  it("sends a new email lower-cased", async () => {
    const fetchMock = respond({ success: true, data: { holder: { name: "Ada", email: "new@example.com" }, nameChanged: false, emailChanged: true, emailSent: true } });
    vi.stubGlobal("fetch", fetchMock);
    render(editor());
    fireEvent.click(screen.getByRole("button", { name: "Edit Ada Lovelace" }));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: " New@Example.com " } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse((fetchMock.mock.calls[0] as [string, { body: string }])[1].body)).toEqual({ email: "new@example.com" });
  });

  it("says nothing changed and posts nothing when the values are the same", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(editor());
    fireEvent.click(screen.getByRole("button", { name: "Edit Ada Lovelace" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Nothing was changed.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("validates an invalid email before posting", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(editor());
    fireEvent.click(screen.getByRole("button", { name: "Edit Ada Lovelace" }));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "nope" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a translated refusal and keeps the form open; no refresh", async () => {
    vi.stubGlobal("fetch", respond({ success: false, error: "api text", code: "transfersOff" }, 403));
    render(editor());
    fireEvent.click(screen.getByRole("button", { name: "Edit Ada Lovelace" }));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Passing tickets on is turned off for this event.")).toBeInTheDocument();
    expect(screen.queryByText("api text")).not.toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("Cancel closes the form, restores the values and returns focus to the Edit button", async () => {
    render(editor());
    fireEvent.click(screen.getByRole("button", { name: "Edit Ada Lovelace" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Changed" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    const button = await screen.findByRole("button", { name: "Edit Ada Lovelace" });
    await waitFor(() => expect(button).toHaveFocus());
    fireEvent.click(button);
    expect(screen.getByLabelText("Name")).toHaveValue("Ada Lovelace");
  });
});

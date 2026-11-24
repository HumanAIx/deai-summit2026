import { afterEach, describe, expect, it, vi } from "vitest";
import { axeViolations, describeViolations } from "../../helpers/axe";
import { fireEvent, render, screen, waitFor } from "../../test-utils";
import { LostLinkForm } from "../../../components/tickets/LostLinkForm";

function submit(email: string) {
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: email } });
  fireEvent.click(screen.getByRole("button", { name: "Send my links" }));
}

afterEach(() => vi.unstubAllGlobals());

describe("LostLinkForm", () => {
  it("has a labelled email field and no axe violations", async () => {
    const { container } = render(<LostLinkForm ticketsHref="/tickets" />);
    expect(screen.getByLabelText("Email address")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Email address")).toHaveAttribute("autocomplete", "email");
    const violations = await axeViolations({ container });
    expect(describeViolations(violations)).toEqual([]);
  });

  it("an empty submit says the email is required and posts nothing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<LostLinkForm ticketsHref="/tickets" />);
    fireEvent.click(screen.getByRole("button", { name: "Send my links" }));
    expect(await screen.findByText("Enter your email address.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("an invalid email says so and posts nothing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<LostLinkForm ticketsHref="/tickets" />);
    submit("not-an-email");
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the email to our own handler and always shows the same neutral success message", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<LostLinkForm ticketsHref="/de/tickets" />);
    submit("ada@example.com");

    expect(await screen.findByText("If we found tickets for that email address, we have sent the links to it.")).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/tickets/lost-link");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ email: "ada@example.com" });
    expect(screen.getByRole("link", { name: "Back to tickets" })).toHaveAttribute("href", "/de/tickets");
    const violations = await axeViolations({ container });
    expect(describeViolations(violations)).toEqual([]);
  });

  it("shows a translated message for our own rate limit, never the API text", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, error: "internal detail", code: "rateLimited" }), { status: 429 })));
    render(<LostLinkForm ticketsHref="/tickets" />);
    submit("ada@example.com");
    expect(await screen.findByText("Too many attempts. Please wait a few minutes and try again.")).toBeInTheDocument();
    expect(screen.queryByText("internal detail")).not.toBeInTheDocument();
  });

  it("an unknown error code or a network failure falls back to a generic message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, code: "weird.code" }), { status: 500 })));
    const { unmount } = render(<LostLinkForm ticketsHref="/tickets" />);
    submit("ada@example.com");
    expect(await screen.findByText("Something went wrong. Please try again.")).toBeInTheDocument();
    unmount();

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    render(<LostLinkForm ticketsHref="/tickets" />);
    submit("ada@example.com");
    await waitFor(() => expect(screen.getByText("We could not reach the ticket service. Please try again in a moment.")).toBeInTheDocument());
  });
});

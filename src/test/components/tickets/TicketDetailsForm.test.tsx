import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axeViolations, describeViolations } from "../../helpers/axe";
import { fireEvent, render, screen, waitFor, within } from "../../test-utils";
import type { ProfileBlock } from "../../../lib/tickets/schemas";

const router = { push: vi.fn(), refresh: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { TicketDetailsForm, changedBody, missingOf, toggleDiet } = await import("../../../components/tickets/TicketDetailsForm");
const { CompleteDetailsButton } = await import("../../../components/tickets/CompleteDetailsButton");

const TOKEN = "h".repeat(43);
const EMPTY = { company: "", jobTitle: "", diet: [], dietNote: "", street: "", postcode: "", city: "", country: "", phone: "", linkedin: "", website: "", telegram: "", x: "", instagram: "" } as const;
const PROFILE: ProfileBlock = {
  values: { ...EMPTY, diet: [], company: "Quantia" },
  required: ["name", "company", "jobTitle", "diet", "address"],
  missing: ["jobTitle", "diet", "address"],
  deadline: "2026-11-18T00:00:00.000Z",
  frozen: false,
  saved: false,
};

function renderForm(over: Partial<{ profile: ProfileBlock; canCorrectName: boolean; holderName: string | null }> = {}) {
  return render(
    <TicketDetailsForm
      token={TOKEN}
      profile={over.profile ?? PROFILE}
      holderName={over.holderName === undefined ? "Priya Nair" : over.holderName}
      typeName="VIP Pass"
      eventName="DeAI Summit 2026"
      canCorrectName={over.canCorrectName ?? true}
      deadlineLabel="Nov 18, 2026"
    />,
  );
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const saved = (values: Partial<ProfileBlock["values"]>, missing: ProfileBlock["missing"] = []): unknown => ({ success: true, data: { ...PROFILE, values: { ...PROFILE.values, ...values }, missing, saved: true } });

beforeEach(() => {
  router.refresh.mockReset();
  window.location.hash = "";
  window.scrollTo = vi.fn();
});
afterEach(() => vi.unstubAllGlobals());

describe("details helpers", () => {
  const values = { name: "Priya", ...EMPTY, diet: [] as never[], company: "Quantia" };

  it("missingOf follows the required groups; the address needs all four parts", () => {
    expect(missingOf({ required: ["name", "company", "jobTitle", "diet", "address"], values })).toEqual(["jobTitle", "diet", "address"]);
    expect(missingOf({ required: ["name"], values: { ...values, name: " " } })).toEqual(["name"]);
    expect(missingOf({ required: ["address"], values: { ...values, street: "A 1", postcode: "B", city: "C" } })).toEqual(["address"]);
    expect(missingOf({ required: ["address"], values: { ...values, street: "A 1", postcode: "B", city: "C", country: "MT" } })).toEqual([]);
  });

  it("toggleDiet: 'No requirements' stands alone, another value clears it, list order is kept", () => {
    expect(toggleDiet({ diet: ["vegan"], value: "none" })).toEqual(["none"]);
    expect(toggleDiet({ diet: ["none"], value: "halal" })).toEqual(["halal"]);
    expect(toggleDiet({ diet: ["kosher"], value: "vegan" })).toEqual(["vegan", "kosher"]);
    expect(toggleDiet({ diet: ["vegan", "kosher"], value: "vegan" })).toEqual(["kosher"]);
  });

  it("changedBody sends only what changed, trims, upper-cases the postcode and drops the note with the last allergy", () => {
    const before = { ...values, diet: ["nut_allergy"] as never[], dietNote: "Severe" };
    expect(changedBody({ saved: before, values: before })).toEqual({});
    expect(changedBody({ saved: before, values: { ...before, city: " Valletta ", postcode: "bkr 1" } })).toEqual({ city: "Valletta", postcode: "BKR 1" });
    expect(changedBody({ saved: before, values: { ...before, diet: ["vegan"] as never[] } })).toEqual({ diet: ["vegan"], dietNote: "" });
  });
});

describe("TicketDetailsForm", () => {
  it("shows the progress, the badge preview and marks the empty required fields", () => {
    renderForm();
    expect(screen.getByText("2 of 5 done")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Details completed" })).toHaveAttribute("aria-valuenow", "2");
    const badge = screen.getByRole("img", { name: "Badge preview" });
    expect(within(badge).getByText("Priya Nair")).toBeInTheDocument();
    expect(within(badge).getByText("Quantia")).toBeInTheDocument();
    expect(within(badge).getByText("VIP Pass")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Job title/ })).toHaveAttribute("data-missing", "true");
    expect(screen.getByRole("textbox", { name: /Company/ })).not.toHaveAttribute("data-missing");
    expect(screen.getByRole("textbox", { name: /Street and number/ })).toHaveAttribute("data-missing", "true");
    expect(screen.getByRole("combobox", { name: /Country/ })).toHaveAttribute("data-missing", "true");
    expect(screen.getByText(/Badges? is printed from these details on Nov 18, 2026|Your badge is printed from these details on Nov 18, 2026/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Still missing: job title, dietary requirements, address");
  });

  it("the badge preview follows what is typed; the save button waits for a change", () => {
    renderForm();
    const save = screen.getByRole("button", { name: "Save details" });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: /Job title/ }), { target: { value: "Head of Product" } });
    expect(within(screen.getByRole("img", { name: "Badge preview" })).getByText("Head of Product")).toBeInTheDocument();
    expect(save).not.toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Unsaved changes · you can save now and finish later");
  });

  it("dietary chips: pressed state, 'No requirements' alone, and the caterer note only with an allergy", () => {
    renderForm();
    const vegan = screen.getByRole("button", { name: "Vegan" });
    fireEvent.click(vegan);
    expect(screen.getByRole("button", { name: /Vegan/ })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "No requirements" }));
    expect(screen.getByRole("button", { name: /No requirements/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Vegan" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("textbox", { name: /Tell the caterer more/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Nut allergy" }));
    expect(screen.getByRole("textbox", { name: /Tell the caterer more/ })).toBeInTheDocument();
  });

  it("saves only the changed fields with the token in a header, says what is still missing, and refreshes the page", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(saved({ jobTitle: "CTO", diet: ["vegan"] }, ["address"])));
    vi.stubGlobal("fetch", fetchMock);
    renderForm();
    fireEvent.change(screen.getByRole("textbox", { name: /Job title/ }), { target: { value: " CTO " } });
    fireEvent.click(screen.getByRole("button", { name: "Vegan" }));
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, { method: string; headers: Record<string, string>; body: string }];
    expect(url).toBe("/api/tickets/my/ticket/profile");
    expect(init.method).toBe("PUT");
    expect(init.headers["x-ticket-token"]).toBe(TOKEN);
    expect(JSON.parse(init.body)).toEqual({ jobTitle: "CTO", diet: ["vegan"] });
    expect(await screen.findByText(/^Saved \d\d:\d\d · still missing: address$/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save details" })).toBeDisabled();
  });

  it("a changed name goes through the name route first, then the details", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ success: true, data: { holder: { name: "Priya N" } } }))
      .mockResolvedValueOnce(json(saved({ city: "Valletta" })));
    vi.stubGlobal("fetch", fetchMock);
    renderForm();
    fireEvent.change(screen.getByRole("textbox", { name: /Full name/ }), { target: { value: "Priya N" } });
    fireEvent.change(screen.getByRole("textbox", { name: /City/ }), { target: { value: "Valletta" } });
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual(["/api/tickets/my/ticket/name", "/api/tickets/my/ticket/profile"]);
    expect(JSON.parse((fetchMock.mock.calls[0] as [string, { body: string }])[1].body)).toEqual({ name: "Priya N" });
  });

  it("name saved but details refused: says so, the name is no longer unsaved, and a retry sends only the details", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ success: true, data: { holder: { name: "Priya N" } } }))
      .mockResolvedValueOnce(json({ success: false, error: "boom", code: "unavailable" }, 503))
      .mockResolvedValueOnce(json(saved({ city: "Valletta" })));
    vi.stubGlobal("fetch", fetchMock);
    renderForm();
    fireEvent.change(screen.getByRole("textbox", { name: /Full name/ }), { target: { value: "Priya N" } });
    fireEvent.change(screen.getByRole("textbox", { name: /City/ }), { target: { value: "Valletta" } });
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    expect(await screen.findByText(/Your name was saved, but your other details were not/)).toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: /City/ })).toHaveValue("Valletta");
    expect(screen.getByRole("textbox", { name: /Full name/ })).toHaveValue("Priya N");
    expect(screen.getByRole("button", { name: "Save details" })).not.toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual(["/api/tickets/my/ticket/name", "/api/tickets/my/ticket/profile", "/api/tickets/my/ticket/profile"]);
    expect(JSON.parse((fetchMock.mock.calls[2] as [string, { body: string }])[1].body)).toEqual({ city: "Valletta" });
  });

  it("the name is read-only when name changes are closed; company and job title after the badge cut-off", () => {
    renderForm({ canCorrectName: false, profile: { ...PROFILE, frozen: true } });
    expect(screen.getByRole("textbox", { name: /Full name/ })).toBeDisabled();
    expect(screen.getByText("Name changes are closed for this ticket.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Job title/ })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: /Company/ })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: /City/ })).not.toBeDisabled();
    expect(screen.getByText(/Badges are being printed/)).toBeInTheDocument();
  });

  it("an invalid field is refused before sending: the error sits next to it and it gets the focus", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderForm();
    const phone = screen.getByRole("textbox", { name: /Phone/ });
    fireEvent.change(phone, { target: { value: "<call me>" } });
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    expect(await screen.findByText("Check this field.")).toBeInTheDocument();
    expect(phone).toHaveAttribute("aria-invalid", "true");
    expect(phone).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("an API refusal shows a translated message (never the API text) and keeps the changes", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ success: false, error: "api text", code: "badgeFrozen" }, 409)));
    renderForm();
    fireEvent.change(screen.getByRole("textbox", { name: /Job title/ }), { target: { value: "CEO" } });
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    expect(await screen.findByText("Badges are being printed: company and job title can no longer be changed.")).toBeInTheDocument();
    expect(screen.queryByText("api text")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Job title/ })).toHaveValue("CEO");
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("'Complete my details' and #details in the address scroll to the form and focus the first missing field", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
    renderForm();
    render(<CompleteDetailsButton label="Complete my details" />);
    fireEvent.click(screen.getByRole("button", { name: "Complete my details" }));
    expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: "smooth" }));
    expect(screen.getByRole("textbox", { name: /Job title/ })).toHaveFocus();
  });

  it("respects reduced motion, and opening the page at #details does the same", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    window.location.hash = "#details";
    renderForm();
    await waitFor(() => expect(screen.getByRole("textbox", { name: /Job title/ })).toHaveFocus());
    expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: "auto" }));
  });

  it("has no axe violations", async () => {
    const { container } = renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Other allergy" }));
    expect(describeViolations(await axeViolations({ container }))).toEqual([]);
  });
});

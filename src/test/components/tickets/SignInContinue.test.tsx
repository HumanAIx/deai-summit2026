import { describe, expect, it } from "vitest";
import { resolveServerElement } from "../../helpers/resolve-server";
import { render, screen } from "../../test-utils";

const { SignInContinue } = await import("../../../components/tickets/SignInContinue");

describe("SignInContinue", () => {
  it("is a plain POST form carrying the token in a hidden field (never in a URL), with a Continue button", async () => {
    const ui = await resolveServerElement(<SignInContinue token={"s".repeat(43)} />);
    const { container } = render(<>{ui}</>);
    const form = container.querySelector("form") as HTMLFormElement;
    expect(form).toHaveAttribute("method", "post");
    expect(form).toHaveAttribute("action", "/api/tickets/sign-in");
    expect(form.querySelector('input[name="token"]')).toHaveValue("s".repeat(43));
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Continue to your tickets" })).toBeInTheDocument();
  });
});

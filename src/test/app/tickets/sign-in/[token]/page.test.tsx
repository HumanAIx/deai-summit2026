import { describe, expect, it, vi } from "vitest";

const { postSignIn, fetchMySession, fetchMyOverview } = vi.hoisted(() => ({ postSignIn: vi.fn(), fetchMySession: vi.fn(), fetchMyOverview: vi.fn() }));
vi.mock("@/lib/tickets/api", () => ({ postSignIn, fetchMySession, fetchMyOverview }));
vi.mock("react/jsx-dev-runtime", async () => (await import("../../../../helpers/jsx-stub")).jsxStub);
vi.mock("react/jsx-runtime", async () => (await import("../../../../helpers/jsx-stub")).jsxStub);
vi.mock("@/components/tickets/SignInContinue", () => ({ SignInContinue: function SignInContinue() { return null; } }));
vi.mock("@/components/tickets/InvalidLinkState", () => ({ InvalidLinkState: function InvalidLinkState() { return null; } }));

const page = await import("../../../../../app/tickets/sign-in/[token]/page");
const { SignInContinue } = await import("../../../../../components/tickets/SignInContinue");
const { InvalidLinkState } = await import("../../../../../components/tickets/InvalidLinkState");

const TOKEN = "s".repeat(43);

describe("/tickets/sign-in/[token] page", () => {
  it("is private: force-dynamic, noindex, no referrer (the token is in the URL)", async () => {
    expect(page.dynamic).toBe("force-dynamic");
    expect(await page.generateMetadata()).toMatchObject({ robots: { index: false, follow: false }, referrer: "no-referrer" });
  });

  it("renders the Continue step WITHOUT calling ep-api (a mail scanner opening the link must not use the token)", async () => {
    const element = await page.default({ params: Promise.resolve({ token: TOKEN }) });
    expect(element.type).toBe(SignInContinue);
    expect(element.props.token).toBe(TOKEN);
    expect(postSignIn).not.toHaveBeenCalled();
    expect(fetchMySession).not.toHaveBeenCalled();
    expect(fetchMyOverview).not.toHaveBeenCalled();
  });

  it("a malformed token is the opaque invalid state", async () => {
    expect((await page.default({ params: Promise.resolve({ token: "bad!" }) })).type).toBe(InvalidLinkState);
    expect(postSignIn).not.toHaveBeenCalled();
  });
});

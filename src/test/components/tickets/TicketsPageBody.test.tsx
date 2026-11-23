import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchPublicTypes, fetchLinkType } = vi.hoisted(() => ({ fetchPublicTypes: vi.fn(), fetchLinkType: vi.fn() }));
vi.mock("@/lib/tickets/api", () => ({ fetchPublicTypes, fetchLinkType }));
vi.mock("react/jsx-dev-runtime", async () => (await import("../../helpers/jsx-stub")).jsxStub);
vi.mock("react/jsx-runtime", async () => (await import("../../helpers/jsx-stub")).jsxStub);
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/components/tickets/TicketTypeList", () => ({ TicketTypeList: function TicketTypeList() { return null; } }));
vi.mock("@/components/tickets/TicketLinkInvalid", () => ({ TicketLinkInvalid: function TicketLinkInvalid() { return null; } }));

const { TicketsPageBody } = await import("@/components/tickets/TicketsPageBody");

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const type = (id: string) => ({ id, name: id.slice(0, 1) });
const checkout = { salesOpen: true, testMode: true, feePayer: "buyer" };
type El = { props: { data: { types: Array<{ id: string }> } } };

beforeEach(() => {
  fetchPublicTypes.mockReset();
  fetchLinkType.mockReset();
  fetchPublicTypes.mockResolvedValue({ types: [type(A), type(B), type(C)], checkout });
});

describe("TicketsPageBody — the CMS-picked ticket types", () => {
  it("offers only the allowed types, in the CMS card order", async () => {
    const el = (await TicketsPageBody({ allowedTypeIds: [C, A] })) as unknown as El;
    expect(el.props.data.types.map((t) => t.id)).toEqual([C, A]);
  });

  it("skips a picked type the catalogue does not hold (deleted, not public)", async () => {
    const el = (await TicketsPageBody({ allowedTypeIds: ["99999999-9999-4999-8999-999999999999", B] })) as unknown as El;
    expect(el.props.data.types.map((t) => t.id)).toEqual([B]);
  });

  it("offers every public type without a list", async () => {
    const el = (await TicketsPageBody({ allowedTypeIds: null })) as unknown as El;
    expect(el.props.data.types.map((t) => t.id)).toEqual([A, B, C]);
  });

  it("never narrows a private link: it names its one hidden type itself", async () => {
    fetchLinkType.mockResolvedValue({ types: [type(C)], checkout });
    const el = (await TicketsPageBody({ rawLink: "x".repeat(24), allowedTypeIds: [A] })) as unknown as El;
    expect(el.props.data.types.map((t) => t.id)).toEqual([C]);
  });
});

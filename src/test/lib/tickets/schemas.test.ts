import { describe, expect, it } from "vitest";
import {
  checkoutBlockSchema,
  createOrderBodySchema,
  documentIdSchema,
  holderEditBodySchema,
  holderEditResultSchema,
  lostLinkBodySchema,
  myOrderSchema,
  myTicketSchema,
  nameBodySchema,
  orderIdSchema,
  passOnBodySchema,
  passOnResultSchema,
  cancelResultSchema,
  createOrderResultSchema,
  extendResultSchema,
  quoteResultSchema,
  refundRequestBodySchema,
  refundRequestResultSchema,
  ticketIdSchema,
  ticketTokenSchema,
} from "../../../lib/tickets/schemas";

const ticket = {
  code: "DEAI-T-4F2A-91",
  status: "valid",
  holder: { name: "Ada", email: "ada@example.com" },
  ticketType: { name: "General", scope: { mode: "all" } },
  source: { kind: "event", name: "Summit", startDate: "2026-11-25", endDate: "2026-11-25", timeZone: "Europe/Malta", startsAt: "2026-11-25T08:00:00.000Z" },
  qrImageUrl: "https://api.example.com/api/tickets/qr/x.sig.png",
  seller: { name: "Acme Ltd", vatNumber: "MT123", replyTo: "hi@acme.example" },
};

describe("myTicketSchema", () => {
  it("accepts the API shape and an unknown status string (a new state must not break the page)", () => {
    expect(myTicketSchema.parse(ticket).code).toBe(ticket.code);
    expect(myTicketSchema.parse({ ...ticket, status: "something_new" }).status).toBe("something_new");
  });
  it("accepts a ticket without a QR (refunded / void)", () => {
    const rest: Partial<typeof ticket> = { ...ticket };
    delete rest.qrImageUrl;
    expect(myTicketSchema.parse({ ...rest, status: "refunded" }).qrImageUrl).toBeUndefined();
  });
  it("refuses a QR url that is not http(s)", () => {
    expect(myTicketSchema.safeParse({ ...ticket, qrImageUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(myTicketSchema.safeParse({ ...ticket, qrImageUrl: "data:image/png;base64,AAAA" }).success).toBe(false);
  });
  it("refuses a body missing required fields", () => {
    expect(myTicketSchema.safeParse({ ...ticket, code: undefined }).success).toBe(false);
  });
});

describe("myOrderSchema", () => {
  const order = {
    orderNo: 7,
    status: "paid",
    paidAt: "2026-11-12T10:00:00.000Z",
    currency: "EUR",
    lines: [{ name: "General", quantity: 2, unitCents: 5000, discountCents: 0, feeCents: 100, vatRate: 18, grossCents: 10200 }],
    totals: { totalCents: 10200, vatCents: 1556, feeCents: 200 },
    holders: [{ name: "Ada", email: "ada@example.com", status: "valid", ticketCode: "T-1" }],
    documents: [{ id: "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11", kind: "invoice", number: "INV-2026-0001", issueDate: "2026-11-12", grossCents: 10200 }],
    seller: { name: null, vatNumber: null, replyTo: null },
  };
  it("accepts the API shape, with or without the isTest flag", () => {
    expect(myOrderSchema.parse(order).orderNo).toBe(7);
    expect(myOrderSchema.parse({ ...order, isTest: true }).isTest).toBe(true);
  });
  it("carries each holder's checkout answers when ep-api sends them, and still parses without them", () => {
    const answers = { company: "Quantia", jobTitle: "CTO", dietary: "other", dietaryOther: "no nuts", tshirt: "L" };
    const parsed = myOrderSchema.parse({ ...order, holders: [{ ...order.holders[0], answers }, { ...order.holders[0], answers: {} }, order.holders[0]] });
    expect(parsed.holders[0]?.answers).toEqual(answers);
    expect(parsed.holders[1]?.answers).toEqual({});
    expect(parsed.holders[2]?.answers).toBeUndefined();
  });
  it("refuses a document id that is not a uuid (it ends up in a URL path)", () => {
    expect(myOrderSchema.safeParse({ ...order, documents: [{ ...order.documents[0], id: "../x" }] }).success).toBe(false);
  });
});

describe("input schemas", () => {
  it("ticketTokenSchema matches ep-api's token shape", () => {
    expect(ticketTokenSchema.safeParse("a".repeat(43)).success).toBe(true);
    expect(ticketTokenSchema.safeParse("short").success).toBe(false);
    expect(ticketTokenSchema.safeParse(`${"a".repeat(30)}/../x`).success).toBe(false);
  });
  it("ids are uuids; the lost-link email is trimmed and lower-cased", () => {
    expect(orderIdSchema.safeParse("nope").success).toBe(false);
    expect(documentIdSchema.safeParse("5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11").success).toBe(true);
    expect(lostLinkBodySchema.parse({ email: "  Ada@Example.COM " }).email).toBe("ada@example.com");
    expect(lostLinkBodySchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});

describe("holder self-service (DASH-205 F1)", () => {
  const ID = "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11";
  const ID2 = "6d2f8b2f-3a5b-4b64-8b4f-1f7a7b5d2c22";

  it("myTicketSchema reads the allowed flags and the close time, and still accepts an older ep-api without them", () => {
    const parsed = myTicketSchema.parse({ ...ticket, canCorrectName: true, canPassOn: false, changesCloseAt: "2026-11-18T08:00:00.000Z" });
    expect(parsed).toMatchObject({ canCorrectName: true, canPassOn: false, changesCloseAt: "2026-11-18T08:00:00.000Z" });
    expect(myTicketSchema.parse(ticket).canCorrectName).toBeUndefined();
    expect(myTicketSchema.parse({ ...ticket, changesCloseAt: null }).changesCloseAt).toBeNull();
  });

  it("myOrderSchema reads holder ids and edit flags, the refund request and canRequestRefund, and an older shape still parses", () => {
    const base = { orderNo: 1, status: "paid", paidAt: null, currency: "EUR", lines: [], totals: { totalCents: 0, vatCents: 0, feeCents: 0 }, documents: [], seller: { name: null, vatNumber: null, replyTo: null } };
    const rich = myOrderSchema.parse({
      ...base,
      holders: [{ id: ID, name: "Ada", email: "ada@example.com", status: "valid", ticketCode: "T-1", canEdit: true, canEditName: true, canEditEmail: false }],
      changesCloseAt: "2026-11-18T08:00:00.000Z",
      refundRequest: { status: "declined", createdAt: "2026-11-12T10:00:00.000Z", ticketCount: 1, reason: "other", reply: "No." },
      canRequestRefund: true,
    });
    expect(rich.holders[0]).toMatchObject({ id: ID, canEdit: true, canEditEmail: false });
    expect(rich.refundRequest).toMatchObject({ status: "declined", reply: "No." });
    const old = myOrderSchema.parse({ ...base, holders: [{ name: "Ada", email: null, status: "valid", ticketCode: "T-1" }] });
    expect(old.holders[0]?.id).toBeUndefined();
    expect(myOrderSchema.parse({ ...base, holders: [], refundRequest: null }).refundRequest).toBeNull();
    expect(myOrderSchema.safeParse({ ...base, holders: [{ id: "not-a-uuid", name: null, email: null, status: "valid", ticketCode: "T-1" }] }).success).toBe(false);
  });

  it("nameBodySchema and passOnBodySchema trim, lower-case the email and enforce ep-api's limits", () => {
    expect(nameBodySchema.parse({ name: "  Ada  " })).toEqual({ name: "Ada" });
    expect(nameBodySchema.safeParse({ name: "   " }).success).toBe(false);
    expect(nameBodySchema.safeParse({ name: "x".repeat(201) }).success).toBe(false);
    expect(passOnBodySchema.parse({ name: " Grace ", email: " Grace@Example.COM " })).toEqual({ name: "Grace", email: "grace@example.com" });
    expect(passOnBodySchema.safeParse({ name: "Grace", email: "nope" }).success).toBe(false);
    expect(passOnBodySchema.safeParse({ name: "Grace" }).success).toBe(false);
    expect(passOnBodySchema.safeParse({ name: "Grace", email: `${"a".repeat(250)}@example.com` }).success).toBe(false);
  });

  it("holderEditBodySchema needs at least one field", () => {
    expect(holderEditBodySchema.safeParse({}).success).toBe(false);
    expect(holderEditBodySchema.parse({ name: "Ivo" })).toEqual({ name: "Ivo" });
    expect(holderEditBodySchema.parse({ email: "Ivo@Example.com" })).toEqual({ email: "ivo@example.com" });
    expect(holderEditBodySchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("refundRequestBodySchema needs 1-200 unique uuid tickets, a listed reason and a message of at most 1000", () => {
    const ok = { ticketIds: [ID, ID2], reason: "cant_attend" };
    expect(refundRequestBodySchema.parse({ ...ok, message: "  hi " }).message).toBe("hi");
    expect(refundRequestBodySchema.safeParse(ok).success).toBe(true);
    expect(refundRequestBodySchema.safeParse({ ...ok, ticketIds: [] }).success).toBe(false);
    expect(refundRequestBodySchema.safeParse({ ...ok, ticketIds: [ID, ID] }).success).toBe(false);
    expect(refundRequestBodySchema.safeParse({ ...ok, ticketIds: ["x"] }).success).toBe(false);
    expect(refundRequestBodySchema.safeParse({ ...ok, ticketIds: Array.from({ length: 201 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`) }).success).toBe(false);
    expect(refundRequestBodySchema.safeParse({ ...ok, reason: "because" }).success).toBe(false);
    expect(refundRequestBodySchema.safeParse({ ...ok, message: "m".repeat(1001) }).success).toBe(false);
  });

  it("ticketIdSchema accepts only a uuid, and the result schemas refuse a shape ep-api never sends", () => {
    expect(ticketIdSchema.safeParse(ID).success).toBe(true);
    expect(ticketIdSchema.safeParse("nope").success).toBe(false);
    expect(passOnResultSchema.safeParse({ passedOnTo: { name: "G" }, emailSent: true }).success).toBe(true);
    expect(passOnResultSchema.safeParse({ passedOnTo: "G" }).success).toBe(false);
    expect(holderEditResultSchema.safeParse({ holder: { name: null, email: null }, nameChanged: false, emailChanged: false, emailSent: false }).success).toBe(true);
    expect(refundRequestResultSchema.safeParse({ refundRequest: { status: "open", createdAt: "x", ticketCount: 1, reason: "other" } }).success).toBe(true);
    expect(refundRequestResultSchema.safeParse({}).success).toBe(false);
  });
});

describe("checkoutBlockSchema questionList", () => {
  const block = { salesOpen: true, testMode: false, feePayer: "buyer", questions: { invoice: true, terms: true } };
  it("is optional (older ep-api) and keeps the question shape, including an unknown field kind", () => {
    expect(checkoutBlockSchema.parse(block).questionList).toBeUndefined();
    const list = [{ key: "shirt", id: "tshirt", scope: "holder", fields: [{ name: "tshirt", kind: "select", required: true, options: [{ value: "M", label: "M" }] }, { name: "x", kind: "future" }] }];
    expect(checkoutBlockSchema.parse({ ...block, questionList: list }).questionList).toEqual(list);
  });
  it("refuses a question list that is not an array of questions", () => {
    expect(checkoutBlockSchema.safeParse({ ...block, questionList: "x" }).success).toBe(false);
  });
});

describe("createOrderBodySchema answers (the limits of ep-api)", () => {
  const TYPE = "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11";
  const base = { idempotencyKey: "k".repeat(36), lines: [{ ticketTypeId: TYPE, quantity: 1 }], buyer: { name: "Ada", email: "ada@example.com" }, newsletter: false, acceptTerms: true };
  const holder = (answers?: unknown) => ({ ticketTypeId: TYPE, name: "Ada", email: "ada@example.com", ...(answers === undefined ? {} : { answers }) });

  it("accepts answers and heardFrom within the limits", () => {
    const parsed = createOrderBodySchema.parse({ ...base, holders: [holder({ company: "Q", jobTitle: "CTO", dietary: "vegan", tshirt: "XXL" })], heardFrom: { value: "other", text: "a podcast" } });
    expect(parsed.holders[0]?.answers).toEqual({ company: "Q", jobTitle: "CTO", dietary: "vegan", tshirt: "XXL" });
    expect(parsed.heardFrom).toEqual({ value: "other", text: "a podcast" });
    expect(createOrderBodySchema.safeParse({ ...base, holders: [holder()] }).success).toBe(true);
  });

  it.each([
    ["company over 120", { company: "x".repeat(121) }],
    ["job title over 120", { jobTitle: "x".repeat(121) }],
    ["dietary text over 200", { dietary: "other", dietaryOther: "x".repeat(201) }],
    ["unknown dietary value", { dietary: "pescatarian" }],
    ["unknown size", { tshirt: "XXXXL" }],
    // The prototype's range is S to XXL (owner, 2026-11-12): XS and XXXL are refused like ep-api does.
    ["size below the range (XS)", { tshirt: "XS" }],
    ["size above the range (XXXL)", { tshirt: "XXXL" }],
  ])("refuses %s", (_name, answers) => {
    expect(createOrderBodySchema.safeParse({ ...base, holders: [holder(answers)] }).success).toBe(false);
  });

  it("refuses an unknown heard-from value and a text over 200", () => {
    expect(createOrderBodySchema.safeParse({ ...base, holders: [holder()], heardFrom: { value: "tv" } }).success).toBe(false);
    expect(createOrderBodySchema.safeParse({ ...base, holders: [holder()], heardFrom: { value: "other", text: "x".repeat(201) } }).success).toBe(false);
  });
});

describe("ticket page details shapes (ep-api T5)", () => {
  const values = { company: "Q", jobTitle: "", diet: ["vegan", "future_diet"], dietNote: "", street: "", postcode: "", city: "", country: "", phone: "", linkedin: "", website: "", telegram: "", x: "", instagram: "" };

  it("the profile block drops dietary values and groups this page does not know, instead of failing", async () => {
    const { profileBlockSchema } = await import("../../../lib/tickets/schemas");
    const parsed = profileBlockSchema.parse({ values, required: ["name", "diet", "badge_photo"], missing: ["diet", "badge_photo"], deadline: null, frozen: false, saved: true });
    expect(parsed.values.diet).toEqual(["vegan"]);
    expect(parsed.required).toEqual(["name", "diet"]);
    expect(parsed.missing).toEqual(["diet"]);
  });

  it("my ticket stays valid without the new fields (older ep-api) and with them", async () => {
    const { myTicketSchema } = await import("../../../lib/tickets/schemas");
    const base = {
      code: "T-1",
      status: "valid",
      holder: { name: null, email: null },
      ticketType: { name: "Pass", scope: { mode: "all" } },
      source: { kind: "event", name: "E", startDate: null, endDate: null, timeZone: "UTC", startsAt: null },
      seller: { name: null, vatNumber: null, replyTo: null },
    };
    expect(myTicketSchema.safeParse(base).success).toBe(true);
    const full = myTicketSchema.parse({ ...base, ticketType: { ...base.ticketType, description: "A\nB" }, profile: null, orderToken: "o".repeat(43) });
    expect(full.orderToken).toBe("o".repeat(43));
    expect(myTicketSchema.safeParse({ ...base, orderToken: "bad token" }).success).toBe(false);
  });

  it("the profile body mirrors ep-api's rules", async () => {
    const { profileBodySchema } = await import("../../../lib/tickets/schemas");
    expect(profileBodySchema.safeParse({ diet: ["none"], country: "mt" }).data).toEqual({ diet: ["none"], country: "MT" });
    expect(profileBodySchema.safeParse({ diet: ["none", "vegan"] }).success).toBe(false);
    expect(profileBodySchema.safeParse({ phone: "+356 (99) 12-34" }).success).toBe(true);
    expect(profileBodySchema.safeParse({ unknown: 1 }).success).toBe(false);
  });
});

describe("quote codeStatus (DASH-236 TK-04)", () => {
  const totals = { lines: [], subtotalCents: 0, discountCents: 0, feeCents: 0, totalCents: 0, vatCents: 0 };
  const parse = (extra: Record<string, unknown>) => quoteResultSchema.parse({ totals, currency: "EUR", ...extra });

  it("parses each of ep-api's six statuses and the not-valid-now dates", () => {
    for (const status of ["none", "valid", "unknown", "not_valid_now", "not_applicable", "used_up"]) {
      expect(parse({ codeStatus: status }).codeStatus).toBe(status);
    }
    const result = parse({ codeStatus: "not_valid_now", validFrom: "2026-12-01T09:00:00.000Z", validUntil: null });
    expect(result.validFrom).toBe("2026-12-01T09:00:00.000Z");
    expect(result.validUntil).toBeNull();
    expect(parse({ codeStatus: "none" }).validFrom).toBeUndefined();
  });

  it("reads the old 'invalid' and any future value as unknown, never as valid", () => {
    expect(parse({ codeStatus: "invalid" }).codeStatus).toBe("unknown");
    expect(parse({ codeStatus: "brand_new_reason" }).codeStatus).toBe("unknown");
    expect(parse({ codeStatus: 7 }).codeStatus).toBe("unknown");
  });
});

describe("isTest, canCancel and holdMaxAt (DASH-236)", () => {
  it("the ticket parses isTest and canCancel, and both are optional", () => {
    expect(myTicketSchema.parse({ ...ticket, isTest: true, canCancel: true })).toMatchObject({ isTest: true, canCancel: true });
    const plain = myTicketSchema.parse(ticket);
    expect(plain.isTest).toBeUndefined();
    expect(plain.canCancel).toBeUndefined();
  });

  it("the cancel answer keeps only the status", () => {
    expect(cancelResultSchema.parse({ code: "X", status: "void", holder: { email: "a@b.c" } })).toEqual({ status: "void" });
  });

  it("order create and extend carry holdMaxAt when ep-api sends it", () => {
    const cart = { lines: [], subtotalCents: 0, discountCents: 0, feeCents: 0, totalCents: 0, vatCents: 0 };
    const base = { orderId: "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11", buyerToken: "t".repeat(43), holdExpiresAt: "2030-01-01T00:15:00Z", totals: cart, clientSecret: null, publishableKey: null, free: true };
    expect(createOrderResultSchema.parse({ ...base, holdMaxAt: "2030-01-01T00:30:00Z" }).holdMaxAt).toBe("2030-01-01T00:30:00Z");
    expect(createOrderResultSchema.parse(base).holdMaxAt).toBeUndefined();
    expect(extendResultSchema.parse({ holdExpiresAt: "2030-01-01T00:25:00Z", holdMaxAt: "2030-01-01T00:30:00Z" }).holdMaxAt).toBe("2030-01-01T00:30:00Z");
  });
});

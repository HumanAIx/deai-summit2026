import { describe, expect, it, vi } from "vitest";

const { FakeEpApiError } = vi.hoisted(() => {
  class FakeEpApiError extends Error {
    constructor(
      readonly status: number,
      readonly path: string,
      message: string,
      readonly code?: string,
      readonly details?: Record<string, unknown>,
    ) {
      super(message);
    }
  }
  return { FakeEpApiError };
});
vi.mock("@/lib/tickets/ep-client", () => ({ EpApiError: FakeEpApiError }));

const { statusForTicketError, ticketErrorCode, ticketErrorDetails, TICKET_ERROR_CODES } = await import("../../../lib/tickets/errors");

describe("ticketErrorCode", () => {
  it("maps by HTTP status when ep-api sent no machine code", () => {
    expect(ticketErrorCode({ error: new FakeEpApiError(404, "/x", "nope") })).toBe("notFound");
    expect(ticketErrorCode({ error: new FakeEpApiError(429, "/x", "slow down") })).toBe("rateLimited");
    expect(ticketErrorCode({ error: new FakeEpApiError(401, "/x", "no") })).toBe("forbidden");
    expect(ticketErrorCode({ error: new FakeEpApiError(403, "/x", "no") })).toBe("forbidden");
    expect(ticketErrorCode({ error: new FakeEpApiError(400, "/x", "bad") })).toBe("invalid");
    expect(ticketErrorCode({ error: new FakeEpApiError(409, "/x", "conflict") })).toBe("invalid");
  });

  it("honours a known tickets.* code when ep-api starts sending one", () => {
    expect(ticketErrorCode({ error: new FakeEpApiError(409, "/x", "Sold out", "tickets.soldOut") })).toBe("soldOut");
  });

  it("maps every tickets.* key the checkout can hit (ep-api #432) to a code with a message", async () => {
    const mapped: Record<string, string> = {
      soldOut: "soldOut",
      priceChanged: "priceChanged",
      codeInvalid: "codeInvalid",
      codeNotValidNow: "codeNotValidNow",
      codeNotApplicable: "codeNotApplicable",
      codeUsedUp: "codeUsedUp",
      codeOnce: "codeOnce",
      oneEventPerOrder: "oneEventPerOrder",
      holdersMismatch: "holdersMismatch",
      termsRequired: "termsRequired",
      answerInvalid: "answerInvalid",
      answerRequired: "answerRequired",
      idempotencyKeyReused: "idempotencyKeyReused",
      paymentUnavailable: "paymentUnavailable",
      linkNotFound: "linkNotFound",
      tooManyPending: "tooManyOpenOrders",
      paused: "notOnSale",
      saleEnded: "notOnSale",
      typeUnavailable: "notOnSale",
      overMax: "overMax",
      overQuantity: "overMax",
      typeNotFound: "linkNotFound",
      duplicate: "idempotencyKeyReused",
      typeMismatch: "holdersMismatch",
      stripeNotConnected: "paymentUnavailable",
      siteNotConfigured: "salesClosed",
      contactRequired: "contactRequired",
    };
    const messages = (await import("@/lib/tickets/messages.en.json")).default as { tickets: { errors: Record<string, string> } };
    for (const [key, expected] of Object.entries(mapped)) {
      const code = ticketErrorCode({ error: new FakeEpApiError(409, "/x", "text", `tickets.${key}`) });
      expect(code, key).toBe(expected);
      expect(messages.tickets.errors[code], key).toBeTruthy();
    }
  });

  it("ignores an unknown tickets.* code and never echoes raw API text", () => {
    expect(ticketErrorCode({ error: new FakeEpApiError(409, "/x", "secret detail", "tickets.somethingNew") })).toBe("invalid");
  });

  it("treats 5xx, network failures and non-API errors as unavailable", () => {
    expect(ticketErrorCode({ error: new FakeEpApiError(502, "/x", "bad gateway") })).toBe("unavailable");
    expect(ticketErrorCode({ error: new FakeEpApiError(0, "/x", "network error") })).toBe("unavailable");
    expect(ticketErrorCode({ error: new Error("boom") })).toBe("unavailable");
  });
});

describe("ticketErrorDetails", () => {
  const ID = "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11";
  it("passes on only a well-formed ticket type id and a short status word", () => {
    expect(ticketErrorDetails({ error: new FakeEpApiError(409, "/x", "t", "tickets.soldOut", { ticketTypeId: ID, status: "sold_out", other: "x" }) })).toEqual({ ticketTypeId: ID, status: "sold_out" });
    expect(ticketErrorDetails({ error: new FakeEpApiError(409, "/x", "t", "tickets.soldOut", { ticketTypeId: ID }) })).toEqual({ ticketTypeId: ID });
    expect(ticketErrorDetails({ error: new FakeEpApiError(409, "/x", "t", "tickets.soldOut", { ticketTypeId: ID, status: "<script>" }) })).toEqual({ ticketTypeId: ID });
  });
  it("drops anything else", () => {
    expect(ticketErrorDetails({ error: new FakeEpApiError(409, "/x", "t", "tickets.soldOut", { ticketTypeId: "not-a-uuid" }) })).toBeUndefined();
    expect(ticketErrorDetails({ error: new FakeEpApiError(409, "/x", "t", "tickets.soldOut") })).toBeUndefined();
    expect(ticketErrorDetails({ error: new Error("x") })).toBeUndefined();
  });
});

describe("statusForTicketError", () => {
  it("answers a sensible HTTP status for every code", () => {
    for (const code of TICKET_ERROR_CODES) {
      const status = statusForTicketError({ code });
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(600);
    }
    expect(statusForTicketError({ code: "notFound" })).toBe(404);
    expect(statusForTicketError({ code: "rateLimited" })).toBe(429);
    expect(statusForTicketError({ code: "forbidden" })).toBe(403);
    expect(statusForTicketError({ code: "unavailable" })).toBe(502);
    expect(statusForTicketError({ code: "invalid" })).toBe(400);
    expect(statusForTicketError({ code: "soldOut" })).toBe(409);
    expect(statusForTicketError({ code: "codeUsedUp" })).toBe(409);
    expect(statusForTicketError({ code: "oneEventPerOrder" })).toBe(400);
    expect(statusForTicketError({ code: "paymentUnavailable" })).toBe(502);
  });

  it("has an English message for every code (so the client never shows a raw key)", async () => {
    const messages = (await import("@/lib/tickets/messages.en.json")).default as { tickets: { errors: Record<string, string> } };
    for (const code of TICKET_ERROR_CODES) expect(messages.tickets.errors[code], code).toBeTruthy();
  });
});

describe("holder self-service codes (DASH-205 F1)", () => {
  it("maps each tickets.* key ep-api sends to its own code, with a message and its HTTP status", async () => {
    const messages = (await import("@/lib/tickets/messages.en.json")).default as { tickets: { errors: Record<string, string> } };
    const expected: Array<[string, string, number]> = [
      ["nameChangesOff", "nameChangesOff", 403],
      ["transfersOff", "transfersOff", 403],
      ["changesClosed", "changesClosed", 409],
      ["passOnSameEmail", "passOnSameEmail", 409],
      ["refundRequestOpen", "refundRequestOpen", 409],
      // ep-api DASH-205: a ticket in an open refund request cannot be passed on or get a new email.
      ["refundRequestPending", "refundRequestPending", 409],
      ["ticketsNotRefundable", "ticketsNotRefundable", 409],
      ["orderNotRefundable", "orderNotRefundable", 409],
    ];
    for (const [key, code, status] of expected) {
      const mapped = ticketErrorCode({ error: new FakeEpApiError(status, "/x", "text", `tickets.${key}`) });
      expect(mapped, key).toBe(code);
      expect(statusForTicketError({ code: mapped }), key).toBe(status);
      expect(messages.tickets.errors[mapped], key).toBeTruthy();
    }
  });
});

describe("waitlist codes (DASH-205 F3)", () => {
  it("maps each tickets.* key ep-api sends to its own code, with a message and a 409", async () => {
    const messages = (await import("@/lib/tickets/messages.en.json")).default.tickets.errors as Record<string, string>;
    for (const key of ["waitlistClosed", "offerEnded", "offerOverQuantity", "offerInUse"]) {
      expect(TICKET_ERROR_CODES).toContain(key);
      expect(ticketErrorCode({ error: new FakeEpApiError(409, "/x", "raw", `tickets.${key}`) })).toBe(key);
      expect(statusForTicketError({ code: key as never })).toBe(409);
      expect(messages[key]).toBeTruthy();
    }
  });

  it("tickets.captchaRequired / tickets.captchaFailed map to their own codes, answered as a 400, with English messages", async () => {
    const messages = (await import("@/lib/tickets/messages.en.json")).default.tickets.errors as Record<string, string>;
    for (const key of ["captchaRequired", "captchaFailed"] as const) {
      expect(TICKET_ERROR_CODES).toContain(key);
      expect(ticketErrorCode({ error: new FakeEpApiError(400, "/x", "raw", `tickets.${key}`) })).toBe(key);
      expect(statusForTicketError({ code: key })).toBe(400);
      expect(messages[key]).toBeTruthy();
    }
  });

  it("tickets.waitlistTooMany maps to its own code, answered as a 400, with an English message", async () => {
    const messages = (await import("@/lib/tickets/messages.en.json")).default.tickets.errors as Record<string, string>;
    expect(TICKET_ERROR_CODES).toContain("waitlistTooMany");
    expect(ticketErrorCode({ error: new FakeEpApiError(400, "/x", "raw", "tickets.waitlistTooMany") })).toBe("waitlistTooMany");
    expect(statusForTicketError({ code: "waitlistTooMany" })).toBe(400);
    expect(messages.waitlistTooMany).toBe("This ticket type doesn't have that many places. Ask for fewer tickets.");
  });

  it("an offer that ended read as a 404 still maps to offerEnded (the code wins over the status)", () => {
    expect(ticketErrorCode({ error: new FakeEpApiError(404, "/x", "raw", "tickets.offerEnded") })).toBe("offerEnded");
  });
});

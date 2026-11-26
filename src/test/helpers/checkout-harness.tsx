import { expect, vi } from "vitest";
import { fireEvent, screen, waitFor } from "../test-utils";
import { NO_EXTRA_QUESTIONS } from "../../lib/tickets/checkout-questions";
import type { CheckoutConfig } from "../../components/tickets/checkout/types";
import type { PublicType } from "../../lib/tickets/schemas";

/** Shared fixtures + a scripted fake of our own `/api/tickets/*` handlers for the checkout client tests. */
export const TYPE_A_ID = "5c1f7a1e-2f4a-4a53-9a3e-0e6f6a4c1b11";
export const TYPE_B_ID = "9b2d1c33-7e5a-4f6b-8c1d-3a4b5c6d7e8f";
export const TYPE_C_ID = "1d2e3f40-5a6b-4c7d-8e9f-0a1b2c3d4e5f";
export const ORDER_ID = "7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d";
export const BUYER_TOKEN = "t".repeat(43);

export const typeA: PublicType = { id: TYPE_A_ID, name: "Full pass", description: "Both days", priceCents: 15000, currency: "EUR", bookingFeeCents: 250, status: "on_sale", left: null, maxPerOrder: 10, source: { kind: "event", id: "e1", name: "DeAI Summit" } };
export const typeC: PublicType = { ...typeA, id: TYPE_C_ID, name: "Student pass", priceCents: 5000 };
export const typeB: PublicType = { ...typeA, id: TYPE_B_ID, name: "Workshop seat", priceCents: 4000, source: { kind: "schedule", id: "s1", name: "Workshops" } };

export const config: CheckoutConfig = {
  salesOpen: true,
  testMode: false,
  feePayer: "buyer",
  termsUrl: "https://acme.example/terms",
  privacyUrl: "https://acme.example/privacy",
  questions: { invoice: true, terms: true },
  extraQuestions: NO_EXTRA_QUESTIONS,
  newsletterOffer: { on: true, pct: 5 },
};

export interface Call {
  url: string;
  body: Record<string, unknown> | undefined;
  headers: Record<string, string>;
}

type Reply = { status?: number; body: unknown };
const ok = (data: unknown, status = 200): Reply => ({ status, body: { success: true, data } });
export const refusal = ({ code, status = 409, ticketTypeId }: { code: string; status?: number; ticketTypeId?: string }): Reply => ({
  status,
  body: { success: false, error: "raw upstream text", code, ...(ticketTypeId ? { details: { ticketTypeId, status: "sold_out" } } : {}) },
});

/** The numbers are ep-api's and deliberately NOT unit x quantity: the page must show them as given. */
export function quoteAnswer({ body, total = 12345 }: { body: { lines: { ticketTypeId: string; quantity: number }[]; discountCode?: string }; total?: number }) {
  return {
    totals: {
      lines: body.lines.map((line) => ({ ticketTypeId: line.ticketTypeId, quantity: line.quantity, unitCents: 15000, discountCents: 0, feeCents: 250, grossCents: 99999 })),
      subtotalCents: 30000,
      discountCents: body.discountCode ? 777 : 0,
      feeCents: 500,
      totalCents: total,
      vatCents: 2222,
    },
    codeStatus: body.discountCode ? (body.discountCode === "BADCODE" ? "invalid" : "valid") : "none",
    currency: "EUR",
  };
}

export function orderAnswer({
  free = false,
  total = 12345,
  holdMs = 10 * 60_000,
  stripeAccount = null,
}: { free?: boolean; total?: number; holdMs?: number; stripeAccount?: string | null } = {}) {
  return {
    orderId: ORDER_ID,
    buyerToken: BUYER_TOKEN,
    holdExpiresAt: new Date(Date.now() + holdMs).toISOString(),
    totals: { lines: [], subtotalCents: 30000, discountCents: 0, feeCents: 500, totalCents: free ? 0 : total, vatCents: 2222 },
    clientSecret: free ? null : "pi_1_secret_x",
    publishableKey: free ? null : "pk_test_order",
    stripeAccount: free ? null : stripeAccount,
    testMode: true,
    free,
  };
}

export interface FakeApi {
  calls: Call[];
  callsTo: (url: string) => Call[];
  quote: (body: Call["body"]) => Reply;
  order: (body: Call["body"]) => Reply;
  /** May return a promise (e.g. one that never settles) to model a slow or hanging extend. */
  extend: () => Reply | Promise<Reply>;
  fetch: ReturnType<typeof vi.fn>;
}

export function installFakeApi(): FakeApi {
  const calls: Call[] = [];
  const api: FakeApi = {
    calls,
    callsTo: (url) => calls.filter((call) => call.url === url),
    quote: (body) => ok(quoteAnswer({ body: body as never })),
    order: () => ok(orderAnswer(), 201),
    extend: () => ok({ holdExpiresAt: new Date(Date.now() + 10 * 60_000).toISOString() }),
    fetch: vi.fn(),
  };
  api.fetch.mockImplementation(async (url: string, init: RequestInit = {}) => {
    const body = typeof init.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : undefined;
    calls.push({ url, body, headers: (init.headers ?? {}) as Record<string, string> });
    const reply = await (url === "/api/tickets/quote" ? api.quote(body) : url === "/api/tickets/orders" ? api.order(body) : url.endsWith("/extend") ? api.extend() : { status: 404, body: {} });
    return new Response(JSON.stringify(reply.body), { status: reply.status ?? 200 });
  });
  vi.stubGlobal("fetch", api.fetch);
  return api;
}

export const money = (text: string) => screen.getByText(text, { exact: false });

/** Adds `count` of a ticket type with its "+" button and waits for the debounced quote to land. */
export async function addTickets({ name, count = 1 }: { name: string; count?: number }) {
  for (let i = 0; i < count; i += 1) fireEvent.click(screen.getByRole("button", { name: `Add one ${name}` }));
}

/** The order button of the cart step ("Continue to payment", or "Get tickets" for a free order). */
export const orderButton = () => screen.getByRole("button", { name: /^(Continue to payment|Get tickets)/ });

export async function waitForQuote() {
  await waitFor(() => expect(orderButton()).toBeEnabled());
}

export function fillDetails({ name = "Ada Lovelace", email = "ada@example.com", terms = true }: { name?: string; email?: string; terms?: boolean } = {}) {
  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: name } });
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: email } });
  if (terms) fireEvent.click(screen.getByLabelText("I accept the terms and conditions and the privacy policy."));
}

export function fillHolder({ index, name, email }: { index: number; name: string; email: string }) {
  fireEvent.change(document.querySelector(`[id$="-holder-${index}-name"]`) as HTMLElement, { target: { value: name } });
  fireEvent.change(document.querySelector(`[id$="-holder-${index}-email"]`) as HTMLElement, { target: { value: email } });
}

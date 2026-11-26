import { z } from "zod";

/**
 * Zod shapes of the ep-api ticket answers this renderer reads (rule 25: never
 * trust an API shape). Source of truth: `ep-api/src/services/tickets/
 * {myTicket,publicCatalog,checkout}.service.ts`. Deliberately tolerant — an
 * unknown `status` / `kind` string is kept as a string (the UI shows a neutral
 * fallback) so ep-api adding a state never breaks the page; a field that is
 * genuinely required for rendering is required here.
 */

const nullableString = z.string().nullable();

/** ep-api's token shape (`myTokenSchema`): checked before a token is ever put in a header. */
export const ticketTokenSchema = z.string().trim().min(20).max(128).regex(/^[A-Za-z0-9_-]+$/);

const sellerSchema = z.object({
  name: nullableString,
  vatNumber: nullableString,
  replyTo: nullableString,
});
export type TicketSeller = z.infer<typeof sellerSchema>;

/** The hosted QR image URL: must be an absolute http(s) URL, never another scheme. */
const imageUrl = z
  .string()
  .url()
  .refine((value) => /^https?:\/\//i.test(value), "qr image url must be http(s)");

const scopeSchema = z.object({
  mode: z.string(),
  days: z.array(z.string()).optional(),
  sessions: z.array(z.string()).optional(),
});

// ─── "Your details" on the ticket page (ep-api DASH-205 T5) ───────────────────────────────────────────────

/** The ticket page's dietary list (ep-api `attendeeProfile.ts` DIET_VALUES); `none` is never combined with another value. */
export const DIET_VALUES = ["none", "vegetarian", "vegan", "pescatarian", "gluten_free", "lactose_free", "halal", "kosher", "nut_allergy", "other_allergy"] as const;
export type DietValue = (typeof DIET_VALUES)[number];
/** Values that open the "tell the caterer more" note. */
export const DIET_NOTE_VALUES: readonly DietValue[] = ["nut_allergy", "other_allergy"];
/** The groups the banner and the "N of M done" counter name, in the page's order. */
export const PROFILE_GROUPS = ["name", "company", "jobTitle", "diet", "address"] as const;
export type ProfileGroup = (typeof PROFILE_GROUPS)[number];
export const SOCIAL_KEYS = ["linkedin", "website", "telegram", "x", "instagram"] as const;
/** The same limits as ep-api's `myProfileBodySchema`. */
export const PROFILE_LIMITS = { company: 120, jobTitle: 120, dietNote: 300, street: 200, postcode: 20, city: 100, phone: 40, social: 200 } as const;

const profileValuesSchema = z.object({
  company: z.string(),
  jobTitle: z.string(),
  // Tolerant: a value this page has no chip for is dropped, never an error.
  diet: z.array(z.string()).transform((values) => values.filter((value): value is DietValue => (DIET_VALUES as readonly string[]).includes(value))),
  dietNote: z.string(),
  street: z.string(),
  postcode: z.string(),
  city: z.string(),
  country: z.string(),
  phone: z.string(),
  linkedin: z.string(),
  website: z.string(),
  telegram: z.string(),
  x: z.string(),
  instagram: z.string(),
});
export type ProfileValues = z.infer<typeof profileValuesSchema>;

const profileGroupsSchema = z.array(z.string()).transform((values) => values.filter((value): value is ProfileGroup => (PROFILE_GROUPS as readonly string[]).includes(value)));

/** The `profile` block of `GET /tickets/my/ticket` and the answer of `PUT /tickets/my/ticket/profile`. */
export const profileBlockSchema = z.object({
  values: profileValuesSchema,
  required: profileGroupsSchema,
  missing: profileGroupsSchema,
  deadline: nullableString,
  frozen: z.boolean(),
  saved: z.boolean(),
});
export type ProfileBlock = z.infer<typeof profileBlockSchema>;

const profileText = (max: number) => z.string().trim().max(max).nullable().optional();

/** `PUT /tickets/my/ticket/profile` — a partial save; the same rules as ep-api's `myProfileBodySchema`. */
export const profileBodySchema = z
  .object({
    company: profileText(PROFILE_LIMITS.company),
    jobTitle: profileText(PROFILE_LIMITS.jobTitle),
    diet: z
      .array(z.enum(DIET_VALUES))
      .max(DIET_VALUES.length)
      .refine((values) => new Set(values).size === values.length && (!values.includes("none") || values.length === 1), { message: "diet" })
      .optional(),
    dietNote: profileText(PROFILE_LIMITS.dietNote),
    street: profileText(PROFILE_LIMITS.street),
    postcode: profileText(PROFILE_LIMITS.postcode),
    city: profileText(PROFILE_LIMITS.city),
    country: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^([A-Z]{2})?$/)
      .nullable()
      .optional(),
    phone: z
      .string()
      .trim()
      .max(PROFILE_LIMITS.phone)
      .regex(/^[0-9+()./\s-]*$/)
      .nullable()
      .optional(),
    linkedin: profileText(PROFILE_LIMITS.social),
    website: profileText(PROFILE_LIMITS.social),
    telegram: profileText(PROFILE_LIMITS.social),
    x: profileText(PROFILE_LIMITS.social),
    instagram: profileText(PROFILE_LIMITS.social),
  })
  .strict();
export type ProfileBody = z.infer<typeof profileBodySchema>;

/** `GET /tickets/my/ticket` */
export const myTicketSchema = z.object({
  code: z.string(),
  status: z.string(),
  /** `void` because the organiser blocked it (ep-api `blocked_at`), not because the holder cancelled. Absent on older ep-api builds = not blocked. */
  blocked: z.boolean().optional(),
  /** A test-mode ticket (Stripe test keys): the page shows a "Test ticket" badge. Absent on older ep-api builds = not a test ticket. */
  isTest: z.boolean().optional(),
  holder: z.object({ name: nullableString, email: nullableString }),
  ticketType: z.object({
    name: z.string(),
    scope: scopeSchema,
    /** What the ticket includes (ep-api T5); one line per item. Optional for older ep-api builds. */
    description: nullableString.optional(),
  }),
  source: z.object({
    kind: z.string(),
    name: z.string(),
    startDate: nullableString,
    endDate: nullableString,
    timeZone: z.string(),
    startsAt: nullableString,
    /** Where it takes place (ep-api DASH-205 F4). Optional: older ep-api builds do not send it; null = no venue set. */
    venue: z.object({ name: z.string(), city: nullableString, label: nullableString }).nullable().optional(),
  }),
  qrImageUrl: imageUrl.optional(),
  seller: sellerSchema,
  passedOnTo: z.object({ name: nullableString }).optional(),
  /** Holder self-service (ep-api DASH-205 F1): the organiser allows it AND the change window is open. Optional for older ep-api builds. */
  canCorrectName: z.boolean().optional(),
  canPassOn: z.boolean().optional(),
  /** Free order, valid, not checked in, event not started (ep-api `canCancelTicket`): the "Cancel my ticket" action. Absent on older builds = false. */
  canCancel: z.boolean().optional(),
  /** ISO time changes close; null when nothing can be changed or the event has no known start. */
  changesCloseAt: nullableString.optional(),
  /** "Your details" (ep-api T5): valid tickets only; null or absent = no form (older builds, or a ticket that no longer admits anyone). */
  profile: profileBlockSchema.nullable().optional(),
  /** The holder bought this order: the buyer link of the order (ep-api T5). */
  orderToken: ticketTokenSchema.optional(),
});
export type MyTicket = z.infer<typeof myTicketSchema>;

/** The per-holder checkout answers ep-api stores (`tickets.answers`). Values are kept as strings: an unknown value is shown as it is. */
const holderAnswersShape = z.object({
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  dietary: z.string().optional(),
  dietaryOther: z.string().optional(),
  tshirt: z.string().optional(),
});
export type HolderAnswersView = z.infer<typeof holderAnswersShape>;

/** `GET /tickets/my/order` */
export const myOrderSchema = z.object({
  orderNo: z.number(),
  status: z.string(),
  paidAt: nullableString,
  currency: z.string(),
  lines: z.array(
    z.object({
      name: z.string(),
      quantity: z.number(),
      unitCents: z.number(),
      discountCents: z.number(),
      feeCents: z.number(),
      vatRate: z.number(),
      grossCents: z.number(),
    }),
  ),
  totals: z.object({ totalCents: z.number(), vatCents: z.number(), feeCents: z.number() }),
  holders: z.array(
    z.object({
      /** The ticket id the holder edit route takes (ep-api F1); absent on older builds, so nothing is editable there. */
      id: z.string().uuid().optional(),
      name: nullableString,
      email: nullableString,
      status: z.string(),
      ticketCode: z.string(),
      canEdit: z.boolean().optional(),
      canEditName: z.boolean().optional(),
      canEditEmail: z.boolean().optional(),
      /** What the buyer answered at checkout for this holder (company, job title, dietary needs, T-shirt size). Optional for older ep-api builds. */
      answers: holderAnswersShape.optional(),
      /** Same email as the buyer ("(you)"), and that ticket's own link while it is valid (ep-api T5). */
      isBuyer: z.boolean().optional(),
      ticketToken: ticketTokenSchema.optional(),
    }),
  ),
  documents: z.array(z.object({ id: z.string().uuid(), kind: z.string(), number: z.string(), issueDate: nullableString, grossCents: z.number() })),
  seller: sellerSchema,
  /** A test-mode purchase (no real payment, no invoice): the page shows a badge. Optional for older ep-api builds. */
  isTest: z.boolean().optional(),
  /** When holder changes close for this order (ISO), the latest refund request, and whether a new one may be sent. */
  changesCloseAt: nullableString.optional(),
  /** The event's IANA time zone (ep-api ≥ DASH-205 F1): the cut-off is shown in it. */
  timeZone: z.string().optional(),
  refundRequest: z
    .object({ status: z.string(), createdAt: z.string(), ticketCount: z.number(), reason: z.string(), reply: nullableString.optional() })
    .nullable()
    .optional(),
  canRequestRefund: z.boolean().optional(),
});
export type MyOrder = z.infer<typeof myOrderSchema>;

/** `GET /tickets/orders/:id/status` */
export const orderStatusSchema = z.object({
  status: z.string(),
  orderNo: z.number(),
  paidAt: nullableString,
  holdExpiresAt: nullableString,
});
export type OrderStatusAnswer = z.infer<typeof orderStatusSchema>;

const sourceSchema = z.object({
  kind: z.string(),
  id: z.string(),
  name: z.string(),
  startDate: nullableString.optional(),
  endDate: nullableString.optional(),
  timeZone: z.string().optional(),
});

/** One sellable ticket type of `GET /tickets/types` (and `/types/link/:token`). */
export const publicTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: nullableString,
  priceCents: z.number(),
  currency: z.string(),
  bookingFeeCents: z.number(),
  status: z.string(),
  left: z.number().nullable(),
  maxPerOrder: z.number(),
  /** The date sales open, for the "not on sale yet" card (ISO timestamp). */
  saleFrom: nullableString.optional(),
  /** When sales close (ISO timestamp; the type's own end, else the site's default stop before the event). */
  closeAt: nullableString.optional(),
  /** Which days / sessions the ticket covers; read by the Tickets block for its auto label. Optional: older answers lack it. */
  scope: scopeSchema.optional(),
  /** A sold-out type takes a waitlist (ep-api DASH-205 F3). Optional for older ep-api builds: absent reads as off. */
  waitlistEnabled: z.boolean().optional(),
  source: sourceSchema,
});
export type PublicType = z.infer<typeof publicTypeSchema>;

const questionFieldSchema = z.object({
  name: z.string(),
  kind: z.string(),
  required: z.boolean().optional(),
  maxLength: z.number().optional(),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
});
const questionSchema = z.object({ key: z.string(), id: z.string(), scope: z.string(), fields: z.array(questionFieldSchema) });
export type PublicQuestion = z.infer<typeof questionSchema>;

/** The `checkout` block both catalogue answers carry. Everything the cart needs; the publishable key is NOT read (the order answer carries it). */
export const checkoutBlockSchema = z.object({
  salesOpen: z.boolean(),
  testMode: z.boolean(),
  feePayer: z.string(),
  holdMinutes: z.number().optional(),
  currency: z.string().optional(),
  termsUrl: nullableString.optional(),
  privacyUrl: nullableString.optional(),
  questions: z.object({ invoice: z.boolean(), terms: z.boolean() }).optional(),
  /** The extra questions the site asks (ep-api F2). Tolerant: an unknown question or field is ignored by the checkout, never an error. */
  questionList: z.array(questionSchema).optional(),
  /** Holders add company / job title and dietary needs on their ticket page instead (ep-api T7). */
  detailsLater: z.boolean().optional(),
  newsletterOffer: z.object({ on: z.boolean(), pct: z.number() }).optional(),
  /** The site's "Ticket pages address" (ep-api ≥ ep-api#522), null = the GConf.ai pages. Absent on older builds. */
  ticketPagesUrl: nullableString.optional(),
  /** Whether the checkout asks for the buyer's phone and address (ep-api API-267): off / optional / required. Absent (older API) or unknown = off. */
  contact: z.enum(["off", "optional", "required"]).optional().catch(undefined),
});
export type CheckoutBlock = z.infer<typeof checkoutBlockSchema>;

/** `GET /tickets/types` */
export const publicTypesSchema = z.object({ types: z.array(publicTypeSchema), checkout: checkoutBlockSchema });
export type PublicTypes = z.infer<typeof publicTypesSchema>;

/**
 * What `GET /api/tickets/types` (our own handler, for the site-builder Tickets block) answers: the types plus the
 * `checkout` block (the cards read its flags; the checkout pop-up builds its `CheckoutConfig` from all of it). The same
 * data the public `/tickets` page already shows; no secret in it.
 */
export const blockTypesSchema = z.object({
  types: z.array(publicTypeSchema),
  checkout: checkoutBlockSchema,
});
export type BlockTypes = z.infer<typeof blockTypesSchema>;

/** `GET /tickets/types/link/:token` — the one type behind a private link. */
export const linkTypeSchema = z.object({ type: publicTypeSchema, checkout: checkoutBlockSchema });

/** `GET /tickets/waitlist/offers/:token` — the offered type, how many tickets are held and until when. Nothing about the person. */
export const waitlistOfferSchema = z.object({
  type: publicTypeSchema,
  checkout: checkoutBlockSchema,
  quantity: z.number().int().min(1),
  offerExpiresAt: z.string(),
});
export type WaitlistOffer = z.infer<typeof waitlistOfferSchema>;

/** `POST /tickets/types/:id/waitlist` — always the same neutral answer. */
export const waitlistJoinResultSchema = z.object({ joined: z.boolean() });

/** The priced cart ep-api returns in a quote and in an order answer: the ONLY source of money shown in the browser. */
export const pricedCartSchema = z.object({
  lines: z.array(
    z.object({
      ticketTypeId: z.string(),
      quantity: z.number(),
      unitCents: z.number(),
      discountCents: z.number(),
      feeCents: z.number(),
      grossCents: z.number(),
    }),
  ),
  subtotalCents: z.number(),
  discountCents: z.number(),
  feeCents: z.number(),
  totalCents: z.number(),
  vatCents: z.number(),
  codeDiscountCents: z.number().optional(),
  newsletterDiscountCents: z.number().optional(),
});
export type PricedCart = z.infer<typeof pricedCartSchema>;

/**
 * Why a discount code was or was not accepted (ep-api `QuoteCodeStatus`). `unknown` = no such code (or switched off).
 * An older ep-api answers `invalid` for every rejection: read as `unknown`, as is any value a newer ep-api adds.
 */
export const CODE_STATUSES = ["none", "valid", "unknown", "not_valid_now", "not_applicable", "used_up"] as const;
export type CodeStatus = (typeof CODE_STATUSES)[number];

const codeStatusSchema = z
  .enum([...CODE_STATUSES, "invalid"])
  .catch("unknown")
  .transform((value): CodeStatus => (value === "invalid" ? "unknown" : value));

/** `POST /tickets/orders/quote` */
export const quoteResultSchema = z.object({
  totals: pricedCartSchema,
  codeStatus: codeStatusSchema,
  /** Only with `not_valid_now`: the code's window (ISO), so the page can say "starts on" / "ended on". */
  validFrom: nullableString.optional(),
  validUntil: nullableString.optional(),
  currency: z.string(),
});
export type QuoteResult = z.infer<typeof quoteResultSchema>;

/** `POST /tickets/orders` */
export const createOrderResultSchema = z.object({
  orderId: z.string().uuid(),
  buyerToken: ticketTokenSchema.nullable(),
  holdExpiresAt: z.string(),
  /** The latest time the hold can be extended to (ISO). Optional for older ep-api builds. */
  holdMaxAt: z.string().optional(),
  totals: pricedCartSchema,
  clientSecret: nullableString,
  publishableKey: nullableString,
  /** Stripe Connect only: the organiser's connected account the payment is taken on — Stripe.js starts with
   *  `loadStripe(publishableKey, { stripeAccount })`. Null with the organiser's own API keys; absent on older ep-api builds. */
  stripeAccount: nullableString.optional(),
  testMode: z.boolean().optional(),
  free: z.boolean(),
});
export type CreateOrderResult = z.infer<typeof createOrderResultSchema>;

/** `POST /tickets/orders/:id/extend` */
export const extendResultSchema = z.object({ holdExpiresAt: z.string(), holdMaxAt: z.string().optional() });
export type ExtendResult = z.infer<typeof extendResultSchema>;

/** The lost-link form's body — shared by the client form and the route handler. */
export const lostLinkBodySchema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });

export const orderIdSchema = z.string().uuid();

/** Body of the pop-up's order-document routes: the buyer token travels in the BODY (never a URL). */
export const orderDocumentsBodySchema = z.object({ token: ticketTokenSchema });
export const orderDocumentBodySchema = z.object({ token: ticketTokenSchema, documentId: z.string().uuid() });
export const documentIdSchema = z.string().uuid();

// ─── request bodies of our own checkout handlers (the same limits as ep-api's `schemas/ticketsPublic.ts`) ───

const uuid = z.string().uuid();
const text = (max: number) => z.string().trim().min(1).max(max);
const emailField = z.string().trim().toLowerCase().email().max(254);
const cartLine = z.object({ ticketTypeId: uuid, quantity: z.number().int().min(1).max(1000) });
const cartLines = z.array(cartLine).min(1).max(20);
const linkToken = z.string().trim().min(16).max(64).regex(/^[A-Za-z0-9_-]+$/);
/** The token of `/tickets/w/{token}` (a waitlist offer): url-safe characters only, checked before it is ever sent on. */
const offerToken = z.string().trim().min(16).max(128).regex(/^[A-Za-z0-9_-]+$/);

/** Answer vocabulary and limits of the checkout questions: the same as ep-api's `services/tickets/questions.ts`. */
export const DIETARY_VALUES = ["none", "vegetarian", "vegan", "gluten_free", "halal", "kosher", "other"] as const;
// The prototype's range, S to XXL (owner, 2026-11-12). The order view reads any stored size as text (`holderAnswersShape`).
export const TSHIRT_VALUES = ["S", "M", "L", "XL", "XXL"] as const;
export const HEARD_FROM_VALUES = ["social", "search", "friend", "newsletter", "partner", "other"] as const;
export const ANSWER_LIMITS = { company: 120, jobTitle: 120, other: 200 } as const;

const answerText = (max: number) => z.string().trim().min(1).max(max);
const holderAnswers = z.object({
  company: answerText(ANSWER_LIMITS.company).optional(),
  jobTitle: answerText(ANSWER_LIMITS.jobTitle).optional(),
  dietary: z.enum(DIETARY_VALUES).optional(),
  dietaryOther: answerText(ANSWER_LIMITS.other).optional(),
  tshirt: z.enum(TSHIRT_VALUES).optional(),
});
const heardFrom = z.object({ value: z.enum(HEARD_FROM_VALUES), text: answerText(ANSWER_LIMITS.other).optional() });

/** Discount codes: A-Z, 0-9 and dashes, 3-32 characters (upper-cased like ep-api does). */
export const DISCOUNT_CODE_PATTERN = /^[A-Z0-9-]{3,32}$/;
const discountCode = z.string().trim().toUpperCase().regex(DISCOUNT_CODE_PATTERN);

export const quoteBodySchema = z.object({
  lines: cartLines,
  discountCode: discountCode.optional(),
  newsletter: z.boolean(),
  linkToken: linkToken.optional(),
  offerToken: offerToken.optional(),
});
export type QuoteBody = z.infer<typeof quoteBodySchema>;

export const createOrderBodySchema = z.object({
  idempotencyKey: z.string().trim().min(32).max(128),
  lines: cartLines,
  buyer: z.object({
    name: text(200),
    email: emailField,
    /** Only when the site asks for contact details (`checkout.contact`): 5-40 characters. */
    phone: z.string().trim().min(5).max(40).optional(),
    address: z
      .object({
        street: text(200),
        postalCode: z.string().trim().max(20).optional(),
        city: text(120),
        countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
      })
      .optional(),
  }),
  holders: z
    .array(z.object({ ticketTypeId: uuid, name: text(200), email: emailField, answers: holderAnswers.optional(), sameAddressAsBuyer: z.boolean().optional() }))
    .min(1)
    .max(200),
  heardFrom: heardFrom.optional(),
  company: z
    .object({
      name: text(200),
      vatNumber: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,20}$/).optional(),
      street: text(200),
      postalCode: z.string().trim().max(20).optional(),
      city: text(120),
      countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
    })
    .optional(),
  discountCode: discountCode.optional(),
  newsletter: z.boolean(),
  acceptTerms: z.boolean(),
  linkToken: linkToken.optional(),
  offerToken: offerToken.optional(),
  /** The solved captcha (ep-api PR #456). Sent ONLY when the site has a captcha: the current API refuses unknown fields. */
  captchaToken: z.string().trim().min(1).max(4096).optional(),
});
export type CreateOrderBody = z.infer<typeof createOrderBodySchema>;

/** Catalogue filters of `/tickets?schedule=` / `?event=` / `?link=`. */
export const sourceFilterIdSchema = uuid;
export const linkTokenSchema = linkToken;
export const offerTokenSchema = offerToken;

/** Waitlist form: name / email limits as ep-api's; the quantity is capped by the type's per-order maximum on the server. */
export const waitlistBodySchema = z.object({
  ticketTypeId: uuid,
  name: text(200),
  email: emailField,
  quantity: z.number().int().min(1).max(1000),
});
export type WaitlistBody = z.infer<typeof waitlistBodySchema>;

// ─── holder self-service (ep-api DASH-205 F1): the same limits as ep-api's `schemas/ticketsMy.ts` ───

const personName = z.string().trim().min(1).max(200);
const personEmail = z.string().trim().toLowerCase().email().max(254);

/** `POST /tickets/my/ticket/name` */
export const nameBodySchema = z.object({ name: personName });
export type NameBody = z.infer<typeof nameBodySchema>;

/** `POST /tickets/my/ticket/pass-on` */
export const passOnBodySchema = z.object({ name: personName, email: personEmail });
export type PassOnBody = z.infer<typeof passOnBodySchema>;

/** `POST /tickets/my/ticket/pass-on/check` — would a pass-on to this address be accepted? Nothing changes. */
export const passOnCheckBodySchema = z.object({ email: personEmail });
export type PassOnCheckBody = z.infer<typeof passOnCheckBodySchema>;
export const passOnCheckResultSchema = z.object({ ok: z.literal(true) });

/** `PATCH /tickets/my/order/holders/:ticketId` — at least one of the two. */
export const holderEditBodySchema = z
  .object({ name: personName.optional(), email: personEmail.optional() })
  .refine((body) => body.name !== undefined || body.email !== undefined, { message: "empty" });
export type HolderEditBody = z.infer<typeof holderEditBodySchema>;

export const REFUND_REASONS = ["cant_attend", "charged_twice", "event_changed", "bought_by_mistake", "other"] as const;
export type RefundReason = (typeof REFUND_REASONS)[number];

/** `POST /tickets/my/order/refund-request` */
export const refundRequestBodySchema = z.object({
  ticketIds: z
    .array(z.string().uuid())
    .min(1)
    .max(200)
    .refine((ids) => new Set(ids).size === ids.length, { message: "duplicate" }),
  reason: z.enum(REFUND_REASONS),
  message: z.string().trim().max(1000).optional(),
});
export type RefundRequestBody = z.infer<typeof refundRequestBodySchema>;

/** `POST /tickets/my/ticket/cancel` — no body (the holder token names the ticket); ep-api answers the updated ticket; only its `status` is read. */
export const cancelResultSchema = z.object({ status: z.string() });

/** The ticket id of `PATCH .../holders/:ticketId`. */
export const ticketIdSchema = z.string().uuid();

/** What the self-service handlers answer on success (each is a narrow, non-personal confirmation). */
export const nameResultSchema = z.object({ holder: z.object({ name: z.string() }) });
export const passOnResultSchema = z.object({ passedOnTo: z.object({ name: z.string() }), emailSent: z.boolean() });
export const holderEditResultSchema = z.object({
  holder: z.object({ name: nullableString, email: nullableString }),
  nameChanged: z.boolean(),
  emailChanged: z.boolean(),
  emailSent: z.boolean(),
});
export const refundRequestResultSchema = z.object({
  refundRequest: z.object({ status: z.string(), createdAt: z.string(), ticketCount: z.number(), reason: z.string(), reply: nullableString.optional() }),
});

/** `GET /tickets/my/overview` — "My tickets": everything behind one list link (ep-api DASH-205). */
const overviewSourceSchema = z.object({ name: nullableString, startDate: nullableString, endDate: nullableString });
export const myOverviewSchema = z.object({
  email: z.string(),
  expiresAt: z.string(),
  orders: z.array(
    z.object({
      token: ticketTokenSchema,
      orderNo: z.number(),
      status: z.string(),
      paidAt: nullableString,
      totalCents: z.number(),
      currency: z.string(),
      lines: z.array(z.object({ name: z.string(), quantity: z.number() })),
      source: overviewSourceSchema,
    }),
  ),
  tickets: z.array(
    z.object({
      token: ticketTokenSchema,
      code: z.string(),
      holderName: nullableString,
      typeName: z.string(),
      source: overviewSourceSchema,
    }),
  ),
});
export type MyOverview = z.infer<typeof myOverviewSchema>;

/** `GET /tickets/my/session` — the signed-in visitor's list: exactly the item shape of the overview (ep-api API-266). */
export const mySessionSchema = myOverviewSchema;

/** `POST /tickets/my/sign-in` — the session the one-time link was exchanged for. */
export const signInResultSchema = z.object({ sessionToken: z.string().trim().min(16).max(512), expiresAt: z.string() });
export type SignInResult = z.infer<typeof signInResultSchema>;

/** The form post of the "Continue" page. */
export const signInBodySchema = z.object({ token: ticketTokenSchema });

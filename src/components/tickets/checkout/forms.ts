import { z } from "zod";
import { NO_EXTRA_QUESTIONS, type ExtraQuestions } from "@/lib/tickets/checkout-questions";
import { ANSWER_LIMITS } from "@/lib/tickets/schemas";

/**
 * The checkout's form (rule 37: react-hook-form + zod). Messages are TOKENS, not prose — the components map
 * them to `tickets.checkout.validation.*` in the visitor's language (WCAG 3.3.1 / 3.3.3). Limits mirror ep-api's
 * `createOrderBodySchema`, so a value that passes here is never refused there for its shape.
 */
export type ValidationToken = "required" | "email" | "tooLong" | "terms" | "vat";

export interface DetailsValues {
  name: string;
  email: string;
  invoice: boolean;
  companyName: string;
  vatNumber: string;
  street: string;
  postalCode: string;
  city: string;
  countryCode: string;
  acceptTerms: boolean;
  /** "How did you hear about us?" (an option value, or "" for no answer) and its free text for "other". */
  heardFrom: string;
  heardFromText: string;
}

export const EMPTY_DETAILS: DetailsValues = {
  name: "",
  email: "",
  invoice: false,
  companyName: "",
  vatNumber: "",
  street: "",
  postalCode: "",
  city: "",
  countryCode: "",
  acceptTerms: false,
  heardFrom: "",
  heardFromText: "",
};

/** A VAT number as ep-api stores it: no spaces, dots or dashes, upper case. */
export function normalizeVat({ value }: { value: string }): string {
  return value.replace(/[\s.-]/g, "").toUpperCase();
}

const email = z.string().trim().min(1, "required").max(254, "tooLong").pipe(z.email("email"));
const required = (max: number) => z.string().trim().min(1, "required").max(max, "tooLong");

const detailsShape = {
  name: required(200),
  email,
  invoice: z.boolean(),
  companyName: z.string().trim().max(200, "tooLong"),
  vatNumber: z.string().trim().max(40, "tooLong"),
  street: z.string().trim().max(200, "tooLong"),
  postalCode: z.string().trim().max(20, "tooLong"),
  city: z.string().trim().max(120, "tooLong"),
  countryCode: z.string().trim(),
  acceptTerms: z.boolean(),
  heardFrom: z.string().trim(),
  heardFromText: z.string().trim().max(ANSWER_LIMITS.other, "tooLong"),
};

function checkDetails({ values, context, termsRequired }: { values: DetailsValues; context: z.RefinementCtx; termsRequired: boolean }) {
  if (termsRequired && !values.acceptTerms) context.addIssue({ code: "custom", path: ["acceptTerms"], message: "terms" });
  if (!values.invoice) return;
  for (const field of ["companyName", "street", "city", "countryCode"] as const) {
    if (!values[field]) context.addIssue({ code: "custom", path: [field], message: "required" });
  }
  const vat = normalizeVat({ value: String(values.vatNumber ?? "") });
  if (vat && !/^[A-Z0-9]{4,20}$/.test(vat)) context.addIssue({ code: "custom", path: ["vatNumber"], message: "vat" });
}

/** One ticket holder: name + email always, then the answers to the extra questions the site asks (empty strings when not asked). */
export interface HolderValues {
  name: string;
  email: string;
  company: string;
  jobTitle: string;
  dietary: string;
  dietaryOther: string;
  tshirt: string;
}

export const EMPTY_HOLDER: HolderValues = { name: "", email: "", company: "", jobTitle: "", dietary: "", dietaryOther: "", tshirt: "" };

function holderSchema({ questions }: { questions: ExtraQuestions }) {
  const optionalText = (max: number) => z.string().trim().max(max, "tooLong");
  return z
    .object({
      name: required(200),
      email,
      company: optionalText(ANSWER_LIMITS.company),
      jobTitle: optionalText(ANSWER_LIMITS.jobTitle),
      dietary: z.string().trim(),
      dietaryOther: optionalText(ANSWER_LIMITS.other),
      tshirt: z.string().trim(),
    })
    .superRefine((values, context) => {
      if (questions.dietary && !questions.dietary.some((option) => option.value === values.dietary)) context.addIssue({ code: "custom", path: ["dietary"], message: "required" });
      if (questions.tshirt && !questions.tshirt.some((option) => option.value === values.tshirt)) context.addIssue({ code: "custom", path: ["tshirt"], message: "required" });
    });
}

/**
 * The one form of the cart step (design: "Tickets & details"): the buyer, an optional company invoice, the terms, and
 * one holder per ticket. Company and job title are optional; dietary needs and T-shirt size are required when asked
 * (their selects have no empty choice that means "none": "No dietary needs" is its own option). Limits mirror ep-api.
 */
export function buildCartSchema({ termsRequired, questions }: { termsRequired: boolean; questions: ExtraQuestions }) {
  return z.object({ ...detailsShape, holders: z.array(holderSchema({ questions })) }).superRefine((values, context) => checkDetails({ values, context, termsRequired }), {
    // Also when another field failed: one press of the button shows every missing field at once (terms, invoice too).
    when: (payload) => typeof payload.value === "object" && payload.value !== null,
  });
}

export const cartSchema = buildCartSchema({ termsRequired: false, questions: NO_EXTRA_QUESTIONS });
export type CartFormValues = z.infer<typeof cartSchema>;

import { z } from "zod";
import { REFUND_REASONS } from "@/lib/tickets/schemas";

/**
 * The client-side form schemas of holder self-service. Their messages are TOKENS (`required`, `max`, `email`, `tickets`, `reason`)
 * that the components map to translated text (WCAG 3.3.1 / 3.3.3); the limits are the same as ep-api's and as the
 * route handlers' schemas in `lib/tickets/schemas.ts`.
 */
const name = z.string().trim().min(1, "required").max(200, "max");
const email = z.string().trim().toLowerCase().min(1, "required").max(254, "max").pipe(z.email("email"));

export const nameFormSchema = z.object({ name });
export type NameFormValues = z.infer<typeof nameFormSchema>;

export const passOnFormSchema = z.object({ name, email });
export type PassOnFormValues = z.infer<typeof passOnFormSchema>;

/** The buyer's holder edit: each field is optional, but at least one must be filled (checked by the component against the changes). */
export const holderFormSchema = z.object({ name: name.or(z.literal("")), email: email.or(z.literal("")) });
export type HolderFormValues = z.infer<typeof holderFormSchema>;

export const refundFormSchema = z.object({
  ticketIds: z.array(z.string()).min(1, "tickets"),
  reason: z.enum(REFUND_REASONS, { message: "reason" }),
  message: z.string().trim().max(1000, "max"),
});
export type RefundFormValues = z.infer<typeof refundFormSchema>;

/** Bounded choices as data (rule 39): `{ value, label }` pairs are built where the labels are translated. */
export const REFUND_REASON_VALUES = REFUND_REASONS;

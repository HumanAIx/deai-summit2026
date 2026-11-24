import type { InputHTMLAttributes } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { TICKETS_INPUT, TK_INPUT, TK_LABEL } from "../tickets-classes";
import { TP_FIELD_LABEL, TP_INPUT, TP_INPUT_ERROR, TP_INPUT_OK } from "../ticket-page-classes";

/**
 * A labelled text input for the checkout forms: visible label, error text tied to the field with `aria-describedby`
 * and announced (`role="alert"`) when it appears, 44 px high. Pure markup, so it renders on the server too. `page` is the
 * look of the holder's ticket page and the buyer's order page (52 px navy field).
 */
export function TextField({
  id,
  label,
  error,
  registration,
  hint,
  variant,
  ...input
}: { id: string; label: string; error: string | null; registration: UseFormRegisterReturn; hint?: string; variant?: "checkout" | "page" | undefined } & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "name" | "onChange" | "onBlur" | "ref">) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`flex min-w-0 flex-col ${variant === "page" ? "gap-2" : "gap-1.5"}`}>
      <label htmlFor={id} className={variant === "checkout" ? TK_LABEL : variant === "page" ? TP_FIELD_LABEL : "text-sm font-medium"}>
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={variant === "checkout" ? TK_INPUT : variant === "page" ? `${TP_INPUT} ${error ? TP_INPUT_ERROR : TP_INPUT_OK}` : TICKETS_INPUT}
        {...input}
        {...registration}
      />
      {hint ? (
        <p id={`${id}-hint`} className={variant === "checkout" ? "text-xs text-(--tk-mut)" : variant === "page" ? "text-[13px] text-(--mt-dim)" : "text-sm text-muted"}>
          {hint}
        </p>
      ) : null}
      <p id={`${id}-error`} role="alert" className={variant === "checkout" ? "text-[13px] text-(--tk-err) empty:hidden" : variant === "page" ? "text-[13px] text-(--mt-err) empty:hidden" : "text-sm text-danger"}>
        {error}
      </p>
    </div>
  );
}

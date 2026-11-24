import type { InputHTMLAttributes } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { TICKETS_INPUT, TK_INPUT, TK_LABEL } from "../tickets-classes";

/**
 * A labelled text input for the checkout forms: visible label, error text tied to the field with `aria-describedby`
 * and announced (`role="alert"`) when it appears, 44 px high. Pure markup, so it renders on the server too.
 */
export function TextField({
  id,
  label,
  error,
  registration,
  hint,
  variant,
  ...input
}: { id: string; label: string; error: string | null; registration: UseFormRegisterReturn; hint?: string; variant?: "checkout" | undefined } & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "name" | "onChange" | "onBlur" | "ref">) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={variant === "checkout" ? TK_LABEL : "text-sm font-medium"}>
        {label}
      </label>
      <input id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy} className={variant === "checkout" ? TK_INPUT : TICKETS_INPUT} {...input} {...registration} />
      {hint ? (
        <p id={`${id}-hint`} className={variant === "checkout" ? "text-xs text-(--tk-mut)" : "text-sm text-muted"}>
          {hint}
        </p>
      ) : null}
      <p id={`${id}-error`} role="alert" className={variant === "checkout" ? "text-[13px] text-(--tk-err) empty:hidden" : "text-sm text-danger"}>
        {error}
      </p>
    </div>
  );
}

import type { SelectHTMLAttributes } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import type { SelectOption } from "@/lib/tickets/checkout-questions";
import { TICKETS_INPUT } from "../tickets-classes";

/**
 * A labelled `<select>` for the checkout forms (rule 39: options are a `{ value, label }` data array). Visible label,
 * error text tied to the field and announced, 44 px high. Pure markup, so it renders on the server too.
 */
export function SelectField({
  id,
  label,
  error,
  registration,
  options,
  placeholder,
  ...select
}: { id: string; label: string; error: string | null; registration: UseFormRegisterReturn; options: readonly SelectOption[]; placeholder: string } & Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "id" | "name" | "onChange" | "onBlur" | "ref"
>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <select id={id} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} className={TICKETS_INPUT} {...select} {...registration}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <p id={`${id}-error`} role="alert" className="text-sm text-danger">
        {error}
      </p>
    </div>
  );
}

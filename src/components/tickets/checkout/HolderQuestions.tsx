import { useId } from "react";
import { useTranslations } from "@/lib/tickets/i18n";
import { useWatch, type Control, type UseFormRegister } from "react-hook-form";
import { ANSWER_LIMITS } from "@/lib/tickets/schemas";
import type { ExtraQuestions, SelectOption } from "@/lib/tickets/checkout-questions";
import type { CartFormValues } from "./forms";
import { SelectField } from "./SelectField";
import { TextField } from "./TextField";

type HolderField = "company" | "jobTitle" | "dietary" | "dietaryOther" | "tshirt";

/** A select option shown in the visitor's language when this renderer has its wording, else ep-api's label. */
export function useOptionLabel(): (args: { group: "dietary" | "heard"; option: SelectOption }) => string {
  const t = useTranslations("tickets.checkout.questions");
  return ({ group, option }) => (t.has(`option.${group}.${option.value}`) ? t(`option.${group}.${option.value}`) : option.label);
}

/**
 * The per-holder answers of the cart step (03 · Ticket holders), inside that holder's own fieldset: company and job title (optional), dietary
 * needs (+ free text with "other") and T-shirt size. One column on a phone, two for the optional text pair from `sm`,
 * so ten holders stay a short scroll of compact cards and no field is wider than the screen.
 */
export function HolderQuestions({
  index,
  questions,
  register,
  control,
  message,
}: {
  index: number;
  questions: ExtraQuestions;
  register: UseFormRegister<CartFormValues>;
  control: Control<CartFormValues>;
  message: (index: number, field: HolderField) => string | null;
}) {
  const t = useTranslations("tickets.checkout.questions");
  const uid = useId();
  const optionLabel = useOptionLabel();
  const dietary = useWatch({ control, name: `holders.${index}.dietary` });
  const labelled = (group: "dietary" | "heard", options: readonly SelectOption[]): SelectOption[] => options.map((option) => ({ value: option.value, label: optionLabel({ group, option }) }));

  return (
    <>
      {questions.companyJob ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField variant="checkout" id={`${uid}-holder-${index}-company`} label={t("company")} error={message(index, "company")} registration={register(`holders.${index}.company`)} maxLength={ANSWER_LIMITS.company + 1} autoComplete="off" />
          <TextField variant="checkout" id={`${uid}-holder-${index}-jobTitle`} label={t("jobTitle")} error={message(index, "jobTitle")} registration={register(`holders.${index}.jobTitle`)} maxLength={ANSWER_LIMITS.jobTitle + 1} autoComplete="off" />
        </div>
      ) : null}
      {questions.dietary ? (
        <>
          <SelectField variant="checkout"
            id={`${uid}-holder-${index}-dietary`}
            label={t("dietary")}
            placeholder={t("choose")}
            error={message(index, "dietary")}
            registration={register(`holders.${index}.dietary`)}
            options={labelled("dietary", questions.dietary)}
          />
          {dietary === "other" ? (
            <TextField variant="checkout" id={`${uid}-holder-${index}-dietaryOther`} label={t("dietaryOther")} error={message(index, "dietaryOther")} registration={register(`holders.${index}.dietaryOther`)} maxLength={ANSWER_LIMITS.other + 1} autoComplete="off" />
          ) : null}
        </>
      ) : null}
      {questions.tshirt ? (
        <SelectField variant="checkout" id={`${uid}-holder-${index}-tshirt`} label={t("tshirt")} placeholder={t("choose")} error={message(index, "tshirt")} registration={register(`holders.${index}.tshirt`)} options={questions.tshirt} />
      ) : null}
    </>
  );
}

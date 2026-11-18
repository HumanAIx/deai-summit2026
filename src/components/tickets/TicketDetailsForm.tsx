"use client";

// Interactive: "Your details" on the holder's ticket page (ep-api DASH-205 T5) — react-hook-form (rule 37) with the live
// badge preview, the dietary chips and a partial save to our own route handler (`PUT /api/tickets/my/ticket/profile`).

import { useLocale, useTranslations } from "@/lib/tickets/i18n";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { countryOptions } from "@/lib/tickets/countries";
import { DIET_NOTE_VALUES, DIET_VALUES, PROFILE_LIMITS, profileBodySchema, type DietValue, type ProfileBlock, type ProfileBody, type ProfileGroup } from "@/lib/tickets/schemas";
import { requestNameCorrection, requestSaveProfile } from "@/lib/tickets/self-service-client";
import { DETAILS_ID, goToDetails, goToField } from "./details-focus";
import { MT_BUTTON_LG, MT_CARD, MT_CHIP, MT_GRADIENT, MT_INPUT, MT_INPUT_ERROR, MT_INPUT_MISSING, MT_INPUT_OK, MT_LABEL } from "./my-ticket-classes";

export interface DetailsFormValues {
  name: string;
  company: string;
  jobTitle: string;
  diet: DietValue[];
  dietNote: string;
  street: string;
  postcode: string;
  city: string;
  country: string;
  phone: string;
  linkedin: string;
  website: string;
  telegram: string;
  x: string;
  instagram: string;
}

type TextKey = Exclude<keyof DetailsFormValues, "diet">;
const PROFILE_KEYS: ReadonlyArray<Exclude<keyof DetailsFormValues, "name">> = ["company", "jobTitle", "diet", "dietNote", "street", "postcode", "city", "country", "phone", "linkedin", "website", "telegram", "x", "instagram"];

/** The required groups still empty in these values, in the page's order (same rules as ep-api `missingGroups`). */
export function missingOf({ required, values }: { required: readonly ProfileGroup[]; values: DetailsFormValues }): ProfileGroup[] {
  return required.filter((group) => {
    if (group === "name") return !values.name.trim();
    if (group === "company") return !values.company.trim();
    if (group === "jobTitle") return !values.jobTitle.trim();
    if (group === "diet") return values.diet.length === 0;
    return !(values.street.trim() && values.postcode.trim() && values.city.trim() && values.country);
  });
}

/** Chip toggle: "No requirements" clears the others; any other value clears "No requirements" (prototype). List order kept. */
export function toggleDiet({ diet, value }: { diet: readonly DietValue[]; value: DietValue }): DietValue[] {
  if (diet.includes(value)) return diet.filter((item) => item !== value);
  if (value === "none") return ["none"];
  const next = new Set<DietValue>([...diet.filter((item) => item !== "none"), value]);
  return DIET_VALUES.filter((item) => next.has(item));
}

/** Only what changed since the last save, as the API body (`''` clears; the note goes when no allergy is left). */
export function changedBody({ saved, values }: { saved: DetailsFormValues; values: DetailsFormValues }): ProfileBody {
  const body: Record<string, unknown> = {};
  for (const key of PROFILE_KEYS) {
    if (key === "diet") {
      if (values.diet.join(",") !== saved.diet.join(",")) body.diet = values.diet;
      continue;
    }
    const value = key === "postcode" ? values[key].trim().toUpperCase() : values[key].trim();
    if (value !== saved[key].trim()) body[key] = value;
  }
  if (!values.diet.some((value) => DIET_NOTE_VALUES.includes(value)) && saved.dietNote) body.dietNote = "";
  return body as ProfileBody;
}

function initialValues({ profile, holderName }: { profile: ProfileBlock; holderName: string | null }): DetailsFormValues {
  return { name: holderName ?? "", ...profile.values };
}

/** Every field as a string / list, whatever the form store holds (a disabled input, a value not yet registered). */
function normalised(raw: Partial<DetailsFormValues>): DetailsFormValues {
  const text = (value: unknown): string => (typeof value === "string" ? value : "");
  return {
    name: text(raw.name),
    company: text(raw.company),
    jobTitle: text(raw.jobTitle),
    diet: Array.isArray(raw.diet) ? raw.diet : [],
    dietNote: text(raw.dietNote),
    street: text(raw.street),
    postcode: text(raw.postcode),
    city: text(raw.city),
    country: text(raw.country),
    phone: text(raw.phone),
    linkedin: text(raw.linkedin),
    website: text(raw.website),
    telegram: text(raw.telegram),
    x: text(raw.x),
    instagram: text(raw.instagram),
  };
}

const timeOf = (date: Date): string => `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

interface FieldSpec {
  key: TextKey;
  label: string;
  required?: boolean;
  placeholder?: string | undefined;
  type?: "text" | "tel" | "url";
  autoComplete?: string;
  maxLength: number;
  disabled?: boolean;
  hint?: string | undefined;
  upper?: boolean;
}

/**
 * "Your details": badge (name, job title, company) with a live preview, dietary needs with a note for allergies, address,
 * contact and socials. The required groups follow the site's checkout switches (`profile.required`); an empty required field
 * has the amber border and `data-missing` (the banner's "Complete my details" focuses the first one). Save sends only what
 * changed; a partial save is fine. The name goes through the existing name-correction route, only while it is open. After
 * the badge cut-off (`profile.frozen`) company and job title are read-only. Validation errors are shown next to the field,
 * which gets the focus. After a save the server page is refreshed (banner, ticket card).
 */
export function TicketDetailsForm({
  token,
  profile,
  holderName,
  typeName,
  eventName,
  canCorrectName,
  deadlineLabel,
}: {
  token: string;
  profile: ProfileBlock;
  holderName: string | null;
  typeName: string;
  eventName: string;
  canCorrectName: boolean;
  deadlineLabel: string | null;
}) {
  const t = useTranslations("tickets");
  const locale = useLocale();
  const router = useRouter();
  const [saved, setSaved] = useState<DetailsFormValues>(() => initialValues({ profile, holderName }));
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { register, control, setValue, reset, setError, clearErrors, formState } = useForm<DetailsFormValues>({ defaultValues: saved });
  const values = normalised(useWatch({ control }));
  const countries = useMemo(() => countryOptions({ locale }), [locale]);
  const required = new Set<ProfileGroup>(profile.required);
  const missing = missingOf({ required: profile.required, values });
  const missingSet = new Set(missing);
  const doneCount = profile.required.length - missing.length;
  const pct = profile.required.length > 0 ? Math.round((doneCount / profile.required.length) * 100) : 100;
  const body = changedBody({ saved, values });
  const nameChanged = canCorrectName && values.name.trim() !== saved.name.trim();
  const dirty = nameChanged || Object.keys(body).length > 0;
  const missingText = missing.map((group) => t(`ticket.details.groupsInline.${group}`)).join(", ");
  const noteOn = values.diet.some((value) => DIET_NOTE_VALUES.includes(value));

  // `#details` in the address (the ticket email's "Complete my details", a reminder): go there once the page is drawn.
  useEffect(() => {
    if (window.location.hash === `#${DETAILS_ID}`) goToDetails();
  }, []);

  const fieldError = (key: keyof DetailsFormValues): string | null => {
    const issue = formState.errors[key]?.message;
    return issue ? (t.has(`ticket.details.errors.${issue}`) ? t(`ticket.details.errors.${issue}`) : t("ticket.details.errors.invalid")) : null;
  };

  async function onSave() {
    if (!dirty || saving) return;
    setFailure(null);
    clearErrors();
    if (nameChanged && !values.name.trim()) {
      setError("name", { message: "required" });
      goToField({ id: "details-name" });
      return;
    }
    const parsed = profileBodySchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const key = (first?.path[0] ?? "company") as keyof DetailsFormValues;
      for (const issue of parsed.error.issues) setError(issue.path[0] as keyof DetailsFormValues, { message: issue.code === "too_big" ? "tooLong" : "invalid" });
      goToField({ id: `details-${key}` });
      return;
    }
    setSaving(true);
    if (nameChanged) {
      const named = await requestNameCorrection({ token, body: { name: values.name.trim() } });
      if (!named.ok) {
        setSaving(false);
        setFailure(named.code);
        setError("name", { message: "nameNotSaved" });
        goToField({ id: "details-name" });
        return;
      }
      // The name is stored now: make it the baseline so a failed details save (or a retry) does not send it again.
      const savedName = values.name.trim();
      setSaved((previous) => ({ ...previous, name: savedName }));
      setValue("name", savedName);
    }
    if (Object.keys(parsed.data).length > 0) {
      const result = await requestSaveProfile({ token, body: parsed.data });
      if (!result.ok) {
        setSaving(false);
        setFailure(nameChanged ? "nameSavedDetailsFailed" : result.code);
        return;
      }
    }
    const next = { ...values, name: values.name.trim(), postcode: values.postcode.trim().toUpperCase(), dietNote: noteOn ? values.dietNote : "" };
    setSaved(next);
    reset(next);
    setSavedAt(timeOf(new Date()));
    setSaving(false);
    router.refresh();
  }

  const statusText = dirty
    ? missing.length > 0
      ? t("ticket.details.status.unsavedPartial")
      : t("ticket.details.status.unsaved")
    : savedAt
      ? missing.length > 0
        ? t("ticket.details.status.savedMissing", { time: savedAt, fields: missingText })
        : t("ticket.details.status.savedDone", { time: savedAt })
      : missing.length > 0
        ? t("ticket.details.status.missing", { fields: missingText })
        : t("ticket.details.status.done");
  const statusTone = dirty ? "text-text" : missing.length > 0 ? "text-warning-emphasis" : "text-success";

  const renderField = (spec: FieldSpec) => {
    const error = fieldError(spec.key);
    const isMissing = Boolean(spec.required) && !values[spec.key].trim();
    const id = `details-${spec.key}`;
    const describedBy = [error ? `${id}-error` : null, spec.hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
    const registration = register(spec.key);
    return (
      <div key={spec.key} className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor={id} className="text-[13px] text-muted">
          {spec.label}
          {spec.required ? (
            <span aria-hidden className="text-warning-emphasis">
              {" "}
              *
            </span>
          ) : null}
        </label>
        <input
          id={id}
          type={spec.type ?? "text"}
          autoComplete={spec.autoComplete ?? "off"}
          placeholder={spec.placeholder}
          maxLength={spec.maxLength}
          disabled={spec.disabled}
          aria-required={spec.required ? true : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          data-missing={isMissing && !spec.disabled ? "true" : undefined}
          className={`${MT_INPUT} ${error ? MT_INPUT_ERROR : isMissing ? MT_INPUT_MISSING : MT_INPUT_OK} ${spec.upper ? "uppercase" : ""}`}
          {...registration}
        />
        {spec.hint ? (
          <p id={`${id}-hint`} className="text-xs text-muted">
            {spec.hint}
          </p>
        ) : null}
        {error ? (
          <p id={`${id}-error`} role="alert" className="text-xs text-danger">
            {error}
          </p>
        ) : null}
      </div>
    );
  };

  const frozenHint = profile.frozen ? t("ticket.details.frozenHint") : undefined;
  const badgeFields: FieldSpec[] = [
    { key: "name", label: t("ticket.details.fields.name"), required: required.has("name"), autoComplete: "name", maxLength: 200, disabled: !canCorrectName, hint: canCorrectName ? undefined : t("ticket.details.nameLocked") },
    { key: "jobTitle", label: t("ticket.details.fields.jobTitle"), required: required.has("jobTitle"), autoComplete: "organization-title", placeholder: t("ticket.details.placeholders.jobTitle"), maxLength: PROFILE_LIMITS.jobTitle, disabled: profile.frozen, hint: frozenHint },
    { key: "company", label: t("ticket.details.fields.company"), required: required.has("company"), autoComplete: "organization", maxLength: PROFILE_LIMITS.company, disabled: profile.frozen, hint: frozenHint },
  ];
  const addressRequired = required.has("address");
  const addressFields: FieldSpec[] = [
    { key: "street", label: t("ticket.details.fields.street"), required: addressRequired, autoComplete: "address-line1", maxLength: PROFILE_LIMITS.street },
    { key: "postcode", label: t("ticket.details.fields.postcode"), required: addressRequired, autoComplete: "postal-code", maxLength: PROFILE_LIMITS.postcode, upper: true },
    { key: "city", label: t("ticket.details.fields.city"), required: addressRequired, autoComplete: "address-level2", maxLength: PROFILE_LIMITS.city },
  ];
  const contactFields: FieldSpec[] = [
    { key: "phone", label: t("ticket.details.fields.phone"), type: "tel", autoComplete: "tel", placeholder: "+356 …", maxLength: PROFILE_LIMITS.phone },
    { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/…", maxLength: PROFILE_LIMITS.social },
    { key: "website", label: t("ticket.details.fields.website"), type: "url", autoComplete: "url", placeholder: "https://…", maxLength: PROFILE_LIMITS.social },
    { key: "telegram", label: "Telegram", placeholder: "@handle", maxLength: PROFILE_LIMITS.social },
    { key: "x", label: "X (Twitter)", placeholder: "@handle", maxLength: PROFILE_LIMITS.social },
    { key: "instagram", label: "Instagram", placeholder: "@handle", maxLength: PROFILE_LIMITS.social },
  ];
  const countryError = fieldError("country");
  const countryMissing = addressRequired && !values.country;

  return (
    <section id={DETAILS_ID} aria-labelledby="details-heading" className={`${MT_CARD} flex scroll-mt-4 flex-col gap-5 p-[clamp(18px,4vw,24px)] print:hidden`}>
      <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1.5">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <h2 id="details-heading" className="text-[19px] font-semibold">
              {t("ticket.details.heading")}
            </h2>
            {profile.required.length > 0 ? (
              <span className={`font-mono text-[12.5px] ${missing.length > 0 ? "text-warning-emphasis" : "text-success"}`}>{t("ticket.details.progress", { done: doneCount, total: profile.required.length })}</span>
            ) : null}
          </div>
          <p className="text-[13.5px] leading-normal text-muted [text-wrap:pretty]">
            {profile.frozen
              ? t("ticket.details.introFrozen")
              : deadlineLabel
                ? t("ticket.details.introBy", { date: deadlineLabel, event: eventName })
                : t("ticket.details.intro", { event: eventName })}
          </p>
          <div
            role="progressbar"
            aria-label={t("ticket.details.progressLabel")}
            aria-valuemin={0}
            aria-valuemax={profile.required.length}
            aria-valuenow={doneCount}
            className="mt-1 h-1 overflow-hidden rounded-sm bg-(--color-border)"
          >
            <div className={`h-full ${MT_GRADIENT} transition-[width] duration-300 motion-reduce:transition-none`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div aria-label={t("ticket.details.badgePreview")} role="img" className="flex-[0_0_220px] overflow-hidden rounded-xl bg-on-dark text-on-light shadow-(--shadow) max-[520px]:flex-[1_1_100%]">
          <div aria-hidden className={`h-2 ${MT_GRADIENT}`} />
          <div aria-hidden className="flex flex-col gap-[3px] px-4 pt-3.5 pb-4">
            <span className="font-mono text-[10px] tracking-[0.16em] text-on-light/60 uppercase [overflow-wrap:anywhere]">{t("ticket.details.badgeKicker", { event: eventName })}</span>
            <span className={`mt-1.5 text-[19px] leading-tight font-bold tracking-[-0.01em] [overflow-wrap:anywhere] ${values.name.trim() ? "" : "text-on-light/45 italic"}`}>{values.name.trim() || t("ticket.details.badgeName")}</span>
            <span className={`text-[13px] [overflow-wrap:anywhere] ${values.jobTitle.trim() ? "text-on-light/75" : "text-on-light/45 italic"}`}>{values.jobTitle.trim() || t("ticket.details.fields.jobTitle")}</span>
            <span className={`text-[13px] font-semibold [overflow-wrap:anywhere] ${values.company.trim() ? "" : "text-on-light/45 italic"}`}>{values.company.trim() || t("ticket.details.fields.company")}</span>
            <span className="mt-2.5 self-start rounded-full bg-on-light px-2.5 py-[3px] text-[11.5px] font-semibold tracking-[0.04em] text-on-dark uppercase">{typeName}</span>
          </div>
        </div>
      </div>

      <form
        noValidate
        aria-labelledby="details-heading"
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void onSave();
        }}
      >
        <fieldset className="flex flex-col gap-3">
          <legend className={`${MT_LABEL} mb-3`}>{t("ticket.details.sections.badge")}</legend>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-3.5 gap-y-3">{badgeFields.map(renderField)}</div>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className={`${MT_LABEL} mb-3`}>
            {t("ticket.details.sections.diet")}
            {required.has("diet") ? (
              <span aria-hidden className="text-warning-emphasis">
                {" "}
                *
              </span>
            ) : null}
          </legend>
          <div role="group" aria-label={required.has("diet") ? `${t("ticket.details.sections.diet")} *` : t("ticket.details.sections.diet")} className="flex flex-wrap gap-2">
            {DIET_VALUES.map((value, index) => {
              const on = values.diet.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={on}
                  data-missing={index === 0 && missingSet.has("diet") ? "true" : undefined}
                  onClick={() => setValue("diet", toggleDiet({ diet: values.diet, value }), { shouldDirty: true })}
                  className={MT_CHIP}
                >
                  {on ? (
                    <span aria-hidden className="me-1">
                      ✓
                    </span>
                  ) : null}
                  {t(`ticket.details.diet.${value}`)}
                </button>
              );
            })}
          </div>
          {noteOn ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="details-dietNote" className="text-[13px] text-muted">
                {t("ticket.details.fields.dietNote")}
                <span className="text-muted"> · {t("ticket.details.fields.dietNoteHint")}</span>
              </label>
              <textarea
                id="details-dietNote"
                rows={2}
                maxLength={PROFILE_LIMITS.dietNote}
                placeholder={t("ticket.details.placeholders.dietNote")}
                aria-invalid={fieldError("dietNote") ? true : undefined}
                className={`${MT_INPUT} min-h-0 resize-y py-2.5 leading-normal ${fieldError("dietNote") ? MT_INPUT_ERROR : MT_INPUT_OK}`}
                {...register("dietNote")}
              />
            </div>
          ) : null}
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className={`${MT_LABEL} mb-3`}>{t("ticket.details.sections.address")}</legend>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-3.5 gap-y-3">
            {addressFields.map(renderField)}
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="details-country" className="text-[13px] text-muted">
                {t("ticket.details.fields.country")}
                {addressRequired ? (
                  <span aria-hidden className="text-warning-emphasis">
                    {" "}
                    *
                  </span>
                ) : null}
              </label>
              <select
                id="details-country"
                autoComplete="country"
                aria-required={addressRequired ? true : undefined}
                aria-invalid={countryError ? true : undefined}
                data-missing={countryMissing ? "true" : undefined}
                className={`${MT_INPUT} cursor-pointer ${countryError ? MT_INPUT_ERROR : countryMissing ? MT_INPUT_MISSING : MT_INPUT_OK}`}
                {...register("country")}
              >
                <option value="">{t("ticket.details.chooseCountry")}</option>
                {countries.map((country) => (
                  // The label comes from Intl.DisplayNames, whose ICU data differs between Node and the browser
                  // ("Falkland Islands (Islas Malvinas)" vs "Falkland Islands"); the value (ISO code) is the same.
                  <option key={country.value} value={country.value} suppressHydrationWarning>
                    {country.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className={`${MT_LABEL} mb-3`}>{t("ticket.details.sections.contact")}</legend>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-3.5 gap-y-3">{contactFields.map(renderField)}</div>
          <p className="text-[12.5px] leading-normal text-muted">{t("ticket.details.contactNote")}</p>
        </fieldset>

        <div role="alert">{failure ? <p className="text-sm text-danger">{t.has(`errors.${failure}`) ? t(`errors.${failure}`) : t("errors.generic")}</p> : null}</div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-t border-(--color-border) pt-4">
          <button type="submit" disabled={!dirty || saving} className={MT_BUTTON_LG}>
            {saving ? t("selfService.saving") : t("ticket.details.save")}
          </button>
          <p role="status" className={`text-[13.5px] ${statusTone}`}>
            {statusText}
          </p>
        </div>
      </form>
    </section>
  );
}

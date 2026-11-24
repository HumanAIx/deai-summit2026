"use client";

// Interactive: a form that validates an email on the client (react-hook-form + zod, rule 37) and posts it
// to our own route handler with a plain same-origin fetch (no react-query/axios in the public bundle).

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "@/lib/tickets/i18n";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { MT_BUTTON_LG, MT_BUTTON_OUTLINE, MT_INPUT, MT_INPUT_ERROR, MT_INPUT_OK } from "./my-ticket-classes";

// Message tokens, not prose: mapped to translated text below (WCAG 3.3.1 / 3.3.3).
const schema = z.object({
  email: z.string().trim().min(1, "required").max(254, "email").pipe(z.email("email")),
});
type Values = z.infer<typeof schema>;

type Status = { kind: "idle" } | { kind: "sent" } | { kind: "error"; code: string };

export function LostLinkForm({ ticketsHref }: { ticketsHref: string }) {
  const t = useTranslations("tickets");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  async function onSubmit(values: Values) {
    setStatus({ kind: "idle" });
    try {
      const response = await fetch("/api/tickets/lost-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      });
      if (response.ok) {
        setStatus({ kind: "sent" });
        return;
      }
      const body = (await response.json().catch(() => null)) as { code?: unknown } | null;
      setStatus({ kind: "error", code: typeof body?.code === "string" ? body.code : "generic" });
    } catch {
      setStatus({ kind: "error", code: "unavailable" });
    }
  }

  if (status.kind === "sent") {
    return (
      <div role="status" className="flex flex-col gap-3.5">
        <h2 className="text-[15px] font-semibold text-success">{t("lost.successHeading")}</h2>
        <p className="text-[15px] leading-relaxed text-success">{t("lost.successBody")}</p>
        <Link href={ticketsHref} className={`${MT_BUTTON_OUTLINE} self-start`}>
          {t("lost.backToTickets")}
        </Link>
      </div>
    );
  }

  const fieldError = errors.email?.message === "required" ? t("lost.emailRequired") : errors.email ? t("lost.emailInvalid") : null;
  const serverError = status.kind === "error" ? (t.has(`errors.${status.code}`) ? t(`errors.${status.code}`) : t("errors.generic")) : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-2">
      <label htmlFor="lost-link-email" className="sr-only">
        {t("lost.emailLabel")}
      </label>
      <div className="flex flex-wrap gap-2.5">
        <input
          id="lost-link-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder={t("lost.emailPlaceholder")}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? "lost-link-email-error" : undefined}
          className={`${MT_INPUT} min-h-12 flex-[1_1_240px] rounded-xl px-4 ${fieldError ? MT_INPUT_ERROR : MT_INPUT_OK}`}
          {...register("email")}
        />
        <button type="submit" disabled={isSubmitting} className={MT_BUTTON_LG}>
          {isSubmitting ? t("lost.sending") : t("lost.submit")}
        </button>
      </div>
      <p id="lost-link-email-error" role="alert" className="text-sm text-danger">
        {fieldError}
      </p>
      <div role="alert">{serverError ? <p className="text-sm text-danger">{serverError}</p> : null}</div>
    </form>
  );
}

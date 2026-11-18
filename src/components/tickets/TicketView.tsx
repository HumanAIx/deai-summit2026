import { getFormatter, getTranslations } from "@/lib/tickets/i18n-server";
import { formatEventWhen, formatPlainDate } from "@/lib/tickets/format";
import type { MyTicket } from "@/lib/tickets/schemas";
import { CancelTicket } from "./CancelTicket";
import { CompleteDetailsButton } from "./CompleteDetailsButton";
import { MT_BUTTON_OUTLINE, MT_GRADIENT, MT_GRADIENT_TEXT, MT_KICKER, MT_KICKER_RULE, MT_LABEL, MT_TICKET_CARD } from "./my-ticket-classes";
import { SellerFooter } from "./SellerFooter";
import { TicketDetailsForm } from "./TicketDetailsForm";
import { TicketSelfService } from "./TicketSelfService";
import { TicketsShell } from "./TicketsShell";

type Translator = Awaited<ReturnType<typeof getTranslations>>;

const STATUS_KEYS = { valid: "valid", checked_in: "checkedIn", refunded: "refunded", void: "void", passed_on: "passedOn" } as const;
type KnownStatus = keyof typeof STATUS_KEYS;

function statusKey({ status }: { status: string }): (typeof STATUS_KEYS)[KnownStatus] | "unknown" {
  return status in STATUS_KEYS ? STATUS_KEYS[status as KnownStatus] : "unknown";
}

function Banner({ ticket, t }: { ticket: MyTicket; t: Translator }) {
  if (ticket.status === "valid" || ticket.status === "passed_on") return null;
  const text = ticket.status === "checked_in" ? t("banner.checkedIn") : ticket.status === "refunded" ? t("banner.refunded") : ticket.status === "void" ? t("banner.void") : t("banner.unknown");
  const neutral = ticket.status === "checked_in";
  return (
    <p role="status" className={`rounded-[14px] border px-4 py-3 text-sm font-medium ${neutral ? "border-(--color-border) bg-surface text-text" : "border-danger bg-surface text-danger"}`}>
      {text}
    </p>
  );
}

/** The venue line: ep-api's ready label ("Hilton Malta, St Julian's"), else name + city. Null when there is nothing to show. */
function venueParts({ venue }: { venue: MyTicket["source"]["venue"] }): { name: string; city: string | null } | null {
  if (!venue) return null;
  const name = venue.name?.trim() || venue.label?.trim() || "";
  if (!name) return null;
  const city = venue.city?.trim() || null;
  return { name, city: city && city !== name ? city : null };
}

/** "VIP Pass" → the first word in the brand gradient, the rest plain (prototype). One word: all gradient. */
function TypeName({ name }: { name: string }) {
  const at = name.indexOf(" ");
  if (at < 0) return <span className={MT_GRADIENT_TEXT}>{name}</span>;
  return (
    <>
      <span className={MT_GRADIENT_TEXT}>{name.slice(0, at)}</span>
      {name.slice(at)}
    </>
  );
}

/** Calendar days between two `YYYY-MM-DD` values, both included; null when either is missing or unreadable. */
function dayCount({ start, end }: { start: string | null; end: string | null }): number | null {
  const parse = (value: string | null) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? Date.parse(`${value}T00:00:00Z`) : Number.NaN);
  const from = parse(start);
  const to = parse(end ?? start);
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) return null;
  return Math.round((to - from) / 86_400_000) + 1;
}

/** The ticket type's description as "includes" lines; a single long paragraph stays a paragraph. */
export function includesOf({ description }: { description: string | null | undefined }): { kind: "list"; items: string[] } | { kind: "text"; text: string } | null {
  const text = description?.trim() ?? "";
  if (!text) return null;
  const items = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•✓]\s*)/, "").trim())
    .filter(Boolean);
  const only = items.length === 1 ? items[0] : undefined;
  if (only !== undefined && only.length > 80) return { kind: "text", text: only };
  return { kind: "list", items };
}

function PassedOnCard({ ticket, t }: { ticket: MyTicket; t: Translator }) {
  const name = ticket.passedOnTo?.name?.trim() || null;
  const contact = ticket.seller.replyTo;
  return (
    <section aria-labelledby="ticket-heading" className="flex flex-col gap-3.5 rounded-2xl border border-warning/35 bg-surface p-[clamp(22px,5vw,36px)]">
      <p className="flex items-center gap-3 font-mono text-xs tracking-[0.18em] text-warning-emphasis uppercase">
        <span aria-hidden className="h-px w-7 bg-warning-emphasis" />
        {t("passedOn.kicker")}
      </p>
      <h1 id="ticket-heading" className="font-heading text-[clamp(26px,5vw,34px)] leading-tight font-medium tracking-[-0.01em] [overflow-wrap:anywhere]">
        {name ? t("passedOn.headingTo", { name }) : t("passedOn.heading")}
      </h1>
      <p className="text-[15px] leading-relaxed text-muted [text-wrap:pretty]">
        {name ? t("passedOn.bodyTo", { name }) : t("passedOn.body")}
        {contact ? (
          <>
            {" "}
            {t("passedOn.notYou")}{" "}
            <a href={`mailto:${contact}`} className="text-primary-text underline">
              {contact}
            </a>
            .
          </>
        ) : null}
      </p>
    </section>
  );
}

/**
 * "My ticket" for a holder token, in the "My Ticket" design: the completion banner, the ticket card (type, holder, badge line,
 * QR, when / where / access, what it includes), calendar and order links, "Your details" (badge, dietary, address, contact)
 * and "Pass this ticket on". It shows NEVER the price, the order or the buyer (ep-api does not send them); the order link
 * appears only when ep-api says the holder bought it (`orderToken`). The QR is ep-api's hosted PNG (its own signed URL):
 * a plain `<img>` with no referrer, because the page URL carries the token. Print styles keep the QR large.
 * A passed-on ticket is one card: who has it now. A refunded or void ticket keeps the card with its status, without QR or forms.
 */
export async function TicketView({ ticket, calendarHref, token, orderHref }: { ticket: MyTicket; calendarHref: string; token?: string; orderHref?: string | null }) {
  const [t, format] = await Promise.all([getTranslations("tickets.ticket"), getFormatter()]);

  if (ticket.status === "passed_on") {
    return (
      <TicketsShell size="narrow">
        <article className="flex flex-col gap-5">
          <PassedOnCard ticket={ticket} t={t} />
          <SellerFooter seller={ticket.seller} />
        </article>
      </TicketsShell>
    );
  }

  const when = formatEventWhen({ format, source: ticket.source });
  const venue = venueParts({ venue: ticket.source.venue });
  const scope = ticket.ticketType.scope;
  const days = Array.isArray(scope.days) ? scope.days : [];
  const sessions = Array.isArray(scope.sessions) ? scope.sessions : [];
  const access =
    scope.mode === "days" && days.length > 0
      ? t("accessDays", { days: days.map((day) => formatPlainDate({ format, value: day })).join(", ") })
      : scope.mode === "sessions" && sessions.length > 0
        ? t("accessSessions", { count: sessions.length })
        : t("accessAll");
  const accessNote = scope.mode === "sessions" ? t("accessSomeSessions") : t("accessAllSessions");
  const kickerDays = scope.mode === "days" && days.length > 0 ? days.length : dayCount({ start: ticket.source.startDate, end: ticket.source.endDate });
  const status = statusKey({ status: ticket.status });
  const valid = ticket.status === "valid";
  const canCorrectName = valid && ticket.canCorrectName === true && Boolean(token);
  const canPassOn = valid && ticket.canPassOn === true && Boolean(token);
  const canCancel = valid && ticket.canCancel === true && Boolean(token);
  const profile = valid && token ? (ticket.profile ?? null) : null;
  const changesClose =
    (canCorrectName || canPassOn) && ticket.changesCloseAt
      ? format.dateTime(new Date(ticket.changesCloseAt), { dateStyle: "full", timeStyle: "short", timeZone: ticket.source.timeZone })
      : null;
  const deadline = profile?.deadline ? format.dateTime(new Date(profile.deadline), { dateStyle: "medium", timeZone: ticket.source.timeZone }) : null;
  const badgeLine = profile ? [profile.values.jobTitle, profile.values.company].filter(Boolean).join(" · ") : "";
  const includes = includesOf({ description: ticket.ticketType.description });
  const missingCount = profile?.missing.length ?? 0;
  const missingLabels = profile?.missing.map((group) => t(`details.groupsInline.${group}`)) ?? [];

  return (
    <TicketsShell size="ticket">
      <article aria-labelledby="ticket-heading" data-ticket-print className="flex flex-col gap-5">
        {missingCount > 0 && !profile?.frozen ? (
          <div role="status" className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[14px] border border-warning/40 bg-warning/8 px-4 py-3.5 print:hidden">
            <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-0.5">
              <p className="text-[15px] font-semibold text-warning-emphasis">{t("details.banner.title", { count: missingCount })}</p>
              <p className="text-[13.5px] leading-normal text-muted [text-wrap:pretty]">
                {deadline
                  ? t("details.banner.textBy", { fields: format.list(missingLabels, { type: "conjunction" }), date: deadline })
                  : t("details.banner.text", { fields: format.list(missingLabels, { type: "conjunction" }) })}
              </p>
            </div>
            <CompleteDetailsButton label={t("details.banner.button")} />
          </div>
        ) : null}

        <Banner ticket={ticket} t={t} />

        {ticket.isTest === true ? (
          <p role="status" className="inline-block self-start rounded-full border border-warning-emphasis bg-surface px-3 py-1 text-sm font-medium text-text">
            {t("testBadge")}
          </p>
        ) : null}

        <section className={`${MT_TICKET_CARD} print:border-0 print:shadow-none`}>
          <div aria-hidden className={`h-[3px] ${MT_GRADIENT}`} />
          <div className="flex flex-col gap-5.5 p-[clamp(20px,5vw,36px)]">
            <p className={MT_KICKER}>
              <span aria-hidden className={MT_KICKER_RULE} />
              {kickerDays ? t("kickerDays", { count: kickerDays }) : t("kicker")}
            </p>
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-2">
                <h1 id="ticket-heading" className="font-heading text-[clamp(36px,7vw,48px)] leading-[1.05] font-medium tracking-[-0.02em] [overflow-wrap:anywhere]">
                  <TypeName name={ticket.ticketType.name || t("heading")} />
                </h1>
                {ticket.holder.name ? <p className="text-xl font-medium [overflow-wrap:anywhere]">{ticket.holder.name}</p> : null}
                {badgeLine ? <p className="text-[15px] text-text/85 [overflow-wrap:anywhere]">{badgeLine}</p> : null}
                {ticket.holder.email ? <p className="text-sm text-muted [overflow-wrap:anywhere]">{ticket.holder.email}</p> : null}
                <p className="text-sm text-muted">
                  {ticket.source.name}
                  {status !== "valid" ? ` · ${t(`status.${status}`)}` : null}
                </p>
              </div>
              {ticket.qrImageUrl ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="rounded-[10px] bg-on-dark p-3 leading-none">
                    {/* eslint-disable-next-line @next/next/no-img-element -- hosted QR PNG on the API host (its own signed URL): must stay a plain <img> with no referrer so the page URL (which carries the token) is never sent; next/image would proxy it and re-fetch with our headers */}
                    <img src={ticket.qrImageUrl} alt={t("qrAlt", { code: ticket.code })} width={168} height={168} referrerPolicy="no-referrer" className="block h-[168px] w-[168px] print:h-80 print:w-80" />
                  </div>
                  <p className="font-mono text-[12.5px] tracking-[0.06em] text-muted">{ticket.code}</p>
                </div>
              ) : (
                <p className="font-mono text-[12.5px] tracking-[0.06em] text-muted">{ticket.code}</p>
              )}
            </div>
            <div aria-hidden className="h-px bg-(--color-border)" />
            <dl className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
              {when ? (
                <div className="flex flex-col gap-1">
                  <dt className={MT_LABEL}>{t("whenLabel")}</dt>
                  <dd className="text-[15px]">{when}</dd>
                  <dd className="text-[13px] text-muted">{ticket.source.timeZone}</dd>
                </div>
              ) : null}
              {venue ? (
                <div className="flex flex-col gap-1">
                  <dt className={MT_LABEL}>{t("whereLabel")}</dt>
                  <dd className="text-[15px] [overflow-wrap:anywhere]">{venue.name}</dd>
                  {venue.city ? <dd className="text-[13px] text-muted">{venue.city}</dd> : null}
                </div>
              ) : null}
              <div className="flex flex-col gap-1">
                <dt className={MT_LABEL}>{t("accessLabel")}</dt>
                <dd className="text-[15px]">{access}</dd>
                <dd className="text-[13px] text-muted">{accessNote}</dd>
              </div>
            </dl>
            {includes ? (
              <div className="flex flex-col gap-2.5">
                <p className={MT_LABEL}>{t("includesLabel", { type: ticket.ticketType.name })}</p>
                {includes.kind === "list" ? (
                  <ul className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-5 gap-y-2">
                    {includes.items.map((item, index) => (
                      <li key={`${index}-${item}`} className="flex items-center gap-2.5 text-[15px] [overflow-wrap:anywhere]">
                        <span aria-hidden className="text-primary-text">
                          ✓
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[15px] leading-relaxed [overflow-wrap:anywhere]">{includes.text}</p>
                )}
              </div>
            ) : null}
          </div>
        </section>

        {valid || orderHref ? (
          <div className="flex flex-wrap gap-2.5 print:hidden">
            {valid ? (
              <a href={calendarHref} className={`${MT_BUTTON_OUTLINE} min-h-12 flex-[1_1_160px] text-[15px]`}>
                {t("addToCalendar")}
              </a>
            ) : null}
            {orderHref ? (
              <a href={orderHref} className={`${MT_BUTTON_OUTLINE} min-h-12 flex-[1_1_160px] text-[15px]`}>
                {t("viewOrder")}
              </a>
            ) : null}
          </div>
        ) : null}
        {valid ? <p className="text-[13.5px] leading-normal text-muted [text-wrap:pretty] print:hidden">{t("qrHintLong")}</p> : null}

        {profile && token ? (
          <TicketDetailsForm
            token={token}
            profile={profile}
            holderName={ticket.holder.name}
            typeName={ticket.ticketType.name}
            eventName={ticket.source.name}
            canCorrectName={canCorrectName}
            deadlineLabel={deadline}
          />
        ) : null}

        {changesClose ? <p className="text-sm text-muted print:hidden">{t("changesCloseAt", { date: changesClose, zone: ticket.source.timeZone })}</p> : null}
        {token ? <TicketSelfService token={token} holderName={ticket.holder.name} canCorrectName={canCorrectName && !profile} canPassOn={canPassOn} /> : null}

        {canCancel && token ? <CancelTicket token={token} /> : null}

        <SellerFooter seller={ticket.seller} />
      </article>
    </TicketsShell>
  );
}


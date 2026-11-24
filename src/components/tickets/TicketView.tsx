import { getFormatter, getTranslations } from "@/lib/tickets/i18n-server";
import { formatEventWhen, formatPlainDate } from "@/lib/tickets/format";
import type { MyTicket } from "@/lib/tickets/schemas";
import { CancelTicket } from "./CancelTicket";
import { CompleteDetailsButton } from "./CompleteDetailsButton";
import { PrintTicketButton } from "./PrintTicketButton";
import { SellerFooter } from "./SellerFooter";
import { TicketDetailsForm } from "./TicketDetailsForm";
import { TicketSelfService } from "./TicketSelfService";
import { TicketsShell } from "./TicketsShell";
import { BrightnessIcon, CalendarIcon, ChevronLeftIcon, Dot } from "./ticket-page-icons";
import { TP_BACK_LINK, TP_BUTTON_WHITE, TP_FOCUS, TP_GRADIENT_TEXT, TP_LABEL, TP_PILL, TP_PILL_OFF, TP_TEST_PILL, TP_TICKET_CARD } from "./ticket-page-classes";

type Translator = Awaited<ReturnType<typeof getTranslations>>;

const STATUS_KEYS = { valid: "valid", checked_in: "checkedIn", refunded: "refunded", void: "void", passed_on: "passedOn" } as const;
type KnownStatus = keyof typeof STATUS_KEYS;

function statusKey({ status }: { status: string }): (typeof STATUS_KEYS)[KnownStatus] | "unknown" {
  return status in STATUS_KEYS ? STATUS_KEYS[status as KnownStatus] : "unknown";
}

function Banner({ ticket, t }: { ticket: MyTicket; t: Translator }) {
  if (ticket.status === "valid" || ticket.status === "passed_on") return null;
  // `void` is a holder's cancel, or an organiser block (`blocked`); an older ep-api sends no flag, and then "cancelled" is the likelier reading.
  const voidText = ticket.blocked ? t("banner.blocked") : t("banner.cancelled");
  const text = ticket.status === "checked_in" ? t("banner.checkedIn") : ticket.status === "refunded" ? t("banner.refunded") : ticket.status === "void" ? voidText : t("banner.unknown");
  const neutral = ticket.status === "checked_in";
  return (
    <p
      role="status"
      className={`flex items-center gap-3 rounded-2xl border px-5 py-3.5 text-[15px] leading-normal font-medium ${neutral ? "border-(--tk-accent)/35 bg-(--tk-accent)/7 text-(--mt-soft)" : "border-(--mt-err)/40 bg-(--mt-err)/8 text-(--mt-err)"}`}
    >
      <Dot className="size-2" />
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
  if (at < 0) return <span className={TP_GRADIENT_TEXT}>{name}</span>;
  return (
    <>
      <span className={TP_GRADIENT_TEXT}>{name.slice(0, at)}</span>
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

/**
 * The ticket's flowing lines (design: twelve sine waves from blue to cyan behind the holder's name). Fixed numbers, so the
 * server and the browser draw the same paths.
 */
const WAVES = Array.from({ length: 12 }, (_, n) => {
  const i = 11 - n;
  const k = i / 12;
  const base = 90 + i * 7;
  const amp = 30 * (1 - k * 0.5);
  let d = "";
  for (let x = -10; x <= 450; x += 10) d += `${d ? "L" : "M"}${x} ${(base + Math.sin(x * 0.012 + i * 0.22) * amp + Math.sin(x * 0.028 + i * 0.5) * amp * 0.2).toFixed(1)}`;
  const [r, g, b] = [Math.round(19 - 11 * k), Math.round(102 + 79 * k), Math.round(232 - 34 * k)];
  return { d, stroke: `rgba(${r},${g},${b},${i < 2 ? 0.85 : (0.45 - k * 0.3).toFixed(2)})`, width: i < 2 ? 4 : 1.1 };
});

function TicketWaves() {
  return (
    <svg aria-hidden focusable={false} viewBox="0 0 440 200" preserveAspectRatio="none" className="pointer-events-none absolute top-[150px] left-0 h-[170px] w-full">
      {WAVES.map((wave) => (
        <path key={wave.d} d={wave.d} fill="none" stroke={wave.stroke} strokeWidth={wave.width} strokeLinecap="round" />
      ))}
    </svg>
  );
}

/** The ticket's tear line: two notches in the page colour and a dashed rule between them. */
function Perforation() {
  return (
    <div aria-hidden className="relative flex items-center">
      <span className="-ml-[15px] size-[30px] shrink-0 rounded-full border border-(--mt-line) bg-(--mt-ink)" />
      <span className="mx-2 flex-1 border-t-2 border-dashed border-white/18" />
      <span className="-mr-[15px] size-[30px] shrink-0 rounded-full border border-(--mt-line) bg-(--mt-ink)" />
    </div>
  );
}

function PassedOnCard({ ticket, t }: { ticket: MyTicket; t: Translator }) {
  const name = ticket.passedOnTo?.name?.trim() || null;
  const contact = ticket.seller.replyTo;
  return (
    <section aria-labelledby="ticket-heading" className="flex flex-col gap-4 rounded-[22px] border border-(--mt-warn)/35 bg-(--mt-card) p-[clamp(22px,5vw,36px)]">
      <p className="flex items-center gap-3.5 font-mono text-[13px] font-medium tracking-[0.22em] text-(--mt-warn) uppercase">
        <span aria-hidden className="h-px w-8 bg-(--mt-warn)" />
        {t("passedOn.kicker")}
      </p>
      <h1 id="ticket-heading" className="text-[clamp(28px,6vw,40px)] leading-[1.05] font-bold tracking-[-0.03em] [overflow-wrap:anywhere]">
        {name ? t("passedOn.headingTo", { name }) : t("passedOn.heading")}
      </h1>
      <p className="text-[15px] leading-relaxed text-(--mt-body) [text-wrap:pretty]">
        {name ? t("passedOn.bodyTo", { name }) : t("passedOn.body")}
        {contact ? (
          <>
            {" "}
            {t("passedOn.notYou")}{" "}
            <a href={`mailto:${contact}`} className={`rounded-sm text-(--tk-accent) underline hover:text-white ${TP_FOCUS}`}>
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
 * "My ticket" for a holder token, in the "DeAI My Ticket" design: "Back to your order" (only when ep-api says the holder
 * bought it: `orderToken`) and the test badge on top; the completion banner; then, side by side on a wide screen and
 * stacked on a phone, the ticket (type, holder, QR, when / where / access, what it includes) with "Add to calendar" and
 * "Save as PDF" under it, and "Your details" (badge, dietary, address, contact), "Pass this ticket on" and "Cancel my
 * ticket". It shows NEVER the price, the order or the buyer (ep-api does not send them). The QR is ep-api's hosted PNG
 * (its own signed URL): a plain `<img>` with no referrer, because the page URL carries the token. Printing (Save as PDF)
 * prints the ticket card alone. A passed-on ticket is one card: who has it now. A refunded or void ticket keeps the card
 * with its status, without QR or forms.
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
  const selfService = Boolean(token) && (canCorrectName || canPassOn);
  const hasSide = Boolean(profile && token) || Boolean(changesClose) || selfService || canCancel;

  const cells = [
    when ? { key: "when", label: t("whenLabel"), value: when, note: ticket.source.timeZone } : null,
    venue ? { key: "where", label: t("whereLabel"), value: venue.name, note: venue.city } : null,
    { key: "access", label: t("accessLabel"), value: access, note: accessNote },
  ].filter((cell): cell is { key: string; label: string; value: string; note: string | null } => cell !== null);

  return (
    <TicketsShell size="page">
      <article aria-labelledby="ticket-heading" data-ticket-print className="flex flex-col gap-[clamp(20px,3.5vw,32px)]">
        {orderHref || ticket.isTest === true ? (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 print:hidden">
            {orderHref ? (
              <a href={orderHref} className={TP_BACK_LINK}>
                <ChevronLeftIcon />
                {t("backToOrder")}
              </a>
            ) : (
              <span />
            )}
            {ticket.isTest === true ? (
              <p role="status" className={TP_TEST_PILL}>
                <Dot />
                {t("testBadge")}
              </p>
            ) : null}
          </div>
        ) : null}

        {missingCount > 0 && !profile?.frozen ? (
          <div role="status" className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-(--mt-warn)/40 bg-(--mt-warn)/7 px-5 py-4 print:hidden">
            <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-1">
              <p className="text-[15px] font-semibold text-(--mt-warn)">{t("details.banner.title", { count: missingCount })}</p>
              <p className="text-sm leading-normal text-(--mt-warn-soft) [text-wrap:pretty]">
                {deadline
                  ? t("details.banner.textBy", { fields: format.list(missingLabels, { type: "conjunction" }), date: deadline })
                  : t("details.banner.text", { fields: format.list(missingLabels, { type: "conjunction" }) })}
              </p>
            </div>
            <CompleteDetailsButton label={t("details.banner.button")} />
          </div>
        ) : null}

        <Banner ticket={ticket} t={t} />

        <div className="flex flex-wrap items-start gap-7">
          <div className="mx-auto flex w-full max-w-[440px] min-w-0 flex-[1_1_340px] flex-col gap-3.5">
            <section data-ticket-card className={TP_TICKET_CARD}>
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(420px_300px_at_100%_0%,rgba(19,102,232,0.38),transparent_70%)]" />
              <TicketWaves />
              <div className="relative flex flex-col gap-6.5 px-[clamp(22px,6vw,30px)] pt-7 pb-6">
                <div className="flex items-center justify-between gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a 43 KB static logo inside the printable ticket; a plain <img> prints reliably. Decorative: the site header names the event. */}
                  <img src="/tickets/deai-summit-logo.png" alt="" width={88} height={34} className="block h-[34px] w-auto" />
                  <p className="font-mono text-[11px] font-medium tracking-[0.22em] whitespace-nowrap text-(--tk-accent) uppercase">{kickerDays ? t("kickerDays", { count: kickerDays }) : t("kicker")}</p>
                </div>
                <div className="flex flex-col gap-3">
                  <h1 id="ticket-heading" className="text-[clamp(38px,11vw,46px)] leading-[0.95] font-extrabold tracking-[-0.05em] [overflow-wrap:anywhere]">
                    <TypeName name={ticket.ticketType.name || t("heading")} />
                  </h1>
                  <div className="flex flex-col gap-[3px]">
                    {ticket.holder.name ? <p className="text-xl font-semibold tracking-[-0.01em] [overflow-wrap:anywhere]">{ticket.holder.name}</p> : null}
                    {badgeLine ? <p className="text-[15px] text-(--mt-soft) [overflow-wrap:anywhere]">{badgeLine}</p> : null}
                    {ticket.holder.email ? <p className="text-sm text-(--mt-mut) [overflow-wrap:anywhere]">{ticket.holder.email}</p> : null}
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-(--mt-mut)">
                      <span>{ticket.source.name}</span>
                      {status !== "valid" ? (
                        <span className={`${TP_PILL} ${status === "checkedIn" ? "bg-white/8 text-(--mt-soft)" : TP_PILL_OFF}`}>{t(`status.${status}`)}</span>
                      ) : null}
                    </p>
                  </div>
                </div>
              </div>

              <Perforation />

              <div className="relative flex flex-col items-center gap-3.5 px-[clamp(22px,6vw,30px)] pt-6 pb-7">
                {ticket.qrImageUrl ? (
                  <div className="w-full max-w-[280px] rounded-[22px] bg-white p-4 leading-none">
                    {/* eslint-disable-next-line @next/next/no-img-element -- hosted QR PNG on the API host (its own signed URL): must stay a plain <img> with no referrer so the page URL (which carries the token) is never sent; next/image would proxy it and re-fetch with our headers */}
                    <img src={ticket.qrImageUrl} alt={t("qrAlt", { code: ticket.code })} width={228} height={228} referrerPolicy="no-referrer" className="block aspect-square h-auto w-full [image-rendering:pixelated]" />
                  </div>
                ) : null}
                <p className="font-mono text-[15px] font-semibold tracking-[0.12em] text-(--tk-accent) [overflow-wrap:anywhere]">{ticket.code}</p>
              </div>

              <dl className="relative grid grid-cols-3 gap-px border-t border-(--mt-hair) bg-(--mt-hair)">
                {cells.map((cell, index) => (
                  <div key={cell.key} className={`flex min-w-0 flex-col gap-[5px] bg-(--mt-ticket) px-[clamp(12px,3.5vw,18px)] py-4 ${cells.length === 2 && index === 1 ? "col-span-2" : cells.length === 1 ? "col-span-3" : ""}`}>
                    <dt className={TP_LABEL}>{cell.label}</dt>
                    <dd className="text-sm font-semibold [overflow-wrap:anywhere]">{cell.value}</dd>
                    {cell.note ? <dd className="text-xs text-(--mt-mut) [overflow-wrap:anywhere]">{cell.note}</dd> : null}
                  </div>
                ))}
              </dl>

              {includes ? (
                <div className="relative flex flex-col gap-2.5 border-t border-(--mt-hair) bg-(--mt-ticket) px-[clamp(18px,5vw,22px)] pt-4.5 pb-5.5">
                  <p className={TP_LABEL}>{t("includesLabel", { type: ticket.ticketType.name })}</p>
                  {includes.kind === "list" ? (
                    <ul className="flex flex-wrap gap-1.5">
                      {includes.items.map((item, index) => (
                        <li key={`${index}-${item}`} className="flex min-h-7 items-center rounded-full bg-(--tk-accent)/10 px-3 py-1 text-[13px] text-[#C9F1F6] [overflow-wrap:anywhere]">
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm leading-relaxed text-(--mt-soft) [overflow-wrap:anywhere]">{includes.text}</p>
                  )}
                </div>
              ) : null}
            </section>

            {valid ? (
              <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 print:hidden">
                <a href={calendarHref} className={`${TP_BUTTON_WHITE} w-full px-3`}>
                  <CalendarIcon />
                  {t("addToCalendar")}
                </a>
                <PrintTicketButton label={t("savePdf")} />
              </div>
            ) : null}
            {valid ? (
              <p className="flex gap-2.5 text-[13px] leading-[1.55] text-(--mt-mut) [text-wrap:pretty] print:hidden">
                <BrightnessIcon className="mt-px shrink-0" />
                {t("qrHintLong")}
              </p>
            ) : null}
          </div>

          {hasSide ? (
            <div className="flex min-w-0 flex-[1.4_1_480px] flex-col gap-5 print:hidden">
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
              {changesClose ? <p className="px-1 text-sm text-(--mt-mut)">{t("changesCloseAt", { date: changesClose, zone: ticket.source.timeZone })}</p> : null}
              {token ? <TicketSelfService token={token} holderName={ticket.holder.name} canCorrectName={canCorrectName && !profile} canPassOn={canPassOn} /> : null}
              {canCancel && token ? <CancelTicket token={token} /> : null}
            </div>
          ) : null}
        </div>

        <SellerFooter seller={ticket.seller} />
      </article>
    </TicketsShell>
  );
}

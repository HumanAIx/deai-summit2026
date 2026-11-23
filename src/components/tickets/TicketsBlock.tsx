"use client"; // reads live prices and stock in the browser (mount, tab refocus, Retry): the CMS page itself is cached for 60 s
import Link from "next/link";
import { useLocale, useFormatter, useTranslations } from "@/lib/tickets/i18n";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { TicketCard } from "@/lib/tickets/block-schema";
import { NO_TICKETS_CODES, requestBlockTypes } from "@/lib/tickets/block-types-client";
import {
  autoKicker,
  buttonState,
  cardTitle,
  featuredIndex,
  gridStyle,
  lowStock,
  priceParts,
  resolveCards,
  showsBookingFee,
  splitTitle,
  type ButtonState,
  type ResolvedCard,
} from "@/lib/tickets/block-cards";
import { formatMoney, formatPlainDate } from "@/lib/tickets/format";
import type { BlockTypes, PublicType } from "@/lib/tickets/schemas";
import { WaitlistJoin } from "./checkout/WaitlistJoin";

type Live = { status: "loading" } | { status: "ready"; data: BlockTypes } | { status: "error" };

/** The "nothing for sale here" answer: the site sells no tickets, so the block shows no cards. */
const NOTHING: BlockTypes = { types: [], checkout: { salesOpen: false, testMode: false, feePayer: "buyer" } };

/**
 * Live ticket state for the block: read on mount and again whenever the tab becomes visible. A refresh that fails
 * keeps the last good answer (it did come from the API); only a first load that fails is an error.
 */
function useLiveTypes({ locale }: { locale: string }): { live: Live; retry: () => void; refresh: () => void } {
  const [live, setLive] = useState<Live>({ status: "loading" });
  const run = useRef(0);

  const load = useCallback(
    () => {
      const id = ++run.current;
      const controller = new AbortController();
      requestBlockTypes({ locale, signal: controller.signal })
        .then((result) => {
          if (id !== run.current) return;
          if (result.ok) setLive({ status: "ready", data: result.data });
          else if (NO_TICKETS_CODES.has(result.code)) setLive({ status: "ready", data: NOTHING });
          else setLive((current) => (current.status === "ready" ? current : { status: "error" }));
        })
        .catch(() => undefined); // aborted on unmount
      return () => controller.abort();
    },
    [locale],
  );

  useEffect(() => {
    let abort = load();
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      abort();
      abort = load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      abort();
    };
  }, [load]);

  return {
    live,
    retry: () => {
      setLive({ status: "loading" });
      load();
    },
    // Re-read without a skeleton (kept for callers that know stock changed).
    refresh: () => {
      load();
    },
  };
}


const BUTTON_BASE =
  "mt-8 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full px-6 text-center text-base font-semibold [overflow-wrap:anywhere]";

const WAITLIST_BUTTON =
  "mt-8 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full px-6 text-center text-base font-semibold [overflow-wrap:anywhere] border border-[color-mix(in_srgb,var(--color-primary)_40%,transparent)] text-text hover:bg-surface";

/**
 * The cards of a `tickets` add-on block. Card text (title, label, list) comes from the block's own props and is
 * server-rendered; price, stock and the button are filled from live data. While it loads they are a skeleton of the
 * final height (nothing jumps); on failure the buttons are disabled with a Retry. Never shows a price that did not
 * come from `/api/tickets/types`. Not editable here: in the editor (`editable`) the buttons are inert, and a card with
 * no ticket type, or one the site no longer sells, shows as a placeholder so the author can see it (the public site
 * leaves it out).
 */
export function TicketsBlock({
  cards,
  buyHref,
  editable = false,
  frame = (content) => content,
  maxCardPx,
}: {
  cards: readonly TicketCard[];
  buyHref: string;
  editable?: boolean;
  /** DeAI: wraps the cards (the section and its heading), so a section with nothing on sale disappears as a whole. */
  frame?: (content: ReactNode) => ReactNode;
  /** DeAI: a wider card cap where the cards are the page's main content (see `gridStyle`). */
  maxCardPx?: number;
}) {
  const t = useTranslations("block.ticketsBlock");
  const locale = useLocale();
  const { live, retry } = useLiveTypes({ locale });
  const resolved = resolveCards({ cards, types: live.status === "ready" ? live.data.types : null, editor: editable });
  if (resolved.length === 0) return null;
  // DeAI: the checkout a card opens offers exactly this section's tickets (the picked types that are on the public list).
  const offeredIds = resolved.flatMap((entry) => (entry.type ? [entry.type.id] : entry.card.ticketTypeId ? [entry.card.ticketTypeId] : []));

  const featured = featuredIndex({ resolved });
  const salesOpen = live.status === "ready" ? live.data.checkout.salesOpen : false;
  const feePayer = live.status === "ready" ? live.data.checkout.feePayer : "";

  return frame(
    // On a template site the template's own palette wins (`--t-accent-text` is its contrast-checked accent text and
    // follows toned sections; `--t-btn` / `--t-on-btn` is its primary button pair); elsewhere the block's derived tokens.
    <div
      data-tickets-block=""
      className="[--tb-accent:var(--t-accent-text,var(--color-ticket-accent,var(--color-primary-text)))] [--tb-accent-2:var(--t-primary-text,var(--color-ticket-accent-2,var(--tb-accent)))] [--tb-btn:var(--t-btn,var(--ticket-btn-bg,var(--color-primary)))] [--tb-on-btn:var(--t-on-btn,var(--color-ticket-on-btn,var(--color-on-primary)))] w-full min-w-0"
    >
      <ul className="mx-auto grid list-none gap-4 p-0" style={gridStyle({ count: resolved.length, maxCardPx })} aria-busy={live.status === "loading"}>
        {resolved.map((entry, index) => (
          <li key={entry.card.id} className="flex min-w-0">
            <TicketCardView entry={entry} featured={index === featured} live={live} salesOpen={salesOpen} feePayer={feePayer} buyHref={buyHref} offeredIds={offeredIds} editable={editable} />
          </li>
        ))}
      </ul>
      {live.status === "error" ? (
        <div role="alert" className="mx-auto mt-4 flex flex-wrap items-center justify-center gap-3 text-sm text-muted">
          <span>{t("loadFailed")}</span>
          <button type="button" onClick={retry} className="rounded-full border border-(--color-control-border) px-4 py-2 font-medium text-text hover:bg-surface">
            {t("retry")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function TicketCardView({
  entry,
  featured,
  live,
  salesOpen,
  feePayer,
  buyHref,
  offeredIds,
  editable,
}: {
  entry: ResolvedCard;
  featured: boolean;
  live: Live;
  salesOpen: boolean;
  feePayer: string;
  buyHref: string;
  offeredIds: readonly string[];
  editable: boolean;
}) {
  const t = useTranslations("block.ticketsBlock");
  const tl = useTranslations("tickets.list");
  const locale = useLocale();
  const format = useFormatter();
  const { card, type } = entry;
  const loading = live.status === "loading";
  // Editor only (`resolveCards` keeps such a card only then): nothing to sell yet, or the type is gone.
  const placeholder = editable && type === null && (card.ticketTypeId === "" || live.status === "ready");

  const title = cardTitle({ card, type });
  const parts = splitTitle({ title, hl: card.hl });
  const kicker = autoKicker({ type });
  const kickerText =
    card.kicker !== ""
      ? card.kicker
      : kicker.kind === "days"
        ? t("kickerDays", { count: kicker.count })
        : kicker.kind === "sessions"
          ? t("kickerSessions", { count: kicker.count })
          : kicker.kind === "when"
            ? t("kickerWhen", { when: formatPlainDate({ format, value: kicker.date }) })
            : t("kickerPlain");

  const left = type ? lowStock({ type }) : null;
  const state: ButtonState | null = type ? buttonState({ type, salesOpen }) : null;
  const opens = type?.status === "not_yet" && type.saleFrom ? new Date(type.saleFrom) : null;
  const opensText = opens && !Number.isNaN(opens.getTime()) ? format.dateTime(opens, { dateStyle: "long" }) : null;

  const shell = featured
    ? "border-[color-mix(in_srgb,var(--color-primary)_40%,transparent)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface-raised))_0%,var(--color-surface-raised)_100%)] shadow-[0_0_60px_color-mix(in_srgb,var(--color-primary)_20%,transparent)]"
    : "border-(--color-border) bg-(--surf-card,var(--color-surface-raised))";

  return (
    <article className={`relative flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border p-6 text-text sm:p-8 ${shell}`}>
      {featured ? <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-linear-to-r from-primary to-secondary" /> : null}

      <p className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-(--tb-accent) [overflow-wrap:anywhere]">
        <span aria-hidden className="h-px w-8 shrink-0 bg-(--tb-accent)" />
        {kickerText}
      </p>

      {title === "" && loading ? (
        <div aria-hidden className="mt-3 h-10 w-3/4 animate-pulse rounded bg-(--color-border) motion-reduce:animate-none" />
      ) : (
        <h3 className="mt-3 font-heading text-3xl leading-tight font-normal tracking-tight [overflow-wrap:anywhere] sm:text-4xl">
          {parts ? (
            <>
              {parts.before}
              <span className="bg-linear-to-r from-(--tb-accent) to-(--tb-accent-2) bg-clip-text font-semibold text-transparent">{parts.accent}</span>
              {parts.after}
            </>
          ) : (
            title
          )}
        </h3>
      )}

      <div className="mt-4 min-h-[4.5rem]">
        {type ? (
          <>
            <p className="flex flex-wrap items-baseline text-5xl leading-none font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-6xl">
              {type.priceCents === 0 ? (
                tl("free")
              ) : (
                priceParts({ cents: type.priceCents, currency: type.currency, locale }).map((part, i) => (
                  <span key={i} className={part.small ? "text-3xl font-medium text-muted sm:text-4xl" : undefined}>
                    {part.text}
                  </span>
                ))
              )}
            </p>
            {type.priceCents > 0 && showsBookingFee({ type, feePayer }) ? (
              <p className="mt-2 text-sm text-muted">{tl("feeExtra", { fee: formatMoney({ format, cents: type.bookingFeeCents, currency: type.currency }) })}</p>
            ) : null}
            {left !== null ? <p className="mt-2 text-sm font-medium text-muted">{t("left", { count: left })}</p> : null}
          </>
        ) : placeholder ? (
          <p data-testid="ticket-card-placeholder" className="text-sm font-medium text-muted">
            {card.ticketTypeId === "" ? t("editorNoType") : t("editorGoneType")}
          </p>
        ) : (
          <div aria-hidden className="h-14 w-40 animate-pulse rounded bg-(--color-border) motion-reduce:animate-none" />
        )}
      </div>

      <hr className="my-8 border-0 border-t border-(--color-border)" />

      {card.incl !== "" ? <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-muted [overflow-wrap:anywhere]">{card.incl}</p> : null}
      <ul className="flex flex-1 list-none flex-col gap-4 p-0 text-base">
        {(Array.isArray(card.feats) ? card.feats : [])
          .filter((line) => line !== "")
          .map((line, i) => (
            <li key={i} className="flex items-start gap-3 [overflow-wrap:anywhere]">
              <svg aria-hidden viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-(--tb-accent)">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              <span>{line}</span>
            </li>
          ))}
      </ul>

      {type && state ? (
        <CardButton state={state} featured={featured} label={card.btn !== "" ? card.btn : t("buy")} opensText={opensText} buyHref={buyHref} offeredIds={offeredIds} editable={editable} type={type} />
      ) : placeholder ? (
        <div aria-hidden className={`${BUTTON_BASE} cursor-default border border-dashed border-(--color-control-border) text-muted`}>
          {t("editorPickType")}
        </div>
      ) : live.status === "error" ? (
        <button type="button" disabled className={`${BUTTON_BASE} cursor-not-allowed border border-(--color-control-border) text-text opacity-60`}>
          {t("unavailable")}
        </button>
      ) : (
        <div aria-hidden className={`${BUTTON_BASE} animate-pulse bg-(--color-border) motion-reduce:animate-none`} />
      )}
    </article>
  );
}

function CardButton({
  state,
  featured,
  label,
  opensText,
  buyHref,
  offeredIds,
  editable,
  type,
}: {
  state: ButtonState;
  featured: boolean;
  label: string;
  opensText: string | null;
  buyHref: string;
  offeredIds: readonly string[];
  editable: boolean;
  type: PublicType;
}) {
  const t = useTranslations("block.ticketsBlock");

  // Sold out with a waitlist (and sales open on the site): the card offers it. In the editor nothing opens.
  if (state === "soldOut" && type.waitlistEnabled === true && !editable) {
    return <WaitlistJoin ticketTypeId={type.id} typeName={type.name} maxPerOrder={type.maxPerOrder} triggerClassName={WAITLIST_BUTTON} />;
  }

  if (state !== "buy") {
    const text =
      state === "notYet" ? (opensText ? t("onSale", { date: opensText }) : t("closed")) : state === "soldOut" ? t("soldOut") : state === "salesNotOpen" ? t("notOpen") : t("closed");
    return (
      <button type="button" disabled className={`${BUTTON_BASE} cursor-not-allowed border border-(--color-control-border) text-text opacity-60`}>
        {text}
      </button>
    );
  }

  const look = featured
    ? "border-0 text-(--tb-on-btn) [background:var(--tb-btn)] shadow-[0_8px_30px_color-mix(in_srgb,var(--color-secondary)_32%,transparent)] hover:opacity-90"
    : "border border-[color-mix(in_srgb,var(--color-primary)_40%,transparent)] text-text hover:bg-surface";
  const arrow = (
    <svg aria-hidden viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
  // In the editor the button only looks like one: nothing navigates and nothing opens.
  if (editable) {
    return (
      <button type="button" tabIndex={-1} aria-disabled="true" onClick={(event) => event.preventDefault()} className={`${BUTTON_BASE} cursor-default ${look}`}>
        {label}
        {arrow}
      </button>
    );
  }
  return (
    // DeAI: buying always happens on the full `/tickets` page (never in a pop-up), with this card's type preselected and
    // only this section's tickets on offer (`types`).
    <Link href={`${buyHref}?type=${encodeURIComponent(type.id)}&types=${offeredIds.map(encodeURIComponent).join(",")}`} className={`${BUTTON_BASE} ${look}`}>
      {label}
      {arrow}
    </Link>
  );
}

import type { ReactNode } from "react";
import { TK_KICKER } from "../tickets-classes";

/**
 * Small pieces of the checkout's design (23 Nov handoff, `CartDemo` in the kit): the numbered section with its accent
 * kicker, the step bar and the line icons. Pure markup, so they render on the server too.
 */

const ICONS = {
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  arrowLeft: "M19 12H5M11 18l-6-6 6-6",
  lock: "M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5z",
  ticket: "M3 9a3 3 0 0 0 0 6v3h18v-3a3 3 0 0 1 0-6V6H3zM13 6v2M13 11v2M13 16v2",
  timer: "M10 2h4M12 14l3-3M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4",
  idCard: "M3 5h18v14H3zM7 15a2 2 0 0 1 4 0M9 11h.01M14 9h4M14 13h4",
  check: "M5 12.5l4.5 4.5L19 7.5",
  minus: "M5 12h14",
  plus: "M12 5v14M5 12h14",
  alert: "M12 8v4M12 16h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z",
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 16, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className ?? ""}`}>
      <path d={ICONS[name]} />
    </svg>
  );
}

/** "01 · TICKETS": a numbered part of the cart step, a hairline above it. `headingId` names the section for screen readers. */
export function CheckoutSection({ number, title, headingId, children }: { number: string; title: string; headingId: string; children: ReactNode }) {
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3.5 border-t border-(--tk-line) pt-[22px]">
      <h3 id={headingId} className={`${TK_KICKER} m-0 flex items-center gap-3 font-normal`}>
        <span aria-hidden="true" className="h-[1.5px] w-6 bg-(--tk-accent)" />
        <span>
          {number} · {title}
        </span>
      </h3>
      {children}
    </section>
  );
}

/** The three steps: "1 TICKETS & DETAILS — 2 PAYMENT — 3 CONFIRMATION", the current one in the accent colour. */
export function StepsBar({ label, steps, current }: { label: string; steps: readonly string[]; current: number }) {
  return (
    <ol aria-label={label} className="m-0 flex list-none flex-wrap items-center gap-2 p-0 font-mono text-[11px] uppercase tracking-[0.14em]">
      {steps.map((step, index) => (
        <li key={step} aria-current={index === current ? "step" : undefined} className={`inline-flex items-center gap-2 ${index === current ? "text-(--tk-accent)" : "text-(--tk-mut)"}`}>
          {index > 0 ? <span aria-hidden="true" className="h-px w-4 bg-(--tk-line)" /> : null}
          {index + 1} {step}
        </li>
      ))}
    </ol>
  );
}

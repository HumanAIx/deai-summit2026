import type { CSSProperties, ReactNode } from "react";
import { plexMono } from "./ticket-fonts";

/**
 * The dark DeAI ticket backdrop + centred column every ticket page renders inside (the `/tickets` layout supplies
 * DeAI's navbar and footer). Same navy grid and blue → cyan bar as the CMS tickets page, so the live checkout and the
 * token pages look like the rest of the ticket pages. One `<h1>` per page is the caller's job; 16 px side gutters at
 * 375 px, no fixed widths, so nothing overflows horizontally.
 */
const SIZES = { default: "max-w-3xl", wide: "max-w-5xl", ticket: "max-w-[720px]", order: "max-w-[760px]", narrow: "max-w-[640px]", checkout: "max-w-[1200px]", page: "max-w-[1180px]" } as const;

export const TICKETS_BACKDROP_STYLE: CSSProperties = {
  backgroundImage:
    "radial-gradient(900px 520px at 88% -8%, rgba(30,90,220,0.35), transparent 70%), radial-gradient(700px 420px at 10% 105%, rgba(8,150,200,0.18), transparent 70%), linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
  backgroundSize: "auto, auto, 64px 64px, 64px 64px",
};

/** `size` follows the designs: the holder's ticket and the buyer's order 1180 px (`page`), sign-in / passed-on 640 px; the checkout panel 1200 px. `ticket` / `order` / `wide` are older widths. */
export function TicketsShell({ children, wide = false, size }: { children: ReactNode; wide?: boolean; size?: keyof typeof SIZES }) {
  const width = SIZES[size ?? (wide ? "wide" : "default")];
  return (
    <section className={`deai-tickets ${plexMono.variable} relative -mt-[140px] min-h-screen bg-background pt-[140px] font-body text-text`} style={TICKETS_BACKDROP_STYLE}>
      <div aria-hidden className="absolute inset-x-0 top-0 z-40 h-1 bg-linear-to-r from-[#1E6BF0] to-[#08B5C6]" />
      <div id="main-content" tabIndex={-1} className={`relative mx-auto w-full ${width} ${size === "page" ? "px-[clamp(16px,4vw,40px)]" : "px-4 sm:px-6"} py-10 focus:outline-none sm:py-14`}>
        {children}
      </div>
    </section>
  );
}

export { TICKETS_BUTTON, TICKETS_BUTTON_OUTLINE, TICKETS_CARD } from "./tickets-classes";

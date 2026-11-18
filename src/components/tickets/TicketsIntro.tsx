import { plexMono } from './ticket-fonts';

/**
 * The `/tickets` heading in the look of the CMS tickets page (`TicketsPageView`): mono eyebrow between two rules,
 * a large title whose last word is the blue → cyan accent, and a mono meta line ("25–26 NOV · VALLETTA"). The texts
 * come from the CMS `tickets` page, so organisers keep editing them in the dashboard.
 */
export function TicketsIntro({ eyebrow, titleLead, accentWord, meta }: { eyebrow: string; titleLead: string; accentWord: string; meta: string }) {
  return (
    <div className="mx-auto mb-10 flex w-full max-w-3xl flex-col items-center gap-5 text-center sm:mb-14">
      {eyebrow ? (
        <div className={`${plexMono.className} flex items-center justify-center gap-3.5 text-sm font-medium tracking-[0.22em] text-[#2CC7D9]`}>
          <span aria-hidden className="h-0.5 w-11 bg-[#2CC7D9]" />
          {eyebrow}
          <span aria-hidden className="h-0.5 w-11 bg-[#2CC7D9]" />
        </div>
      ) : null}
      <h1 className="m-0 font-display text-[clamp(2.5rem,6vw,4.5rem)] font-normal leading-none tracking-[-0.035em] text-balance">
        {titleLead}
        {accentWord ? (
          <>
            {' '}
            <span className="bg-gradient-to-r from-[#1E6BF0] to-[#08B5C6] bg-clip-text font-bold text-transparent">{accentWord}</span>
          </>
        ) : null}
      </h1>
      {meta ? <p className={`${plexMono.className} m-0 text-sm tracking-[0.22em] text-[#9AA3B8]`}>{meta}</p> : null}
    </div>
  );
}

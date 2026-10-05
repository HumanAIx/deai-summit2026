import type { ReactNode } from 'react';
import { IBM_Plex_Mono } from 'next/font/google';
import type { TicketPass, TicketsPageContent } from '@/lib/tickets-page';

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
});

function Check() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M3.5 10.5l4 4 9-9" stroke="#2CC7D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function external(href: string) {
  return /^https?:\/\//i.test(href);
}

function TicketLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target={external(href) ? '_blank' : undefined}
      rel={external(href) ? 'noopener noreferrer' : undefined}
      className={className}
    >
      {children}
      <span aria-hidden="true">→</span>
    </a>
  );
}

function PassCard({ pass }: { pass: TicketPass }) {
  const [firstWord, ...rest] = pass.title.split(/\s+/).filter(Boolean);
  const remainder = rest.join(' ');

  return (
    <article
      className={`relative flex flex-col gap-8 rounded-3xl p-7 sm:p-9 md:p-11 backdrop-blur-sm ${
        pass.featured
          ? 'overflow-hidden border border-[#2CC7D9]/35 bg-gradient-to-b from-[rgba(20,50,130,0.45)] to-[rgba(10,20,50,0.55)] shadow-[0_30px_80px_-30px_rgba(8,140,220,0.45)]'
          : 'border border-white/10 bg-[rgba(10,20,50,0.55)]'
      }`}
    >
      {pass.featured ? (
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#1E6BF0] to-[#08B5C6]" />
      ) : null}
      <div className="flex flex-col gap-5">
        {pass.eyebrow ? (
          <div className={`${plexMono.className} flex items-center gap-3 text-[13px] font-medium tracking-[0.22em] text-[#2CC7D9]`}>
            <span className="h-0.5 w-8 bg-[#2CC7D9]" />
            {pass.eyebrow}
          </div>
        ) : null}
        <h2 className="m-0 text-[clamp(2.5rem,4.4vw,3.5rem)] font-normal leading-none tracking-[-0.03em]">
          {pass.featured && firstWord ? (
            <>
              <span className="font-bold bg-gradient-to-r from-[#1E6BF0] to-[#08B5C6] bg-clip-text text-transparent">
                {firstWord}
              </span>
              {remainder ? ` ${remainder}` : null}
            </>
          ) : (
            pass.title
          )}
        </h2>
        {pass.priceMajor ? (
          <div className="flex items-baseline font-semibold leading-none tracking-[-0.05em]">
            <span className="text-[clamp(4rem,7vw,5.75rem)]">{pass.priceMajor}</span>
            {pass.priceMinor ? (
              <span className="text-[clamp(1.875rem,3.2vw,2.625rem)] text-[#9A9CA8]">{pass.priceMinor}</span>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="h-px bg-white/10" />
      <div className="flex flex-1 flex-col gap-4">
        {pass.includesLabel ? (
          <div className={`${plexMono.className} text-[13px] tracking-[0.22em] text-[#9AA3B8]`}>
            {pass.includesLabel}
          </div>
        ) : null}
        {pass.includes.length > 0 ? (
          <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
            {pass.includes.map((item) => (
              <li key={item} className="flex items-center gap-4 text-[19px]">
                <Check />
                {item}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <TicketLink
        href={pass.buttonHref}
        className={
          pass.featured
            ? 'mt-2 flex h-[60px] items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#1E6BF0] to-[#08B5C6] text-lg font-semibold text-white shadow-[0_12px_36px_-10px_rgba(8,181,198,0.6)] transition hover:brightness-110'
            : 'mt-2 flex h-[60px] items-center justify-center gap-3 rounded-full border border-[#2CC7D9]/50 text-lg font-semibold text-white transition hover:bg-[#2CC7D9]/10'
        }
      >
        {pass.buttonLabel}
      </TicketLink>
    </article>
  );
}

export function TicketsPageView({ content }: { content: TicketsPageContent }) {
  return (
    <section
      className="relative -mt-[140px] min-h-screen bg-[#040A1E] pt-[140px] text-white"
      style={{
        backgroundImage:
          'radial-gradient(900px 520px at 88% -8%, rgba(30,90,220,0.35), transparent 70%), radial-gradient(700px 420px at 10% 105%, rgba(8,150,200,0.18), transparent 70%), linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize: 'auto, auto, 64px 64px, 64px 64px',
      }}
    >
      <div className="absolute left-0 right-0 top-0 z-40 h-1 bg-gradient-to-r from-[#1E6BF0] to-[#08B5C6]" />
      <div className="relative mx-auto flex w-full max-w-[1180px] flex-col gap-16 px-5 pb-16 pt-8 sm:gap-20 md:px-14 md:pt-12 md:pb-20">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 text-center">
          {content.eyebrow ? (
            <div className={`${plexMono.className} flex items-center justify-center gap-3.5 text-sm font-medium tracking-[0.22em] text-[#2CC7D9]`}>
              <span className="h-0.5 w-11 bg-[#2CC7D9]" />
              {content.eyebrow}
              <span className="h-0.5 w-11 bg-[#2CC7D9]" />
            </div>
          ) : null}
          <h1 className="m-0 text-[clamp(2.75rem,6.5vw,5.25rem)] font-normal leading-none tracking-[-0.035em] text-balance">
            {content.titleLead}
            {content.accentWord ? (
              <>
                {' '}
                <span className="font-bold bg-gradient-to-r from-[#1E6BF0] to-[#08B5C6] bg-clip-text text-transparent">
                  {content.accentWord}
                </span>
              </>
            ) : null}
          </h1>
          {content.meta ? (
            <p className={`${plexMono.className} m-0 text-sm tracking-[0.22em] text-[#9AA3B8]`}>
              {content.meta}
            </p>
          ) : null}
        </div>

        {content.passes.length > 0 ? (
          <div className="grid items-stretch gap-6 lg:grid-cols-2">
            {content.passes.map((pass) => (
              <PassCard key={pass.id} pass={pass} />
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-12 sm:gap-16">
          <div className="flex flex-col items-start justify-between gap-8 rounded-3xl border border-white/10 bg-[rgba(10,20,50,0.4)] p-8 md:flex-row md:items-center md:p-12">
            <div className="flex flex-col gap-3">
              {content.notice ? (
                <div className={`${plexMono.className} text-sm font-medium tracking-[0.22em] text-[#2CC7D9]`}>
                  {content.notice}
                </div>
              ) : null}
              <h2 className="m-0 text-[clamp(1.75rem,3.2vw,2.5rem)] font-medium leading-[1.1] tracking-[-0.025em]">
                {content.closingTitle}
              </h2>
            </div>
            {content.closingHref && content.closingHref !== '#' ? (
              <TicketLink
                href={content.closingHref}
                className="flex h-[68px] shrink-0 items-center gap-3.5 rounded-full bg-gradient-to-r from-[#1E6BF0] to-[#08B5C6] px-8 text-lg font-semibold text-white shadow-[0_16px_44px_-12px_rgba(8,181,198,0.65)] transition hover:brightness-110 sm:px-10 sm:text-xl"
              >
                {content.closingLabel}
              </TicketLink>
            ) : null}
          </div>
          <div className={`${plexMono.className} flex flex-wrap items-center justify-between gap-4 border-t border-white/10 py-7 text-[13px] tracking-[0.22em] text-[#9AA3B8]`}>
            <span>VALLETTA, MALTA</span>
            <a href="https://deaisummit.org" className="text-[#9AA3B8] transition hover:text-white">
              DEAISUMMIT.ORG
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

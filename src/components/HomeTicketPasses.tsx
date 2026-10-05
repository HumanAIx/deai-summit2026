import Link from 'next/link';
import Image from 'next/image';
import type { HomeTicketPass } from '@/lib/home-ticket-passes';

function Check() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="mt-0.5 shrink-0">
      <path d="M3.5 10.5l4 4 9-9" stroke="#2CC7D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TicketBanner({ pass }: { pass: HomeTicketPass }) {
  const [firstWord, ...rest] = pass.title.split(/\s+/).filter(Boolean);
  const remainder = rest.join(' ');

  return (
    <article
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#071427] px-6 py-7 text-white sm:px-8 sm:py-8 lg:px-10 lg:py-9"
      style={{
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
        backgroundSize: '56px 56px',
      }}
    >
      {pass.featured ? (
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#1E6BF0] to-[#08B5C6]" />
      ) : null}

      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <span className="relative block h-9 w-9 shrink-0">
            <Image src="/icontransparent.png" alt="" fill sizes="36px" className="object-contain" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[1.35rem] font-bold tracking-[-0.03em]">DeAI</span>
            <span className="mt-1 text-[0.55rem] font-semibold uppercase tracking-[0.32em] text-white/75">Summit</span>
          </span>
        </div>
        <div className="text-right font-mono text-[11px] uppercase leading-relaxed tracking-[0.16em] text-white/80 sm:text-xs">
          <div>25–26 Nov 2026</div>
          <div>Valletta, Malta</div>
        </div>
      </div>

      <div className="mt-8 grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:gap-12">
        <div className="flex flex-col items-start">
          {pass.eyebrow ? (
            <div className="mb-4 flex items-center gap-3 font-mono text-[12px] font-medium uppercase tracking-[0.22em] text-[#2CC7D9]">
              <span className="h-px w-7 bg-[#2CC7D9]" />
              {pass.eyebrow}
            </div>
          ) : null}
          <h2 className="m-0 text-[clamp(2.6rem,5vw,4.25rem)] font-medium leading-none tracking-[-0.03em]">
            {pass.featured && firstWord ? (
              <>
                <span className="bg-gradient-to-r from-[#1E6BF0] to-[#08B5C6] bg-clip-text font-bold text-transparent">
                  {firstWord}
                </span>
                {remainder ? ` ${remainder}` : null}
              </>
            ) : (
              pass.title
            )}
          </h2>
          {pass.priceMajor ? (
            <div className="mt-3 flex items-baseline font-semibold leading-none tracking-[-0.04em]">
              <span className="text-[clamp(3.5rem,6vw,5.25rem)]">{pass.priceMajor}</span>
              {pass.priceMinor ? (
                <span className="text-[clamp(1.6rem,2.6vw,2.4rem)] text-[#9A9CA8]">{pass.priceMinor}</span>
              ) : null}
            </div>
          ) : null}
          <Link
            href={pass.href}
            className="mt-7 inline-flex h-14 items-center gap-2 rounded-full bg-gradient-to-r from-[#1E6BF0] to-[#08B5C6] px-8 text-lg font-semibold text-white shadow-[0_12px_32px_-12px_rgba(8,181,198,0.7)] transition hover:brightness-110"
          >
            See price
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="rounded-2xl border border-white/15 bg-[#0B1730]/80 px-6 py-6 backdrop-blur-sm sm:px-7 sm:py-7">
          {pass.includesLabel ? (
            <p className="m-0 font-mono text-[12px] uppercase tracking-[0.2em] text-white/70">
              {pass.includesLabel}
            </p>
          ) : null}
          {pass.includes.length > 0 ? (
            <ul className={`m-0 flex list-none flex-col gap-3.5 p-0 ${pass.includesLabel ? 'mt-5' : ''}`}>
              {pass.includes.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[17px] leading-snug">
                  <Check />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[#2CC7D9] sm:text-xs">
        <span>Price increase from 15 October</span>
        <span>deaisummit.org</span>
      </div>
    </article>
  );
}

export function HomeTicketPasses({ passes }: { passes: HomeTicketPass[] }) {
  if (passes.length === 0) return null;

  return (
    <section className="bg-[#050A1F] px-4 py-14 sm:px-6 md:py-20" aria-label="Tickets">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6">
        {passes.map((pass) => (
          <TicketBanner key={pass.id} pass={pass} />
        ))}
      </div>
    </section>
  );
}

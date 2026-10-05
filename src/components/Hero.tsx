'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { HeroConfig } from '@/config/types';
import { HERO_STAGE, HeroWaveField } from '@/components/HeroWaveField';

const VIDEO_MAP: Record<string, string> = {
  globe: 'https://videocdn.cdnpk.net/videos/e3e04e12-b643-5f33-aba6-ed773d587c7f/horizontal/previews/watermarked/large.mp4',
};

const FONT = 'var(--font-inter), system-ui, sans-serif';

/** Fallback until the fixed nav reports its unscaled height. */
const NAV_SLOT = 48;

type HeroButton = NonNullable<HeroConfig['buttons']>[number];

function isWaitlistButton(btn: HeroButton): boolean {
  if (/^#waitlist$/i.test(btn.link)) return true;
  return /waitlist/i.test(btn.label) && (!btn.link || btn.link === '#' || btn.link === '#waitlist');
}

function resolveHeroButtons(data: HeroConfig): HeroButton[] {
  if (data.buttons && data.buttons.length > 0) {
    return data.buttons;
  }

  const legacy = [data.ctaSecondary, data.ctaTertiary].filter(
    (btn): btn is HeroButton => Boolean(btn?.label),
  );

  if (!legacy.some(isWaitlistButton)) {
    legacy.push({ label: 'Waitlist to Attend', link: '#waitlist' });
  }

  return legacy;
}

interface HeroProps {
  data: HeroConfig;
  onOpenContact?: () => void;
  onOpenSpeakerApp?: () => void;
  onOpenWaitlist?: () => void;
  /** Reports the stage scale so the fixed nav can match the design canvas. */
  onScale?: (scale: number) => void;
  /** Unscaled nav height reserved at the top of the stage. */
  navSlot?: number;
  /** Visual bottom of the fixed nav, in viewport pixels. */
  navBottom?: number;
  /** Fill the space above the logo scroller instead of the full viewport. */
  contained?: boolean;
}

const pillStyle: React.CSSProperties = {
  background: '#fff',
  padding: '12px 22px',
  borderRadius: 999,
  fontSize: 14,
  color: '#0B1222',
  boxShadow: '0 2px 10px rgba(0,0,0,.05)',
  whiteSpace: 'nowrap',
  fontFamily: FONT,
};

function buttonStyle(dark: boolean): React.CSSProperties {
  return {
    background: dark ? '#0B1222' : '#fff',
    color: dark ? '#fff' : '#0B1222',
    padding: '15px 28px',
    borderRadius: 999,
    fontSize: 14,
    fontWeight: 600,
    boxShadow: '0 2px 10px rgba(0,0,0,.05)',
    whiteSpace: 'nowrap',
    fontFamily: FONT,
  };
}

export const Hero: React.FC<HeroProps> = ({ data, onOpenWaitlist, onScale, navSlot = NAV_SLOT, contained = false, navBottom = 0 }) => {
  const searchParams = useSearchParams();
  const videoKey = searchParams.get('video');
  const videoSrc = videoKey ? VIDEO_MAP[videoKey] : null;
  const sectionRef = useRef<HTMLElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const fit = () => {
      const next = Math.min(el.clientWidth / HERO_STAGE.width, el.clientHeight / HERO_STAGE.height);
      const safe = next > 0 ? next : 1;
      setScale(safe);
      onScale?.(safe);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [onScale]);

  const buttons = resolveHeroButtons(data);
  const pills = data.textNodes?.length
    ? data.textNodes
    : [
        { text: data.location },
        { text: data.date },
      ];

  const renderButton = (btn: HeroButton, index: number) => {
    const style = buttonStyle(index === 0);
    const className = 'hover:brightness-95 transition-[filter]';

    if (isWaitlistButton(btn)) {
      return (
        <button key={`${btn.label}-${index}`} type="button" onClick={onOpenWaitlist} className={className} style={style}>
          {btn.label}
        </button>
      );
    }

    const href = btn.link?.trim() || '/contact';
    if (href.startsWith('http')) {
      return (
        <a key={`${btn.label}-${index}`} href={href} target="_blank" rel="noopener noreferrer" className={className} style={style}>
          {btn.label}
        </a>
      );
    }

    return (
      <Link key={`${btn.label}-${index}`} href={href} className={className} style={style}>
        {btn.label}
      </Link>
    );
  };

  const renderPill = (node: { text: string; link?: string }, index: number) => {
    if (!node.link) {
      return (
        <span key={`${node.text}-${index}`} style={pillStyle}>
          {node.text}
        </span>
      );
    }
    if (node.link.startsWith('http')) {
      return (
        <a key={`${node.text}-${index}`} href={node.link} target="_blank" rel="noopener noreferrer" style={pillStyle}>
          {node.text}
        </a>
      );
    }
    return (
      <Link key={`${node.text}-${index}`} href={node.link} style={pillStyle}>
        {node.text}
      </Link>
    );
  };

  const copy = (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: '#fff',
          padding: '7px 14px',
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.18em',
          color: '#0B1222',
          boxShadow: '0 2px 10px rgba(0,0,0,.05)',
          fontFamily: FONT,
          textTransform: 'uppercase',
        }}
      >
        <i style={{ width: 7, height: 7, borderRadius: '50%', background: '#08B5C6', display: 'block' }} />
        {data.badge}
      </div>
      <h1
        style={{
          margin: 0,
          fontSize: 96,
          lineHeight: 1,
          fontWeight: 800,
          letterSpacing: '-0.05em',
          color: '#0B1222',
          fontFamily: FONT,
        }}
        dangerouslySetInnerHTML={{ __html: data.headline }}
      />
      <p
        style={{
          margin: 0,
          maxWidth: 720,
          fontSize: 20,
          lineHeight: 1.6,
          fontWeight: 600,
          color: '#1366E8',
          textWrap: 'balance',
          fontFamily: FONT,
        }}
      >
        {data.subheadline}
      </p>
      <div style={{ display: 'flex', gap: 12 }}>{pills.map(renderPill)}</div>
      <div style={{ display: 'flex', gap: 12 }}>{buttons.map(renderButton)}</div>
    </>
  );

  return (
    <section
      ref={sectionRef}
      className={`relative w-full overflow-hidden bg-[#F0F0EE] ${contained ? 'h-full max-lg:min-h-[100vh] lg:min-h-0' : 'min-h-[100vh] lg:h-[100vh]'}`}
    >
      <div className="absolute inset-0 z-0">
        {videoSrc ? (
          <>
            <video autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover">
              <source src={videoSrc} type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-[#050A1F]/60" />
          </>
        ) : (
          <HeroWaveField scale={scale} />
        )}
      </div>

      <div
        className="absolute left-1/2 top-0 z-10 hidden lg:block"
        style={{
          width: HERO_STAGE.width,
          height: HERO_STAGE.height,
          transformOrigin: '50% 0',
          transform: `translateX(-50%) scale(${scale})`,
        }}
      >
        <div
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '28px 40px 0',
            lineHeight: 'normal',
          }}
        >
          <div style={{ height: navSlot, width: '100%' }} />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 24,
              textAlign: 'center',
              paddingTop: Math.max(72, navBottom > 0 && scale > 0 ? (navBottom + 88) / scale - 28 - navSlot : 72),
              width: '100%',
            }}
          >
            {copy}
          </div>
        </div>
      </div>

      <div
        className="relative z-10 flex min-h-[100vh] flex-col items-center px-5 pb-16 text-center lg:hidden"
        style={{ paddingTop: 'calc(var(--site-nav-bottom, 8rem) + 2.5rem)' }}
      >
        <div className="flex w-full max-w-[720px] flex-col items-center gap-6">
          <div
            className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0B1222] shadow-[0_2px_10px_rgba(0,0,0,0.05)]"
            style={{ fontFamily: FONT }}
          >
            <i className="block h-[7px] w-[7px] rounded-full bg-[#08B5C6]" />
            {data.badge}
          </div>
          <h1
            className="text-[clamp(40px,12vw,72px)] font-extrabold leading-none tracking-[-0.05em] text-[#0B1222]"
            style={{ fontFamily: FONT }}
            dangerouslySetInnerHTML={{ __html: data.headline }}
          />
          <p className="text-balance text-base font-semibold leading-relaxed text-[#1366E8]" style={{ fontFamily: FONT }}>
            {data.subheadline}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {pills.map((node, index) => (
              <span key={`${node.text}-${index}`} className="rounded-full bg-white px-5 py-3 text-sm text-[#0B1222] shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
                {node.text}
              </span>
            ))}
          </div>
          <div className="flex w-full flex-col items-center gap-3">
            {buttons.map((btn, index) => (
              <span key={`${btn.label}-m-${index}`} className="w-full max-w-xs [&_a]:flex [&_a]:w-full [&_a]:justify-center [&_button]:w-full [&_button]:justify-center">
                {renderButton(btn, index)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

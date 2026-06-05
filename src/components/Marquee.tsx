'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { MarqueeItemData } from '@/components/LandingPage';
import { sponsorScrollerUsesSilhouetteFilter, SPONSOR_SCROLLER_TILE_CLASS } from '@/lib/logoDisplay';

interface MarqueeProps {
  data: MarqueeItemData[];
}

const ITEM_WIDTH = 200;
const ITEM_HEIGHT = 72;
const ITEM_GAP = 48;
const hoverFilter =
  'brightness(0) saturate(100%) invert(50%) sepia(90%) saturate(500%) hue-rotate(155deg) brightness(95%) contrast(95%)';

const MarqueeItem: React.FC<{
  item: MarqueeItemData;
  onHover: (hovering: boolean) => void;
}> = ({ item, onHover }) => {
  const silhouette = item.logo
    ? sponsorScrollerUsesSilhouetteFilter(item.logo, item.logoHasDarkBg)
    : false;

  const logoContent = (
    <div
      className="relative flex-shrink-0 cursor-pointer sponsor-logo-wrapper"
      style={{
        width: `${ITEM_WIDTH}px`,
        height: `${ITEM_HEIGHT}px`,
        marginLeft: `${ITEM_GAP / 2}px`,
        marginRight: `${ITEM_GAP / 2}px`,
      }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {item.logo ? (
        <div className={`relative w-full h-full px-4 py-3 box-border ${SPONSOR_SCROLLER_TILE_CLASS}`}>
          <div
            className={`relative w-full h-full sponsor-logo-image ${
              silhouette ? 'sponsor-logo-image--silhouette' : 'sponsor-logo-image--natural'
            }`}
          >
            <Image
              src={item.logo}
              alt={item.label}
              fill
              sizes={`${ITEM_WIDTH}px`}
              className="object-contain pointer-events-none select-none"
              unoptimized={item.logo.startsWith('http')}
            />
          </div>
        </div>
      ) : (
        <div className={`w-full h-full flex items-center justify-center ${SPONSOR_SCROLLER_TILE_CLASS}`}>
          <span className="font-mono text-xs tracking-widest text-black/25">{item.label}</span>
        </div>
      )}
    </div>
  );

  if (item.slug) {
    return (
      <Link href={`/partners/${item.slug}`} className="flex-shrink-0 no-underline">
        {logoContent}
      </Link>
    );
  }

  return <div className="flex-shrink-0">{logoContent}</div>;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Move TheBit Research into position 2 or 3 (0-indexed) after shuffle. */
function pinTheBit(items: MarqueeItemData[]): MarqueeItemData[] {
  const idx = items.findIndex(i => /thebit/i.test(i.label || ''));
  if (idx === -1 || items.length < 6) return items;
  const [thebit] = items.splice(idx, 1);
  const targetIndex = 3 + Math.floor(Math.random() * 3);
  items.splice(targetIndex, 0, thebit);
  return items;
}

export const Marquee: React.FC<MarqueeProps> = ({ data }) => {
  const [isHovering, setIsHovering] = useState(false);
  const [items, setItems] = useState<MarqueeItemData[]>(data);
  useEffect(() => {
    setItems(pinTheBit(shuffle(data)));
  }, [data]);
  const searchParams = useSearchParams();
  const hasVideo = !!searchParams.get('video');

  const itemWidth = ITEM_WIDTH + ITEM_GAP;
  const totalWidth = items.length * itemWidth;

  return (
    <section className={`sponsor-scroller w-full z-20 relative overflow-hidden py-10 ${hasVideo ? 'sponsor-scroller--video' : ''}`}>
      <div className="sponsor-scroller__bg sponsor-scroller__bg--navy absolute inset-0" aria-hidden />
      <div className="sponsor-scroller__bg sponsor-scroller__bg--navy-alt absolute inset-0" aria-hidden />
      <div className="sponsor-scroller__wave sponsor-scroller__wave--1 absolute inset-0" aria-hidden />
      <div className="sponsor-scroller__wave sponsor-scroller__wave--2 absolute inset-0" aria-hidden />
      <div className="sponsor-scroller__wave sponsor-scroller__wave--3 absolute inset-0" aria-hidden />

      <style
        dangerouslySetInnerHTML={{
          __html: `
          .sponsor-scroller__bg--navy {
            background: linear-gradient(135deg, #050A1F 0%, #0c1635 42%, #050A1F 100%);
          }
          .sponsor-scroller__bg--navy-alt {
            /* ~20% less blue than #050A1F / #0c1635 — same hue, softer navy */
            background: linear-gradient(135deg, #0a1122 0%, #141d38 42%, #0a1122 100%);
            animation: sponsorBgNavyAltPulse 24s ease-in-out infinite;
          }
          @keyframes sponsorBgNavyAltPulse {
            0%, 100% { opacity: 0; }
            50% { opacity: 1; }
          }
          .sponsor-scroller--video .sponsor-scroller__bg--navy {
            background: linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #000000 100%);
          }
          .sponsor-scroller--video .sponsor-scroller__bg--navy-alt {
            animation: none;
            opacity: 0;
          }
          .sponsor-scroller__wave {
            pointer-events: none;
            mix-blend-mode: soft-light;
          }
          .sponsor-scroller__wave--1 {
            opacity: 0.55;
            background:
              radial-gradient(ellipse 90% 120% at 10% 40%, rgba(255,255,255,0.22) 0%, transparent 58%),
              radial-gradient(ellipse 70% 100% at 90% 60%, rgba(0,0,0,0.12) 0%, transparent 55%);
            background-size: 220% 100%, 220% 100%;
            animation: sponsorWaveDrift1 22s ease-in-out infinite;
          }
          .sponsor-scroller__wave--2 {
            opacity: 0.4;
            background:
              repeating-linear-gradient(
                105deg,
                transparent 0px,
                transparent 48px,
                rgba(255,255,255,0.06) 48px,
                rgba(255,255,255,0.06) 96px
              );
            background-size: 280% 100%;
            animation: sponsorWaveDrift2 16s linear infinite;
          }
          .sponsor-scroller__wave--3 {
            opacity: 0.35;
            background:
              radial-gradient(ellipse 110% 80% at 50% 100%, rgba(255,255,255,0.18) 0%, transparent 62%);
            background-size: 200% 200%;
            animation: sponsorWaveDrift3 28s ease-in-out infinite;
          }
          @keyframes sponsorWaveDrift1 {
            0%, 100% { background-position: 0% 50%, 100% 50%; }
            50% { background-position: 100% 50%, 0% 50%; }
          }
          @keyframes sponsorWaveDrift2 {
            0% { background-position: 0% 0%; }
            100% { background-position: 280% 0%; }
          }
          @keyframes sponsorWaveDrift3 {
            0%, 100% { background-position: 50% 100%; }
            50% { background-position: 50% 0%; }
          }
          @media (prefers-reduced-motion: reduce) {
            .sponsor-scroller__bg--navy-alt {
              animation: none;
              opacity: 0.5;
            }
            .sponsor-scroller__fade-left,
            .sponsor-scroller__fade-right {
              animation: none;
              background: linear-gradient(to right, rgba(10,17,34,0.9) 0%, transparent 100%);
            }
            .sponsor-scroller__fade-right {
              background: linear-gradient(to left, rgba(10,17,34,0.9) 0%, transparent 100%);
            }
            .sponsor-scroller__wave--1,
            .sponsor-scroller__wave--2,
            .sponsor-scroller__wave--3 {
              animation: none;
            }
          }
          .sponsor-scroller__fade-left {
            animation: sponsorFadeLeft 24s ease-in-out infinite;
          }
          .sponsor-scroller__fade-right {
            animation: sponsorFadeRight 24s ease-in-out infinite;
          }
          @keyframes sponsorFadeLeft {
            0%, 100% {
              background: linear-gradient(to right, rgba(5,10,31,0.92) 0%, rgba(5,10,31,0.6) 40%, transparent 100%);
            }
            50% {
              background: linear-gradient(to right, rgba(10,17,34,0.92) 0%, rgba(20,29,56,0.6) 40%, transparent 100%);
            }
          }
          @keyframes sponsorFadeRight {
            0%, 100% {
              background: linear-gradient(to left, rgba(5,10,31,0.92) 0%, rgba(5,10,31,0.6) 40%, transparent 100%);
            }
            50% {
              background: linear-gradient(to left, rgba(10,17,34,0.92) 0%, rgba(20,29,56,0.6) 40%, transparent 100%);
            }
          }
          .sponsor-scroller--video .sponsor-scroller__fade-left {
            background: linear-gradient(to right, #1a1a1a, transparent);
          }
          .sponsor-scroller--video .sponsor-scroller__fade-right {
            background: linear-gradient(to left, #1a1a1a, transparent);
          }
          .sponsor-logo-wrapper {
            transition: transform 0.3s ease;
          }
          .sponsor-logo-wrapper:hover {
            transform: scale(1.04);
          }
          .sponsor-logo-image {
            transition: filter 0.2s ease, opacity 0.2s ease;
          }
          .sponsor-logo-image--silhouette {
            filter: grayscale(100%) brightness(0) contrast(1.15);
            opacity: 0.9;
          }
          .sponsor-logo-image--natural {
            filter: grayscale(100%) contrast(1.2) brightness(0.72);
            opacity: 0.92;
          }
          .sponsor-logo-wrapper:hover .sponsor-logo-image--silhouette,
          .sponsor-logo-wrapper:hover .sponsor-logo-image--natural {
            filter: ${hoverFilter} !important;
            opacity: 1 !important;
          }
          @keyframes sponsorScroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-${totalWidth}px); }
          }
        `,
        }}
      />

      <div className="sponsor-scroller__fade-left absolute left-0 top-0 h-full w-24 z-10 pointer-events-none" />
      <div className="sponsor-scroller__fade-right absolute right-0 top-0 h-full w-24 z-10 pointer-events-none" />

      <div
        className="relative z-[1] flex items-center"
        style={{
          width: 'fit-content',
          animation: 'sponsorScroll 60s linear infinite',
          animationPlayState: isHovering ? 'paused' : 'running',
        }}
      >
        {[0, 1, 2, 3].map((setIndex) =>
          items.map((item, i) => (
            <MarqueeItem
              key={`${setIndex}-${i}`}
              item={item}
              onHover={setIsHovering}
            />
          )),
        )}
      </div>
    </section>
  );
};

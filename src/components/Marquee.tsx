'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { MarqueeItemData } from '@/components/LandingPage';

interface MarqueeProps {
  data: MarqueeItemData[];
}

/** Pixels per second. The old logo strip moved about 60px/s. */
const SCROLL_SPEED = 85;

const MarqueeItem: React.FC<{
  item: MarqueeItemData;
  onHover: (hovering: boolean) => void;
}> = ({ item, onHover }) => {
  const wordmark = (
    <div
      className="flex items-center gap-8 md:gap-10 pl-8 md:pl-10"
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <img
        src="/icontransparent.png"
        alt=""
        aria-hidden
        className="h-5 w-5 shrink-0 object-contain"
        style={{ filter: 'brightness(0) invert(1)' }}
      />
      <span className="whitespace-nowrap font-display text-[1.6875rem] md:text-[1.875rem] font-bold uppercase tracking-[0.16em] text-[#E7E4DE]">
        {item.label}
      </span>
    </div>
  );

  if (item.slug) {
    return (
      <Link href={`/sponsors/${item.slug}`} className="flex-shrink-0 no-underline">
        {wordmark}
      </Link>
    );
  }

  return <div className="flex-shrink-0">{wordmark}</div>;
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
  const [distance, setDistance] = useState(0);
  const setRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setItems(pinTheBit(shuffle(data)));
  }, [data]);
  const searchParams = useSearchParams();
  const hasVideo = !!searchParams.get('video');

  useEffect(() => {
    const el = setRef.current;
    if (!el) return;
    const measure = () => setDistance(el.offsetWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [items]);

  const duration = distance > 0 ? distance / SCROLL_SPEED : 40;

  return (
    <section className={`sponsor-scroller w-full z-20 relative overflow-hidden py-8 md:py-10 bg-gradient-to-r from-[#0A1428] via-[#12243F] to-[#1A3A66] ${hasVideo ? 'sponsor-scroller--video' : ''}`}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .sponsor-scroller__fade-left {
            background: linear-gradient(to right, #0A1428 0%, transparent 100%);
          }
          .sponsor-scroller__fade-right {
            background: linear-gradient(to left, #1A3A66 0%, transparent 100%);
          }
          @keyframes sponsorScroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-${distance}px); }
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
          animation: distance > 0 ? `sponsorScroll ${duration}s linear infinite` : undefined,
          animationPlayState: isHovering ? 'paused' : 'running',
        }}
      >
        {[0, 1, 2, 3].map((setIndex) => (
          <div
            key={setIndex}
            ref={setIndex === 0 ? setRef : undefined}
            className="flex items-center"
          >
            {items.map((item, i) => (
              <MarqueeItem
                key={`${setIndex}-${item.slug || item.label}-${i}`}
                item={item}
                onHover={setIsHovering}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
};

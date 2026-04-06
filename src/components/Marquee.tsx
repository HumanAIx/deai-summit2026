'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { MarqueeItemData } from '@/components/LandingPage';

interface MarqueeProps {
  data: MarqueeItemData[];
}

// CSS filter to colorize to brand-cyan (#00B0C2) on hover
const hoverFilter = 'brightness(0) saturate(100%) invert(50%) sepia(90%) saturate(500%) hue-rotate(155deg) brightness(95%) contrast(95%)';
const defaultFilter = 'brightness(0) invert(1) opacity(0.9)';

const MarqueeItem: React.FC<{
  item: MarqueeItemData;
  onHover: (hovering: boolean) => void;
}> = ({ item, onHover }) => {
  const logoContent = (
    <div
      className="relative flex-shrink-0 cursor-pointer sponsor-logo-wrapper"
      style={{
        width: '240px',
        height: '85px',
        marginLeft: '35px',
        marginRight: '35px',
        filter: defaultFilter,
      }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {item.logo ? (
        <Image
          src={item.logo}
          alt={item.label}
          fill
          sizes="240px"
          className="object-contain pointer-events-none select-none"
          unoptimized={item.logo.startsWith('http')}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="font-mono text-sm tracking-widest text-white/30">{item.label}</span>
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

export const Marquee: React.FC<MarqueeProps> = ({ data }) => {
  const [isHovering, setIsHovering] = useState(false);
  // Shuffle after mount to avoid SSR hydration mismatch
  const [items, setItems] = useState<MarqueeItemData[]>(data);
  useEffect(() => {
    setItems(shuffle(data));
  }, [data]);
  const searchParams = useSearchParams();
  const hasVideo = !!searchParams.get('video');
  // Light background like chm-website so grayscale dark logos read clearly.
  const bgColor = hasVideo ? '#000000' : '#050A1F';

  // Calculate total width for animation
  const itemWidth = 310; // 240px logo + 70px margins
  const totalWidth = items.length * itemWidth;

  return (
    <section className="w-full z-20 relative overflow-hidden py-12" style={{ backgroundColor: bgColor }}>
      {/* Dynamic hover styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .sponsor-logo-wrapper {
            transition: filter 0.2s ease, transform 0.3s ease;
          }
          .sponsor-logo-wrapper:hover {
            filter: ${hoverFilter} !important;
            transform: scale(1.05);
          }
          @keyframes sponsorScroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-${totalWidth}px); }
          }
        `
      }} />

      {/* Fade edges */}
      <div className="absolute left-0 top-0 h-full w-24 z-10 pointer-events-none" style={{ background: `linear-gradient(to right, ${bgColor}, transparent)` }} />
      <div className="absolute right-0 top-0 h-full w-24 z-10 pointer-events-none" style={{ background: `linear-gradient(to left, ${bgColor}, transparent)` }} />

      <div
        className="flex items-center"
        style={{
          width: 'fit-content',
          animation: 'sponsorScroll 60s linear infinite',
          animationPlayState: isHovering ? 'paused' : 'running',
        }}
      >
        {/* 4 sets for seamless loop */}
        {[0, 1, 2, 3].map((setIndex) =>
          items.map((item, i) => (
            <MarqueeItem
              key={`${setIndex}-${i}`}
              item={item}
              onHover={setIsHovering}
            />
          ))
        )}
      </div>
    </section>
  );
};

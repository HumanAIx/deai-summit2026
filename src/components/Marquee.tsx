'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { MarqueeItemData } from '@/components/LandingPage';

interface MarqueeProps {
  data: MarqueeItemData[];
}

// CSS filter to colorize to brand-cyan (#06B0C2) on hover
const hoverFilter = 'brightness(0) saturate(100%) invert(45%) sepia(70%) saturate(500%) hue-rotate(190deg) brightness(95%) contrast(90%)';
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

export const Marquee: React.FC<MarqueeProps> = ({ data }) => {
  const [isHovering, setIsHovering] = useState(false);

  // Calculate total width for animation
  const itemWidth = 310; // 240px logo + 70px margins
  const totalWidth = data.length * itemWidth;

  return (
    <section className="w-full z-20 relative overflow-hidden py-12" style={{ backgroundColor: '#2a2a30' }}>
      {/* Dynamic hover styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .sponsor-logo-wrapper {
            transition: filter 0.3s ease, transform 0.3s ease;
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
      <div className="absolute left-0 top-0 h-full w-24 bg-gradient-to-r from-[#2a2a30] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-[#2a2a30] to-transparent z-10 pointer-events-none" />

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
          data.map((item, i) => (
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

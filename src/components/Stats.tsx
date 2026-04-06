'use client';

import React from 'react';
import Image from 'next/image';
import { StatsConfig } from '@/config/types';
import { AnimatedCounter } from '@/components/AnimatedCounter';

interface StatsProps {
  data: StatsConfig;
}

// Accent colors for each stat card
const statAccents = ['#00B0C2', '#0E6FEB', '#050A1F', '#00B0C2', '#0E6FEB'];

export const Stats: React.FC<StatsProps> = ({ data }) => {
  return (
    <section className="relative w-full py-20 md:py-32 bg-white z-20 overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-6">

        {/* Featured Quote Section */}
        <div className="flex flex-col lg:flex-row gap-12 lg:items-end justify-between mb-24 pb-12 border-b border-gray-100">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-[#050A1F] tracking-tight leading-[1.1] flex-1 min-w-0">
            <span className="text-brand-blue">&ldquo;</span>
            {data.quote.text}
            <span className="text-brand-blue">&rdquo;</span>
          </h2>

          <a
            href="/companies/humanaix-foundation"
            className="group relative block flex-shrink-0 w-full lg:w-[460px] rounded-3xl p-[1.5px] bg-gradient-to-br from-brand-cyan via-brand-blue to-[#050A1F] shadow-xl hover:shadow-2xl hover:shadow-brand-cyan/20 transition-all duration-500"
          >
            {/* Animated glow */}
            <div className="pointer-events-none absolute -inset-2 rounded-[2rem] bg-gradient-to-br from-brand-cyan/30 via-brand-blue/20 to-transparent opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-700" />

            <div className="relative rounded-[calc(1.5rem-1px)] bg-[#050A1F] overflow-hidden">
              {/* Subtle grid */}
              <div
                className="absolute inset-0 opacity-[0.07]"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />
              {/* Corner glow */}
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-brand-cyan/30 blur-3xl" />
              <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-brand-blue/30 blur-3xl" />

              {/* Oversized dancing background logo */}
              <div className="pointer-events-none absolute -right-12 -bottom-10 w-[280px] h-[280px] opacity-[0.22] group-hover:opacity-[0.32] transition-opacity duration-700 host-dance">
                <Image
                  src={data.quote.image}
                  alt=""
                  fill
                  className="object-contain"
                  style={{
                    filter: 'brightness(1.6) saturate(1.2) drop-shadow(0 0 18px rgba(0,176,194,0.45))',
                  }}
                  aria-hidden
                />
              </div>

              <style jsx>{`
                @keyframes host-dance {
                  0%   { transform: rotate(-8deg) translateY(0px) scale(1); }
                  25%  { transform: rotate(-3deg) translateY(-6px) scale(1.02); }
                  50%  { transform: rotate(-10deg) translateY(2px) scale(1); }
                  75%  { transform: rotate(-5deg) translateY(-4px) scale(1.03); }
                  100% { transform: rotate(-8deg) translateY(0px) scale(1); }
                }
                .host-dance {
                  animation: host-dance 6s ease-in-out infinite;
                  transform-origin: center;
                }
              `}</style>

              <div className="relative px-7 pt-6 pb-7 flex flex-col gap-5">
                {/* Eyebrow */}
                <div className="flex items-center gap-2">
                  <span className="h-[1px] w-6 bg-brand-cyan" />
                  <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-brand-cyan">
                    Hosted by
                  </span>
                </div>

                {/* Logo + name */}
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-2xl bg-white/5 ring-1 ring-white/10 backdrop-blur-sm flex items-center justify-center p-2 group-hover:scale-105 group-hover:ring-brand-cyan/40 transition-all duration-500">
                    <Image
                      src={data.quote.image}
                      alt={data.quote.author}
                      fill
                      className="object-contain p-2"
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-display font-bold text-white text-xl leading-tight truncate">
                      {data.quote.author}
                    </span>
                    <span className="text-[11px] font-mono uppercase tracking-widest text-white/50 mt-1">
                      {data.quote.role} of DeAI Summit
                    </span>
                  </div>
                </div>

                {/* Footer link */}
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <span className="text-xs text-white/60">humanaix.io</span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-cyan group-hover:gap-2 transition-all">
                    Learn more
                    <i className="ri-arrow-right-up-line text-base" />
                  </span>
                </div>
              </div>
            </div>
          </a>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.items.map((stat, idx) => {
            const accent = statAccents[idx % statAccents.length];
            return (
              <div
                key={idx}
                className="relative flex flex-col justify-between p-8 md:p-10 bg-[#F0F0EF] rounded-3xl min-h-[260px] hover:bg-[#E8E8E7] transition-all duration-300 group overflow-hidden"
              >
                {/* Accent glow */}
                <div
                  className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-15 transition-opacity duration-700"
                  style={{ backgroundColor: accent }}
                />

                <p className="text-lg font-sans text-gray-600 leading-relaxed font-medium relative z-10">
                  {stat.label}
                </p>

                <div className="relative z-10 mt-8">
                  {/* Accent line */}
                  <div
                    className="w-8 h-[3px] rounded-full mb-4"
                    style={{ backgroundColor: accent }}
                  />
                  <AnimatedCounter
                    value={stat.number}
                    className="text-6xl md:text-7xl font-display font-bold tracking-tighter text-[#0E6FEB] group-hover:scale-105 transition-transform duration-300 origin-left"
                    duration={2200}
                    delay={idx * 150}
                  />
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

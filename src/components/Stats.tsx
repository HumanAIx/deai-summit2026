'use client';

import React from 'react';
import Image from 'next/image';
import { StatsConfig } from '@/config/types';
import { AnimatedCounter } from '@/components/AnimatedCounter';

interface StatsProps {
  data: StatsConfig;
}

// Accent colors for each stat card
const statAccents = ['#06B0C2', '#0F6FEB', '#2DD4BF', '#8B5CF6', '#ec622b'];

export const Stats: React.FC<StatsProps> = ({ data }) => {
  return (
    <section className="relative w-full py-20 md:py-32 bg-white z-20 overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-6">

        {/* Featured Quote Section */}
        <div className="flex flex-col lg:flex-row gap-12 lg:items-end justify-between mb-24 pb-12 border-b border-gray-100">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-black tracking-tight leading-[1.1] max-w-4xl">
            <span className="text-brand-blue">&ldquo;</span>
            {data.quote.text}
            <span className="text-brand-blue">&rdquo;</span>
          </h2>

          <div className="flex items-center gap-4 min-w-[200px]">
            <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-black flex items-center justify-center p-1">
              <Image
                src={data.quote.image}
                alt={data.quote.author}
                fill
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-black text-sm">
                <a href="/companies/humanaix-foundation" className="hover:text-brand-blue transition-colors">
                  {data.quote.author}
                </a>
              </span>
              <span className="text-gray-500 text-xs">{data.quote.role}</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.items.map((stat, idx) => {
            const accent = statAccents[idx % statAccents.length];
            return (
              <div
                key={idx}
                className="relative flex flex-col justify-between p-8 md:p-10 bg-[#F9F9F9] rounded-3xl min-h-[260px] hover:bg-[#F0F0F0] transition-all duration-300 group overflow-hidden"
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
                    className="text-6xl md:text-7xl font-display font-bold tracking-tighter text-black group-hover:scale-105 transition-transform duration-300 origin-left"
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

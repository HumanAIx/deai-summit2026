import React from 'react';
import Image from 'next/image';
import { StatsConfig } from '@/config/types';

interface StatsProps {
  data: StatsConfig;
}

export const Stats: React.FC<StatsProps> = ({ data }) => {
  return (
    <section className="relative w-full py-20 md:py-32 bg-white z-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">

        {/* Featured Quote Section */}
        <div className="flex flex-col lg:flex-row gap-12 lg:items-end justify-between mb-24 pb-12 border-b border-gray-100">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-black tracking-tight leading-[1.1] max-w-4xl">
            <span className="text-brand-blue">“</span>
            {data.quote.text}
            <span className="text-brand-blue">”</span>
          </h2>

          <div className="flex items-center gap-4 min-w-[200px]">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden grayscale">
              <Image
                src={data.quote.image}
                alt={data.quote.author}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-black text-sm">{data.quote.author}</span>
              <span className="text-gray-500 text-xs">{data.quote.role}</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.items.map((stat, idx) => (
            <div key={idx} className="flex flex-col justify-between p-8 md:p-10 bg-[#F9F9F9] rounded-3xl min-h-[260px] hover:bg-[#F0F0F0] transition-colors duration-300 group">
              <p className="text-lg font-sans text-gray-600 leading-relaxed font-medium">
                {stat.label}
              </p>
              <span className="text-6xl md:text-7xl font-display font-bold tracking-tighter text-black mt-8 group-hover:scale-105 transition-transform duration-300 origin-left">
                {stat.number}
              </span>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
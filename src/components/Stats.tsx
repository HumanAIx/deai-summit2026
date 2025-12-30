import React from 'react';
import { StatItem } from '@/config/types';

interface StatsProps {
  data: StatItem[];
}

export const Stats: React.FC<StatsProps> = ({ data }) => {
  return (
    <section className="relative w-full py-20 border-b border-black/5 bg-white z-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-4 divide-x divide-transparent md:divide-black/5">
          {data.map((stat, index) => (
            <div key={index} className="flex flex-col items-center text-center px-2 group">
              <span className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-[#020408] mb-2 group-hover:scale-110 transition-transform duration-300">
                {stat.number}
              </span>
              <p className="text-xs md:text-sm font-medium text-slate-500 uppercase tracking-widest leading-relaxed max-w-[150px]">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
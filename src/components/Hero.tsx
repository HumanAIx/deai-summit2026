import React from 'react';
import Image from 'next/image';
import { HeroConfig } from '@/config/types';

interface HeroProps {
  data: HeroConfig;
}

export const Hero: React.FC<HeroProps> = ({ data }) => {
  return (
    <section className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden bg-[#F2F4F7]">

      {/* --- HERO BACKGROUND START --- */}
      <div className="absolute inset-0 z-0 w-full h-full">
        <Image
          src={data.backgroundImage}
          alt="Conference Stage"
          fill
          className="object-cover opacity-10"
          priority
        />
        <div className="absolute inset-0 bg-brand-blue/5 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#F2F4F7]/80 via-transparent to-[#F2F4F7]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#F2F4F7_120%)]" />

        {/* Dark Grid Pattern for Light Mode */}
        <div className="absolute inset-0 z-10 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
            maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
          }}
        />
      </div>
      {/* --- HERO BACKGROUND END --- */}

      <div className="relative z-20 flex flex-col items-center text-center w-full max-w-6xl space-y-10 px-6">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-black/5 bg-white/60 backdrop-blur-md animate-fade-in-up shadow-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-cyan opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-cyan"></span>
          </span>
          <span className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-800 font-semibold">{data.badge}</span>
        </div>

        {/* Headline */}
        <div className="space-y-6 animate-fade-in-up [animation-delay:200ms] opacity-0 fill-mode-forwards">
          <h1
            className="text-5xl md:text-7xl lg:text-8xl font-display font-bold text-slate-900 tracking-tighter leading-[1.0] mix-blend-darken"
            dangerouslySetInnerHTML={{ __html: data.headline }}
          />

          <p className="text-xl md:text-2xl text-[#0D70EB] font-sans font-light max-w-3xl mx-auto leading-relaxed tracking-wide">
            {data.subheadline}
          </p>
        </div>

        {/* Meta Data Grid */}
        <div className="flex flex-wrap justify-center gap-4 py-4 animate-fade-in-up [animation-delay:400ms] opacity-0 fill-mode-forwards font-sans">
          <div className="flex items-center gap-3 px-6 py-3 rounded-full border border-black/5 bg-white/60 backdrop-blur-sm hover:bg-white/80 transition-colors cursor-default shadow-sm">
            <i className="ri-map-pin-line text-brand-blue text-xl"></i>
            <span className="text-base font-medium text-slate-800">{data.location}</span>
          </div>
          <div className="flex items-center gap-3 px-6 py-3 rounded-full border border-black/5 bg-white/60 backdrop-blur-sm hover:bg-white/80 transition-colors cursor-default shadow-sm">
            <i className="ri-calendar-line text-brand-cyan text-xl"></i>
            <span className="text-base font-medium text-slate-800">{data.date}</span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 pt-6 items-center animate-fade-in-up [animation-delay:600ms] opacity-0 fill-mode-forwards">
          <button className="shiny-cta group transform hover:scale-105 transition-transform duration-300 shadow-xl shadow-brand-blue/10">
            <span className="relative z-10 flex items-center gap-3 font-bold text-base tracking-wide">
              {data.ctaPrimary.label}
              <i className="ri-arrow-right-line text-xl transition-transform group-hover:translate-x-1"></i>
            </span>
          </button>

          <button className="px-8 py-4 rounded-full text-base font-bold text-slate-800 hover:text-brand-blue transition-colors border border-black/10 hover:border-brand-blue/30 bg-white/50 hover:bg-white backdrop-blur-sm flex items-center gap-3 shadow-sm">
            {data.ctaSecondary.label}
            <i className="ri-download-line text-xl"></i>
          </button>
        </div>
      </div>
    </section>
  );
};
'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { HeroConfig } from '@/config/types';
import { AnimatedGrid } from '@/components/AnimatedGrid';

const VIDEO_MAP: Record<string, string> = {
  globe: 'https://videocdn.cdnpk.net/videos/e3e04e12-b643-5f33-aba6-ed773d587c7f/horizontal/previews/watermarked/large.mp4',
};

interface HeroProps {
  data: HeroConfig;
  onOpenContact?: () => void;
  onOpenSpeakerApp?: () => void;
  onOpenWaitlist?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ data, onOpenContact, onOpenSpeakerApp, onOpenWaitlist }) => {
  const searchParams = useSearchParams();
  const videoKey = searchParams.get('video');
  const videoSrc = videoKey ? VIDEO_MAP[videoKey] : null;

  return (
    <section className={`relative w-full min-h-[85vh] flex flex-col items-center justify-center overflow-hidden pt-32 pb-8 md:pt-40 md:pb-6 ${videoSrc ? 'bg-[#050A1F]' : 'bg-[#F0F0EF]'}`}>

      {/* --- HERO BACKGROUND START --- */}
      <div className="absolute inset-0 z-0 w-full h-full">
        {videoSrc ? (
          <>
            <video
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src={videoSrc} type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-[#050A1F]/60" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[#F0F0EF]" />
        )}

        {/* Dark Grid Pattern */}
        {!videoSrc && (
          <div className="absolute inset-0 z-10 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
              maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
            }}
          />
        )}
        {/* Animated cell glow — hidden on mobile to prevent compositing issues */}
        <div className="absolute inset-0 z-10 hidden md:block">
          <AnimatedGrid variant={videoSrc ? 'dark' : 'light'} density={60} mouseTrail />
        </div>
      </div>
      {/* --- HERO BACKGROUND END --- */}

      <div className="relative z-20 flex flex-col items-center text-center w-full max-w-[1440px] space-y-6 md:space-y-10 px-4 md:px-6" style={{ isolation: 'isolate' }}>

        {/* Badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full border backdrop-blur-md animate-fade-in-up ${videoSrc ? 'border-white/80 bg-white/90' : 'border-blue-200/50 bg-white/60'}`} style={{ boxShadow: '0 0 8px 1px rgba(14,111,235,0.10), 0 0 16px 2px rgba(14,111,235,0.05)' }}>
          <span className="relative flex h-2 w-2 md:h-2.5 md:w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-cyan opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 md:h-2.5 md:w-2.5 bg-brand-cyan"></span>
          </span>
          <span className="text-[0.6rem] md:text-[0.7rem] uppercase tracking-[0.2em] font-semibold text-slate-800">{data.badge}</span>
        </div>

        {/* Headline */}
        <div className="space-y-4 md:space-y-6 animate-fade-in-up [animation-delay:200ms] opacity-0 fill-mode-forwards w-full">
          <h1
            className={`text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-display font-bold tracking-tighter leading-[1.1] md:leading-[1.0] break-words ${videoSrc ? 'text-white' : 'text-slate-900'}`}
            dangerouslySetInnerHTML={{ __html: data.headline }}
          />

          <p className={`text-xl md:text-3xl font-sans font-bold max-w-3xl mx-auto leading-relaxed tracking-wide px-2 ${videoSrc ? 'text-white drop-shadow-[0_0_20px_rgba(0,176,194,0.5)]' : 'text-[#0E6FEB]'}`}>
            {data.subheadline}
          </p>
        </div>

        {/* Meta Data Grid */}
        <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 md:gap-4 py-2 md:py-4 animate-fade-in-up [animation-delay:400ms] opacity-0 fill-mode-forwards font-sans w-full sm:w-auto">
          <div className={`flex items-center justify-center gap-2 md:gap-3 px-4 py-2 md:px-6 md:py-3 rounded-full border backdrop-blur-sm hover:bg-white/80 transition-all duration-300 cursor-default min-w-fit w-full sm:w-auto ${videoSrc ? 'border-white/80 bg-white/90 hover:bg-white' : 'border-blue-200/40 bg-white/60'}`} style={{ boxShadow: '0 0 8px 1px rgba(14,111,235,0.10), 0 0 16px 2px rgba(14,111,235,0.05)' }}>
            <i className="ri-map-pin-line text-brand-blue text-lg md:text-xl"></i>
            <span className={`text-sm md:text-base font-medium whitespace-nowrap text-slate-800`}>{data.location}</span>
          </div>
          <div className={`flex items-center justify-center gap-2 md:gap-3 px-4 py-2 md:px-6 md:py-3 rounded-full border backdrop-blur-sm hover:bg-white/80 transition-all duration-300 cursor-default min-w-fit w-full sm:w-auto ${videoSrc ? 'border-white/80 bg-white/90 hover:bg-white' : 'border-blue-200/40 bg-white/60'}`} style={{ boxShadow: '0 0 8px 1px rgba(14,111,235,0.10), 0 0 16px 2px rgba(14,111,235,0.05)' }}>
            <i className="ri-calendar-line text-brand-cyan text-lg md:text-xl"></i>
            <span className={`text-sm md:text-base font-medium whitespace-nowrap text-slate-800`}>{data.date}</span>
          </div>
        </div>

        {/* CTA Buttons */}
        {(() => {
          const btnClass = videoSrc
            ? "px-6 py-3 md:px-8 md:py-4 rounded-full text-sm md:text-base font-bold text-slate-900 hover:text-brand-cyan hover:bg-white/80 transition-all duration-300 border border-white/80 bg-white/90 backdrop-blur-sm flex items-center justify-center gap-3 w-full sm:w-auto whitespace-nowrap"
            : "px-6 py-3 md:px-8 md:py-4 rounded-full text-sm md:text-base font-bold text-slate-800 hover:text-brand-blue transition-all duration-300 border border-blue-200/40 hover:border-brand-blue/40 bg-white/50 hover:bg-white backdrop-blur-sm flex items-center justify-center gap-3 w-full sm:w-auto whitespace-nowrap";
          const glowDefault = videoSrc
            ? '0 0 15px 3px rgba(0,176,194,0.15), 0 0 30px 6px rgba(0,176,194,0.08)'
            : '0 0 15px 3px rgba(14,111,235,0.10), 0 0 30px 6px rgba(14,111,235,0.05)';
          const glowHover = videoSrc
            ? '0 0 25px 6px rgba(0,176,194,0.25), 0 0 50px 12px rgba(0,176,194,0.12)'
            : '0 0 25px 6px rgba(14,111,235,0.20), 0 0 50px 12px rgba(14,111,235,0.10)';
          return (
        <div className="flex flex-col sm:flex-row gap-4 md:gap-4 pt-4 md:pt-6 pb-10 md:pb-16 items-center w-full sm:w-auto animate-fade-in-up [animation-delay:600ms] opacity-0 fill-mode-forwards flex-wrap justify-center">
          <Link href="/contact?inquiry=Speaker+Application" className={btnClass} style={{ boxShadow: glowDefault }} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = glowHover; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = glowDefault; }}>
            {data.ctaSecondary.label}
            <i className="ri-download-line text-lg md:text-xl"></i>
          </Link>
          {data.ctaTertiary && (
            <Link href="/contact?inquiry=Sponsorship+Opportunities" className={btnClass} style={{ boxShadow: glowDefault }} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = glowHover; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = glowDefault; }}>
              {data.ctaTertiary.label}
              <i className="ri-hand-heart-line text-lg md:text-xl"></i>
            </Link>
          )}
          <button onClick={onOpenWaitlist} className={btnClass} style={{ boxShadow: glowDefault }} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = glowHover; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = glowDefault; }}>
            Waitlist to Attend
            <i className="ri-calendar-check-line text-lg md:text-xl"></i>
          </button>
        </div>
          );
        })()}
      </div>
    </section>
  );
};
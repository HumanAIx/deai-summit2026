"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import type { LeadingSpeakerData } from "@/components/LandingPage";
import { formatPersonName } from "@/lib/utils";
import {
  resolvePersonPhotoSrc,
  getPhotoCssFilter,
  getPhotoTransform,
  withPhotoCacheBuster,
} from "@/lib/personPhoto";

interface LeadingVoicesProps {
  data: LeadingSpeakerData[];
}

const SPEED = 0.8; // px per frame — slower, more elegant

const SpeakerCard: React.FC<{
  speaker: LeadingSpeakerData;
  colorIndex: number;
  onHover: (hovered: boolean) => void;
}> = ({ speaker, colorIndex, onHover }) => {
  const [hovered, setHovered] = useState(false);

  // Subtle accent colors for the bottom gradient
  const accents = ['#00B0C2', '#0E6FEB', '#00B0C2', '#0E6FEB'];
  const accent = accents[colorIndex % accents.length];

  const handleEnter = () => {
    setHovered(true);
    onHover(true);
  };

  const handleLeave = () => {
    setHovered(false);
    onHover(false);
  };

  const cardContent = (
    <div
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className="relative flex-shrink-0 mx-4 flex flex-col overflow-hidden rounded-2xl cursor-pointer"
      style={{
        width: "18rem",
        height: "22rem",
        background: "#050A1F",
        transform: hovered ? "scale(1.08)" : "scale(1)",
        transformOrigin: "center center",
        boxShadow: hovered
          ? `0 30px 60px rgba(0,0,0,0.3), 0 0 40px ${accent}25`
          : "0 4px 20px rgba(0,0,0,0.15)",
        transition:
          "transform 0.5s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.5s ease",
        zIndex: hovered ? 50 : 1,
      }}
    >
      {/* Text at top */}
      <div className="relative w-full px-5 pt-5 pb-3">
        {/* Accent line */}
        <div
          className="w-10 h-[3px] rounded-full mb-3 transition-all duration-500"
          style={{
            backgroundColor: accent,
            width: hovered ? "3rem" : "2.5rem",
          }}
        />

        {/* Name */}
        <h3 className="font-display font-bold text-white leading-tight text-base mb-1">
          {formatPersonName(speaker.title, speaker.name)}
        </h3>

        {/* Role */}
        <p className="font-mono uppercase tracking-widest text-white/50 text-[0.6rem] leading-relaxed">
          {speaker.role}
        </p>

        {/* Company */}
        <div className="mt-2">
          <p
            className="text-xs font-semibold leading-snug"
            style={{ color: accent }}
          >
            {speaker.company}
          </p>
        </div>
      </div>

      {/* Photo region — original dark navy background; we no longer paint
          photo_settings.background (gradient/sunrays/swirl) here. Animated
          decoration is also removed from this surface. */}
      <div className="relative w-full flex-1 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={
            speaker.photoSource
              ? withPhotoCacheBuster(
                  resolvePersonPhotoSrc(speaker.photoSource) || speaker.image,
                  speaker.photoSource,
                )
              : speaker.image
          }
          alt={speaker.name}
          className="absolute bottom-0 left-1/2 max-w-none transition-transform duration-700"
          style={{
            height: '95%',
            width: 'auto',
            transform: `translateX(-50%) ${
              speaker.photoSource ? (getPhotoTransform(speaker.photoSource) ?? '') : ''
            } scale(${hovered ? 1.08 : 1})`,
            transformOrigin: 'bottom center',
            filter: speaker.photoSource ? getPhotoCssFilter(speaker.photoSource) : undefined,
          }}
        />
        {/* Subtle blend at top of photo */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(to bottom, #050A1F 0%, rgba(5,10,31,0) 18%)`,
          }}
        />
      </div>
    </div>
  );

  if (speaker.slug) {
    return (
      <Link href={`/speakers/${speaker.slug}`} className="no-underline">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
};

export const LeadingVoices: React.FC<LeadingVoicesProps> = ({ data }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(0);
  const pausedRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  // Shuffle client-side on mount so the scroller order varies across visits
  // without causing SSR/hydration mismatch. The server renders `data` as-is;
  // the client swaps to a Fisher-Yates-shuffled copy once hydrated.
  const [order, setOrder] = useState<LeadingSpeakerData[]>(data);
  useEffect(() => {
    const shuffled = [...data];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setOrder(shuffled);
    // Reset scroll position so the shuffled order starts from the left
    positionRef.current = 0;
    if (trackRef.current) trackRef.current.style.transform = 'translateX(0px)';
  }, [data]);

  const setPausedState = useCallback((val: boolean) => {
    pausedRef.current = val;
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const animate = () => {
      if (!pausedRef.current && track) {
        positionRef.current += SPEED;
        const halfWidth = track.scrollWidth / 2;
        if (positionRef.current >= halfWidth) {
          positionRef.current = 0;
        }
        track.style.transform = `translateX(-${positionRef.current}px)`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const doubled = [...order, ...order];

  return (
    <section
      id="leading-voices"
      className="relative w-full py-28 bg-[#F0F0EF] text-black"
    >
      {/* Heading */}
      <div className="max-w-[1440px] mx-auto px-6 mb-16">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight text-[#050A1F] leading-[1.1]">
          Leading Voices on the <br className="hidden md:block" />
          <span className="text-brand-blue">DeAI Summit</span> Stage
        </h2>
      </div>

      {/* Fade edges */}
      <div className="absolute left-0 top-0 h-full w-32 bg-gradient-to-r from-[#F0F0EF] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-[#F0F0EF] to-transparent z-10 pointer-events-none" />

      {/* Outer wrapper */}
      <div
        className="py-8"
        style={{ overflowX: "clip", overflowY: "visible" }}
      >
        <div
          ref={trackRef}
          className="flex items-center will-change-transform"
          style={{ width: "max-content" }}
        >
          {doubled.map((speaker, idx) => (
            <SpeakerCard
              key={idx}
              speaker={speaker}
              colorIndex={idx}
              onHover={setPausedState}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

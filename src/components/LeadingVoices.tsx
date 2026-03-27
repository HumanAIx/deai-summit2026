"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import type { LeadingSpeakerData } from "@/components/LandingPage";

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
  const accents = ['#00B0C2', '#0E6FEB', '#050A1F', '#00B0C2'];
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
          {speaker.name}
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

      {/* Photo at bottom */}
      <div className="relative w-full flex-1 overflow-hidden">
        <Image
          src={speaker.image}
          alt={speaker.name}
          fill
          className={`object-cover transition-transform duration-700 ${speaker.slug === 'aaron-farrugia' ? 'object-[center_-90px]' : (speaker.slug === 'max-li' || speaker.slug === 'sean-yang') ? 'object-[center_-20px]' : 'object-top'}`}
          style={{
            transform: hovered ? "scale(1.08)" : "scale(1)",
          }}
        />
        {/* Subtle blend at top of photo */}
        <div
          className="absolute inset-0"
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

  const doubled = [...data, ...data];

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

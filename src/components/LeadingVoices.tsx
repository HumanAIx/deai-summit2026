"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { LeadingVoice } from "@/config/types";

interface LeadingVoicesProps {
  data: LeadingVoice[];
}

const SPEED = 2; // px per frame

const SpeakerCard: React.FC<{
  speaker: LeadingVoice;
  onHover: (hovered: boolean) => void;
}> = ({ speaker, onHover }) => {
  const [expanded, setExpanded] = useState(false);

  const handleEnter = () => {
    setExpanded(true);
    onHover(true);
  };

  const handleLeave = () => {
    setExpanded(false);
    onHover(false);
  };

  return (
    <div
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className="relative flex-shrink-0 mx-3 flex flex-col items-center text-center bg-white border rounded-2xl cursor-default"
      style={{
        width: "14rem",
        padding: "1.5rem",
        transform: expanded ? "scale(1.2)" : "scale(1)",
        transformOrigin: "center center",
        boxShadow: expanded
          ? "0 30px 80px rgba(0,0,0,0.22)"
          : "0 2px 8px rgba(0,0,0,0.04)",
        borderColor: expanded ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.08)",
        transition:
          "transform 0.5s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.4s ease, border-color 0.4s ease",
        zIndex: expanded ? 50 : 1,
      }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-blue-50/60 to-transparent pointer-events-none rounded-2xl"
        style={{ opacity: expanded ? 1 : 0, transition: "opacity 0.4s ease" }}
      />

      {/* Photo */}
      <div
        className="relative w-24 h-24 rounded-full overflow-hidden border-2 flex-shrink-0 mb-4"
        style={{
          borderColor: expanded ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.05)",
          transition: "border-color 0.4s ease",
        }}
      >
        <Image
          src={speaker.image}
          alt={speaker.name}
          fill
          className="object-cover transition-all duration-500"
          style={{ filter: expanded ? "none" : "grayscale(1) contrast(1.25)" }}
        />
      </div>

      {/* Name */}
      <h3 className="font-display font-bold text-[#1a1a1a] leading-tight mb-1 text-sm">
        {speaker.name}
      </h3>

      {/* Role */}
      <p className="font-mono uppercase tracking-widest text-gray-500 leading-relaxed text-[0.65rem] min-h-[2.5rem]">
        {speaker.role}
      </p>

      {/* Full company — fades in when expanded */}
      <div
        style={{
          maxHeight: expanded ? "10rem" : "0",
          opacity: expanded ? 1 : 0,
          marginTop: expanded ? "1rem" : "0",
          overflow: "hidden",
          transition:
            "max-height 0.4s ease, opacity 0.4s ease 0.1s, margin 0.4s ease",
        }}
      >
        <div className="w-full border-t border-black/10 pt-3">
          <p className="text-[0.65rem] font-semibold text-[#1a1a1a] leading-snug text-center">
            {speaker.company}
          </p>
        </div>
      </div>
    </div>
  );
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
      className="relative w-full py-24 bg-[#F0F0EF] text-black"
      // No overflow-hidden here — allows expanded cards to show fully
    >
      {/* Heading */}
      <div className="max-w-7xl mx-auto px-6 mb-14">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight text-[#1a1a1a] leading-[1.1]">
          Leading Voices on the <br className="hidden md:block" />
          <span className="text-brand-blue">DeAI Summit</span> Stage
        </h2>
      </div>

      {/* Fade edges — left and right only, no top/bottom bands */}
      <div className="absolute left-0 top-0 h-full w-24 bg-gradient-to-r from-[#F0F0EF] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-[#F0F0EF] to-transparent z-10 pointer-events-none" />

      {/* Outer wrapper: clips LEFT/RIGHT only using overflow-x-hidden */}
      <div
        className="py-16"
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
              onHover={setPausedState}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

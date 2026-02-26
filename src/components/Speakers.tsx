'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Speaker, PartnerItem } from '@/config/types';

interface SpeakersProps {
    speakersData: Speaker[];
    partnersData: PartnerItem[];
}

const LogoItem: React.FC<{ name: string, logo: string }> = ({ name, logo }) => (
    <div className="group flex items-center justify-center h-40 border-r border-b border-gray-200 bg-transparent hover:bg-white/50 transition-all duration-300 cursor-default px-8">
        <Image
            src={logo}
            alt={name}
            width={120}
            height={60}
            className="max-h-12 w-auto max-w-full opacity-40 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300 mix-blend-multiply"
        />
    </div>
);

export const Speakers: React.FC<SpeakersProps> = ({ speakersData, partnersData }) => {
    return (
        <section id="agenda" className="relative w-full py-20 md:py-32 px-4 bg-[#F0F0EF] text-black overflow-hidden">

            {/* Background radial gradient for depth */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1200px] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.8)_0%,transparent_70%)] pointer-events-none" />

            <div className="max-w-7xl mx-auto flex flex-col items-center">

                {/* Headline - Fixed layout to prevent 4-line break */}
                <div className="text-center max-w-6xl px-4 space-y-4 md:space-y-6 mb-16 md:mb-24 relative z-40">
                    <h2 className="text-3xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight text-[#020408] leading-[1.1] md:leading-[1.05]">
                        The Most Senior Global Line Up
                        <span className="block text-brand-blue mt-2">in the Decentralized AI Industry</span>
                    </h2>
                </div>

                {/* Trusted By Caption */}
                <div className="w-full text-center mb-8 md:mb-10">
                    <p className="text-[0.65rem] md:text-xs font-bold tracking-[0.2em] text-gray-400 uppercase">
                        Trusted by 160+ Product Development Teams
                    </p>
                </div>

                {/* Logo Grid */}
                <div className="w-full border-t border-l border-gray-200 grid grid-cols-2 md:grid-cols-4">
                    {partnersData.map((partner, index) => (
                        <LogoItem key={index} name={partner.name} logo={partner.logo} />
                    ))}
                </div>

                <div className="mt-20 text-center">
                    <button className="px-8 py-3 rounded-full border border-black/10 bg-white hover:bg-black hover:text-white transition-all duration-300 text-sm font-semibold shadow-sm hover:shadow-xl">
                        View Full Agenda
                    </button>
                </div>

            </div>
        </section>
    );
};
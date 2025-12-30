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

const SpeakerCard: React.FC<{ speaker: Speaker, isCenter?: boolean }> = ({ speaker, isCenter }) => (
    <div className={`flex items-center gap-4 bg-white p-2 pr-6 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.15)] transition-all duration-300 border border-black/[0.03] min-w-[240px] ${isCenter ? 'ring-2 ring-brand-blue/10' : ''}`}>
        <Image
            src={speaker.image}
            alt={speaker.name}
            width={56}
            height={56}
            className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover border border-gray-100"
        />
        <div className="flex flex-col text-left">
            <span className="text-sm md:text-base font-bold text-gray-900 leading-tight">
                {speaker.name}
            </span>
            <span className="text-xs md:text-sm text-gray-500 font-medium leading-tight">
                {speaker.role}
            </span>
        </div>
    </div>
);

export const Speakers: React.FC<SpeakersProps> = ({ speakersData, partnersData }) => {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const x = (e.clientX / window.innerWidth) * 2 - 1;
            const y = (e.clientY / window.innerHeight) * 2 - 1;
            setMousePos({ x, y });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Ensure we have enough speakers for the desktop view indices (0 to 4)
    const s = speakersData;

    return (
        <section id="agenda" className="relative w-full py-32 px-4 bg-[#F0F0EF] text-black overflow-hidden">

            {/* Background radial gradient for depth */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1200px] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.8)_0%,transparent_70%)] pointer-events-none" />

            <div className="max-w-7xl mx-auto flex flex-col items-center">

                {/* Parallax Speakers Cloud */}
                <div className="relative w-full max-w-5xl h-[450px] mb-12 perspective-1000 hidden md:block">

                    {/* Speaker Cards with mouse-based parallax */}
                    {s[0] && (
                        <div
                            className="absolute top-6 left-1/2 z-10 transition-transform duration-75 ease-out will-change-transform"
                            style={{ transform: `translate3d(calc(-50% - 200px), ${mousePos.y * -20}px, 0) translate3d(${mousePos.x * -15}px, 0, 0)` }}
                        >
                            <SpeakerCard speaker={s[0]} />
                        </div>
                    )}

                    {s[1] && (
                        <div
                            className="absolute top-12 left-1/2 z-10 transition-transform duration-75 ease-out will-change-transform"
                            style={{ transform: `translate3d(calc(-50% + 200px), ${mousePos.y * -15}px, 0) translate3d(${mousePos.x * -10}px, 0, 0)` }}
                        >
                            <SpeakerCard speaker={s[1]} />
                        </div>
                    )}

                    {s[3] && (
                        <div
                            className="absolute top-[160px] left-1/2 z-30 transition-transform duration-75 ease-out will-change-transform scale-110"
                            style={{ transform: `translate3d(-50%, ${mousePos.y * -10}px, 0) translate3d(${mousePos.x * -5}px, 0, 0)` }}
                        >
                            <SpeakerCard speaker={s[3]} isCenter />
                        </div>
                    )}

                    {s[2] && (
                        <div
                            className="absolute top-[290px] left-1/2 z-20 transition-transform duration-75 ease-out will-change-transform"
                            style={{ transform: `translate3d(calc(-50% - 240px), ${mousePos.y * -25}px, 0) translate3d(${mousePos.x * -20}px, 0, 0)` }}
                        >
                            <SpeakerCard speaker={s[2]} />
                        </div>
                    )}

                    {s[4] && (
                        <div
                            className="absolute top-[310px] left-1/2 z-20 transition-transform duration-75 ease-out will-change-transform"
                            style={{ transform: `translate3d(calc(-50% + 230px), ${mousePos.y * -18}px, 0) translate3d(${mousePos.x * -12}px, 0, 0)` }}
                        >
                            <SpeakerCard speaker={s[4]} />
                        </div>
                    )}
                </div>

                {/* Mobile View: Simple Stack */}
                <div className="md:hidden flex flex-col gap-4 mb-20 w-full max-w-sm">
                    {speakersData.map(s => <SpeakerCard key={s.id} speaker={s} />)}
                </div>

                {/* Headline - Fixed layout to prevent 4-line break */}
                <div className="text-center max-w-6xl px-4 space-y-6 mb-24 relative z-40">
                    <h2 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight text-[#020408] leading-[1.05]">
                        The Most Senior Global Line Up
                        <span className="block text-brand-blue mt-2">in the Decentralized AI Industry</span>
                    </h2>
                </div>

                {/* Trusted By Caption */}
                <div className="w-full text-center mb-10">
                    <p className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase">
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
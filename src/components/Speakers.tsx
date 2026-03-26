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

            <div className="max-w-[1440px] mx-auto flex flex-col items-center">


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


            </div>
        </section>
    );
};
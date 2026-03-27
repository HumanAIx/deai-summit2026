import React from 'react';
import { SiteConfig } from '@/config/types';

interface UnderConstructionProps {
    onOpenContact: () => void;
    data: SiteConfig;
}

export const UnderConstruction: React.FC<UnderConstructionProps> = ({ onOpenContact, data }) => {
    return (
        <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-[#050A1F]">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-black/60 z-10" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 z-20" />
                <img
                    src={data.hero.backgroundImage}
                    alt="Background"
                    className="w-full h-full object-cover opacity-50"
                />
            </div>

            {/* Content */}
            <div className="relative z-30 flex flex-col items-center text-center px-4 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-32">

                {/* Logo/Brand */}
                <div className="flex flex-col items-center mb-6">
                    <div className="w-16 h-16 relative flex items-center justify-center mb-4">
                        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_15px_rgba(0,176,194,0.5)]">
                            <path d="M10 30 C30 15, 60 45, 90 30" stroke="#0E6FEB" strokeWidth="8" strokeLinecap="round" />
                            <path d="M10 50 C30 35, 60 65, 90 50" stroke="#00B0C2" strokeWidth="8" strokeLinecap="round" />
                            <path d="M20 70 C40 55, 70 85, 90 70" stroke="#0E6FEB" strokeWidth="8" strokeLinecap="round" />
                        </svg>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-2">
                        DeAI Summit
                    </h1>
                    <p className="text-sm md:text-base uppercase tracking-[0.3em] text-brand-cyan/80">
                        {data.hero.badge}
                    </p>
                </div>

                {/* Main Message */}
                <div className="space-y-4">
                    <h2 className="text-3xl md:text-5xl font-light text-white/90">
                        <span className="font-semibold text-brand-cyan">Under Construction</span>
                    </h2>

                </div>



            </div>
        </div>
    );
};

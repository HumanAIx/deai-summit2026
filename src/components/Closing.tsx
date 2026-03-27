import React from 'react';
import { ClosingConfig } from '@/config/types';

interface ClosingProps {
    data: ClosingConfig;
}

export const Closing: React.FC<ClosingProps> = ({ data }) => {
    return (
        <section className="relative w-full py-24 md:py-40 px-4 bg-[#050A1F] text-white border-t border-white/5 overflow-hidden">

            {/* Background Texture/Gradient */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-cyan/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-blue/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center text-center">

                {/* Badge/Location */}
                <div className="mb-8 md:mb-12 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm">
                    <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse"></span>
                    <span className="text-[10px] md:text-xs font-mono uppercase tracking-[0.2em] text-white/70">
                        {data.location}
                    </span>
                </div>

                {/* Main Heading */}
                <h2 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold tracking-tighter text-white mb-8 md:mb-12 leading-[1.1]">
                    {data.statement}
                </h2>

                {/* Description */}
                <p className="max-w-3xl text-lg md:text-xl lg:text-2xl text-white/60 font-light leading-relaxed mb-16">
                    {data.description}
                </p>

                {/* Primary CTA */}
                <button className="shiny-cta group text-lg px-8 py-4">
                    <span className="relative z-10 flex items-center justify-center gap-3">
                        {data.cta}
                        <i className="ri-arrow-right-line transition-transform duration-300 group-hover:translate-x-1"></i>
                    </span>
                </button>

            </div>
        </section>
    );
};

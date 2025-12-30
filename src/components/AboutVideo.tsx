import React from 'react';
import { AboutConfig } from '@/config/types';

interface AboutVideoProps {
    data: AboutConfig;
}

export const AboutVideo: React.FC<AboutVideoProps> = ({ data }) => {
    return (
        <section className="relative w-full py-20 md:py-32 px-4 md:px-6 bg-[#020408] text-white border-t border-white/5">

            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-brand-blue/5 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-brand-cyan/5 rounded-full blur-[100px]"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto flex flex-col items-center text-center">

                {/* Section Title */}
                <h2 className="text-3xl md:text-5xl lg:text-8xl font-display font-bold text-white tracking-tighter mb-12 md:mb-20">
                    {data.sectionTitle}
                </h2>

                {/* Hero Photo Container */}
                <div className="group relative w-full max-w-6xl aspect-[16/9] rounded-xl md:rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_0_60px_rgba(34,211,238,0.05)]">

                    {/* Primary High-Resolution Photo */}
                    <img
                        src={data.coverImage}
                        alt="DeAI Summit Experience"
                        className="w-full h-full object-cover transition-transform duration-[5s] group-hover:scale-110"
                    />

                    {/* Cinematic Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020408] via-transparent to-transparent opacity-80" />
                    <div className="absolute inset-0 bg-brand-blue/10 mix-blend-overlay" />

                    {/* Corner Label */}
                    <div className="absolute top-4 left-4 md:top-8 md:left-8 flex items-center gap-2 md:gap-3 px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-white/10 bg-black/40 backdrop-blur-md">
                        <i className="ri-image-line text-brand-cyan text-sm md:text-base"></i>
                        <span className="text-[0.5rem] md:text-[10px] font-mono uppercase tracking-[0.3em] text-white/80">{data.badge}</span>
                    </div>

                    {/* Overlay Caption Text */}
                    <div className="absolute bottom-0 left-0 w-full p-6 md:p-10 lg:p-16 text-left flex flex-col justify-end">
                        <h3 className="text-2xl md:text-4xl lg:text-6xl font-display font-bold text-white tracking-tighter mb-2 md:mb-4 max-w-3xl">
                            {data.overlayTitle}
                        </h3>
                        <div className="flex items-center gap-4">
                            <span className="text-[0.6rem] md:text-xs font-mono uppercase tracking-[0.2em] text-brand-cyan">{data.galleryLabel}</span>
                            <div className="h-px w-12 md:w-24 bg-white/20"></div>
                        </div>
                    </div>
                </div>

                {/* Text Content */}
                <div className="mt-12 md:mt-24 max-w-4xl mx-auto text-center space-y-6 md:space-y-8">
                    <h3
                        className="text-xl md:text-2xl lg:text-4xl text-white font-medium leading-[1.3] md:leading-[1.2] tracking-tight px-2"
                        dangerouslySetInnerHTML={{ __html: data.mainStatement }}
                    />
                    <p className="text-base md:text-lg lg:text-xl text-white/60 font-light leading-relaxed max-w-3xl mx-auto px-4">
                        {data.description}
                    </p>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-6 mt-16 w-full justify-center">
                    <button className="shiny-cta group min-w-[200px]">
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            {data.ctaPrimary}
                        </span>
                    </button>

                    <button className="px-8 py-4 rounded-full border border-white/10 text-white font-medium text-sm hover:bg-white hover:text-black transition-all duration-300 min-w-[200px]">
                        {data.ctaSecondary}
                    </button>
                </div>

            </div>
        </section>
    );
};
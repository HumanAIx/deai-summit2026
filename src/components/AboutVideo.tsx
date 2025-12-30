import React from 'react';
import { AboutConfig } from '@/config/types';

interface AboutVideoProps {
    data: AboutConfig;
}

export const AboutVideo: React.FC<AboutVideoProps> = ({ data }) => {
    return (
        <section className="relative w-full py-32 px-6 bg-[#020408] text-white border-t border-white/5">

            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-brand-blue/5 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-brand-cyan/5 rounded-full blur-[100px]"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto flex flex-col items-center text-center">

                {/* Section Title */}
                <h2 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold text-white tracking-tighter mb-20">
                    {data.sectionTitle}
                </h2>

                {/* Hero Photo Container */}
                <div className="group relative w-full max-w-6xl aspect-[16/9] rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_0_60px_rgba(34,211,238,0.05)]">

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
                    <div className="absolute top-8 left-8 flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-black/40 backdrop-blur-md">
                        <i className="ri-image-line text-brand-cyan text-base"></i>
                        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/80">{data.badge}</span>
                    </div>

                    {/* Overlay Caption Text */}
                    <div className="absolute bottom-0 left-0 w-full p-10 md:p-16 text-left flex flex-col justify-end">
                        <h3 className="text-4xl md:text-6xl font-display font-bold text-white tracking-tighter mb-4 max-w-3xl">
                            {data.overlayTitle}
                        </h3>
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-mono uppercase tracking-[0.2em] text-brand-cyan">{data.galleryLabel}</span>
                            <div className="h-px w-24 bg-white/20"></div>
                        </div>
                    </div>
                </div>

                {/* Text Content */}
                <div className="mt-24 max-w-4xl mx-auto text-center space-y-8">
                    <h3
                        className="text-2xl md:text-4xl text-white font-medium leading-[1.2] tracking-tight"
                        dangerouslySetInnerHTML={{ __html: data.mainStatement }}
                    />
                    <p className="text-lg md:text-xl text-white/60 font-light leading-relaxed max-w-3xl mx-auto">
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
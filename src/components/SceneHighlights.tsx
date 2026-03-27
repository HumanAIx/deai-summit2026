import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { HighlightsConfig } from '@/config/types';

interface SceneHighlightsProps {
    data: HighlightsConfig;
}

export const SceneHighlights: React.FC<SceneHighlightsProps> = ({ data }) => {
    return (
        <section className="relative w-full min-h-[600px] md:h-screen md:min-h-[700px] bg-[#050A1F] overflow-hidden border-t border-white/5">

            {/* Full Screen Image */}
            <div className="absolute inset-0">
                <Image
                    src={data.backgroundImage}
                    alt="Conference Hall"
                    fill
                    className="object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050A1F] via-transparent to-[#050A1F]/40"></div>
                {/* Subtle brand tint */}
                <div className="absolute inset-0 bg-brand-blue/10 mix-blend-overlay"></div>
            </div>

            {/* Content Container */}
            <div className="relative w-full h-full max-w-[1400px] mx-auto pointer-events-none">
                <style jsx>{`
                    .responsive-hotspot {
                        top: var(--top, auto);
                        left: var(--left, auto);
                        right: var(--right, auto);
                        bottom: var(--bottom, auto);
                    }
                    @media (min-width: 768px) {
                        .responsive-hotspot {
                            top: var(--md-top, var(--top, auto));
                            left: var(--md-left, var(--left, auto));
                            right: var(--md-right, var(--right, auto));
                            bottom: var(--md-bottom, var(--bottom, auto));
                        }
                    }
                    @media (min-width: 1024px) {
                        .responsive-hotspot {
                            left: var(--lg-left, var(--md-left, var(--left, auto)));
                            right: var(--lg-right, var(--md-right, var(--right, auto)));
                        }
                    }
                `}</style>

                {data.hotspots.map((spot, idx) => {
                    let alignmentClass = "";

                    if (spot.type === 'left-aligned') {
                        alignmentClass = "items-start";
                    } else if (spot.type === 'center') {
                        alignmentClass = "items-center";
                    } else if (spot.type === 'right-aligned') {
                        alignmentClass = "items-end text-right";
                    }

                    const cssVars = {
                        '--top': spot.position.top,
                        '--left': spot.position.left,
                        '--right': spot.position.right,
                        '--bottom': spot.position.bottom,
                        '--md-top': spot.position.mdTop,
                        '--md-left': spot.position.mdLeft,
                        '--md-right': spot.position.mdRight,
                        '--md-bottom': spot.position.mdBottom,
                        '--lg-left': spot.position.lgLeft,
                        '--lg-right': spot.position.lgRight,
                    } as React.CSSProperties;

                    return (
                        <div
                            key={spot.id}
                            className={`absolute flex flex-col ${alignmentClass} w-auto pointer-events-auto opacity-0 animate-fade-in-up [animation-delay:${(idx + 1) * 200}ms] fill-mode-forwards responsive-hotspot`}
                            style={cssVars}
                        >
                            {spot.type === 'left-aligned' && (
                                <>
                                    <div className="relative flex items-center justify-center w-3 h-3 ml-[1px]">
                                        <div className="absolute w-full h-full bg-white rounded-full shadow-[0_0_10px_white] z-10"></div>
                                        <div className="absolute w-8 h-8 bg-white/20 rounded-full animate-ping"></div>
                                    </div>
                                    <div className="w-px h-32 md:h-48 bg-gradient-to-b from-white via-white/50 to-transparent ml-[6px]"></div>
                                </>
                            )}

                            {spot.type === 'center' && (
                                <div className="mb-4 text-center">
                                    <h3 className="font-display font-bold text-3xl md:text-5xl text-white tracking-tighter drop-shadow-2xl whitespace-nowrap">
                                        {spot.title}
                                    </h3>
                                </div>
                            )}

                            {spot.type === 'right-aligned' && (
                                <div className="relative flex items-center justify-center w-3 h-3 mr-[1px]">
                                    <div className="absolute w-full h-full bg-white rounded-full shadow-[0_0_10px_white] z-10"></div>
                                    <div className="absolute w-8 h-8 bg-white/20 rounded-full animate-ping"></div>
                                </div>
                            )}

                            {spot.type === 'right-aligned' && (
                                <div className="w-px h-24 md:h-32 bg-gradient-to-b from-white via-white/50 to-transparent mr-[6px]"></div>
                            )}


                            {spot.type !== 'center' && (
                                spot.id === 'venue' ? (
                                    <Link href="/venues/monte-kristo" className="mt-4 block no-underline group/venue">
                                        <h3
                                            className="font-display font-bold text-2xl md:text-3xl text-white tracking-tighter leading-tight drop-shadow-2xl group-hover/venue:text-brand-cyan transition-colors"
                                            dangerouslySetInnerHTML={{ __html: spot.title }}
                                        />
                                        <span className="text-brand-cyan text-xs md:text-sm tracking-widest uppercase font-mono mt-2 block font-medium">
                                            {spot.subtitle}
                                        </span>
                                    </Link>
                                ) : (
                                    <div className="mt-4">
                                        <h3
                                            className="font-display font-bold text-2xl md:text-3xl text-white tracking-tighter leading-tight drop-shadow-2xl"
                                            dangerouslySetInnerHTML={{ __html: spot.title }}
                                        />
                                        <span className="text-white/60 text-xs md:text-sm tracking-widest uppercase font-mono mt-2 block">
                                            {spot.subtitle}
                                        </span>
                                    </div>
                                )
                            )}

                            {spot.type === 'center' && (
                                <>
                                    <div className="w-px h-32 md:h-48 bg-gradient-to-b from-transparent via-white/50 to-white"></div>
                                    <div className="relative flex items-center justify-center w-3 h-3 mt-[-1px]">
                                        <div className="absolute w-full h-full bg-white rounded-full shadow-[0_0_10px_white] z-10"></div>
                                        <div className="absolute w-12 h-12 bg-brand-cyan/30 rounded-full animate-pulse"></div>
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    )
}

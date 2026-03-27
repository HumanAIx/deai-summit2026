'use client';
import React, { useState, useEffect } from 'react';
import { NetworkingItem } from '@/config/types';

interface NetworkingProps {
    data: NetworkingItem[];
}

const cardAccents = ['#06B0C2', '#0F6FEB', '#2DD4BF', '#8B5CF6'];

export const Networking: React.FC<NetworkingProps> = ({ data }) => {
    const [activeTab, setActiveTab] = useState(0);
    const [hoveredTab, setHoveredTab] = useState<number | null>(null);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);

    useEffect(() => {
        if (!isAutoPlaying) return;
        const interval = setInterval(() => {
            setActiveTab((prev) => (prev + 1) % data.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [isAutoPlaying, data.length]);

    const handleTabClick = (index: number) => {
        setActiveTab(index);
        setIsAutoPlaying(false);
    };

    return (
        <section className="relative w-full py-32 px-6 bg-[#020408] text-white overflow-hidden">

            {/* Background effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-blue/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-brand-cyan/8 rounded-full blur-[140px]"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(circle_at_center,black_40%,transparent_100%)]"></div>
            </div>

            <div className="relative z-10 max-w-[1440px] mx-auto flex flex-col items-center">

                {/* Header */}
                <div className="text-center max-w-5xl mb-20 space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 backdrop-blur-sm mb-4">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-cyan opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-cyan"></span>
                        </span>
                        <span className="text-xs font-mono uppercase tracking-widest text-brand-cyan">Precision Networking</span>
                    </div>

                    <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight leading-[1.2]">
                        HumanAIx is advancing the open infrastructure for decentralized AI — <span className="text-brand-cyan">where compute, data, and intelligence are governed by people.</span>
                    </h2>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                    {data.map((item, index) => {
                        const accent = cardAccents[index % cardAccents.length];
                        const isActive = (hoveredTab !== null ? hoveredTab : activeTab) === index;

                        return (
                            <button
                                key={item.id}
                                onClick={() => handleTabClick(index)}
                                onMouseEnter={() => { setHoveredTab(index); setIsAutoPlaying(false); }}
                                onMouseLeave={() => setHoveredTab(null)}
                                className="group relative flex flex-col text-left p-8 rounded-2xl border transition-all duration-500 overflow-hidden"
                                style={{
                                    backgroundColor: isActive ? accent + '15' : 'rgba(255,255,255,0.03)',
                                    borderColor: isActive ? accent + '40' : 'rgba(255,255,255,0.08)',
                                    boxShadow: isActive ? `0 0 30px ${accent}15, 0 10px 40px rgba(0,0,0,0.3)` : '0 2px 10px rgba(0,0,0,0.2)',
                                }}
                            >
                                {/* Accent glow */}
                                <div
                                    className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl transition-opacity duration-700"
                                    style={{
                                        backgroundColor: accent,
                                        opacity: isActive ? 0.15 : 0,
                                    }}
                                />

                                {/* Number */}
                                <span
                                    className="text-5xl font-display font-bold mb-6 transition-colors duration-500"
                                    style={{ color: isActive ? accent : 'rgba(255,255,255,0.15)' }}
                                >
                                    {String(index + 1).padStart(2, '0')}
                                </span>

                                {/* Icon */}
                                <i
                                    className={`${item.icon} text-3xl mb-5 transition-all duration-500`}
                                    style={{
                                        color: isActive ? accent : 'rgba(255,255,255,0.4)',
                                        transform: isActive ? 'scale(1.1)' : 'scale(1)',
                                    }}
                                ></i>

                                {/* Title */}
                                <h3 className="text-xl font-display font-bold text-white mb-4 leading-tight">
                                    {item.title}
                                </h3>

                                {/* Description */}
                                <p className="text-base text-white/50 leading-relaxed group-hover:text-white/70 transition-colors duration-300">
                                    {item.description}
                                </p>

                                {/* Bottom accent line */}
                                <div
                                    className="absolute bottom-0 left-0 h-[3px] rounded-b-2xl transition-all duration-700"
                                    style={{
                                        width: isActive ? '100%' : '0%',
                                        backgroundColor: accent,
                                    }}
                                />
                            </button>
                        );
                    })}
                </div>

            </div>
        </section>
    );
};

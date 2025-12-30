'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { NetworkingItem } from '@/config/types';

interface NetworkingProps {
    data: NetworkingItem[];
}

export const Networking: React.FC<NetworkingProps> = ({ data }) => {
    const [activeTab, setActiveTab] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);

    // Auto-rotate tabs if user hasn't interacted recently
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
        <section className="relative w-full py-32 px-6 bg-white text-slate-900 overflow-hidden">

            {/* Ambient Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-blue/5 rounded-full blur-[100px] mix-blend-multiply animate-pulse-fast"></div>
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-brand-cyan/5 rounded-full blur-[120px] mix-blend-multiply"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(circle_at_center,black_40%,transparent_100%)]"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto flex flex-col items-center">

                {/* Header */}
                <div className="text-center max-w-5xl mb-16 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 backdrop-blur-sm mb-4">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-cyan opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-cyan"></span>
                        </span>
                        <span className="text-xs font-mono uppercase tracking-widest text-brand-dark">Precision Networking</span>
                    </div>

                    <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-slate-900 leading-[1.2]">
                        HumanAIx is advancing the open infrastructure for decentralized AI — <span className="text-brand-blue">where compute, data, and intelligence are governed by people.</span>
                    </h2>
                </div>

                {/* Main Content Area */}
                <div className="w-full flex flex-col items-center gap-12">

                    {/* Central Image Window */}
                    <div className="relative w-full max-w-5xl aspect-[4/5] md:aspect-[16/9] rounded-2xl overflow-hidden border border-black/5 shadow-[0_20px_60px_rgba(0,0,0,0.05)] bg-[#F5F5F5] group">

                        {/* Dynamic Image */}
                        <div className="relative w-full h-full">
                            {data.map((tab, index) => (
                                <div
                                    key={tab.id}
                                    className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${activeTab === index ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                                >
                                    <Image
                                        src={tab.image}
                                        alt={tab.title}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-[2s]"
                                    />
                                    {/* Fade to white gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-90 md:opacity-40"></div>
                                </div>
                            ))}
                        </div>

                        {/* Overlay Text on Image (Mobile only, desktop uses tabs below) */}
                        <div className="absolute bottom-0 left-0 w-full p-8 md:hidden z-20">
                            <h3 className="text-2xl font-display font-bold text-slate-900 mb-2">{data[activeTab].title}</h3>
                            <p className="text-sm text-slate-800">{data[activeTab].description}</p>
                        </div>
                    </div>

                    {/* Interactive Tabs (Desktop) */}
                    <div className="hidden md:grid grid-cols-4 gap-8 w-full max-w-6xl">
                        {data.map((tab, index) => (
                            <button
                                key={tab.id}
                                onClick={() => handleTabClick(index)}
                                className={`flex flex-col text-left gap-4 p-4 rounded-xl transition-all duration-300 group border-t-2 ${activeTab === index
                                    ? 'border-brand-blue bg-slate-50'
                                    : 'border-transparent hover:border-black/10 hover:bg-slate-50'
                                    }`}
                            >
                                <span className={`text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === index ? 'text-brand-blue' : 'text-slate-400 group-hover:text-slate-600'
                                    }`}>
                                    0{index + 1}
                                </span>

                                <div>
                                    <h4 className={`text-lg font-bold mb-2 transition-colors ${activeTab === index ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-800'
                                        }`}>
                                        {tab.title}
                                    </h4>
                                    <div className="flex gap-2 mb-2 text-2xl text-brand-blue">
                                        <i className={tab.icon}></i>
                                    </div>
                                    <p className={`text-sm leading-relaxed transition-colors ${activeTab === index ? 'text-slate-600' : 'text-slate-400 group-hover:text-slate-500'
                                        }`}>
                                        {tab.description}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>

                </div>
            </div>
        </section>
    );
};
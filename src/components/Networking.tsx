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

            </div>
        </section>
    );
};
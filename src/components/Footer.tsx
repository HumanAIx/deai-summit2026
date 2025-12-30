'use client';
import React from 'react';
import Image from 'next/image';
import { FooterConfig, NavigationConfig } from '@/config/types';

interface FooterProps {
    data: FooterConfig;
    navData: NavigationConfig;
    onShowToast: (message: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ data, navData, onShowToast }) => {

    const handleCopyEmail = (e: React.MouseEvent) => {
        e.preventDefault();
        navigator.clipboard.writeText(navData.contactEmail);
        onShowToast("Email copied to clipboard");
    };

    const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        e.preventDefault();
        const element = document.querySelector(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <footer className="relative w-full py-12 md:py-24 px-4 md:px-6 bg-[#F2F4F7] text-slate-900 border-t border-black/5 overflow-hidden">

            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-black/10 to-transparent"></div>

            <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">

                {/* Brand Column */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    <a href="#" className="flex items-center gap-2 group w-fit">
                        <div className="w-10 h-10 relative flex items-center justify-center bg-white rounded-xl shadow-sm border border-black/5 group-hover:scale-105 transition-transform duration-300">
                            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[80%] h-[80%]">
                                <path d="M10 30 C30 15, 60 45, 90 30" stroke="#3B82F6" strokeWidth="12" strokeLinecap="round" />
                                <path d="M10 50 C30 35, 60 65, 90 50" stroke="#22D3EE" strokeWidth="12" strokeLinecap="round" />
                                <path d="M20 70 C40 55, 70 85, 90 70" stroke="#2DD4BF" strokeWidth="12" strokeLinecap="round" />
                            </svg>
                        </div>
                        <div className="flex flex-col leading-none justify-center">
                            <span className="font-bold tracking-tight text-slate-900 text-xl leading-tight">DeAI</span>
                            <span className="text-[0.65rem] uppercase tracking-[0.25em] text-slate-500 leading-none group-hover:text-brand-blue transition-colors">Summit</span>
                        </div>
                    </a>
                    <p className="text-sm font-light text-slate-500 leading-relaxed max-w-xs">
                        {data.brandDescription}
                    </p>
                    {/* Stats embedded in footer */}
                    <div className="flex gap-6 mt-2 pt-6 border-t border-black/5">
                        {data.stats.map((stat, idx) => (
                            <div key={idx}>
                                <div className={`text-lg font-medium ${idx === 1 ? 'text-brand-blue' : 'text-slate-900'}`}>{stat.value}</div>
                                <div className="text-[10px] uppercase tracking-widest text-slate-400">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Links */}
                <div className="lg:col-span-2 flex flex-col gap-4 pt-1">
                    <h4 className="font-medium text-xs uppercase tracking-widest text-slate-400">Event</h4>
                    <ul className="flex flex-col gap-3">
                        {navData.main.map((item) => (
                            <li key={item.label}>
                                <a
                                    href={item.href}
                                    onClick={(e) => handleNavClick(e, item.href)}
                                    className="text-sm font-light text-slate-600 hover:text-brand-blue transition-colors"
                                >
                                    {item.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Legal */}
                <div className="lg:col-span-2 flex flex-col gap-4 pt-1">
                    <h4 className="font-medium text-xs uppercase tracking-widest text-slate-400">Legal</h4>
                    <ul className="flex flex-col gap-3">
                        {navData.legal.map((item) => (
                            <li key={item}><a href="#" className="text-sm font-light text-slate-600 hover:text-brand-blue transition-colors">{item}</a></li>
                        ))}
                    </ul>
                </div>

                {/* Large Footer Cards */}
                <div className="lg:col-span-4 flex flex-col sm:flex-row gap-4 mt-8 lg:mt-0">
                    {/* Sponsor Card */}
                    <a href="#sponsors" onClick={(e) => handleNavClick(e, '#sponsors')} className="flex-1 group relative p-6 rounded-2xl border border-white bg-white shadow-sm hover:shadow-md transition-all overflow-hidden h-32 flex flex-col justify-between">
                        <div className="flex justify-between items-start z-10 relative">
                            <span className="font-medium text-sm text-slate-900">Become a Sponsor</span>
                            <i className="ri-arrow-right-up-line text-base text-slate-400 group-hover:text-brand-blue transition-colors"></i>
                        </div>
                        <div className="relative z-10">
                            <i className="ri-vip-diamond-line text-2xl text-brand-blue/60 group-hover:text-brand-blue transition-colors"></i>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </a>

                    {/* Contact Card */}
                    <button onClick={handleCopyEmail} className="flex-1 group relative p-6 rounded-2xl border border-white bg-white shadow-sm hover:shadow-md transition-all overflow-hidden h-32 flex flex-col justify-between text-left w-full">
                        <div className="flex justify-between items-start z-10 relative w-full">
                            <span className="font-medium text-sm text-slate-900 transition-colors">
                                Contact Us
                            </span>
                            <i className="ri-arrow-right-up-line text-base text-slate-400 group-hover:text-brand-teal transition-colors"></i>
                        </div>
                        <div className="relative z-10">
                            <i className="ri-mail-line text-2xl text-brand-teal/60 group-hover:text-brand-teal transition-colors"></i>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-teal/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </button>
                </div>

            </div>

            {/* Bottom Bar */}
            <div className="relative z-10 max-w-7xl mx-auto mt-16 pt-8 border-t border-brand-blue/10 flex flex-col md:flex-row justify-between items-center gap-4">
                <span className="text-xs font-mono text-slate-400">{data.copyright}</span>
                <div className="flex gap-6 items-center">
                    <a href={data.socials.twitter} target="_blank" rel="noopener noreferrer">
                        <i className="ri-twitter-x-line text-[40px] text-slate-300 hover:text-slate-900 cursor-pointer transition-colors"></i>
                    </a>
                    <a href={data.socials.linkedin} target="_blank" rel="noopener noreferrer">
                        <i className="ri-linkedin-fill text-[40px] text-slate-300 hover:text-slate-900 cursor-pointer transition-colors"></i>
                    </a>
                    <a href={data.socials.youtube} target="_blank" rel="noopener noreferrer">
                        <i className="ri-youtube-fill text-[40px] text-slate-300 hover:text-slate-900 cursor-pointer transition-colors"></i>
                    </a>
                </div>
            </div>

        </footer>
    );
};
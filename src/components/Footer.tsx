'use client';
import React from 'react';
import Link from 'next/link';
import { FooterConfig, NavigationConfig } from '@/config/types';
import { AnimatedCounter } from '@/components/AnimatedCounter';

interface SocialLinkData {
    key: string;
    label: string;
    url: string;
    icon?: string;
    color?: string;
}

interface FooterProps {
    data: FooterConfig;
    navData: NavigationConfig;
    onShowToast: (message: string) => void;
    onOpenContact?: () => void;
    socials?: SocialLinkData[];
}

function getRemixIcon(key: string): string {
    const map: Record<string, string> = {
        linkedin: 'ri-linkedin-fill',
        x: 'ri-twitter-x-fill',
        twitter: 'ri-twitter-x-fill',
        youtube: 'ri-youtube-fill',
        github: 'ri-github-fill',
        telegram: 'ri-telegram-fill',
        discord: 'ri-discord-fill',
        facebook: 'ri-facebook-circle-fill',
        instagram: 'ri-instagram-fill',
        tiktok: 'ri-tiktok-fill',
        medium: 'ri-medium-fill',
        meetup: 'ri-community-fill',
        luma: 'ri-calendar-event-fill',
    };
    return map[key] || 'ri-link';
}

export const Footer: React.FC<FooterProps> = ({ data, navData, onShowToast, onOpenContact, socials }) => {

    // Build social links: API socials first, fill gaps from siteConfig
    const socialLinks: { key: string; label: string; url: string; icon: string }[] = [];
    if (socials && socials.length > 0) {
        for (const s of socials) {
            if (s.url) {
                socialLinks.push({ key: s.key, label: s.label, url: s.url, icon: getRemixIcon(s.key) });
            }
        }
    }
    // Fill in any missing from siteConfig
    const configSocials: Record<string, { label: string; url: string }> = {
        linkedin: { label: 'LinkedIn', url: data.socials.linkedin },
        twitter: { label: 'X / Twitter', url: data.socials.twitter },
        youtube: { label: 'YouTube', url: data.socials.youtube },
    };
    for (const [key, val] of Object.entries(configSocials)) {
        if (val.url && !socialLinks.some(s => s.key === key)) {
            socialLinks.push({ key, label: val.label, url: val.url, icon: getRemixIcon(key) });
        }
    }

    const handleCopyEmail = (e: React.MouseEvent) => {
        e.preventDefault();
        if (onOpenContact) {
            onOpenContact();
        } else {
            navigator.clipboard.writeText(navData.contactEmail);
            onShowToast("Email copied to clipboard");
        }
    };

    return (
        <footer className="relative w-full bg-[#050A1F] text-white overflow-hidden">

            {/* Top accent line */}
            <div className="w-full h-[2px] bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-teal" />

            {/* Main content */}
            <div className="max-w-[1440px] mx-auto px-6 md:px-12 pt-20 pb-12">

                {/* Top section: Brand + CTA cards */}
                <div className="flex flex-col lg:flex-row justify-between gap-16 mb-20">

                    {/* Brand */}
                    <div className="lg:max-w-md">
                        <Link href="/" className="flex items-center gap-3 group mb-6">
                            <div className="w-12 h-12 relative flex items-center justify-center">
                                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                                    <path d="M10 30 C30 15, 60 45, 90 30" stroke="#3B82F6" strokeWidth="12" strokeLinecap="round" />
                                    <path d="M10 50 C30 35, 60 65, 90 50" stroke="#22D3EE" strokeWidth="12" strokeLinecap="round" />
                                    <path d="M20 70 C40 55, 70 85, 90 70" stroke="#2DD4BF" strokeWidth="12" strokeLinecap="round" />
                                </svg>
                            </div>
                            <div className="flex flex-col leading-none justify-center">
                                <span className="font-bold tracking-tight text-white text-2xl leading-tight">DeAI</span>
                                <span className="text-[0.6rem] uppercase tracking-[0.25em] text-white/50 leading-none group-hover:text-brand-cyan transition-colors">Summit</span>
                            </div>
                        </Link>
                        <p className="text-base text-white/50 leading-relaxed mb-8">
                            {data.brandDescription}
                        </p>

                        {/* Stats */}
                        <div className="flex gap-14 mt-2">
                            {data.stats.map((stat, idx) => {
                                const colors = ['#00B0C2', '#0E6FEB'];
                                const color = colors[idx % colors.length];
                                return (
                                    <div key={idx} className="relative">
                                        <div className="absolute inset-0 blur-2xl opacity-15 rounded-full scale-150" style={{ backgroundColor: color }} />
                                        <div className="text-5xl md:text-6xl font-display font-bold relative" style={{ color }}>
                                            <AnimatedCounter value={stat.value} duration={2400} delay={idx * 300} />
                                        </div>
                                        <div className="w-10 h-[3px] rounded-full mt-3 mb-2" style={{ backgroundColor: color }} />
                                        <div className="text-sm uppercase tracking-widest text-white/40">{stat.label}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* CTA cards */}
                    <div className="flex flex-col sm:flex-row gap-5 lg:self-start">
                        <button
                            onClick={(e) => { e.preventDefault(); if (onOpenContact) onOpenContact(); }}
                            className="group relative p-8 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all duration-300 overflow-hidden w-full sm:w-56 text-left"
                        >
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-brand-blue to-brand-cyan opacity-0 group-hover:opacity-100 transition-opacity" />
                            <i className="ri-vip-diamond-line text-3xl text-brand-blue mb-4 block group-hover:scale-110 transition-transform origin-left"></i>
                            <span className="text-base font-semibold text-white block mb-1">Become a Sponsor</span>
                            <span className="text-sm text-white/40 group-hover:text-white/60 transition-colors">Partner with us</span>
                            <i className="ri-arrow-right-up-line text-lg text-white/30 group-hover:text-brand-cyan absolute top-6 right-6 transition-colors"></i>
                        </button>

                        <button
                            onClick={handleCopyEmail}
                            className="group relative p-8 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all duration-300 overflow-hidden w-full sm:w-56 text-left"
                        >
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-brand-cyan to-brand-teal opacity-0 group-hover:opacity-100 transition-opacity" />
                            <i className="ri-mail-send-line text-3xl text-brand-cyan mb-4 block group-hover:scale-110 transition-transform origin-left"></i>
                            <span className="text-base font-semibold text-white block mb-1">Contact Us</span>
                            <span className="text-sm text-white/40 group-hover:text-white/60 transition-colors">Get in touch</span>
                            <i className="ri-arrow-right-up-line text-lg text-white/30 group-hover:text-brand-cyan absolute top-6 right-6 transition-colors"></i>
                        </button>
                    </div>
                </div>

                {/* Divider */}
                <div className="h-[1px] bg-white/10 mb-12" />

                {/* Links row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 mb-16">

                    {/* Event links */}
                    <div>
                        <h4 className="text-sm font-semibold uppercase tracking-widest text-white/30 mb-5">Event</h4>
                        <ul className="flex flex-col gap-3">
                            {navData.main.map((item) => (
                                <li key={item.label}>
                                    <Link
                                        href={item.href}
                                        className="text-base text-white/60 hover:text-brand-cyan transition-colors"
                                    >
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                            <li>
                                <Link href="/agenda" className="text-base text-white/60 hover:text-brand-cyan transition-colors">
                                    Agenda
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Legal links */}
                    <div>
                        <h4 className="text-sm font-semibold uppercase tracking-widest text-white/30 mb-5">Legal</h4>
                        <ul className="flex flex-col gap-3">
                            {navData.legal.map((item) => (
                                <li key={item.label}>
                                    <Link href={item.href} className="text-base text-white/60 hover:text-brand-cyan transition-colors">
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Social links */}
                    <div>
                        <h4 className="text-sm font-semibold uppercase tracking-widest text-white/30 mb-5">Connect</h4>
                        <ul className="flex flex-col gap-3">
                            {socialLinks.map((s) => (
                                <li key={s.key}>
                                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-base text-white/60 hover:text-brand-cyan transition-colors flex items-center gap-2">
                                        <i className={`${s.icon} text-lg`}></i> {s.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-sm font-semibold uppercase tracking-widest text-white/30 mb-5">Venue</h4>
                        <ul className="flex flex-col gap-3">
                            <li className="text-base text-white/60">
                                <i className="ri-map-pin-2-fill text-brand-cyan mr-1"></i> Is-Siġġiewi, Malta
                            </li>
                            <li className="text-base text-white/60">
                                <i className="ri-calendar-event-fill text-brand-cyan mr-1"></i> 28-30 Oct 2026
                            </li>
                            <li>
                                <button onClick={handleCopyEmail} className="text-base text-white/60 hover:text-brand-cyan transition-colors">
                                    <i className="ri-mail-fill text-brand-cyan mr-1"></i> {navData.contactEmail}
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t border-white/10">
                    <span className="text-sm text-white/30 font-mono">{data.copyright}</span>
                    <div className="flex gap-5 items-center">
                        {socialLinks.map((s) => (
                            <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-brand-cyan transition-colors" title={s.label}>
                                <i className={`${s.icon} text-2xl`}></i>
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
};

'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { Toast } from '@/components/Toast';
import { siteConfig } from '@/config/site';

export default function AgendaPage() {
    const [toast, setToast] = useState({ visible: false, message: '' });
    const [isContactOpen, setIsContactOpen] = useState(false);

    const showToast = (message: string) => {
        setToast({ visible: true, message });
    };

    const closeToast = () => {
        setToast(prev => ({ ...prev, visible: false }));
    };

    const handleOpenContact = () => {
        setIsContactOpen(true);
    };

    return (
        <div className="min-h-screen relative w-full selection:bg-brand-cyan/30 selection:text-brand-cyan font-sans bg-[#020408]">
            <Navbar
                onShowToast={showToast}
                onOpenContact={handleOpenContact}
                data={siteConfig.navigation}
            />

            <main className="w-full mx-auto px-6 py-32 md:py-48 max-w-5xl text-white">

                {/* Header Section */}
                <div className="mb-20">
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 mt-12 bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
                        Agenda
                    </h1>
                    <div className="h-1 w-20 bg-brand-cyan mb-8 rounded-full"></div>

                    <h2 className="text-2xl md:text-3xl font-medium mb-6 text-white/90">
                        High-Stakes Programming Formats
                    </h2>
                    <p className="text-lg text-white/70 leading-relaxed mb-8">
                        Instead of passive keynotes, the summit utilizes adversarial and collaborative formats to extract truth:
                    </p>

                    <ul className="space-y-4 text-white/80 text-lg">
                        <li className="flex gap-4">
                            <i className="ri-arrow-right-s-line text-brand-cyan mt-1"></i>
                            <span><strong className="text-white">Oxford-Style Debates:</strong> Rigorous analysis of centralized vs. decentralized architectures, governance models, and safety protocols.</span>
                        </li>
                        <li className="flex gap-4">
                            <i className="ri-arrow-right-s-line text-brand-cyan mt-1"></i>
                            <span><strong className="text-white">Technical Rebuttals:</strong> Direct inquiries into the justification of &quot;black-box&quot; systems versus the scalability and safety of decentralized networks.</span>
                        </li>
                        <li className="flex gap-4">
                            <i className="ri-arrow-right-s-line text-brand-cyan mt-1"></i>
                            <span><strong className="text-white">Joint Alignment Sessions:</strong> Collaborative deep-dives into the &quot;Hard Problems&quot; of AI: safety, alignment, control, and verifiable accountability.</span>
                        </li>
                    </ul>

                    <div className="mt-10 p-6 rounded-2xl bg-white/5 border border-white/10 italic text-white/90 text-lg text-center md:text-left">
                        "The summit is the only venue where hot debates on AI's societal and legal future actually happen."
                    </div>
                </div>

                {/* Legacy vs Decentralised AI Stage */}
                <div className="mb-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div>
                        <div className="inline-flex items-center justify-center px-3 py-1 mb-6 text-xs font-semibold tracking-wide text-brand-cyan uppercase bg-brand-cyan/10 rounded-full border border-brand-cyan/20">
                            Main Stage
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold mb-4">Legacy vs Decentralised AI Stage</h3>
                        <p className="text-white/70 leading-relaxed mb-6">
                            One main stage designed for “opposed futures of AI” debates, not keynotes.
                        </p>

                        <div className="bg-gradient-to-br from-[#111] to-[#0a0a0a] p-6 rounded-2xl border border-white/5">
                            <h4 className="font-semibold text-white/90 mb-2">Match-ups between:</h4>
                            <p className="text-brand-cyan mb-6 pl-4 border-l-2 border-brand-cyan/30">
                                Frontier / centralized actors and Decentralised / Web3 actors
                            </p>

                            <h4 className="font-semibold text-white/90 mb-2">Formats:</h4>
                            <p className="text-white/60">
                                Oxford-style debates, live rebuttals, joint technical sessions on safety, control, and openness.
                            </p>
                        </div>
                    </div>
                    <div className="relative h-64 md:h-full min-h-[300px] w-full rounded-2xl overflow-hidden border border-white/10 group">
                        <div className="absolute inset-0 bg-gradient-to-t from-[#020408] via-transparent to-transparent z-10"></div>
                        <img src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop" alt="Debate Stage" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    </div>
                </div>

                {/* Societal, Ethical & Legal Arena */}
                <div className="mb-20">
                    <div className="inline-flex items-center justify-center px-3 py-1 mb-6 text-xs font-semibold tracking-wide text-pink-500 uppercase bg-pink-500/10 rounded-full border border-pink-500/20">
                        Arena
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold mb-6">Societal, Ethical & Legal Arena</h3>
                    <p className="text-white/70 leading-relaxed mb-10 max-w-3xl">
                        High-level sessions focusing on the regulatory, ethical, and societal implications of rapidly advancing AI technologies.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { title: 'EU', icon: 'ri-global-line', desc: 'European AI Office, members of the AI Board, and EU AI Act' },
                            { title: 'UK', icon: 'ri-government-line', desc: 'MPs and advisors involved in AI safety and upcoming AI legislation and the AI Safety Institute.' },
                            { title: 'US', icon: 'ri-bank-line', desc: 'Voices linked to the US AI Safety Institute and emerging national AI security and risk frameworks.' },
                            { title: 'Parallel Track', icon: 'ri-mind-map', desc: 'Engage with leading thinkers and authors in parallel breakout sessions.' }
                        ].map((item, idx) => (
                            <div key={idx} className="bg-white/5 p-6 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                                    <i className={`${item.icon} text-2xl text-white/90`}></i>
                                </div>
                                <h4 className="text-xl font-bold mb-3">{item.title}</h4>
                                <p className="text-white/60 text-sm leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* A Safe Space for “Hard Conversations” */}
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#111] via-[#050505] to-[#0a0f1a] p-8 md:p-12 mt-20">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-cyan/50 to-transparent"></div>

                    <div className="relative z-10 flex flex-col md:flex-row gap-10 items-center">
                        <div className="w-full md:w-1/3 flex justify-center">
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-brand-cyan/10 border border-brand-cyan/30 flex items-center justify-center animate-pulse">
                                <i className="ri-shield-keyhole-line text-4xl md:text-5xl text-brand-cyan"></i>
                            </div>
                        </div>
                        <div className="w-full md:w-2/3">
                            <h3 className="text-2xl md:text-3xl font-bold mb-4">A Safe Space for “Hard Conversations”</h3>
                            <p className="text-white/80 leading-relaxed italic mb-6">
                                The explicit promise: this is the place where controversial conversations about AI that don’t fit in corporate conferences actually happen.
                            </p>

                            <ul className="space-y-4">
                                <li className="flex items-start gap-4">
                                    <div className="mt-1 w-6 h-6 rounded-full bg-brand-cyan/20 flex items-center justify-center shrink-0">
                                        <i className="ri-check-line text-xs text-brand-cyan"></i>
                                    </div>
                                    <span className="text-white/90">Chatham House–style rules for select sessions, live public debates for others.</span>
                                </li>
                                <li className="flex items-start gap-4">
                                    <div className="mt-1 w-6 h-6 rounded-full bg-brand-cyan/20 flex items-center justify-center shrink-0">
                                        <i className="ri-check-line text-xs text-brand-cyan"></i>
                                    </div>
                                    <span className="text-white/90">Government representatives can test positions against industry, civil society, and DeAI communities in one room.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

            </main>

            <Footer
                onShowToast={showToast}
                onOpenContact={handleOpenContact}
                navData={siteConfig.navigation}
                data={siteConfig.footer}
            />

            <ContactModal
                isOpen={isContactOpen}
                onClose={() => setIsContactOpen(false)}
            />

            <Toast
                message={toast.message}
                isVisible={toast.visible}
                onClose={closeToast}
            />
        </div>
    );
}

'use client';

import React, { useState, Suspense } from 'react';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { Marquee } from '@/components/Marquee';
import { Stats } from '@/components/Stats';
import { AboutVideo } from '@/components/AboutVideo';
import { SceneHighlights } from '@/components/SceneHighlights';
import { LeadingVoices } from '@/components/LeadingVoices';
import { Networking } from '@/components/Networking';
import { PastSponsors } from '@/components/PastSponsors';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SpeakerApplicationModal } from '@/components/SpeakerApplicationModal';
import { WaitlistModal } from '@/components/WaitlistModal';
import { Toast } from '@/components/Toast';

// Import Site Config (for sections not yet driven by API)
import { siteConfig } from '@/config/site';

export interface LeadingSpeakerData {
    name: string;
    slug: string;
    role: string;
    company: string;
    image: string;
    icon: string;
}

export interface MarqueeItemData {
    label: string;
    slug: string;
    logo?: string;
    iconType?: string;
}

export interface PartnerItemData {
    name: string;
    slug: string;
    logo: string;
    isSponsor: boolean;
}

export interface SocialLinkData {
    key: string;
    label: string;
    url: string;
    icon?: string;
    color?: string;
}

interface LandingPageProps {
    speakers: LeadingSpeakerData[];
    marqueeItems: MarqueeItemData[];
    partnerItems: PartnerItemData[];
    socials?: SocialLinkData[];
}

export const LandingPage: React.FC<LandingPageProps> = ({ speakers, marqueeItems, partnerItems, socials }) => {
    const [toast, setToast] = useState({ visible: false, message: '' });
    const [isContactOpen, setIsContactOpen] = useState(false);
    const [isSpeakerModalOpen, setIsSpeakerModalOpen] = useState(false);
    const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);

    const showToast = (message: string) => {
        setToast({ visible: true, message });
    };

    const closeToast = () => {
        setToast(prev => ({ ...prev, visible: false }));
    };

    const handleOpenContact = () => {
        setIsContactOpen(true);
    };

    const handleOpenSpeakerApp = () => {
        setIsSpeakerModalOpen(true);
    };

    return (
        <div className="min-h-screen relative w-full selection:bg-brand-cyan/30 selection:text-brand-cyan font-sans">
            <Navbar
                onShowToast={showToast}
                onOpenContact={handleOpenContact}
                data={siteConfig.navigation}
            />

            <main className="w-full mx-auto">
                <Suspense>
                    <Hero data={siteConfig.hero} onOpenContact={handleOpenContact} onOpenSpeakerApp={handleOpenSpeakerApp} onOpenWaitlist={() => setIsWaitlistOpen(true)} />
                </Suspense>

                {/* Sponsor logo scroller */}
                <Suspense>
                    <Marquee data={marqueeItems} />
                </Suspense>

                {/* Light Stats Section */}
                <Stats data={siteConfig.stats} />


                {/* Dark Video Section */}
                <AboutVideo data={siteConfig.about} />

                {/* Full Screen Image Highlights */}
                {/* Pass the whole config object since the component expects HighlightsConfig */}
                <SceneHighlights data={siteConfig.highlights} />

                {/* Light Grid Speakers Section (Leading Voices) */}
                <LeadingVoices data={speakers} />

                {/* Speaker Call to Action - Temporary placement until user decides */}
                <div className="w-full bg-[#F0F0EF] pb-20 flex justify-center">
                    <button
                        onClick={handleOpenSpeakerApp}
                        className="px-8 py-3 rounded-full border border-[#050A1F] bg-white text-[#050A1F] hover:bg-[#050A1F] hover:text-white transition-all duration-300 text-sm font-bold shadow-md hover:shadow-xl flex items-center gap-2"
                    >
                        <i className="ri-mic-line"></i>
                        Apply to Speak
                    </button>
                </div>

                {/* Dark Networking Section */}
                <Networking data={siteConfig.networking} />

                {/* Sponsors Logo Grid */}
                <PastSponsors data={partnerItems} onOpenContact={handleOpenContact} />
            </main>

            <Footer
                onShowToast={showToast}
                onOpenContact={handleOpenContact}
                navData={siteConfig.navigation}
                data={siteConfig.footer}
                socials={socials}
            />

            <ContactModal
                isOpen={isContactOpen}
                onClose={() => setIsContactOpen(false)}
            />

            <SpeakerApplicationModal
                isOpen={isSpeakerModalOpen}
                onClose={() => setIsSpeakerModalOpen(false)}
            />

            <WaitlistModal
                isOpen={isWaitlistOpen}
                onClose={() => setIsWaitlistOpen(false)}
            />

            <Toast
                message={toast.message}
                isVisible={toast.visible}
                onClose={closeToast}
            />
        </div>
    );
};

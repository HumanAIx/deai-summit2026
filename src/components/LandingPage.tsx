'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
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
import type {
  NavigationConfig,
  HeroConfig,
  StatsConfig,
  AboutConfig,
  HighlightsConfig,
  NetworkingItem,
} from '@/config/types';
import type { NavigationAPIData } from '@/lib/api-types';

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
    logoHasDarkBg?: boolean;
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
    navigationData?: NavigationConfig;
    navigationAPIData?: NavigationAPIData;
    // CMS-driven section data with siteConfig fallbacks applied at the page level.
    heroData?: HeroConfig;
    statsData?: StatsConfig;
    aboutData?: AboutConfig;
    highlightsData?: HighlightsConfig;
    networkingData?: NetworkingItem[];
    speakerCtaData?: { title?: string; subtitle?: string; button?: { label: string; link: string } };
    sponsorsSectionData?: { title?: string; badge?: string; subtitle?: string };
}

export const LandingPage: React.FC<LandingPageProps> = ({
    speakers,
    marqueeItems,
    partnerItems,
    socials,
    navigationData,
    navigationAPIData,
    heroData,
    statsData,
    aboutData,
    highlightsData,
    networkingData,
    speakerCtaData,
    sponsorsSectionData,
}) => {
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
                data={navigationData || siteConfig.navigation}
            />

            <main className="w-full mx-auto">
                <Suspense>
                    <Hero data={heroData || siteConfig.hero} onOpenContact={handleOpenContact} onOpenSpeakerApp={handleOpenSpeakerApp} onOpenWaitlist={() => setIsWaitlistOpen(true)} />
                </Suspense>

                {/* Sponsor logo scroller */}
                <Suspense>
                    <Marquee data={marqueeItems} />
                </Suspense>

                {/* Light Stats Section */}
                <Stats data={statsData || siteConfig.stats} />


                {/* Dark Video Section */}
                <AboutVideo data={aboutData || siteConfig.about} />

                {/* Full Screen Image Highlights */}
                {/* Pass the whole config object since the component expects HighlightsConfig */}
                <SceneHighlights data={highlightsData || siteConfig.highlights} />

                {/* Light Grid Speakers Section (Leading Voices) */}
                <LeadingVoices data={speakers} />

                {/* Speaker Call to Action */}
                <div className="w-full bg-[#F0F0EF] pb-20 flex justify-center">
                    <Link
                        href={speakerCtaData?.button?.link || '/contact?inquiry=Speaker+Application'}
                        className="px-8 py-3 rounded-full border border-[#050A1F] bg-white text-[#050A1F] hover:bg-[#050A1F] hover:text-white transition-all duration-300 text-sm font-bold shadow-md hover:shadow-xl flex items-center gap-2"
                    >
                        <i className="ri-mic-line"></i>
                        {speakerCtaData?.button?.label || 'Apply to Speak'}
                    </Link>
                </div>

                {/* Dark Networking Section */}
                <Networking data={networkingData || siteConfig.networking} />

                {/* Sponsors Logo Grid */}
                <PastSponsors data={partnerItems} onOpenContact={handleOpenContact} sectionData={sponsorsSectionData} />
            </main>

            <Footer
                onShowToast={showToast}
                onOpenContact={handleOpenContact}
                navData={navigationData || siteConfig.navigation}
                navigationAPIData={navigationAPIData}
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

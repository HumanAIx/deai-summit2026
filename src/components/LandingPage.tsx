'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { Marquee } from '@/components/Marquee';
import { Stats } from '@/components/Stats';
import { AboutVideo } from '@/components/AboutVideo';
import { LeadingVoices } from '@/components/LeadingVoices';
import { Networking } from '@/components/Networking';
import { PastSponsors } from '@/components/PastSponsors';
import { CmsPageRenderer } from '@/components/cms/CmsPageRenderer';
import { Footer } from '@/components/Footer';
import { HomeTicketPasses } from '@/components/HomeTicketPasses';
import { ContactModal } from '@/components/ContactModal';
import { SpeakerApplicationModal } from '@/components/SpeakerApplicationModal';
import { WaitlistModal } from '@/components/WaitlistModal';
import { Toast } from '@/components/Toast';

// Import Site Config (for sections not yet driven by API)
import { siteConfig } from '@/config/site';
import type { HomeRenderNode } from '@/lib/home-cms';
import type { HomeTicketPass } from '@/lib/home-ticket-passes';
import type {
  NavigationConfig,
  HeroConfig,
  StatsConfig,
  AboutConfig,
  NetworkingItem,
} from '@/config/types';
import type { NavigationAPIData } from '@/lib/api-types';

export interface LeadingSpeakerData {
    name: string;
    title?: string;
    slug: string;
    role: string;
    company: string;
    image: string;
    icon: string;
    /** Optional raw photo source so the renderer can apply
     * `photo_settings` background / filter / animation. Set when the data
     * came from the API; absent for static `siteConfig` / CMS entries. */
    photoSource?: import('@/lib/personPhoto').PersonPhotoSource;
}

export interface MarqueeItemData {
    label: string;
    slug: string;
    logo?: string;
    logoHasDarkBg?: boolean;
    iconType?: string;
}

export interface PartnerItemData {
    name: string;
    slug: string;
    logo: string;
    isSponsor: boolean;
    isPartner: boolean;
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
    networkingData?: NetworkingItem[];
    networkingHeading?: { title?: string; badge?: string };
    speakerCtaData?: { title?: string; subtitle?: string; button?: { label: string; link: string } };
    sponsorsSectionData?: { title?: string; badge?: string; subtitle?: string };
    redditSpeakerLeadPixelId?: string;
    /** Designed sections plus any CMS blocks that don't map onto one. */
    renderPlan?: HomeRenderNode[];
    ticketPasses?: HomeTicketPass[];
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
    networkingData,
    networkingHeading,
    speakerCtaData,
    sponsorsSectionData,
    redditSpeakerLeadPixelId,
    renderPlan,
    ticketPasses,
}) => {
    const [toast, setToast] = useState({ visible: false, message: '' });
    const [isContactOpen, setIsContactOpen] = useState(false);
    const [isSpeakerModalOpen, setIsSpeakerModalOpen] = useState(false);
    const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
    const [heroScale, setHeroScale] = useState(1);
    const [navSlot, setNavSlot] = useState(48);
    const [navBottom, setNavBottom] = useState(0);

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
            <div className="lg:hidden">
                <Navbar
                    onShowToast={showToast}
                    onOpenContact={handleOpenContact}
                    data={navigationData || siteConfig.navigation}
                    socials={socials}
                />
            </div>
            <Navbar
                layout="hero"
                heroScale={heroScale}
                onNavHeight={setNavSlot}
                onNavBottom={setNavBottom}
                onShowToast={showToast}
                onOpenContact={handleOpenContact}
                data={navigationData || siteConfig.navigation}
                socials={socials}
            />

            <main className="w-full mx-auto">
                {(renderPlan ?? [
                    { type: 'builtin' as const, slot: 'hero' as const },
                    { type: 'builtin' as const, slot: 'marquee' as const },
                    { type: 'builtin' as const, slot: 'stats' as const },
                    { type: 'builtin' as const, slot: 'about' as const },
                    { type: 'builtin' as const, slot: 'speakers' as const },
                    { type: 'builtin' as const, slot: 'speakerCta' as const },
                    { type: 'builtin' as const, slot: 'networking' as const },
                    { type: 'builtin' as const, slot: 'sponsors' as const },
                ]).map((node, index, plan) => {
                    if (node.type === 'block') {
                        return (
                            <CmsPageRenderer
                                key={node.block.id || `cms-block-${index}`}
                                blocks={[node.block]}
                                embedded
                            />
                        );
                    }

                    const next = plan[index + 1];
                    const marqueeFollowsHero = next?.type === 'builtin' && next.slot === 'marquee';
                    const previous = plan[index - 1];
                    if (
                        node.slot === 'marquee' &&
                        previous?.type === 'builtin' &&
                        previous.slot === 'hero'
                    ) {
                        return null;
                    }

                    switch (node.slot) {
                        case 'hero': {
                            const hero = (
                                <Suspense key="hero">
                                    <Hero data={heroData || siteConfig.hero} onOpenContact={handleOpenContact} onOpenSpeakerApp={handleOpenSpeakerApp} onOpenWaitlist={() => setIsWaitlistOpen(true)} onScale={setHeroScale} navSlot={navSlot} navBottom={navBottom} contained={marqueeFollowsHero} />
                                </Suspense>
                            );
                            if (!marqueeFollowsHero) return hero;
                            return (
                                <div key="hero-fold" className="flex flex-col lg:h-[100dvh]">
                                    <div className="lg:min-h-0 lg:flex-1">{hero}</div>
                                    <div className="lg:shrink-0">
                                        <Suspense key="marquee">
                                            <Marquee data={marqueeItems} />
                                        </Suspense>
                                    </div>
                                </div>
                            );
                        }
                        case 'marquee':
                            return (
                                <Suspense key="marquee">
                                    <Marquee data={marqueeItems} />
                                </Suspense>
                            );
                        case 'stats':
                            return <Stats key="stats" data={statsData || siteConfig.stats} />;
                        case 'about':
                            return <AboutVideo key="about" data={aboutData || siteConfig.about} />;
                        case 'speakers':
                            return <LeadingVoices key="speakers" data={speakers} />;
                        case 'speakerCta':
                            return (
                                <div key="speaker-cta" className="w-full bg-[#F0F0EF] pb-20 flex justify-center">
                                    <Link
                                        href={speakerCtaData?.button?.link || '/contact?inquiry=Speaker+Application'}
                                        className="px-8 py-3 rounded-full border border-[#050A1F] bg-white text-[#050A1F] hover:bg-[#050A1F] hover:text-white transition-all duration-300 text-sm font-bold shadow-md hover:shadow-xl flex items-center gap-2"
                                    >
                                        <i className="ri-mic-line"></i>
                                        {speakerCtaData?.button?.label || 'Apply to Speak'}
                                    </Link>
                                </div>
                            );
                        case 'networking':
                            return (
                                <Networking
                                    key="networking"
                                    data={networkingData || siteConfig.networking}
                                    heading={networkingHeading}
                                />
                            );
                        case 'sponsors':
                            return (
                                <PastSponsors
                                    key="sponsors"
                                    data={partnerItems}
                                    onOpenContact={handleOpenContact}
                                    sectionData={sponsorsSectionData}
                                />
                            );
                        default:
                            return null;
                    }
                })}
            </main>

            <HomeTicketPasses passes={ticketPasses ?? []} />

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
                redditSpeakerLeadPixelId={redditSpeakerLeadPixelId}
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

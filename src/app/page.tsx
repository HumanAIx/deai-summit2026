'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { Marquee } from '@/components/Marquee';
import { Speakers } from '@/components/Speakers';
import { Stats } from '@/components/Stats';
import { AboutVideo } from '@/components/AboutVideo';
import { SceneHighlights } from '@/components/SceneHighlights';
import { LeadingVoices } from '@/components/LeadingVoices';
import { Networking } from '@/components/Networking';
import { PastSponsors } from '@/components/PastSponsors';
import { Footer } from '@/components/Footer';
import { Toast } from '@/components/Toast';

// Import JSON Data Structure
import heroData from '@/data/hero.json';
import navigationData from '@/data/navigation.json';
import speakersConfig from '@/data/speakers.json';
import statsData from '@/data/stats.json';
import marqueeData from '@/data/marquee.json';
import aboutData from '@/data/about.json';
import highlightsData from '@/data/highlights.json';
import networkingData from '@/data/networking.json';
import partnersData from '@/data/partners.json';
import footerData from '@/data/footer.json';

import {
  HeroConfig,
  NavigationConfig,
  SpeakersConfig,
  StatItem,
  MarqueeItem,
  AboutConfig,
  HighlightsConfig,
  NetworkingItem,
  PartnerItem,
  FooterConfig
} from '@/config/types';

export default function Home() {
  const [toast, setToast] = useState({ visible: false, message: '' });

  const showToast = (message: string) => {
    setToast({ visible: true, message });
  };

  const closeToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  return (
    <div className="min-h-screen relative w-full selection:bg-brand-cyan/30 selection:text-brand-cyan font-sans">
      <Navbar
        onShowToast={showToast}
        data={navigationData as NavigationConfig}
      />

      <main className="w-full mx-auto">
        <Hero data={heroData as HeroConfig} />

        {/* Dark transition section for Marquee */}
        <div className="bg-[#020408] border-t border-white/5 pb-12 pt-12">
          <Marquee data={marqueeData as MarqueeItem[]} />
        </div>

        {/* Light Stats Section */}
        <Stats data={statsData.items as StatItem[]} />

        {/* Light Speakers Section (Featured Cloud) */}
        {/* Note: Speakers component takes both speakers list and partners list for the 'Trusted By' section */}
        <Speakers
          speakersData={(speakersConfig as SpeakersConfig).featured}
          partnersData={partnersData as PartnerItem[]}
        />

        {/* Dark Video Section */}
        <AboutVideo data={aboutData as AboutConfig} />

        {/* Full Screen Image Highlights */}
        <SceneHighlights data={highlightsData as HighlightsConfig} />

        {/* Light Grid Speakers Section (Leading Voices) */}
        <LeadingVoices data={(speakersConfig as SpeakersConfig).leading} />

        {/* Dark Networking Section */}
        <Networking data={networkingData as NetworkingItem[]} />

        {/* Sponsors Logo Grid */}
        <PastSponsors data={partnersData as PartnerItem[]} />
      </main>

      <Footer
        onShowToast={showToast}
        navData={navigationData as NavigationConfig}
        data={footerData as FooterConfig}
      />

      <Toast
        message={toast.message}
        isVisible={toast.visible}
        onClose={closeToast}
      />
    </div>
  );
}

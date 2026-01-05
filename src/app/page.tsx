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
import { ContactModal } from '@/components/ContactModal';
import { Toast } from '@/components/Toast';

// Import Site Config
import { siteConfig } from '@/config/site';

export default function Home() {
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
    <div className="min-h-screen relative w-full selection:bg-brand-cyan/30 selection:text-brand-cyan font-sans">
      <Navbar
        onShowToast={showToast}
        onOpenContact={handleOpenContact}
        data={siteConfig.navigation}
      />

      <main className="w-full mx-auto">
        <Hero data={siteConfig.hero} onOpenContact={handleOpenContact} />

        {/* Dark transition section for Marquee */}
        <div className="bg-[#020408] border-t border-white/5 pb-12 pt-12">
          <Marquee data={siteConfig.marquee} />
        </div>

        {/* Light Stats Section */}
        <Stats data={siteConfig.stats} />

        {/* Light Speakers Section (Featured Cloud) */}
        {/* Note: Speakers component takes both speakers list and partners list for the 'Trusted By' section */}
        <Speakers
          speakersData={siteConfig.speakers.featured}
          partnersData={siteConfig.partners}
        />

        {/* Dark Video Section */}
        <AboutVideo data={siteConfig.about} />

        {/* Full Screen Image Highlights */}
        {/* Pass the whole config object since the component expects HighlightsConfig */}
        <SceneHighlights data={siteConfig.highlights} />

        {/* Light Grid Speakers Section (Leading Voices) */}
        <LeadingVoices data={siteConfig.speakers.leading} />

        {/* Dark Networking Section */}
        <Networking data={siteConfig.networking} />

        {/* Sponsors Logo Grid */}
        <PastSponsors data={siteConfig.partners} />
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

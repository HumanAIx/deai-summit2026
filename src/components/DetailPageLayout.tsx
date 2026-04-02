'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { siteConfig } from '@/config/site';
import type { NavigationConfig } from '@/config/types';
import type { NavigationAPIData } from '@/lib/api-types';

interface SocialLinkData {
  key: string;
  label: string;
  url: string;
  icon?: string;
  color?: string;
}

interface DetailPageLayoutProps {
  children: React.ReactNode;
  navigationData?: NavigationConfig;
  navigationAPIData?: NavigationAPIData;
  socials?: SocialLinkData[];
}

export const DetailPageLayout: React.FC<DetailPageLayoutProps> = ({ children, navigationData, navigationAPIData, socials }) => {
  const [isContactOpen, setIsContactOpen] = useState(false);
  const handleShowToast = () => {};
  const navData = navigationData || siteConfig.navigation;

  return (
    <div className="min-h-screen relative w-full selection:bg-brand-cyan/30 selection:text-brand-cyan font-sans">
      <Navbar
        onShowToast={handleShowToast}
        onOpenContact={() => setIsContactOpen(true)}
        data={navData}
      />
      <main className="w-full mx-auto pt-[140px]">
        {children}
      </main>
      <Footer
        onShowToast={handleShowToast}
        onOpenContact={() => setIsContactOpen(true)}
        navData={navData}
        navigationAPIData={navigationAPIData}
        socials={socials}
      />
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />
    </div>
  );
};

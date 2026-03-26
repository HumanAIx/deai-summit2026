'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { siteConfig } from '@/config/site';

interface DetailPageLayoutProps {
  children: React.ReactNode;
}

export const DetailPageLayout: React.FC<DetailPageLayoutProps> = ({ children }) => {
  const handleShowToast = () => {};

  return (
    <div className="min-h-screen relative w-full selection:bg-brand-cyan/30 selection:text-brand-cyan font-sans">
      <Navbar
        onShowToast={handleShowToast}
        data={siteConfig.navigation}
      />
      <main className="w-full mx-auto pt-[140px]">
        {children}
      </main>
      <Footer
        onShowToast={handleShowToast}
        navData={siteConfig.navigation}
        data={siteConfig.footer}
      />
    </div>
  );
};

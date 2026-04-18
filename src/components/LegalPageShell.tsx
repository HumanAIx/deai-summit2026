'use client';

import { useState, ReactNode } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { Toast } from '@/components/Toast';
import type { NavigationConfig } from '@/config/types';
import type { NavigationAPIData } from '@/lib/api-types';
import type { SocialLink } from '@/lib/prefetch';

interface Props {
  title: string;
  children: ReactNode;
  navigationData: NavigationConfig;
  navigationAPIData?: NavigationAPIData;
  socials?: SocialLink[];
}

/**
 * Shared client shell for legal / content pages (Terms, Privacy, etc.).
 * Owns the Navbar + Footer + Contact modal + Toast so the page itself can
 * stay a server component and CMS-fetch its content at request time.
 */
export function LegalPageShell({ title, children, navigationData, navigationAPIData, socials }: Props) {
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [isContactOpen, setIsContactOpen] = useState(false);

  const showToast = (message: string) => setToast({ visible: true, message });
  const closeToast = () => setToast((prev) => ({ ...prev, visible: false }));
  const handleOpenContact = () => setIsContactOpen(true);

  return (
    <main className="min-h-screen bg-white">
      <Navbar data={navigationData} onOpenContact={handleOpenContact} onShowToast={showToast} />
      <div className="pt-40 pb-32 px-6 md:px-16 max-w-4xl mx-auto text-slate-900">
        <h1 className="text-4xl md:text-5xl font-bold mb-10 leading-tight">{title}</h1>
        <div className="legal-prose max-w-none">
          {children}
        </div>
      </div>
      <Footer
        navData={navigationData}
        navigationAPIData={navigationAPIData}
        socials={socials}
        onShowToast={showToast}
        onOpenContact={handleOpenContact}
      />
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
      <Toast message={toast.message} isVisible={toast.visible} onClose={closeToast} />
    </main>
  );
}

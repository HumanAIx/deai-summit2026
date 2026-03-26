'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NavigationConfig } from '@/config/types';

interface NavbarProps {
  onShowToast: (message: string) => void;
  onOpenContact?: () => void;
  data: NavigationConfig;
}

export const Navbar: React.FC<NavbarProps> = ({ onShowToast, onOpenContact, data }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  const handleContactClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onOpenContact) {
      onOpenContact();
      setIsMenuOpen(false);
    } else {
      navigator.clipboard.writeText(data.contactEmail);
      onShowToast("Email copied to clipboard");
      setIsMenuOpen(false);
    }
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setIsMenuOpen(false);

    // Page route — navigate via router
    if (href.startsWith('/')) {
      router.push(href);
      return;
    }

    // Anchor link — smooth scroll
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <>
      <nav className="fixed left-1/2 -translate-x-1/2 top-6 md:top-10 z-50 flex items-center justify-between w-[95%] max-w-4xl rounded-full px-5 py-3 border border-white/20 bg-[#020408]/80 backdrop-blur-xl transition-all duration-300" style={{ boxShadow: '0 0 30px 8px rgba(255,255,255,0.12), 0 0 60px 20px rgba(255,255,255,0.06)' }}>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 pl-2 group">
          <div className="w-10 h-10 relative flex items-center justify-center">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <path d="M10 30 C30 15, 60 45, 90 30" stroke="#3B82F6" strokeWidth="12" strokeLinecap="round" />
              <path d="M10 50 C30 35, 60 65, 90 50" stroke="#22D3EE" strokeWidth="12" strokeLinecap="round" />
              <path d="M20 70 C40 55, 70 85, 90 70" stroke="#2DD4BF" strokeWidth="12" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex flex-col leading-none justify-center">
            <span className="font-bold tracking-tight text-white text-xl leading-tight">DeAI</span>
            <span className="text-[0.5rem] uppercase tracking-[0.2em] text-white/80 leading-none">Summit</span>
          </div>
        </Link>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-10">
          <div className="flex items-center gap-8">
            {data.main.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className="text-base font-medium text-white/50 hover:text-white transition-colors"
              >
                {item.label}
              </a>
            ))}

            <button
              onClick={handleContactClick}
              className="text-base font-medium text-white/50 hover:text-white transition-colors"
            >
              Contact Us
            </button>
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-5 border-l border-white/10 pl-7 ml-2">
            <a
              href={data.socials.linkedin}
              target="_blank"
              rel="noreferrer"
              className="text-white/60 hover:text-white transition-colors"
              aria-label="Follow us on LinkedIn"
            >
              <i className="ri-linkedin-fill text-xl"></i>
            </a>
          </div>
        </div>

        {/* Action */}
        <div className="flex items-center gap-3">
          <a
            href={data.actionButton.link}
            title={data.actionButton.title}  // ← hover tooltip
            className="hidden md:flex text-sm font-semibold text-[#020408] bg-white hover:bg-brand-cyan/10 hover:text-white transition-all rounded-full px-8 py-3"
          >
            {data.actionButton.label}
          </a>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 text-white/70 hover:text-white transition-colors"
          >
            <i className={isMenuOpen ? "ri-close-line text-2xl" : "ri-menu-line text-2xl"}></i>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-[#020408]/95 backdrop-blur-xl pt-24 px-6 lg:hidden flex flex-col items-center gap-8 animate-in fade-in slide-in-from-top-5 duration-200">
          <div className="flex flex-col items-center gap-6 w-full max-w-sm">
            {data.main.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className="text-2xl font-medium text-white/80 hover:text-white transition-colors w-full text-center py-2"
              >
                {item.label}
              </a>
            ))}

            <button
              onClick={handleContactClick}
              className="text-2xl font-medium text-white/80 hover:text-white transition-colors w-full text-center py-2"
            >
              Contact Us
            </button>

            <div className="flex items-center justify-center gap-6">
              <a
                href={data.socials.linkedin}
                target="_blank"
                rel="noreferrer"
                className="text-white/60 hover:text-white transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                <i className="ri-linkedin-fill text-2xl"></i>
              </a>
            </div>

            <a
              href={data.actionButton.link}
              title={data.actionButton.title}  // ← hover tooltip
              onClick={() => setIsMenuOpen(false)}
              className="mt-4 flex w-full justify-center text-sm font-semibold text-[#020408] bg-white hover:bg-white/90 transition-all rounded-full px-8 py-3"
            >
              Get {data.actionButton.label}
            </a>
          </div>
        </div>
      )}
    </>
  );
};

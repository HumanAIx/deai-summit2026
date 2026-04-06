'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DetailPageLayout } from '@/components/DetailPageLayout';
import { AnimatedGrid } from '@/components/AnimatedGrid';
import { markdownToHtml, youtubeToEmbed } from '@/lib/utils';
import type { Company, CompanySocials, NavigationAPIData } from '@/lib/api-types';
import type { NavigationConfig } from '@/config/types';

interface SocialLinkData {
  key: string;
  label: string;
  url: string;
  icon?: string;
  color?: string;
}

interface CompanyDetailClientProps {
  company: Company;
  backLabel: string;
  backHref: string;
  navigationData?: NavigationConfig;
  navigationAPIData?: NavigationAPIData;
  socials?: SocialLinkData[];
}

function getSocialIcon(key: string): string {
  const icons: Record<string, string> = {
    linkedin: 'ri-linkedin-box-fill',
    x: 'ri-twitter-x-fill',
    twitter: 'ri-twitter-x-fill',
    github: 'ri-github-fill',
    youtube: 'ri-youtube-fill',
    telegram: 'ri-telegram-fill',
    discord: 'ri-discord-fill',
    facebook: 'ri-facebook-circle-fill',
    instagram: 'ri-instagram-fill',
    meetup: 'ri-community-fill',
  };
  return icons[key] || 'ri-link';
}

function SocialLinks({ socials, website }: { socials?: CompanySocials; website?: string }) {
  const links: { url: string; icon: string; label: string }[] = [];

  if (website) {
    links.push({ url: website, icon: 'ri-globe-line', label: 'Website' });
  }

  if (socials) {
    for (const [key, url] of Object.entries(socials)) {
      if (url && typeof url === 'string' && url.startsWith('http')) {
        links.push({ url, icon: getSocialIcon(key), label: key });
      }
    }
  }

  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3 mt-8">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-11 h-11 rounded-full bg-white/10 hover:bg-brand-cyan/20 border border-white/15 hover:border-brand-cyan/40 flex items-center justify-center transition-all duration-300 group"
          title={link.label}
        >
          <i className={`${link.icon} text-xl text-white/70 group-hover:text-brand-cyan transition-colors`}></i>
        </a>
      ))}
    </div>
  );
}

function renderBio(bio: string): string {
  if (bio.includes('<p>') || bio.includes('<div>') || bio.includes('<br')) {
    return bio;
  }
  return markdownToHtml(bio);
}

export const CompanyDetailClient: React.FC<CompanyDetailClientProps> = ({ company, backLabel, backHref, navigationData, navigationAPIData, socials }) => {
  const router = useRouter();
  const handleBack = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // If there is a same-origin referrer (user navigated here from within the site), go back.
    if (typeof window !== 'undefined' && document.referrer) {
      try {
        const ref = new URL(document.referrer);
        if (ref.origin === window.location.origin) {
          e.preventDefault();
          router.back();
          return;
        }
      } catch {}
    }
    // Otherwise fall through to the Link's default navigation (backHref).
  };
  const embedUrl = company.company_embedded_youtube
    ? youtubeToEmbed(company.company_embedded_youtube)
    : null;

  return (
    <DetailPageLayout navigationData={navigationData} navigationAPIData={navigationAPIData} socials={socials}>
      {/* Hero section */}
      <section className="relative bg-[#050A1F] text-white">
        {/* Grid Overlay */}
        <div className="absolute inset-0 pointer-events-none animated-grid">
          <AnimatedGrid />
        </div>
        <div className="relative z-10 max-w-[1440px] mx-auto px-6 py-20 md:py-28">
          <div className="flex flex-col md:flex-row gap-12 md:gap-16 items-center mx-auto w-fit">
            {/* Logo */}
            {company.company_logo && (
              <div className="flex-shrink-0">
                <div className={`relative w-48 h-48 md:w-64 md:h-64 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl shadow-brand-cyan/10 flex items-center justify-center ${company.logo_background_white ? 'bg-white' : 'bg-white/5'} p-6`}>
                  <Image
                    src={company.company_logo}
                    alt={company.company_name}
                    fill
                    className="object-contain p-4"
                    priority
                  />
                </div>
              </div>
            )}

            {/* Info */}
            <div className="text-center md:text-left">
              <Link href={backHref} onClick={handleBack} className="text-brand-cyan text-sm font-mono uppercase tracking-widest hover:underline mb-6 inline-flex items-center gap-1">
                <i className="ri-arrow-left-line"></i> {backLabel}
              </Link>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-[1.1] mb-5">
                {company.company_name}
              </h1>
              {(company.company_city || company.company_country) && (
                <p className="text-lg text-white/60 mb-2 flex items-center gap-2 justify-center md:justify-start">
                  <i className="ri-map-pin-line"></i>
                  {[company.company_city, company.company_country].filter(Boolean).join(', ')}
                </p>
              )}
              {company.company_email && (
                <p className="text-white/60 mb-2 flex items-center gap-2 justify-center md:justify-start">
                  <i className="ri-mail-line"></i>
                  <a href={`mailto:${company.company_email}`} className="text-brand-cyan hover:underline">
                    {company.company_email}
                  </a>
                </p>
              )}

              <SocialLinks socials={company.company_socials} website={company.company_website} />
            </div>
          </div>
        </div>
      </section>

      {/* Bio section */}
      {company.company_bio && (
        <section className="bg-[#F0F0EF]">
          <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-1 h-8 bg-brand-cyan rounded-full" />
              <h2 className="text-2xl md:text-3xl font-display font-bold text-[#050A1F]">About</h2>
            </div>
            <div
              className="bio-content max-w-none"
              dangerouslySetInnerHTML={{ __html: renderBio(company.company_bio) }}
            />
          </div>
        </section>
      )}

      {/* Video embed */}
      {embedUrl && (
        <section className="bg-white border-t border-gray-200">
          <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-1 h-8 bg-red-500 rounded-full" />
              <h2 className="text-2xl md:text-3xl font-display font-bold text-[#050A1F]">Video</h2>
            </div>
            <div className="aspect-video rounded-2xl overflow-hidden shadow-xl shadow-black/10">
              <iframe
                src={embedUrl}
                title={company.company_name}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </section>
      )}
    </DetailPageLayout>
  );
};

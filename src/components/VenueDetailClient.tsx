'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
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

interface VenueDetailClientProps {
  company: Company;
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
  if (website) links.push({ url: website, icon: 'ri-globe-line', label: 'Website' });
  if (socials) {
    for (const [key, url] of Object.entries(socials)) {
      if (url && typeof url === 'string' && url.startsWith('http')) {
        links.push({ url, icon: getSocialIcon(key), label: key });
      }
    }
  }
  if (links.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-3 mt-6">
      {links.map((link) => (
        <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
          className="w-11 h-11 rounded-full bg-white/10 hover:bg-brand-cyan/20 border border-white/15 hover:border-brand-cyan/40 flex items-center justify-center transition-all duration-300 group"
          title={link.label}>
          <i className={`${link.icon} text-xl text-white/70 group-hover:text-brand-cyan transition-colors`}></i>
        </a>
      ))}
    </div>
  );
}

function renderBio(bio: string): string {
  if (bio.includes('<p>') || bio.includes('<div>') || bio.includes('<br')) return bio;
  return markdownToHtml(bio);
}

export const VenueDetailClient: React.FC<VenueDetailClientProps> = ({ company, navigationData, navigationAPIData, socials }) => {
  const embedUrl = company.company_embedded_youtube
    ? youtubeToEmbed(company.company_embedded_youtube)
    : null;

  return (
    <DetailPageLayout navigationData={navigationData} navigationAPIData={navigationAPIData} socials={socials}>
      {/* Hero with video or venue photo */}
      <section className="relative -mt-[140px] bg-[#050A1F] text-white overflow-hidden">
        {/* Grid Overlay */}
        <div className="absolute inset-0 pointer-events-none animated-grid z-10">
          <AnimatedGrid />
        </div>

        {/* Venue photo as background */}
        {company.venue_photo && (
          <div className="absolute inset-0 z-0">
            <Image
              src={company.venue_photo}
              alt={company.company_name}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#050A1F]/70 via-[#050A1F]/50 to-[#050A1F]" />
          </div>
        )}

        <div className="relative z-20 max-w-[1440px] mx-auto px-6 pt-[160px] pb-20 md:pt-[180px] md:pb-28">
          {/* Venue info centered */}
          <div className="flex flex-col items-center text-center mt-6">
            {/* Logo */}
            {company.company_logo && (
              <div className="mb-8">
                <div className={`relative w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden border-2 border-white/15 shadow-2xl ${company.logo_background_white ? 'bg-white' : 'bg-white/10 backdrop-blur-sm'} p-4`}>
                  <Image
                    src={company.company_logo}
                    alt={company.company_name}
                    fill
                    className="object-contain p-2"
                  />
                </div>
              </div>
            )}

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 backdrop-blur-sm mb-6">
              <i className="ri-building-line text-brand-cyan text-sm"></i>
              <span className="text-xs font-mono uppercase tracking-widest text-brand-cyan">Official Venue</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-7xl font-display font-bold tracking-tight leading-[1.1] mb-5">
              {company.company_name}
            </h1>

            {(company.company_city || company.company_country) && (
              <p className="text-xl text-white/70 mb-3 flex items-center gap-2 justify-center">
                <i className="ri-map-pin-line text-brand-cyan"></i>
                {[company.company_city, company.company_country === 'MT' ? 'Malta' : company.company_country].filter(Boolean).join(', ')}
              </p>
            )}

            {company.company_email && (
              <p className="text-white/60 mb-3 flex items-center gap-2 justify-center">
                <i className="ri-mail-line text-brand-cyan"></i>
                <a href={`mailto:${company.company_email}`} className="text-brand-cyan hover:underline">
                  {company.company_email}
                </a>
              </p>
            )}

            <div className="flex justify-center">
              <SocialLinks socials={company.company_socials} website={company.company_website} />
            </div>

            {/* Google Maps link */}
            {company.company_google_maps && (
              <a
                href={company.company_google_maps}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all duration-300 text-sm font-semibold text-white"
              >
                <i className="ri-map-2-line text-brand-cyan"></i>
                View on Google Maps
                <i className="ri-external-link-line text-white/50"></i>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Video section — prominent in its own full-width section */}
      {embedUrl && (
        <section className="bg-[#050A1F] pb-20 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl shadow-brand-cyan/10 border border-white/10">
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

      {/* Bio section */}
      {company.company_bio && (
        <section className="bg-[#F0F0EF]">
          <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-1 h-8 bg-brand-cyan rounded-full" />
              <h2 className="text-2xl md:text-3xl font-display font-bold text-[#050A1F]">About the Venue</h2>
            </div>
            <div
              className="bio-content max-w-none"
              dangerouslySetInnerHTML={{ __html: renderBio(company.company_bio) }}
            />
          </div>
        </section>
      )}

      {/* Venue photo gallery (if no background photo was used) */}
      {company.venue_photo && (
        <section className="bg-white border-t border-gray-200">
          <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-1 h-8 bg-brand-blue rounded-full" />
              <h2 className="text-2xl md:text-3xl font-display font-bold text-[#050A1F]">The Estate</h2>
            </div>
            <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden shadow-xl">
              <Image
                src={company.venue_photo}
                alt={`${company.company_name} venue`}
                fill
                className="object-cover"
              />
            </div>
          </div>
        </section>
      )}
    </DetailPageLayout>
  );
};

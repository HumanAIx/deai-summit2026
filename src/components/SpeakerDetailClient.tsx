'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DetailPageLayout } from '@/components/DetailPageLayout';
import { AnimatedGrid } from '@/components/AnimatedGrid';
import { markdownToHtml } from '@/lib/utils';
import type { Member, Company, PersonSocials, NavigationAPIData } from '@/lib/api-types';
import type { NavigationConfig } from '@/config/types';

interface SocialLinkData {
  key: string;
  label: string;
  url: string;
  icon?: string;
  color?: string;
}

interface SpeakerDetailClientProps {
  member: Member;
  companies: Company[];
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
    mastodon: 'ri-mastodon-fill',
    medium: 'ri-medium-fill',
  };
  return icons[key] || 'ri-link';
}

function SocialLinks({ socials, website }: { socials?: PersonSocials; website?: string }) {
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
  // If it looks like HTML (has tags), use as-is; otherwise convert markdown
  if (bio.includes('<p>') || bio.includes('<div>') || bio.includes('<br')) {
    return bio;
  }
  return markdownToHtml(bio);
}

export const SpeakerDetailClient: React.FC<SpeakerDetailClientProps> = ({ member, companies, navigationData, navigationAPIData, socials }) => {
  const router = useRouter();
  const handleBack = (e: React.MouseEvent<HTMLAnchorElement>) => {
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
  };
  const name = `${member.person_firstname} ${member.person_surname}`.trim();
  const bio = member.speaker_bio || member.person_bio;
  const photo = member.person_photo_nobg || member.person_photo;
  const firstCompany = member.person_companies?.[0];

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
            {/* Photo */}
            {photo && (
              <div className="flex-shrink-0">
                <div className="relative w-56 h-56 md:w-72 md:h-72 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl shadow-brand-cyan/10">
                  <Image
                    src={photo}
                    alt={name}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
            )}

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <Link href="/speakers" onClick={handleBack} className="text-brand-cyan text-sm font-mono uppercase tracking-widest hover:underline mb-6 inline-flex items-center gap-1">
                <i className="ri-arrow-left-line"></i> All Speakers
              </Link>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-[1.1] mb-5">
                {name}
              </h1>
              {firstCompany && (
                <div className="mb-4 space-y-1">
                  {firstCompany.person_job_title && (
                    <p className="text-lg text-white/70">
                      {firstCompany.person_job_title}
                    </p>
                  )}
                  {firstCompany.company_name && (
                    <p className="text-brand-cyan text-lg font-semibold">
                      {firstCompany.company_slug ? (
                        <Link href={`/companies/${firstCompany.company_slug}`} className="hover:underline">
                          {firstCompany.company_name}
                        </Link>
                      ) : (
                        firstCompany.company_name
                      )}
                    </p>
                  )}
                </div>
              )}

              <SocialLinks socials={member.person_socials} website={member.person_website} />
            </div>
          </div>
        </div>
      </section>

      {/* Bio section */}
      {bio && (
        <section className="bg-[#F0F0EF]">
          <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-1 h-8 bg-brand-cyan rounded-full" />
              <h2 className="text-2xl md:text-3xl font-display font-bold text-[#050A1F]">About</h2>
            </div>
            <div
              className="bio-content max-w-none"
              dangerouslySetInnerHTML={{ __html: renderBio(bio) }}
            />
          </div>
        </section>
      )}

      {/* Associated companies */}
      {companies.length > 0 && (
        <section className="bg-white border-t border-gray-200">
          <div className="max-w-4xl mx-auto px-6 py-16">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-1 h-8 bg-brand-blue rounded-full" />
              <h2 className="text-2xl md:text-3xl font-display font-bold text-[#050A1F]">Organizations</h2>
            </div>
            <div className="flex flex-wrap justify-center gap-6">
              {companies.map((company, index) => {
                const colors = ['#00B0C2', '#0E6FEB', '#050A1F', '#00B0C2', '#0E6FEB', '#050A1F', '#00B0C2', '#0E6FEB'];
                const bgColor = colors[index % colors.length];
                const href = company.company_is_sponsor ? `/partners/${company.company_slug}` : `/companies/${company.company_slug}`;

                return (
                  <Link
                    key={company.id}
                    href={href}
                    className="group block overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl no-underline bg-white border border-gray-200 hover:border-gray-300 w-full md:w-[calc(50%-12px)]"
                  >
                    {/* Logo section */}
                    <div className="relative h-[130px] flex items-center justify-center p-6 bg-white">
                      {company.company_logo ? (
                        <div className="relative w-full h-full max-w-[160px]">
                          <Image
                            src={company.company_logo}
                            alt={company.company_name}
                            fill
                            className="object-contain"
                          />
                        </div>
                      ) : (
                        <span className="text-gray-300 text-lg font-display font-bold">{company.company_name}</span>
                      )}
                    </div>

                    {/* Info section */}
                    <div className="p-5 h-[100px] flex flex-col justify-between" style={{ backgroundColor: bgColor }}>
                      <div>
                        <h3 className="text-white text-base font-display font-extrabold group-hover:underline transition-colors leading-tight">
                          {company.company_name}
                        </h3>
                        {company.company_city && (
                          <p className="text-white/70 text-xs font-semibold mt-1">
                            {company.company_city}{company.company_country ? `, ${company.company_country}` : ''}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-white/60 text-xs font-bold font-mono uppercase tracking-widest group-hover:text-white transition-colors">
                        View Details
                        <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </DetailPageLayout>
  );
};

'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { DetailPageLayout } from '@/components/DetailPageLayout';
import { markdownToHtml } from '@/lib/utils';
import type { Member, Company, PersonSocials } from '@/lib/api-types';

interface SpeakerDetailClientProps {
  member: Member;
  companies: Company[];
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

export const SpeakerDetailClient: React.FC<SpeakerDetailClientProps> = ({ member, companies }) => {
  const name = `${member.person_firstname} ${member.person_surname}`.trim();
  const bio = member.speaker_bio || member.person_bio;
  const photo = member.person_photo_nobg || member.person_photo;
  const firstCompany = member.person_companies?.[0];

  return (
    <DetailPageLayout>
      {/* Hero section */}
      <section className="bg-[#020408] text-white">
        <div className="max-w-[1440px] mx-auto px-6 py-20 md:py-28">
          <div className="flex flex-col md:flex-row gap-12 md:gap-16 items-center md:items-start">
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
              <Link href="/speakers" className="text-brand-cyan text-sm font-mono uppercase tracking-widest hover:underline mb-6 inline-flex items-center gap-1">
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
              <h2 className="text-2xl md:text-3xl font-display font-bold text-[#1a1a1a]">About</h2>
            </div>
            <div
              className="prose prose-lg max-w-none text-gray-700 leading-relaxed
                prose-headings:font-display prose-headings:text-[#1a1a1a] prose-headings:font-bold
                prose-h2:text-xl prose-h3:text-lg
                prose-a:text-brand-blue prose-a:no-underline hover:prose-a:underline
                prose-strong:text-[#1a1a1a]
                prose-li:marker:text-brand-cyan
                prose-blockquote:border-l-brand-cyan prose-blockquote:text-gray-600"
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
              <h2 className="text-2xl md:text-3xl font-display font-bold text-[#1a1a1a]">Organizations</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {companies.map((company) => (
                <Link
                  key={company.id}
                  href={company.company_is_sponsor ? `/sponsors/${company.company_slug}` : `/companies/${company.company_slug}`}
                  className="flex items-center gap-5 p-6 rounded-2xl border border-gray-200 hover:border-brand-cyan/30 hover:shadow-lg hover:shadow-brand-cyan/5 transition-all duration-300 no-underline group"
                >
                  {company.company_logo && (
                    <div className="relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-gray-50 p-2">
                      <Image
                        src={company.company_logo}
                        alt={company.company_name}
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-[#1a1a1a] group-hover:text-brand-cyan transition-colors">{company.company_name}</h3>
                    {company.company_city && (
                      <p className="text-sm text-gray-500 mt-0.5">{company.company_city}{company.company_country ? `, ${company.company_country}` : ''}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </DetailPageLayout>
  );
};

'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DetailPageLayout } from '@/components/DetailPageLayout';
import { AnimatedGrid } from '@/components/AnimatedGrid';
import { markdownToHtml, youtubeThumbnail, youtubeToEmbed } from '@/lib/utils';
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
  /** Hotels use cover photography + richer contact/media presentation. */
  variant?: 'default' | 'hotel';
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
    website: 'ri-global-line',
  };
  return icons[key] || 'ri-link';
}

function collectLinks(socials?: CompanySocials, website?: string) {
  const links: { url: string; icon: string; label: string }[] = [];
  if (website?.startsWith('http')) {
    links.push({ url: website, icon: getSocialIcon('website'), label: 'Website' });
  }
  if (socials) {
    for (const [key, url] of Object.entries(socials)) {
      if (url && typeof url === 'string' && url.startsWith('http')) {
        links.push({ url, icon: getSocialIcon(key), label: key });
      }
    }
  }
  return links;
}

function SocialLinks({
  socials,
  website,
  luxurious = false,
}: {
  socials?: CompanySocials;
  website?: string;
  luxurious?: boolean;
}) {
  const links = collectLinks(socials, website);
  if (links.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-3 ${luxurious ? 'mt-8' : 'mt-8'}`}>
      {links.map((link) => (
        <a
          key={link.label}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={
            luxurious
              ? 'w-12 h-12 rounded-full bg-gradient-to-br from-white/15 to-white/5 hover:from-brand-cyan/30 hover:to-brand-cyan/10 border border-white/20 hover:border-brand-cyan/50 flex items-center justify-center transition-all duration-300 shadow-[0_8px_24px_-12px_rgba(0,176,194,0.55)]'
              : 'w-11 h-11 rounded-full bg-white/10 hover:bg-brand-cyan/20 border border-white/15 hover:border-brand-cyan/40 flex items-center justify-center transition-all duration-300 group'
          }
          title={link.label}
        >
          <i
            className={`${link.icon} text-xl ${luxurious ? 'text-white/85' : 'text-white/70 group-hover:text-brand-cyan'} transition-colors`}
          />
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

function hotelCover(company: Company): string | undefined {
  return company.venue_photo || company.company_thumbnail || company.company_logo || undefined;
}

function hotelVideos(company: Company): string[] {
  const urls: string[] = [];
  if (company.company_embedded_youtube) urls.push(company.company_embedded_youtube);
  if (Array.isArray(company.company_youtube_videos)) {
    for (const u of company.company_youtube_videos) {
      if (typeof u === 'string' && u && !urls.includes(u)) urls.push(u);
    }
  }
  return urls;
}

export const CompanyDetailClient: React.FC<CompanyDetailClientProps> = ({
  company,
  backLabel,
  backHref,
  navigationData,
  navigationAPIData,
  socials,
  variant = 'default',
}) => {
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
      } catch {
        /* ignore */
      }
    }
  };

  const isHotel = variant === 'hotel';
  const cover = isHotel ? hotelCover(company) : company.company_logo;
  const videos = isHotel ? hotelVideos(company) : company.company_embedded_youtube ? [company.company_embedded_youtube] : [];
  const primaryEmbed = videos[0] ? youtubeToEmbed(videos[0]) : null;

  if (isHotel) {
    return (
      <DetailPageLayout navigationData={navigationData} navigationAPIData={navigationAPIData} socials={socials}>
        <section className="relative bg-[#050A1F] text-white overflow-hidden">
          <div className="absolute inset-0 pointer-events-none animated-grid opacity-60">
            <AnimatedGrid />
          </div>
          <div className="relative z-10 max-w-[1440px] mx-auto px-6 py-16 md:py-24">
            <Link
              href={backHref}
              onClick={handleBack}
              className="text-brand-cyan text-sm font-mono uppercase tracking-[0.22em] hover:underline mb-10 inline-flex items-center gap-1"
            >
              <i className="ri-arrow-left-line" /> {backLabel}
            </Link>

            <div className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-10 lg:gap-14 items-stretch">
              <div className="relative min-h-[320px] md:min-h-[420px] rounded-[1.75rem] overflow-hidden border border-white/15 shadow-[0_40px_100px_-40px_rgba(0,176,194,0.55)]">
                {cover ? (
                  <Image
                    src={cover}
                    alt={company.company_name}
                    fill
                    priority
                    sizes="(max-width:1024px) 100vw, 50vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-white/5" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#050A1F]/80 via-transparent to-transparent" />
              </div>

              <div className="flex flex-col justify-center">
                <p className="text-brand-cyan/90 text-xs font-mono uppercase tracking-[0.28em] mb-4">
                  Partner hotel
                </p>
                <h1 className="text-4xl md:text-5xl lg:text-[3.4rem] font-display font-bold tracking-tight leading-[1.05] mb-6">
                  {company.company_name}
                </h1>

                <div className="space-y-3 text-white/70">
                  {(company.company_address || company.company_city || company.company_country) && (
                    <p className="flex items-start gap-3 text-base">
                      <i className="ri-map-pin-line text-brand-cyan mt-1" />
                      <span>
                        {[company.company_address, company.company_city, company.company_country]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </p>
                  )}
                  {company.company_email && (
                    <p className="flex items-center gap-3">
                      <i className="ri-mail-line text-brand-cyan" />
                      <a href={`mailto:${company.company_email}`} className="text-brand-cyan hover:underline">
                        {company.company_email}
                      </a>
                    </p>
                  )}
                  {company.company_phone && (
                    <p className="flex items-center gap-3">
                      <i className="ri-phone-line text-brand-cyan" />
                      <a href={`tel:${company.company_phone}`} className="hover:text-white transition-colors">
                        {company.company_phone}
                      </a>
                    </p>
                  )}
                </div>

                <SocialLinks socials={company.company_socials} website={company.company_website} luxurious />

                <div className="mt-10 flex flex-wrap gap-3">
                  {company.company_affiliated_hotel_bookings_url ? (
                    <a
                      href={company.company_affiliated_hotel_bookings_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-brand-cyan text-[#050A1F] text-sm font-bold hover:bg-white transition-colors shadow-[0_12px_40px_-12px_rgba(0,176,194,0.8)]"
                    >
                      <i className="ri-calendar-check-line" />
                      Book a stay
                    </a>
                  ) : null}
                  {company.company_google_maps ? (
                    <a
                      href={company.company_google_maps}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-white/25 text-white text-sm font-bold hover:bg-white/10 transition-colors"
                    >
                      <i className="ri-map-2-line" />
                      Directions
                    </a>
                  ) : null}
                  {company.brochure_url ? (
                    <a
                      href={company.brochure_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-white/25 text-white text-sm font-bold hover:bg-white/10 transition-colors"
                    >
                      <i className="ri-file-pdf-line" />
                      Brochure
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>

        {company.company_bio && (
          <section className="bg-[#F0F0EF]">
            <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-1 h-8 bg-brand-cyan rounded-full" />
                <h2 className="text-2xl md:text-3xl font-display font-bold text-[#050A1F]">About the hotel</h2>
              </div>
              <div
                className="bio-content max-w-none"
                dangerouslySetInnerHTML={{ __html: renderBio(company.company_bio) }}
              />
            </div>
          </section>
        )}

        {videos.length > 0 && (
          <section className="bg-[#070c22] border-t border-white/5">
            <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-1 h-8 bg-brand-cyan rounded-full" />
                <h2 className="text-2xl md:text-3xl font-display font-bold text-white">Experience</h2>
              </div>
              <div className="space-y-8">
                {videos.map((url) => {
                  const embed = youtubeToEmbed(url);
                  const thumb = youtubeThumbnail(url);
                  if (!embed) return null;
                  return (
                    <div
                      key={url}
                      className="aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)] relative bg-black"
                    >
                      {thumb ? (
                        <Image src={thumb} alt="" fill sizes="1000px" className="object-cover opacity-30" />
                      ) : null}
                      <iframe
                        src={embed}
                        title={`${company.company_name} video`}
                        className="relative w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </DetailPageLayout>
    );
  }

  const embedUrl = primaryEmbed;

  return (
    <DetailPageLayout navigationData={navigationData} navigationAPIData={navigationAPIData} socials={socials}>
      <section className="relative bg-[#050A1F] text-white">
        <div className="absolute inset-0 pointer-events-none animated-grid">
          <AnimatedGrid />
        </div>
        <div className="relative z-10 max-w-[1440px] mx-auto px-6 py-20 md:py-28">
          <div className="flex flex-col md:flex-row gap-12 md:gap-16 items-center mx-auto w-fit">
            {company.company_logo && (
              <div className="flex-shrink-0">
                <div
                  className={`relative w-48 h-48 md:w-64 md:h-64 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl shadow-brand-cyan/10 flex items-center justify-center ${company.logo_background_white ? 'bg-white' : 'bg-white/5'} p-6`}
                >
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

            <div className="text-center md:text-left">
              <Link
                href={backHref}
                onClick={handleBack}
                className="text-brand-cyan text-sm font-mono uppercase tracking-widest hover:underline mb-6 inline-flex items-center gap-1"
              >
                <i className="ri-arrow-left-line" /> {backLabel}
              </Link>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-[1.1] mb-5">
                {company.company_name}
              </h1>
              {(company.company_city || company.company_country) && (
                <p className="text-lg text-white/60 mb-2 flex items-center gap-2 justify-center md:justify-start">
                  <i className="ri-map-pin-line" />
                  {[company.company_city, company.company_country].filter(Boolean).join(', ')}
                </p>
              )}
              {company.company_email && (
                <p className="text-white/60 mb-2 flex items-center gap-2 justify-center md:justify-start">
                  <i className="ri-mail-line" />
                  <a href={`mailto:${company.company_email}`} className="text-brand-cyan hover:underline">
                    {company.company_email}
                  </a>
                </p>
              )}

              <SocialLinks socials={company.company_socials} website={company.company_website} />
              {company.company_affiliated_hotel_bookings_url ? (
                <a
                  href={company.company_affiliated_hotel_bookings_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-cyan text-[#050A1F] text-sm font-bold hover:bg-white transition-colors"
                >
                  <i className="ri-calendar-check-line" />
                  Book a stay
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

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

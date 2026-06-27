import Image from 'next/image';
import Link from 'next/link';
import type { HighlightsHotspotBanner } from '@/config/types';
import { sponsorScrollerUsesSilhouetteFilter } from '@/lib/logoDisplay';

interface ColocatedPartnerBannerProps {
  banner: HighlightsHotspotBanner;
  className?: string;
}

export function ColocatedPartnerBanner({ banner, className = 'mt-5 ml-1 max-w-[280px]' }: ColocatedPartnerBannerProps) {
  const logoSilhouette = banner.logo
    ? sponsorScrollerUsesSilhouetteFilter(banner.logo, banner.logoHasDarkBg)
    : false;

  return (
    <Link href={banner.href} className={`group/banner block no-underline ${className}`}>
      <div className="relative overflow-hidden rounded-xl border border-white/15 bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-md px-3 py-2.5 transition-all duration-300 hover:border-brand-cyan/50 hover:shadow-[0_0_28px_rgba(0,176,194,0.2)]">
        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-brand-blue via-brand-cyan to-brand-teal opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-cyan/10 to-transparent opacity-0 group-hover/banner:opacity-100 transition-opacity" />
        <div className="relative flex items-center gap-3 pl-1.5">
          {banner.logo ? (
            <div
              className={`flex h-10 w-14 shrink-0 items-center justify-center rounded-lg p-1.5 ${
                banner.logoBackgroundWhite
                  ? 'bg-white shadow-sm ring-1 ring-black/5'
                  : 'bg-white/95 shadow-sm ring-1 ring-white/20'
              }`}
            >
              <Image
                src={banner.logo}
                alt=""
                width={48}
                height={32}
                className={`max-h-full w-auto object-contain ${logoSilhouette ? 'brightness-0 opacity-90' : ''}`}
                unoptimized={banner.logo.startsWith('http')}
              />
            </div>
          ) : (
            <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-white/10 border border-white/15">
              <i className="ri-building-4-line text-brand-cyan text-sm" aria-hidden />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <span className="text-[0.65rem] md:text-xs font-medium text-white/90 leading-snug group-hover/banner:text-white transition-colors block">
              {banner.label}
            </span>
          </div>
          <i
            className="ri-arrow-right-up-line text-white/35 group-hover/banner:text-brand-cyan group-hover/banner:translate-x-0.5 group-hover/banner:-translate-y-0.5 transition-all text-base shrink-0"
            aria-hidden
          />
        </div>
      </div>
    </Link>
  );
}

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { PartnerItemData } from '@/components/LandingPage';

interface PastSponsorsProps {
  data: PartnerItemData[];
  onOpenContact: () => void;
}

export const PastSponsors: React.FC<PastSponsorsProps> = ({ data, onOpenContact }) => {
  return (
    <section id="sponsors" className="relative w-full py-24 px-6 bg-[#F0F0EF] text-black border-t border-gray-200">
      <div className="max-w-[1440px] mx-auto flex flex-col items-center">

        {/* Headline */}
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-center mb-16 tracking-tight text-[#1a1a1a]">
          Our Sponsors & Partners
        </h2>

        {/* Logo Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 lg:gap-12 w-full max-w-6xl mb-20">
          {data.map((sponsor, index) => {
            const href = sponsor.isSponsor
              ? `/sponsors/${sponsor.slug}`
              : `/companies/${sponsor.slug}`;

            const card = (
              <div className="group flex items-center justify-center p-6 h-28 bg-white hover:bg-gray-50 rounded-2xl transition-all duration-300 border border-gray-200 hover:border-gray-300 hover:shadow-md">
                <div className="relative w-full h-full max-h-12 max-w-[150px]">
                  <Image
                    src={sponsor.logo}
                    alt={sponsor.name}
                    fill
                    className="object-contain opacity-80 group-hover:opacity-100 transition-all duration-500"
                  />
                </div>
              </div>
            );

            if (sponsor.slug) {
              return (
                <Link key={index} href={href} className="no-underline">
                  {card}
                </Link>
              );
            }

            return <div key={index}>{card}</div>;
          })}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center justify-center w-full px-4 sm:px-0">
          <button
            onClick={onOpenContact}
            className="px-8 py-3 rounded-full border border-black bg-white text-black hover:bg-black hover:text-white transition-all duration-300 text-sm font-bold shadow-md hover:shadow-xl flex items-center gap-2"
          >
            <i className="ri-vip-diamond-line"></i>
            Become a Sponsor
          </button>
          <button
            onClick={onOpenContact}
            className="px-8 py-3 rounded-full border border-black bg-white text-black hover:bg-black hover:text-white transition-all duration-300 text-sm font-bold shadow-md hover:shadow-xl flex items-center gap-2"
          >
            <i className="ri-download-line"></i>
            Request Sponsorship Deck
          </button>
        </div>

      </div>
    </section>
  );
};

import React from 'react';
import Image from 'next/image';
import { PartnerItem } from '@/config/types';

interface PastSponsorsProps {
  data: PartnerItem[];
  onOpenContact: () => void;
}

export const PastSponsors: React.FC<PastSponsorsProps> = ({ data, onOpenContact }) => {
  return (
    <section id="sponsors" className="relative w-full py-24 px-6 bg-[#F0F0EF] text-black border-t border-gray-200">
      <div className="max-w-7xl mx-auto flex flex-col items-center">

        {/* Headline */}
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-center mb-16 tracking-tight text-[#1a1a1a]">
          Our Sponsors
        </h2>

        {/* Logo Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 lg:gap-12 w-full max-w-6xl mb-20">
          {data.map((sponsor, index) => (
            <div key={index} className="group flex items-center justify-center p-4 h-24 bg-white/50 hover:bg-white rounded-xl transition-all duration-300 border border-transparent hover:border-black/5 hover:shadow-sm">
              <div className="relative w-full h-full max-h-10 max-w-[140px]">
                <Image
                  src={sponsor.logo}
                  alt={sponsor.name}
                  fill
                  className="object-contain grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 mix-blend-multiply"
                />
              </div>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center justify-center w-full px-4 sm:px-0">
          <button
            onClick={onOpenContact}
            className="w-full sm:w-auto px-6 py-4 rounded-full bg-transparent border border-black/10 text-black font-bold text-sm tracking-wide hover:border-black hover:bg-white transition-all min-w-0 sm:min-w-[280px] flex items-center justify-center gap-2"
          >
            Request Sponsorship Deck
            <i className="ri-download-line text-base"></i>
          </button>
        </div>

      </div>
    </section>
  );
};
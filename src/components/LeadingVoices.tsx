import React from 'react';
import Image from 'next/image';
import { LeadingVoice } from '@/config/types';

interface LeadingVoicesProps {
  data: LeadingVoice[];
}

export const LeadingVoices: React.FC<LeadingVoicesProps> = ({ data }) => {
  return (
    <section id="leading-voices" className="relative w-full py-24 bg-[#F2F4F7] border-t border-black/5">
      <div className="max-w-7xl mx-auto px-6">

        <div className="flex flex-col md:flex-row justify-between items-end mb-12">
          <div>
            <div className="text-sm font-bold tracking-widest text-brand-blue uppercase mb-2">Speakers</div>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-slate-900 tracking-tight">
              Leading Voices
            </h2>
          </div>
          <div className="mt-4 md:mt-0 max-w-sm">
            <p className="text-slate-500 leading-relaxed text-sm">
              Hear from the pioneers defining the protocols, governance, and infrastructure of the decentralized future.
            </p>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-12">
          {data.map((speaker, index) => (
            <div key={index} className="group flex flex-col items-center text-center cursor-default">

              {/* Image Container with hover effect */}
              <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-full overflow-hidden mb-6 shadow-md border-4 border-white group-hover:border-brand-blue/20 transition-all duration-500">
                <Image
                  src={speaker.image}
                  alt={speaker.name}
                  fill
                  className="object-cover filter grayscale contrast-125 group-hover:grayscale-0 transition-all duration-500"
                />
              </div>

              {/* Text Content */}
              <h3 className="text-xl font-display font-bold text-[#1a1a1a] mb-1">{speaker.name}</h3>
              <p className="text-xs font-mono uppercase tracking-widest text-gray-500 mb-8 min-h-[3em] flex items-center justify-center">
                {speaker.role}
              </p>

              {/* Logo Placeholder */}
              <div className="mt-auto pt-6 border-t border-black/5 w-full flex justify-center text-black/60 group-hover:text-black">
                <div className="flex items-center gap-2">
                  <i className={`${speaker.icon} text-2xl`}></i>
                  <span className="font-bold text-sm tracking-tight">{speaker.company}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
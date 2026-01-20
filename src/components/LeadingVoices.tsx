import React from 'react';
import Image from 'next/image';
import { LeadingVoice } from '@/config/types';

interface LeadingVoicesProps {
  data: LeadingVoice[];
}

export const LeadingVoices: React.FC<LeadingVoicesProps> = ({ data }) => {
  return (
    <section id="leading-voices" className="relative w-full py-32 px-6 bg-[#F0F0EF] text-black">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-center mb-16 tracking-tight text-[#1a1a1a]">
          Our Leading Voices On The <br className="hidden md:block" /> DeAI Summit Stage
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {data.map((speaker, index) => (
            <div
              key={index}
              className="group relative flex flex-col items-center text-center p-8 bg-transparent border border-black/10 rounded-2xl hover:border-black/30 hover:bg-white hover:shadow-lg transition-all duration-300"
            >
              {/* Image Container */}
              <div className="relative w-32 h-32 mb-6 rounded-full overflow-hidden border border-black/5 group-hover:border-black/10 transition-colors">
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
                  {/* <i className={`${speaker.icon} text-2xl`}></i> */}
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
import React from 'react';
import { MarqueeItem as MarqueeItemType } from '@/config/types';

interface MarqueeProps {
  data: MarqueeItemType[];
}

interface MarqueeItemProps {
  label: string;
  iconType: string;
}

const getIcon = (type: string) => {
  switch (type) {
    case 'diamond': return <div className="w-8 h-8 rounded border border-current rotate-45"></div>;
    case 'circle-dashed': return <div className="w-8 h-8 rounded-full border-2 border-current border-dashed"></div>;
    case 'square': return <div className="w-8 h-8 rounded-lg bg-white/20"></div>;
    case 'circle-dot': return <div className="w-8 h-8 rounded-full border border-current flex items-center justify-center"><div className="w-2 h-2 bg-current rounded-full"></div></div>;
    case 'bracket': return <div className="w-8 h-8 rounded border-t-2 border-b-2 border-current"></div>;
    default: return <div className="w-8 h-8 rounded border border-current"></div>;
  }
}

const MarqueeItem: React.FC<MarqueeItemProps & { logo?: string }> = ({ label, iconType, logo }) => (
  <div className="flex items-center justify-center min-w-[140px] md:min-w-[200px] px-4">
    {logo ? (
      <div className="relative w-full h-[40px] md:h-[60px] flex items-center justify-center">
        <img
          src={logo}
          alt={label}
          className="max-w-[120px] md:max-w-[160px] max-h-full w-auto object-contain brightness-0 invert opacity-100"
        />
      </div>
    ) : (
      <div className="flex items-center gap-4 text-white">
        {iconType && getIcon(iconType)}
        <span className="font-mono text-sm tracking-widest">{label}</span>
      </div>
    )}
  </div>
);

export const Marquee: React.FC<MarqueeProps> = ({ data }) => {
  return (
    <section className="w-full z-20  relative overflow-hidden mask-gradient-fade bg-[#020408] border-t border-white/5 py-8">
      <div className="flex animate-marquee hover:[animation-play-state:paused] w-max gap-1 items-center">
        {/* First Loop */}
        {data.map((item, index) => (
          <MarqueeItem key={`1-${index}`} label={item.label} iconType={item.iconType || 'circle'} logo={item.logo} />
        ))}
        {/* Second Loop for seamless scroll */}
        {data.map((item, index) => (
          <MarqueeItem key={`2-${index}`} label={item.label} iconType={item.iconType || 'circle'} logo={item.logo} />
        ))}
        {/* Third Loop for extra width safety */}
        {data.map((item, index) => (
          <MarqueeItem key={`3-${index}`} label={item.label} iconType={item.iconType || 'circle'} logo={item.logo} />
        ))}
      </div>
    </section>
  );
};
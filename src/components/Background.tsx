import React from 'react';

export const Background: React.FC = () => {
  return (
    <div className="fixed inset-0 z-0 w-full h-full overflow-hidden pointer-events-none bg-[#050A1F]">
      {/* 
         Image: Conference Hall / Stage 
         Shows the stage from the perspective of the audience (backs of heads/seats visible).
      */}
      <img
        src="https://images.unsplash.com/photo-1544531586-fde5298cdd40?q=80&w=2070&auto=format&fit=crop"
        alt="Conference Stage"
        className="absolute inset-0 w-full h-full object-cover opacity-80"
      />
      
      {/* Brand Color Tint - blended to unify the image colors */}
      <div className="absolute inset-0 bg-brand-blue/30 mix-blend-multiply" />

      {/* Radial Vignette - Reveals the center (stage) while keeping edges heavy black */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(5,10,31,0.2)_0%,#050A1F_100%)]" />

      {/* Grid Pattern */}
      <div className="absolute inset-0 grid-bg z-10 opacity-20" />
      
      {/* Vertical Fade - Ensures header and footer text remains readable against the image */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050A1F] via-transparent to-[#050A1F] opacity-90 z-20" />
    </div>
  );
};
import React from 'react';

export const Background: React.FC = () => {
  return (
    <div className="fixed inset-0 z-0 w-full h-full overflow-hidden pointer-events-none bg-[#020408]">
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(2,4,8,0.2)_0%,#020408_100%)]" />

      {/* Grid Pattern */}
      <div className="absolute inset-0 grid-bg z-10 opacity-20" />
      
      {/* Vertical Fade - Ensures header and footer text remains readable against the image */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#020408] via-transparent to-[#020408] opacity-90 z-20" />
    </div>
  );
};
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface AnimatedCounterProps {
  value: string;        // e.g. "5,000", "$50B+", "100+", "60+"
  className?: string;
  duration?: number;    // ms, default 2000
  delay?: number;       // ms delay after becoming visible
}

function parseValue(value: string): { prefix: string; number: number; suffix: string; hasComma: boolean } {
  // Extract prefix (non-numeric start like "$"), the number, and suffix (like "B+", "+", "K")
  const match = value.match(/^([^0-9]*?)([\d,]+(?:\.\d+)?)\s*(.*)$/);
  if (!match) return { prefix: '', number: 0, suffix: value, hasComma: false };

  const prefix = match[1];
  const numStr = match[2].replace(/,/g, '');
  const number = parseFloat(numStr);
  const suffix = match[3];
  const hasComma = match[2].includes(',');

  return { prefix, number, suffix, hasComma };
}

function formatNumber(n: number, hasComma: boolean): string {
  const rounded = Math.round(n);
  if (hasComma) {
    return rounded.toLocaleString('en-US');
  }
  return rounded.toString();
}

// Easing: cubic ease-out for a satisfying deceleration
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  className = '',
  duration = 2000,
  delay = 0,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [displayValue, setDisplayValue] = useState('0');
  const [hasAnimated, setHasAnimated] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const { prefix, number, suffix, hasComma } = parseValue(value);

  const animate = useCallback(() => {
    if (number === 0) {
      setDisplayValue(value);
      return;
    }

    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      const current = easedProgress * number;
      setDisplayValue(`${prefix}${formatNumber(current, hasComma)}${suffix}`);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        setDisplayValue(value);
      }
    };

    requestAnimationFrame(tick);
  }, [value, prefix, number, suffix, hasComma, duration]);

  // Intersection Observer — trigger when scrolled into view
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setIsVisible(true);
          setHasAnimated(true);

          if (delay > 0) {
            setTimeout(animate, delay);
          } else {
            animate();
          }

          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [animate, delay, hasAnimated]);

  return (
    <span
      ref={ref}
      className={`inline-block transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${className}`}
    >
      {hasAnimated ? displayValue : '\u00A0'}
    </span>
  );
};

/**
 * A glowing animated stat block with counter, label, and optional accent color.
 */
interface AnimatedStatProps {
  value: string;
  label: string;
  accentColor?: string;
  delay?: number;
  dark?: boolean;
}

export const AnimatedStat: React.FC<AnimatedStatProps> = ({
  value,
  label,
  accentColor = '#06B0C2',
  delay = 0,
  dark = false,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`text-center transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="relative inline-block">
        {/* Glow effect behind number */}
        <div
          className="absolute inset-0 blur-2xl opacity-20 rounded-full scale-150 transition-opacity duration-1000"
          style={{
            backgroundColor: accentColor,
            opacity: isVisible ? 0.2 : 0,
          }}
        />
        <span className="text-4xl md:text-5xl font-display font-bold relative" style={{ color: accentColor }}>
          <AnimatedCounter
            value={value}
            delay={delay + 200}
            duration={2200}
          />
        </span>
      </div>
      <div
        className="w-10 h-[3px] mx-auto mt-3 mb-2 rounded-full transition-all duration-1000"
        style={{
          backgroundColor: accentColor,
          width: isVisible ? '2.5rem' : '0',
          transitionDelay: `${delay + 400}ms`,
        }}
      />
      <p className={`text-xs uppercase tracking-widest mt-2 ${dark ? 'text-white/50' : 'text-gray-500'}`}>
        {label}
      </p>
    </div>
  );
};

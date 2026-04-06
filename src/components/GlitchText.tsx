'use client';

import React, { useEffect, useRef, useState } from 'react';

interface GlitchTextProps {
  children: string;
  className?: string;
  /** Interval between shuffle cycles in ms */
  interval?: number;
  /** Duration of the shuffle animation in ms */
  duration?: number;
}

const CHARS = '!<>-_\\/[]{}—=+*^?#________ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Shuffle / scramble text animation. Recurring every `interval` ms.
 * Each character resolves over time to the target string, with random glyphs in between.
 */
export const GlitchText: React.FC<GlitchTextProps> = ({
  children,
  className = '',
  interval = 5000,
  duration = 1200,
}) => {
  const target = children;
  const [display, setDisplay] = useState(target);
  const frameRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const runShuffle = () => {
      const start = performance.now();
      const queue = target.split('').map((char, i) => {
        // Spaces stay as spaces
        if (char === ' ') return { from: ' ', to: ' ', startAt: 0, endAt: 0 };
        const startAt = Math.random() * (duration * 0.4);
        const endAt = startAt + Math.random() * (duration * 0.5) + duration * 0.1;
        return { from: randomChar(), to: char, startAt, endAt };
      });

      const tick = (now: number) => {
        if (cancelled) return;
        const elapsed = now - start;
        let output = '';
        let complete = 0;
        for (const q of queue) {
          if (elapsed >= q.endAt) {
            complete++;
            output += q.to;
          } else if (elapsed >= q.startAt) {
            output += randomChar();
          } else {
            output += q.from;
          }
        }
        setDisplay(output);
        if (complete < queue.length) {
          frameRef.current = requestAnimationFrame(tick);
        } else {
          setDisplay(target);
          timeoutRef.current = setTimeout(runShuffle, interval);
        }
      };

      frameRef.current = requestAnimationFrame(tick);
    };

    timeoutRef.current = setTimeout(runShuffle, interval);

    return () => {
      cancelled = true;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [target, interval, duration]);

  return (
    <span className={className}>{display}</span>
  );
};

function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

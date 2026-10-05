'use client';

import { useEffect, useRef } from 'react';

/** Design canvas from the wave-field hero. Content is laid out at this size and scaled to the viewport. */
export const HERO_STAGE = { width: 1440, height: 860 };

const CELL = 42;
const WAVE_COUNT = 34;

const LIT_FADE_IN = 600;
const LIT_HOLD = 800;
const LIT_FADE_OUT = 900;
const LIT_MAX = 180;
const LIT_SPAWN_MS = 10;
const LIT_COLORS = ['rgba(0, 176, 194,', 'rgba(14, 111, 235,'];

interface LitCell {
  x: number;
  y: number;
  opacity: number;
  phase: 'in' | 'hold' | 'out';
  elapsed: number;
  maxOpacity: number;
  color: string;
}

export function HeroWaveField({ scale }: { scale: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const host = canvas.closest('section');
    if (!host) return;

    const state = {
      W: HERO_STAGE.width,
      H: HERO_STAGE.height,
      cw: 0,
      ch: 0,
      mx: -9999,
      my: -9999,
      mIn: 0,
      target: 0,
      applied: -1,
      cells: [] as LitCell[],
      lastSpawn: 0,
      lastFrame: 0,
    };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const lightCell = (x: number, y: number, maxOpacity: number) => {
      if (x < 0 || y < 0) return;
      if (state.cells.some((cell) => cell.x === x && cell.y === y && cell.phase !== 'out')) return;
      state.cells.push({
        x,
        y,
        opacity: 0,
        phase: 'in',
        elapsed: 0,
        maxOpacity,
        color: LIT_COLORS[Math.floor(Math.random() * LIT_COLORS.length)],
      });
    };

    const fit = () => {
      const k = scaleRef.current || 1;
      const cw = canvas.offsetWidth;
      const ch = canvas.offsetHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      state.cw = cw;
      state.ch = ch;
      state.applied = k;
      state.W = cw / k;
      state.H = ch / k;
      canvas.width = Math.max(1, Math.round(cw * dpr));
      canvas.height = Math.max(1, Math.round(ch * dpr));
      ctx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
    };

    const onMove = (event: MouseEvent) => {
      const rect = host.getBoundingClientRect();
      const k = scaleRef.current || 1;
      state.mx = (event.clientX - rect.left) / k;
      state.my = (event.clientY - rect.top) / k;
      state.target = 1;
    };
    const onLeave = () => {
      state.target = 0;
    };

    const stepCells = (now: number) => {
      if (reduce) return;
      const dt = state.lastFrame ? now - state.lastFrame : 16;
      state.lastFrame = now;
      if (state.cells.length < LIT_MAX && now - state.lastSpawn > LIT_SPAWN_MS) {
        const cols = Math.max(1, Math.floor(state.W / CELL));
        const rows = Math.max(1, Math.floor(state.H / CELL));
        const occupied = new Set(state.cells.map((cell) => `${cell.x},${cell.y}`));
        let attempts = 0;
        let x = 0;
        let y = 0;
        do {
          x = Math.floor(Math.random() * cols);
          y = Math.floor(Math.random() * rows);
          attempts++;
        } while (occupied.has(`${x},${y}`) && attempts < 20);
        if (attempts < 20) lightCell(x, y, 0.06 + Math.random() * 0.28);
        state.lastSpawn = now;
      }
      state.cells = state.cells.filter((cell) => {
        cell.elapsed += dt;
        if (cell.phase === 'in') {
          cell.opacity = cell.maxOpacity * Math.min(cell.elapsed / LIT_FADE_IN, 1);
          if (cell.elapsed >= LIT_FADE_IN) {
            cell.phase = 'hold';
            cell.elapsed = 0;
          }
        } else if (cell.phase === 'hold') {
          cell.opacity = cell.maxOpacity;
          if (cell.elapsed >= LIT_HOLD) {
            cell.phase = 'out';
            cell.elapsed = 0;
          }
        } else {
          cell.opacity = cell.maxOpacity * (1 - Math.min(cell.elapsed / LIT_FADE_OUT, 1));
          if (cell.elapsed >= LIT_FADE_OUT) return false;
        }
        return true;
      });
    };

    const draw = (time: number) => {
      const { W, H } = state;
      ctx.clearRect(0, 0, W, H);

      const midX = W / 2;
      const midY = H / 2;
      for (const cell of state.cells) {
        const px = cell.x * CELL + CELL / 2;
        const py = cell.y * CELL + CELL / 2;
        const nx = (px - midX) / (W * 0.42);
        const ny = (py - midY) / (H * 0.38);
        const falloff = Math.max(0, 1 - Math.sqrt(nx * nx + ny * ny));
        const alpha = cell.opacity * (0.25 + 0.75 * falloff);
        if (alpha <= 0.01) continue;
        ctx.fillStyle = `${cell.color} ${alpha})`;
        ctx.fillRect(cell.x * CELL, cell.y * CELL, CELL, CELL);
      }

      ctx.strokeStyle = 'rgba(11,18,34,0.045)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= W; x += CELL) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, H);
      }
      for (let y = 0; y <= H; y += CELL) {
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(W, y + 0.5);
      }
      ctx.stroke();

      for (let i = WAVE_COUNT - 1; i >= 0; i--) {
        const blend = i / WAVE_COUNT;
        const base = H * 0.66 + i * 8.5;
        const amp = 46 * (1 - blend * 0.55);
        const r = Math.round(19 - 11 * blend);
        const g = Math.round(102 + 79 * blend);
        const b = Math.round(232 - 34 * blend);
        const thick = i < 3;
        ctx.strokeStyle = `rgba(${r},${g},${b},${thick ? 1 : 0.55 - blend * 0.4})`;
        ctx.lineWidth = thick ? 9 : 1.3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let x = -20; x <= W + 20; x += 8) {
          const bump = state.mIn * Math.exp(-((x - state.mx) ** 2) / 26000) * 70 * (1 - blend * 0.6);
          const y =
            base +
            Math.sin(x * 0.0042 + time * 0.7 + i * 0.12) * amp +
            Math.sin(x * 0.011 - time * 1.1 + i * 0.4) * amp * 0.22 -
            bump;
          if (x < -10) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    };

    fit();
    draw(0);
    window.addEventListener('resize', fit);
    host.addEventListener('mousemove', onMove);
    host.addEventListener('mouseleave', onLeave);

    const started = performance.now();
    let frame = 0;
    const loop = (now: number) => {
      const k = scaleRef.current || 1;
      if (state.cw !== canvas.offsetWidth || state.ch !== canvas.offsetHeight || state.applied !== k) fit();
      state.mIn += (state.target - state.mIn) * 0.08;
      stepCells(now);
      draw(reduce ? 0 : (now - started) / 1000);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', fit);
      host.removeEventListener('mousemove', onMove);
      host.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />;
}

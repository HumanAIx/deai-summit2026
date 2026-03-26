'use client';

import React, { useEffect, useRef } from 'react';

const CELL_SIZE = 60;
const FADE_IN = 600;
const HOLD = 800;
const FADE_OUT = 900;

interface Cell {
  x: number;
  y: number;
  opacity: number;
  phase: 'in' | 'hold' | 'out';
  elapsed: number;
  maxOpacity: number;
  color: string;
}

const DARK_COLORS = [
  'rgba(6, 176, 194,',   // cyan
  'rgba(15, 111, 235,',  // blue
  'rgba(45, 212, 191,',  // teal
  'rgba(139, 92, 246,',  // purple
];

const LIGHT_COLORS = [
  'rgba(6, 176, 194,',   // cyan
  'rgba(15, 111, 235,',  // blue
  'rgba(45, 212, 191,',  // teal
  'rgba(100, 60, 220,',  // purple
];

interface AnimatedGridProps {
  variant?: 'dark' | 'light';
  density?: number;
  mouseTrail?: boolean;
}

export function AnimatedGrid({ variant = 'dark', density = 1, mouseTrail = false }: AnimatedGridProps) {
  const MAX_ACTIVE = Math.round(240 * density);
  const SPAWN_INTERVAL = Math.max(2, Math.round(10 / density));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cellsRef = useRef<Cell[]>([]);
  const lastSpawnRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef(0);
  const colorsRef = useRef(variant === 'light' ? LIGHT_COLORS : DARK_COLORS);
  const lastMouseCellRef = useRef<string>('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);

    const addCell = (x: number, y: number, maxOpacity: number) => {
      const key = `${x},${y}`;
      // Don't stack on existing active cell
      if (cellsRef.current.some(c => c.x === x && c.y === y && c.phase !== 'out')) return;

      const colors = colorsRef.current;
      cellsRef.current.push({
        x, y,
        opacity: 0,
        phase: 'in',
        elapsed: 0,
        maxOpacity,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    };

    const spawnCell = () => {
      const cols = Math.floor(canvas.width / CELL_SIZE);
      const rows = Math.floor(canvas.height / CELL_SIZE);
      if (cols === 0 || rows === 0) return;

      const occupied = new Set(cellsRef.current.map(c => `${c.x},${c.y}`));
      let attempts = 0;
      let x: number, y: number;
      do {
        x = Math.floor(Math.random() * cols);
        y = Math.floor(Math.random() * rows);
        attempts++;
      } while (occupied.has(`${x},${y}`) && attempts < 20);

      if (attempts >= 20) return;

      addCell(x, y, 0.06 + Math.random() * 0.28);
    };

    // Mouse trail handler
    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseTrail || !canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const cellX = Math.floor(mx / CELL_SIZE);
      const cellY = Math.floor(my / CELL_SIZE);
      const key = `${cellX},${cellY}`;

      if (key === lastMouseCellRef.current) return;
      lastMouseCellRef.current = key;

      // Light up the cell under the cursor + some neighbors
      addCell(cellX, cellY, 0.25 + Math.random() * 0.25);

      // Random neighbors for a wider trail
      const offsets = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1],[-1,1],[1,-1]];
      for (const [dx, dy] of offsets) {
        if (Math.random() > 0.4) continue;
        const nx = cellX + dx;
        const ny = cellY + dy;
        if (nx >= 0 && ny >= 0) {
          addCell(nx, ny, 0.12 + Math.random() * 0.20);
        }
      }
    };

    // Walk up to find the nearest <section> to listen on (it receives pointer events)
    let target: HTMLElement | null = canvas.parentElement;
    while (target && target.tagName !== 'SECTION') {
      target = target.parentElement;
    }
    if (!target) target = canvas.parentElement;

    if (mouseTrail && target) {
      target.addEventListener('mousemove', handleMouseMove);
    }

    const animate = (time: number) => {
      const dt = lastTimeRef.current ? time - lastTimeRef.current : 16;
      lastTimeRef.current = time;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (cellsRef.current.length < MAX_ACTIVE && time - lastSpawnRef.current > SPAWN_INTERVAL) {
        spawnCell();
        lastSpawnRef.current = time;
      }

      cellsRef.current = cellsRef.current.filter(cell => {
        cell.elapsed += dt;

        if (cell.phase === 'in') {
          cell.opacity = cell.maxOpacity * Math.min(cell.elapsed / FADE_IN, 1);
          if (cell.elapsed >= FADE_IN) {
            cell.phase = 'hold';
            cell.elapsed = 0;
          }
        } else if (cell.phase === 'hold') {
          cell.opacity = cell.maxOpacity;
          if (cell.elapsed >= HOLD) {
            cell.phase = 'out';
            cell.elapsed = 0;
          }
        } else if (cell.phase === 'out') {
          cell.opacity = cell.maxOpacity * (1 - Math.min(cell.elapsed / FADE_OUT, 1));
          if (cell.elapsed >= FADE_OUT) return false;
        }

        const px = cell.x * CELL_SIZE;
        const py = cell.y * CELL_SIZE;
        ctx.fillStyle = `${cell.color} ${cell.opacity})`;
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

        return true;
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      resizeObserver.disconnect();
      if (mouseTrail && target) {
        target.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{
        maskImage: 'radial-gradient(ellipse 80% 70% at center, black 0%, transparent 70%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at center, black 0%, transparent 70%)',
      }}
    />
  );
}

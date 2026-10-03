'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

/** Ignore a computed bump below this so logos that already fill the tile stay put. */
const MIN_USEFUL_SCALE = 1.35;
const MAX_SCALE = 3.4;
const TILE_MARGIN = 0.9;

interface InkBox {
  fillW: number;
  fillH: number;
  aspect: number;
  /** Ink center minus image center, as a fraction of the image size. */
  offsetX: number;
  offsetY: number;
}

interface Placement {
  scale: number;
  x: number;
  y: number;
}

function measureInk(img: HTMLImageElement): InkBox | null {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) return null;
  const ratio = Math.min(1, 180 / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * ratio));
  const ch = Math.max(1, Math.round(h * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, cw, ch);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, cw, ch).data;
  } catch {
    return null;
  }

  const at = (x: number, y: number) => {
    const i = (y * cw + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]] as const;
  };
  const corners = [at(0, 0), at(cw - 1, 0), at(0, ch - 1), at(cw - 1, ch - 1)];
  const opaqueCorners = corners.filter((pixel) => pixel[3] > 240);
  const matte = opaqueCorners.length >= 3 ? opaqueCorners[0] : null;

  let minX = cw;
  let minY = ch;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const [r, g, b, a] = at(x, y);
      if (a < 32) continue;
      if (matte && Math.abs(r - matte[0]) + Math.abs(g - matte[1]) + Math.abs(b - matte[2]) < 36) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  const inkCenterX = (minX + maxX + 1) / 2;
  const inkCenterY = (minY + maxY + 1) / 2;
  return {
    fillW: (maxX - minX + 1) / cw,
    fillH: (maxY - minY + 1) / ch,
    aspect: w / h,
    offsetX: (inkCenterX - cw / 2) / cw,
    offsetY: (inkCenterY - ch / 2) / ch,
  };
}

function containSize(aspect: number, boxW: number, boxH: number) {
  const widthLimited = aspect >= boxW / boxH;
  return {
    dispW: widthLimited ? boxW : boxH * aspect,
    dispH: widthLimited ? boxW / aspect : boxH,
  };
}

function placementForBox(ink: InkBox, boxW: number, boxH: number): Placement {
  if (boxW < 8 || boxH < 8) return { scale: 1, x: 0, y: 0 };
  const { dispW, dispH } = containSize(ink.aspect, boxW, boxH);
  const inkW = dispW * ink.fillW;
  const inkH = dispH * ink.fillH;
  if (inkW < 1 || inkH < 1) return { scale: 1, x: 0, y: 0 };
  const raw = Math.min((boxW * TILE_MARGIN) / inkW, (boxH * TILE_MARGIN) / inkH);
  if (raw < MIN_USEFUL_SCALE) return { scale: 1, x: 0, y: 0 };
  const scale = Math.min(raw, MAX_SCALE);
  return {
    scale,
    x: -ink.offsetX * dispW * scale,
    y: -ink.offsetY * dispH * scale,
  };
}

/**
 * Logos whose artwork already fills a reference slot stay at that size.
 * Smaller marks use the real frame, so a taller card can enlarge them.
 */
function placementForFrame(
  ink: InkBox,
  frameW: number,
  frameH: number,
  hold?: { width: number; height: number },
): Placement {
  if (!hold || hold.width < 8 || hold.height < 8) return placementForBox(ink, frameW, frameH);
  const held = containSize(ink.aspect, hold.width, hold.height);
  const inkW = held.dispW * ink.fillW;
  const inkH = held.dispH * ink.fillH;
  const established = inkW >= 85 && inkH >= 20;
  if (!established) return placementForBox(ink, frameW, frameH);
  const frame = containSize(ink.aspect, frameW, frameH);
  if (frame.dispW < 1) return { scale: 1, x: 0, y: 0 };
  const scale = held.dispW / frame.dispW;
  if (scale >= 0.98) return { scale: 1, x: 0, y: 0 };
  return { scale, x: 0, y: 0 };
}

const inkCache = new Map<string, InkBox | null>();

export function FittedCompanyLogo({
  src,
  alt,
  unoptimized = false,
  holdBox,
}: {
  src: string;
  alt: string;
  unoptimized?: boolean;
  /** Pixel size of the previous slot. Logos that already fill it are not enlarged. */
  holdBox?: { width: number; height: number };
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const inkRef = useRef<InkBox | null>(null);
  const [placement, setPlacement] = useState<Placement>({ scale: 1, x: 0, y: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    let cancelled = false;
    inkRef.current = null;
    setReady(false);
    setPlacement({ scale: 1, x: 0, y: 0 });

    const apply = () => {
      const ink = inkRef.current;
      const node = frameRef.current;
      if (!ink || !node || cancelled) return;
      const { width, height } = node.getBoundingClientRect();
      setPlacement(placementForFrame(ink, width, height, holdBox));
      setReady(true);
    };

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      if (inkCache.has(src)) {
        inkRef.current = inkCache.get(src) ?? null;
      } else {
        inkRef.current = measureInk(img);
        inkCache.set(src, inkRef.current);
      }
      if (!inkRef.current) {
        setPlacement({ scale: 1, x: 0, y: 0 });
        setReady(true);
        return;
      }
      apply();
    };
    img.onerror = () => {
      if (cancelled) return;
      setPlacement({ scale: 1, x: 0, y: 0 });
      setReady(true);
    };
    img.src = src;

    const observer = new ResizeObserver(apply);
    observer.observe(frame);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [src, holdBox?.width, holdBox?.height]);

  return (
    <div ref={frameRef} className="relative h-full w-full">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="280px"
        unoptimized={unoptimized}
        className="object-contain"
        style={{
          opacity: ready ? 1 : 0,
          transform:
            Math.abs(placement.scale - 1) > 0.02
              ? `translate(${placement.x}px, ${placement.y}px) scale(${placement.scale})`
              : undefined,
        }}
      />
    </div>
  );
}

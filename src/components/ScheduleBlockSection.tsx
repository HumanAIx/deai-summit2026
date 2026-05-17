'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface ScheduleSpeaker {
  id: string;
  role?: string;
  person_firstname?: string;
  person_surname?: string;
  person_photo?: string;
}

export interface ScheduleAgendaItem {
  id: string;
  title: string;
  description?: string;
  agenda_date?: string;
  start_time?: string;
  end_time?: string;
  stage_id?: string | null;
  stage_name?: string | null;
  company_name?: string | null;
  speakers?: ScheduleSpeaker[];
  gradient_color?: string | null;
  ai_metadata?: Record<string, unknown> | null;
}

export interface HydratedSchedule {
  id: string;
  name?: string;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  agenda_items_by_date?: Record<string, ScheduleAgendaItem[]>;
}

type ViewMode = 'list' | 'grid' | 'timetable';

/* ---------- helpers ---------- */

function formatTime(t?: string) {
  if (!t) return '';
  const parts = String(t).trim().split(':');
  return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : t;
}

function timeToMinutes(t?: string | null): number | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(t).trim());
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function compareItems(a: ScheduleAgendaItem, b: ScheduleAgendaItem) {
  const sa = timeToMinutes(a.start_time);
  const sb = timeToMinutes(b.start_time);
  if (sa == null && sb == null) return (a.title || '').localeCompare(b.title || '');
  if (sa == null) return 1;
  if (sb == null) return -1;
  if (sa !== sb) return sa - sb;
  const ea = timeToMinutes(a.end_time) ?? sa;
  const eb = timeToMinutes(b.end_time) ?? sb;
  if (ea !== eb) return ea - eb;
  return (a.title || '').localeCompare(b.title || '');
}

/** Group sorted items into time buckets keyed by their start time string. */
function groupByStartTime(items: ScheduleAgendaItem[]) {
  const out: Array<{ time: string; items: ScheduleAgendaItem[] }> = [];
  for (const item of items) {
    const key = item.start_time ? formatTime(item.start_time) : '—';
    const tail = out[out.length - 1];
    if (tail && tail.time === key) tail.items.push(item);
    else out.push({ time: key, items: [item] });
  }
  return out;
}

function getSessionColor(item: ScheduleAgendaItem): string | undefined {
  const fromMeta =
    item.ai_metadata && typeof item.ai_metadata.gradient_color === 'string'
      ? (item.ai_metadata.gradient_color as string)
      : undefined;
  const raw = item.gradient_color || fromMeta;
  if (!raw || !String(raw).trim()) return undefined;
  return String(raw).trim();
}

function isCssGradient(value: string): boolean {
  const v = value.toLowerCase();
  return v.includes('gradient(') || v.startsWith('linear-gradient') || v.startsWith('radial-gradient');
}

function isLikelyHex(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value.trim());
}

function hexLuminance(hex: string): number {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return 0.35;
  const r = parseInt(m[1], 16) / 255;
  const g = parseInt(m[2], 16) / 255;
  const b = parseInt(m[3], 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

type CardTone = 'light' | 'dark';

function sessionCardSurface(color: string | undefined): {
  background?: string;
  backgroundImage?: string;
  overlayClass: string;
  textClass: string;
  metaClass: string;
  chipClass: string;
  tone: CardTone;
} {
  if (!color) {
    return {
      background: 'linear-gradient(145deg, #0c1228 0%, #121a38 45%, #0a0e1c 100%)',
      overlayClass: '',
      textClass: 'text-white',
      metaClass: 'text-white/75',
      chipClass: 'bg-white/12 border-white/20 text-white',
      tone: 'dark',
    };
  }
  if (isCssGradient(color)) {
    return {
      backgroundImage: color,
      overlayClass: 'bg-gradient-to-b from-black/25 via-transparent to-black/35',
      textClass: 'text-white',
      metaClass: 'text-white/85',
      chipClass: 'bg-white/15 border-white/25 text-white backdrop-blur-sm',
      tone: 'dark',
    };
  }
  if (isLikelyHex(color)) {
    const light = hexLuminance(color) > 0.62;
    if (light) {
      return {
        background: `linear-gradient(145deg, ${color} 0%, ${color}ee 100%)`,
        overlayClass: 'bg-white/30',
        textClass: 'text-[#050A1F]',
        metaClass: 'text-[#050A1F]/75',
        chipClass: 'bg-[#050A1F]/08 border-[#050A1F]/12 text-[#050A1F]',
        tone: 'light',
      };
    }
    return {
      background: `linear-gradient(155deg, ${color} 0%, ${color}dd 55%, #050A1F 180%)`,
      overlayClass: 'bg-black/15',
      textClass: 'text-white',
      metaClass: 'text-white/80',
      chipClass: 'bg-white/12 border-white/20 text-white backdrop-blur-sm',
      tone: 'dark',
    };
  }
  return {
    background: color,
    overlayClass: 'bg-black/20',
    textClass: 'text-white',
    metaClass: 'text-white/80',
    chipClass: 'bg-white/12 border-white/20 text-white',
    tone: 'dark',
  };
}

function formatDayTab(dateKey: string): { line1: string; line2: string } {
  if (dateKey === 'unset') {
    return { line1: 'Other', line2: 'Unscheduled' };
  }
  const d = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    return { line1: dateKey, line2: '' };
  }
  const line1 = d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase();
  const line2 = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return { line1, line2 };
}

function enumerateDateRange(start?: string | null, end?: string | null): string[] {
  if (!start || !end) return [];
  const s = new Date(`${start}T12:00:00Z`);
  const e = new Date(`${end}T12:00:00Z`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return [];
  const out: string[] = [];
  const cur = new Date(s);
  while (cur <= e) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

/* ---------- markdown ---------- */

function hasMarkdown(text: string): boolean {
  return /(^|\s)[*_~`#>\-]|\*\*|__|\[[^\]]+\]\([^)]+\)|\n\s*[-*+]\s|\n\s*\d+\.\s/.test(text);
}

function Markdown({
  source,
  tone,
  className = '',
}: {
  source: string;
  tone: 'light' | 'dark';
  className?: string;
}) {
  const linkClass = tone === 'light' ? 'underline underline-offset-2' : 'underline underline-offset-2';
  const codeClass =
    tone === 'light'
      ? 'rounded bg-white/15 px-1 py-0.5 font-mono text-[0.85em]'
      : 'rounded bg-black/10 px-1 py-0.5 font-mono text-[0.85em]';
  if (!hasMarkdown(source)) {
    return <p className={className}>{source}</p>;
  }
  return (
    <div className={`schedule-md space-y-2 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ href, children }) => (
            <a href={href ?? '#'} target="_blank" rel="noopener noreferrer" className={linkClass}>
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          code: ({ children }) => <code className={codeClass}>{children}</code>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-current/30 pl-3 italic opacity-90">
              {children}
            </blockquote>
          ),
          h1: ({ children }) => <p className="font-display font-semibold text-lg">{children}</p>,
          h2: ({ children }) => <p className="font-display font-semibold text-base">{children}</p>,
          h3: ({ children }) => <p className="font-display font-semibold text-sm">{children}</p>,
          hr: () => <hr className="border-current/20" />,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}

/* ---------- session card ---------- */

function SessionCard({
  item,
  index,
  density = 'comfortable',
}: {
  item: ScheduleAgendaItem;
  index: number;
  density?: 'comfortable' | 'compact';
}) {
  const color = getSessionColor(item);
  const surface = sessionCardSurface(color);
  const padding = density === 'compact' ? 'p-4 md:p-5' : 'p-6 md:p-8 lg:p-9';
  const titleSize =
    density === 'compact'
      ? 'text-base md:text-lg'
      : 'text-xl md:text-2xl lg:text-[1.65rem]';
  return (
    <div
      className="group relative h-full overflow-hidden rounded-sm border border-[#050A1F]/[0.08] shadow-[0_4px_40px_-12px_rgba(5,10,31,0.35)] ring-1 ring-black/[0.04] [transition:transform_480ms_cubic-bezier(0.4,0,0.2,1),box-shadow_480ms_cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 hover:shadow-[0_12px_48px_-12px_rgba(5,10,31,0.45)]"
      style={{
        animation: `fadeInUp 0.55s cubic-bezier(0.4, 0, 0.2, 1) ${Math.min(index, 12) * 0.05}s both`,
        ...(surface.background ? { background: surface.background } : {}),
        ...(surface.backgroundImage ? { backgroundImage: surface.backgroundImage } : {}),
      }}
    >
      {surface.overlayClass && (
        <div className={`pointer-events-none absolute inset-0 ${surface.overlayClass}`} />
      )}
      <div className={`relative z-[1] ${padding}`}>
        <div className="flex flex-wrap gap-3 items-start justify-between gap-y-2 border-b border-current/10 pb-3 mb-3 md:pb-5 md:mb-5">
          <div className={`font-mono text-xs md:text-sm tracking-wide ${surface.metaClass}`}>
            <span className="font-semibold tabular-nums">
              {formatTime(item.start_time)} – {formatTime(item.end_time)}
            </span>
          </div>
          {item.stage_name && (
            <div
              className={`text-[10px] md:text-xs font-mono uppercase tracking-[0.2em] ${surface.metaClass}`}
            >
              {item.stage_name}
            </div>
          )}
        </div>
        <h3
          className={`${titleSize} font-display font-semibold leading-snug tracking-tight ${surface.textClass}`}
        >
          {item.title}
        </h3>
        {density !== 'compact' && item.description && (
          <Markdown
            source={item.description}
            tone={surface.tone}
            className={`mt-3 md:mt-4 text-sm md:text-base leading-relaxed max-w-4xl ${surface.metaClass}`}
          />
        )}
        {density !== 'compact' && item.company_name && (
          <p className={`mt-4 text-xs md:text-sm uppercase tracking-widest font-mono ${surface.metaClass}`}>
            {item.company_name}
          </p>
        )}
        {item.speakers && item.speakers.length > 0 && (
          <div className={`flex flex-wrap gap-3 ${density === 'compact' ? 'mt-3' : 'mt-6'}`}>
            {item.speakers.map((s) => {
              const photoSize = density === 'compact' ? 'w-[72px] h-[72px]' : 'w-[108px] h-[108px]';
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-3 rounded-full py-2 pl-2 pr-5 border ${surface.chipClass}`}
                >
                  {s.person_photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.person_photo}
                      alt=""
                      className={`${photoSize} rounded-full object-cover ring-2 ring-white/20`}
                    />
                  )}
                  <span className={`text-sm md:text-base font-medium ${surface.textClass}`}>
                    {[s.person_firstname, s.person_surname].filter(Boolean).join(' ')}
                    {s.role ? ` · ${s.role}` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- view: list ---------- */

function ListView({ items }: { items: ScheduleAgendaItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-center py-16 text-[#050A1F]/45 font-mono text-sm uppercase tracking-widest">
        No sessions for this day
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-4 md:gap-5">
      {items.map((item, i) => (
        <li key={item.id}>
          <SessionCard item={item} index={i} />
        </li>
      ))}
    </ul>
  );
}

/* ---------- view: grid (2-column with time gutter) ---------- */

function GridView({ items }: { items: ScheduleAgendaItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-center py-16 text-[#050A1F]/45 font-mono text-sm uppercase tracking-widest">
        No sessions for this day
      </p>
    );
  }
  const groups = groupByStartTime(items);
  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {groups.map((group, gi) => (
        <div
          key={`${group.time}-${gi}`}
          className="grid gap-4 md:gap-6 md:grid-cols-[112px_minmax(0,1fr)]"
        >
          <div className="md:pt-2">
            <p className="font-mono text-[#050A1F] text-base md:text-lg font-semibold tabular-nums">
              {group.time}
            </p>
            <p className="font-mono text-[10px] md:text-xs uppercase tracking-[0.25em] text-[#050A1F]/45 mt-1">
              {group.items.length === 1
                ? '1 session'
                : `${group.items.length} sessions`}
            </p>
          </div>
          <div className="grid gap-4 md:gap-5 md:grid-cols-2">
            {group.items.map((item, i) => (
              <SessionCard key={item.id} item={item} index={gi + i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- view: timetable (matrix by stage) ---------- */

interface TimetableModel {
  startMin: number;
  endMin: number;
  slotMinutes: number;
  slots: number[];
  cols: { id: string; name: string }[];
}

function buildTimetable(items: ScheduleAgendaItem[]): TimetableModel | null {
  const stages = new Map<string, { id: string; name: string }>();
  let hasUnassigned = false;
  let min = Infinity;
  let max = -Infinity;
  for (const item of items) {
    const s = timeToMinutes(item.start_time);
    const eRaw = timeToMinutes(item.end_time);
    const e = eRaw != null ? eRaw : s != null ? s + 60 : null;
    if (s != null) min = Math.min(min, s);
    if (e != null) max = Math.max(max, e);
    const key = item.stage_id || item.stage_name || '';
    if (key) {
      if (!stages.has(key)) {
        stages.set(key, { id: key, name: item.stage_name || 'Stage' });
      }
    } else {
      hasUnassigned = true;
    }
  }
  if (min === Infinity || max === -Infinity) return null;
  const SLOT = 30;
  const startMin = Math.floor(min / SLOT) * SLOT;
  const endMin = Math.max(startMin + SLOT, Math.ceil(max / SLOT) * SLOT);
  const slots: number[] = [];
  for (let t = startMin; t < endMin; t += SLOT) slots.push(t);
  const cols = Array.from(stages.values()).sort((a, b) => a.name.localeCompare(b.name));
  if (hasUnassigned) cols.push({ id: '__unassigned', name: 'Other' });
  return { startMin, endMin, slotMinutes: SLOT, slots, cols };
}

function formatSlotLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function TimetableView({ items }: { items: ScheduleAgendaItem[] }) {
  const model = useMemo(() => buildTimetable(items), [items]);
  if (!model || items.length === 0) {
    return (
      <p className="text-center py-16 text-[#050A1F]/45 font-mono text-sm uppercase tracking-widest">
        No sessions for this day
      </p>
    );
  }
  const ROW_HEIGHT = 56;
  const TIME_COL = 96;
  const MIN_COL = 220;
  const totalRows = model.slots.length;
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `${TIME_COL}px repeat(${model.cols.length}, minmax(${MIN_COL}px, 1fr))`,
    gridTemplateRows: `48px repeat(${totalRows}, ${ROW_HEIGHT}px)`,
  };

  return (
    <div className="rounded-sm border border-[#050A1F]/[0.08] bg-white/85 shadow-[0_4px_40px_-12px_rgba(5,10,31,0.2)] overflow-x-auto">
      <div style={gridStyle} className="relative">
        {/* Top-left corner */}
        <div className="sticky left-0 z-[3] border-r border-b border-[#050A1F]/10 bg-[#0a1228] text-white/70 text-[10px] font-mono uppercase tracking-[0.2em] flex items-center justify-center" />
        {/* Stage headers */}
        {model.cols.map((c, i) => (
          <div
            key={c.id}
            className="border-b border-[#050A1F]/10 bg-[#0a1228] text-white font-display text-sm font-semibold tracking-tight px-4 flex items-center"
            style={{ gridColumn: i + 2, gridRow: 1 }}
          >
            <span className="truncate">{c.name}</span>
          </div>
        ))}
        {/* Time labels + row lines */}
        {model.slots.map((min, ri) => {
          const isHour = min % 60 === 0;
          return (
            <React.Fragment key={`row-${min}`}>
              <div
                className={`sticky left-0 z-[2] flex items-start justify-end pr-3 pt-1 font-mono tabular-nums text-[#050A1F]/70 ${
                  isHour ? 'text-sm font-semibold' : 'text-[11px]'
                } border-r border-[#050A1F]/10 bg-white/95`}
                style={{ gridColumn: 1, gridRow: ri + 2 }}
              >
                {isHour ? formatSlotLabel(min) : ''}
              </div>
              {model.cols.map((c, ci) => (
                <div
                  key={`${c.id}-${min}`}
                  className={`border-l border-[#050A1F]/[0.05] ${
                    isHour ? 'border-t border-[#050A1F]/15' : 'border-t border-dashed border-[#050A1F]/[0.06]'
                  }`}
                  style={{ gridColumn: ci + 2, gridRow: ri + 2 }}
                />
              ))}
            </React.Fragment>
          );
        })}
        {/* Sessions */}
        {items.map((item, i) => {
          const s = timeToMinutes(item.start_time);
          const eRaw = timeToMinutes(item.end_time);
          if (s == null) return null;
          const e = eRaw != null ? eRaw : s + 60;
          const colKey = item.stage_id || item.stage_name || '__unassigned';
          const colIdx = model.cols.findIndex((c) => c.id === colKey);
          if (colIdx < 0) return null;
          const rowStart = Math.max(0, Math.round((s - model.startMin) / model.slotMinutes));
          const rowSpan = Math.max(1, Math.round((e - s) / model.slotMinutes));
          return (
            <div
              key={item.id}
              style={{
                gridColumn: colIdx + 2,
                gridRow: `${rowStart + 2} / span ${rowSpan}`,
                padding: '2px',
              }}
            >
              <SessionCard item={item} index={i} density="compact" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- toolbar buttons ---------- */

function IconBtn({
  active,
  onClick,
  title,
  tone = 'dark',
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  tone?: 'dark' | 'light';
  children: React.ReactNode;
}) {
  const palette =
    tone === 'light'
      ? active
        ? 'bg-brand-cyan/10 border-brand-cyan/55 text-brand-cyan shadow-[0_0_0_1px_rgba(0,176,194,0.18)]'
        : 'bg-white/70 border-[#050A1F]/10 text-[#050A1F]/65 hover:bg-white hover:border-[#050A1F]/20 hover:text-[#050A1F]'
      : active
      ? 'bg-brand-cyan/15 border-brand-cyan/55 text-brand-cyan shadow-[0_0_0_1px_rgba(0,176,194,0.25)]'
      : 'bg-white/[0.04] border-white/10 text-white/80 hover:bg-white/[0.08] hover:border-white/20 hover:text-white';
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={!!active}
      className={[
        'inline-flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-sm border',
        '[transition:background-color_300ms_ease,border-color_300ms_ease,color_300ms_ease,box-shadow_300ms_ease]',
        palette,
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function Toolbar({
  viewMode,
  onViewMode,
  fullscreen,
  onToggleFullscreen,
  tone = 'light',
}: {
  viewMode: ViewMode;
  onViewMode: (m: ViewMode) => void;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  tone?: 'dark' | 'light';
}) {
  const groupClass =
    tone === 'light'
      ? 'flex items-center gap-1 rounded-sm border border-[#050A1F]/10 bg-white/60 p-1'
      : 'flex items-center gap-1 rounded-sm border border-white/10 bg-white/[0.04] p-1';
  return (
    <div className="flex items-center gap-2">
      <div className={`hidden sm:flex ${groupClass}`}>
        <IconBtn tone={tone} active={viewMode === 'list'} onClick={() => onViewMode('list')} title="List view">
          <IconList />
        </IconBtn>
        <IconBtn tone={tone} active={viewMode === 'grid'} onClick={() => onViewMode('grid')} title="Grid view">
          <IconGrid />
        </IconBtn>
        <IconBtn tone={tone} active={viewMode === 'timetable'} onClick={() => onViewMode('timetable')} title="Timetable view">
          <IconMatrix />
        </IconBtn>
      </div>
      <IconBtn
        tone={tone}
        active={fullscreen}
        onClick={onToggleFullscreen}
        title={fullscreen ? 'Exit fullscreen' : 'Use full screen'}
      >
        {fullscreen ? <IconCompress /> : <IconExpand />}
      </IconBtn>
    </div>
  );
}

const IconList = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);
const IconGrid = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
  </svg>
);
const IconMatrix = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="1" />
    <line x1="9" y1="3" x2="9" y2="21" />
    <line x1="15" y1="3" x2="15" y2="21" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
  </svg>
);
const IconExpand = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);
const IconCompress = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="4 14 10 14 10 20" />
    <polyline points="20 10 14 10 14 4" />
    <line x1="14" y1="10" x2="21" y2="3" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

/* ---------- main component ---------- */

export function ScheduleBlockSection({
  title,
  subtitle,
  schedule,
}: {
  title?: string;
  subtitle?: string;
  schedule: HydratedSchedule | null;
}) {
  const dates = useMemo(() => {
    const raw = schedule?.agenda_items_by_date ?? {};
    const keys = Object.keys(raw);
    const rangeDays = enumerateDateRange(schedule?.start_date, schedule?.end_date);
    const merged = new Set<string>(rangeDays);
    keys.filter((k) => k !== 'unset').forEach((k) => merged.add(k));
    const real = Array.from(merged).sort();
    if (keys.includes('unset')) real.push('unset');
    return real;
  }, [schedule]);

  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [fullscreen, setFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (dates.length && (activeDate === null || !dates.includes(activeDate))) {
      setActiveDate(dates[0]);
    }
  }, [dates, activeDate]);

  // Lock body scroll & support ESC while fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [fullscreen]);

  const sortedItems = useMemo(() => {
    if (!activeDate) return [] as ScheduleAgendaItem[];
    const raw = schedule?.agenda_items_by_date?.[activeDate] ?? [];
    return [...raw].sort(compareItems);
  }, [schedule, activeDate]);

  if (!schedule || dates.length === 0) return null;

  const dayBar = (
    <div
      className="w-screen relative left-1/2 -translate-x-1/2 bg-[#060b18]/97 border-y border-white/[0.07] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.45)] backdrop-blur-md"
      style={{ transition: 'box-shadow 480ms cubic-bezier(0.4, 0, 0.2, 1)' }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-cyan/35 to-transparent" />
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 md:py-5">
        <p className="hidden sm:block text-[10px] font-mono uppercase tracking-[0.35em] text-white/40 mb-3 pl-1">
          Programme days
        </p>
        <div className="flex gap-2 md:gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {dates.map((d) => {
            const { line1, line2 } = formatDayTab(d);
            const active = activeDate === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setActiveDate(d)}
                className={[
                  'group flex-shrink-0 min-w-[108px] sm:min-w-[132px] md:flex-1 text-center rounded-sm border px-3 py-3 md:py-4',
                  '[transition:background-color_420ms_cubic-bezier(0.4,0,0.2,1),border-color_420ms_cubic-bezier(0.4,0,0.2,1),transform_420ms_cubic-bezier(0.4,0,0.2,1),box-shadow_420ms_cubic-bezier(0.4,0,0.2,1)]',
                  active
                    ? 'bg-white/[0.09] border-brand-cyan/55 shadow-[0_0_0_1px_rgba(0,176,194,0.25),inset_0_1px_0_rgba(255,255,255,0.08)] scale-[1.02] z-10'
                    : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/15',
                ].join(' ')}
                aria-pressed={active}
              >
                <span
                  className={`block font-display text-lg md:text-xl font-semibold tracking-wide ${
                    active ? 'text-white' : 'text-white/80 group-hover:text-white'
                  } [transition:color_380ms_cubic-bezier(0.4,0,0.2,1)]`}
                >
                  {line1}
                </span>
                {line2 && (
                  <span
                    className={`mt-1 block text-[10px] md:text-xs font-mono uppercase tracking-widest ${
                      active ? 'text-brand-cyan/95' : 'text-white/45 group-hover:text-white/55'
                    } [transition:color_380ms_cubic-bezier(0.4,0,0.2,1)]`}
                  >
                    {line2}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );

  const headingText = title || 'Schedule';
  const intro = (
    <div className="max-w-[1400px] mx-auto px-6 mb-10 md:mb-14">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          {subtitle && (
            <p
              className="text-brand-cyan text-xs md:text-sm font-mono uppercase tracking-[0.28em] mb-3"
              style={{ letterSpacing: '0.22em' }}
            >
              {subtitle}
            </p>
          )}
          <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] font-display font-semibold text-[#050A1F] tracking-tight leading-tight">
            {headingText}
          </h2>
        </div>
        <div className="ml-auto flex-shrink-0">
          <Toolbar
            tone="light"
            viewMode={viewMode}
            onViewMode={setViewMode}
            fullscreen={fullscreen}
            onToggleFullscreen={() => setFullscreen((v) => !v)}
          />
        </div>
      </div>
      {(schedule.description || schedule.name) && (
        <p className="mt-4 text-[#050A1F]/65 text-base md:text-lg max-w-3xl leading-relaxed font-light">
          {schedule.description || schedule.name}
        </p>
      )}
    </div>
  );

  const body = (
    <div key={`${activeDate ?? 'none'}-${viewMode}`} className="max-w-[1400px] mx-auto px-6">
      {viewMode === 'list' && <ListView items={sortedItems} />}
      {viewMode === 'grid' && <GridView items={sortedItems} />}
      {viewMode === 'timetable' && <TimetableView items={sortedItems} />}
    </div>
  );

  const inFlow = (
    <div className="mb-20 md:mb-28">
      <div className="mb-10 md:mb-14">{dayBar}</div>
      {intro}
      {body}
    </div>
  );

  if (!fullscreen) return inFlow;

  const fsContent = (
    <div className="fixed inset-0 z-[10001] overflow-y-auto bg-gradient-to-b from-[#EAE7E2] via-[#F2F0EC] to-[#E8E5E0]">
      <div className="min-h-full pb-20">
        <div className="mb-10 md:mb-14">{dayBar}</div>
        {intro}
        {body}
      </div>
    </div>
  );

  return (
    <>
      {/* Keep a placeholder so the page below doesn't reflow when going fullscreen */}
      <div className="mb-20 md:mb-28" aria-hidden="true" />
      {mounted && createPortal(fsContent, document.body)}
    </>
  );
}

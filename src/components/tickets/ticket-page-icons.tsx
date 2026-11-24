/**
 * The small line icons of the "My Ticket" / "Manage Order" designs. Decorative only (`aria-hidden`): every one sits next
 * to text that says the same thing. `currentColor` unless the design gives the icon its own accent.
 */
type IconProps = { className?: string };

const base = { "aria-hidden": true, focusable: false, fill: "none" } as const;

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg {...base} width="16" height="16" viewBox="0 0 16 16" className={className}>
      <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg {...base} width="13" height="13" viewBox="0 0 16 16" className={className}>
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CalendarIcon({ className, stroke = "currentColor" }: IconProps & { stroke?: string }) {
  return (
    <svg {...base} width="15" height="15" viewBox="0 0 16 16" className={className}>
      <rect x="2" y="3" width="12" height="11" rx="2" stroke={stroke} strokeWidth="1.4" />
      <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function PinIcon({ className }: IconProps) {
  return (
    <svg {...base} width="14" height="14" viewBox="0 0 16 16" className={className}>
      <path d="M8 14.5s5-4.3 5-8.5a5 5 0 10-10 0c0 4.2 5 8.5 5 8.5z" stroke="var(--tk-accent)" strokeWidth="1.3" />
      <circle cx="8" cy="6" r="1.8" stroke="var(--tk-accent)" strokeWidth="1.3" />
    </svg>
  );
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <svg {...base} width="15" height="15" viewBox="0 0 16 16" className={className}>
      <path d="M8 2v8.5M4.5 7L8 10.5 11.5 7M3 13.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BrightnessIcon({ className }: IconProps) {
  return (
    <svg {...base} width="16" height="16" viewBox="0 0 16 16" className={className}>
      <circle cx="8" cy="8" r="3" stroke="var(--tk-accent)" strokeWidth="1.4" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M3 13l1.4-1.4M11.6 4.4L13 3" stroke="var(--tk-accent)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function LockIcon({ className }: IconProps) {
  return (
    <svg {...base} width="14" height="14" viewBox="0 0 14 14" className={className}>
      <rect x="2.5" y="6" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function CheckIcon({ className, stroke = "currentColor", size = 14 }: IconProps & { stroke?: string; size?: number }) {
  return (
    <svg {...base} width={size} height={size} viewBox="0 0 20 20" className={className}>
      <path d="M4 10.5l4 4 8-9" stroke={stroke} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...base} width="14" height="14" viewBox="0 0 14 14" className={className}>
      <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** A small round dot in the text colour (status pills). */
export function Dot({ className = "" }: IconProps) {
  return <span aria-hidden className={`size-1.5 shrink-0 rounded-full bg-current ${className}`} />;
}

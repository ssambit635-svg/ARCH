import { AI_NAME, PRODUCT_NAME } from '@/lib/brand';

/**
 * ARCH mark — a load-bearing arch whose keystone is a live signal.
 *
 * The arch is the oldest structure that holds weight by redirecting it; the pulse inside it is
 * the system still beating. The keystone is drawn in signal blue and *separated* from the arch by a
 * hairline gap, because the keystone is the one stone you never remove — the same way the audit
 * trail is the one record ARCH never lets you lose.
 *
 * Deliberately no gradient fill and no drop shadow: at 16px in a sidebar a gradient mark turns
 * to mud, and a glowing one turns into decoration. Two stroke weights and one accent carry it.
 */
export function LogoMark({ size = 30, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {/* Springline — the ground the arch stands on. */}
      <path d="M3.2 27.1H28.8" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1.3" strokeLinecap="round" />

      {/* Left haunch, stopping short of the crown. */}
      <path
        d="M5.6 27.1V16.5A10.4 10.4 0 0 1 14.18 6.2"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      {/* Right haunch, mirrored. */}
      <path
        d="M17.82 6.2A10.4 10.4 0 0 1 26.4 16.5V27.1"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />

      {/* The incident pulse, still running inside the structure. */}
      <path
        d="M9.4 21.4H12.9L14.85 17.3L17.25 25L19.2 21.4H22.6"
        stroke="var(--arch-accent)"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Keystone — the signal that holds the arch together. */}
      <circle cx="16" cy="5.85" r="1.75" fill="var(--arch-accent)" />
    </svg>
  );
}

export function Logo({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 text-bone ${className}`}>
      <LogoMark size={compact ? 26 : 30} />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="arch-display text-[15px] font-semibold tracking-[0.2em] text-bone">{PRODUCT_NAME}</span>
          <span className="arch-mono mt-1.5 flex items-center gap-1.5 text-[9.5px] font-medium tracking-[0.14em] text-ash-500">
            <span className="size-1 rounded-full bg-signal-500" aria-hidden />
            {AI_NAME}
          </span>
        </span>
      )}
    </span>
  );
}

/**
 * The V1.1 chip. A hairline border, a live dot and mono caps — the way an instrument labels a
 * subsystem, not the way a landing page sells a feature. No gradient, no ring bloom.
 */
export function AiBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`arch-mono inline-flex items-center gap-1.5 rounded-[5px] border border-signal-500/25 bg-signal-500/[0.07] px-2 py-[3px] text-[10px] font-bold tracking-[0.1em] text-signal-300 ${className}`}
    >
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-pulse-dot rounded-full bg-signal-400" aria-hidden />
        <span className="relative inline-flex size-1.5 rounded-full bg-signal-500" />
      </span>
      {AI_NAME}
    </span>
  );
}

export function SparkIcon({ className = 'size-3' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M8 0l1.4 5.2L14.5 6.5l-5.1 1.3L8 13l-1.4-5.2L1.5 6.5l5.1-1.3L8 0z" opacity="0.95" />
      <path d="M13 10l.7 2.6 2.6.7-2.6.7L13 16.6l-.7-2.6-2.6-.7 2.6-.7L13 10z" opacity="0.6" />
    </svg>
  );
}

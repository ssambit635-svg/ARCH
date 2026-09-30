import React from 'react';

/**
 * ARCH Brand Logo & Mark.
 * ARCH dragon emblem with Orbitron typography.
 */
export function LogoMark({
  className = '',
  size = 22,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center select-none ${className}`}
      aria-label="ARCH Logo Mark"
    >
      <img
        src="/dragon-mark.webp"
        alt="ARCH Dragon Mark"
        width={size}
        height={size}
        style={{ width: `${size}px`, height: `${size}px` }}
        className="object-contain drop-shadow-[0_0_10px_rgba(59,142,244,0.28)] shrink-0"
      />
    </span>
  );
}

export function Logo({
  subtitle = 'Incident Platform',
  compact = false,
  className = '',
}: {
  subtitle?: string | null;
  compact?: boolean;
  className?: string;
}) {
  const iconSize = compact ? 22 : 28;

  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <img
        src="/dragon-mark.webp"
        alt="ARCH Logo"
        width={iconSize}
        height={iconSize}
        style={{ width: `${iconSize}px`, height: `${iconSize}px` }}
        className="object-contain drop-shadow-[0_0_12px_rgba(59,142,244,0.28)] shrink-0 transition-transform duration-300 hover:scale-105"
      />
      <span className="flex flex-col leading-none">
        <span className="inline-flex items-baseline gap-2">
          <span
            className={`font-orbitron font-bold tracking-[-0.03em] text-white ${
              compact ? 'text-[15px]' : 'text-[18px]'
            }`}
          >
            ARCH<span className="text-[#3b8ef4]">.</span>
          </span>
          <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-[0.06em] text-zinc-400">
            v1.1
          </span>
        </span>
        {subtitle && !compact && (
          <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}

export function AiBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-[#222] bg-[#0c0d11] px-2.5 py-0.5 font-mono text-[11px] font-medium text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${className}`}
    >
      <img
        src="/dragon-mark.webp"
        alt=""
        className="h-3.5 w-3.5 object-contain"
      />
      <span>ARCH V1.1</span>
    </span>
  );
}

export function SparkIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M8 1.2 9.45 6.1 14.35 7.55 9.45 9 8 13.9 6.55 9 1.65 7.55 6.55 6.1 8 1.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

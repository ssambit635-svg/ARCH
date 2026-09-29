import React from 'react';

/**
 * Pure typographic wordmark following Vengeance UI & the reference hero ("ARCH.").
 * No custom invented SVG logo icon is rendered.
 */
export function LogoMark({ className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-baseline font-orbitron text-xs font-extrabold tracking-tight text-white select-none ${className}`}
      aria-hidden
    >
      A<span className="text-[#FEF62A]">.</span>
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
  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <span className="flex flex-col leading-none">
        <span className="inline-flex items-baseline gap-2">
          <span
            className={`font-orbitron font-bold tracking-[-0.03em] text-white ${
              compact ? 'text-[15px]' : 'text-[18px]'
            }`}
          >
            ARCH<span className="text-[#FEF62A]">.</span>
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
      <span className="h-1.5 w-1.5 rounded-full bg-[#FEF62A]" aria-hidden />
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

import { AI_NAME, PRODUCT_NAME } from '@/lib/brand';

/** ARCH mark — an abstract "A" formed by an incident pulse resolving upward. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id="arch-mark" x1="4" y1="28" x2="28" y2="4" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#A855F7" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#arch-mark)" fillOpacity="0.16" />
      <rect x="1" y="1" width="30" height="30" rx="8" stroke="url(#arch-mark)" strokeOpacity="0.5" />
      <path
        d="M7 22 L13.5 10 L17 17 L19.5 13.5 L25 22"
        stroke="url(#arch-mark)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="25" cy="22" r="1.6" fill="#A78BFA" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={compact ? 28 : 32} />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-[15px] font-bold tracking-[0.18em] text-white">{PRODUCT_NAME}</span>
          <span className="arch-mono mt-1 text-[10px] font-medium tracking-wider text-indigo-400/90">{AI_NAME}</span>
        </span>
      )}
    </span>
  );
}

/** Small "ARCH V1.1" pill used wherever the native intelligence appears. */
export function AiBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500/25 to-violet-500/25 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-violet-200 ring-1 ring-inset ring-violet-500/40">
      <SparkIcon />
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

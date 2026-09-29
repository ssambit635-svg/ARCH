import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Button system — one visual language for links-that-look-like-buttons and real buttons.
 * Server-safe; for pending states inside forms keep using SubmitButton from ui/form.
 *
 * Hierarchy is carried by *contrast and edge*, never by colour or glow:
 *   primary   bone on graphite — the highest-contrast thing on the surface
 *   signal    signal-blue wash — for ARCH-intelligence actions, the one accent
 *   secondary hairline panel — the default, quiet
 *   danger    severity red — reserved for destructive acts
 *   ghost     no surface at all
 *
 * Radii are 8px, tighter than a marketing card: these are instrument controls.
 */

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'ai';
type Size = 'sm' | 'md' | 'lg';

const base =
  'relative inline-flex items-center justify-center overflow-hidden rounded-lg font-medium ' +
  'transition-[transform,background-color,border-color,color,box-shadow] duration-200 ease-out ' +
  'active:scale-[0.985] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45';

const variants: Record<Variant, string> = {
  // Top-light inset + neutral elevation. A specular edge, not a coloured bloom.
  primary:
    'arch-sheen bg-bone text-ink-1000 shadow-[0_1px_0_0_rgb(255_255_255/0.5)_inset,0_10px_24px_-14px_rgb(0_0_0/0.9)] hover:bg-white',
  secondary:
    'border border-white/[0.09] bg-white/[0.028] text-ash-200 hover:border-white/[0.2] hover:bg-white/[0.06] hover:text-bone',
  danger:
    'arch-sheen bg-sev-critical text-white shadow-[0_1px_0_0_rgb(255_255_255/0.22)_inset,0_10px_24px_-14px_rgb(0_0_0/0.9)] hover:brightness-110',
  ghost: 'text-ash-400 hover:bg-white/[0.055] hover:text-bone',
  // The intelligence action: a signal-blue wash behind a hairline, text stays readable.
  ai: 'border border-signal-500/28 bg-signal-500/[0.09] text-signal-200 hover:border-signal-500/45 hover:bg-signal-500/[0.14] hover:text-signal-100',
};

const sizes: Record<Size, string> = {
  sm: 'gap-1.5 px-2.5 py-1.5 text-[13px]',
  md: 'gap-2 px-3.5 py-2 text-sm',
  lg: 'gap-2 px-4.5 py-2.5 text-[15px]',
};

function classes(variant: Variant, size: Size, className: string) {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`;
}

export function ButtonLink({
  href,
  children,
  variant = 'secondary',
  size = 'md',
  className = '',
  prefetch,
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  prefetch?: boolean;
}) {
  return (
    <Link href={href} prefetch={prefetch} className={classes(variant, size, className)}>
      {children}
    </Link>
  );
}

export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button {...props} className={classes(variant, size, className)}>
      {children}
    </button>
  );
}

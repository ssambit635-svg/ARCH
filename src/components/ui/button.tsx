import Link from 'next/link';
import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'ai';
type Size = 'sm' | 'md' | 'lg';

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-white text-[#050608] hover:bg-zinc-200 active:bg-zinc-300 border border-white/80 font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_10px_26px_-18px_rgba(0,0,0,0.75)]',
  secondary:
    'bg-[#111216] hover:bg-[#18191f] text-white border border-[#222] hover:border-zinc-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
  outline:
    'bg-transparent hover:bg-white/[0.04] text-zinc-200 hover:text-white border border-[#222] hover:border-zinc-700',
  ghost:
    'bg-transparent hover:bg-white/[0.04] text-zinc-400 hover:text-white border border-transparent',
  danger:
    'bg-crit-500/15 hover:bg-crit-500/25 text-crit-400 border border-crit-500/35 hover:border-crit-500/55',
  ai:
    'bg-[#FEF62A] text-[#050608] hover:bg-[#f5ec1f] border border-[#FEF62A] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_10px_26px_-18px_rgba(254,246,42,0.35)]',
};

const sizeStyles: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
  md: 'h-9 px-3.5 text-xs font-medium gap-1.5 rounded-lg',
  lg: 'h-10 px-4 text-sm font-medium gap-2 rounded-lg',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    children,
    className = '',
    disabled,
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium tracking-tight transition-all duration-150 select-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...rest}
    >
      {loading ? (
        <span
          className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
          aria-hidden
        />
      ) : (
        leftIcon
      )}
      {children}
      {rightIcon}
    </button>
  );
});

export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  prefetch,
  children,
  className = '',
  ...rest
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  prefetch?: boolean;
  children: React.ReactNode;
  className?: string;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={`inline-flex items-center justify-center font-medium tracking-tight transition-all duration-150 select-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...rest}
    >
      {children}
    </Link>
  );
}

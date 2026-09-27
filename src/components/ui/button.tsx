import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Button system — one visual language for links-that-look-like-buttons and real buttons.
 * Server-safe; for pending states inside forms keep using SubmitButton from ui/form.
 */

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'ai';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-[0_4px_16px_-4px_rgb(99_102_241/0.6)] ring-1 ring-inset ring-white/10 hover:from-indigo-400 hover:to-indigo-500',
  secondary: 'border border-white/10 bg-white/[0.04] text-slate-200 hover:border-white/20 hover:bg-white/[0.08]',
  danger:
    'bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-[0_4px_16px_-4px_rgb(244_63_94/0.6)] ring-1 ring-inset ring-white/10 hover:from-rose-400 hover:to-rose-500',
  ghost: 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-100',
  ai: 'bg-gradient-to-r from-indigo-500/25 to-violet-500/25 text-violet-100 ring-1 ring-inset ring-violet-500/40 hover:from-indigo-500/35 hover:to-violet-500/35',
};

const sizes: Record<Size, string> = {
  sm: 'px-2.5 py-1.5 text-[13px] gap-1.5',
  md: 'px-3.5 py-2 text-sm gap-2',
  lg: 'px-4 py-2.5 text-sm gap-2',
};

function classes(variant: Variant, size: Size, className: string) {
  return `inline-flex items-center justify-center rounded-xl font-medium transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`;
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

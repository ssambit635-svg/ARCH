import type { ReactNode } from 'react';

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="arch-mono inline-flex min-w-5 items-center justify-center rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[11px] font-medium text-slate-300 shadow-[0_1px_0_rgb(255_255_255/0.08)_inset]">
      {children}
    </kbd>
  );
}

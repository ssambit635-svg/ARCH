import type { ReactNode } from 'react';

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="arch-mono inline-flex min-w-5 items-center justify-center rounded-[5px] border border-white/[0.11] bg-white/[0.05] px-1.5 py-0.5 text-[11px] font-medium text-ash-300 shadow-[0_1px_0_rgb(255_255_255/0.07)_inset,0_1px_2px_rgb(0_0_0/0.6)]">
      {children}
    </kbd>
  );
}

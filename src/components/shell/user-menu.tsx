'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { logoutAction } from '@/app/(auth)/actions';

export function UserMenu({ user, role, statusSlug }: { user: { email: string; name: string | null }; role: string; statusSlug: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open ]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="rounded-full ring-2 ring-transparent transition hover:ring-signal-500/50"
      >
        <Avatar name={user.name} email={user.email} />
      </button>

      {open ? (
        <div role="menu" className="layer-shadow absolute right-0 top-full z-50 mt-2 w-60 animate-scale-in rounded-xl border border-white/10 bg-abyss-850 p-1.5">
          <div className="flex items-center gap-3 px-2.5 py-2.5">
            <Avatar name={user.name} email={user.email} size="lg" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold text-slate-100">{user.name ?? 'On-call'}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
              <p className="mt-1 inline-block rounded-md bg-white/[0.07] px-1.5 py-px text-[10px] font-bold uppercase tracking-wider text-slate-300">
                {role}
              </p>
            </div>
          </div>
          <div className="my-1 h-px bg-white/[0.07]" />
          <Link
            href="/dashboard/settings"
            onClick={() => setOpen(false)}
            role="menuitem"
            className="block rounded-lg px-2.5 py-2 text-[13px] text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
          >
            Organization settings
          </Link>
          <Link
            href={`/status/${statusSlug}`}
            prefetch={false}
            onClick={() => setOpen(false)}
            role="menuitem"
            className="block rounded-lg px-2.5 py-2 text-[13px] text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
          >
            View public status page
          </Link>
          <div className="my-1 h-px bg-white/[0.07]" />
          <form action={logoutAction}>
            <button
              type="submit"
              role="menuitem"
              className="block w-full rounded-lg px-2.5 py-2 text-left text-[13px] text-rose-300 transition hover:bg-rose-500/10"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

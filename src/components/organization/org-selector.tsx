'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { switchOrganizationAction } from '@/app/dashboard/actions';

/** Polished organization switcher — dropdown with roles, keyboard-friendly. */
export function OrgSelector({
  organizations,
  current,
}: {
  organizations: { id: string; name: string; role: string }[];
  current: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const active = organizations.find((org) => org.id === current) ?? organizations[0];

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

  if (!active) return null;

  const switchTo = (organizationId: string) => {
    if (organizationId === current) {
      setOpen(false);
      return;
    }
    const formData = new FormData();
    formData.set('organizationId', organizationId);
    setOpen(false);
    startTransition(async () => {
      await switchOrganizationAction(formData);
      router.refresh();
    });
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={pending}
        className="group flex max-w-56 items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] py-1.5 pl-1.5 pr-2.5 transition hover:border-white/15 hover:bg-white/[0.06] disabled:opacity-60"
      >
        <span
          aria-hidden="true"
          className="grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white"
        >
          {active.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 text-left leading-tight">
          <span className="block truncate text-[13px] font-semibold text-slate-100">{active.name}</span>
          <span className="block text-[11px] capitalize text-slate-500">{active.role.toLowerCase()}</span>
        </span>
        <svg viewBox="0 0 16 16" className={`size-3.5 shrink-0 text-slate-500 transition ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Organizations"
          className="layer-shadow absolute left-0 top-full z-50 mt-2 w-64 animate-scale-in rounded-xl border border-white/10 bg-abyss-850 p-1.5"
        >
          <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Switch organization</p>
          {organizations.map((org) => {
            const isActive = org.id === current;
            return (
              <button
                key={org.id}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => switchTo(org.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${
                  isActive ? 'bg-white/[0.07]' : 'hover:bg-white/[0.05]'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 text-xs font-bold text-white"
                >
                  {org.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-[13px] font-medium text-slate-100">{org.name}</span>
                  <span className="block text-[11px] capitalize text-slate-500">{org.role.toLowerCase()}</span>
                </span>
                {isActive ? (
                  <svg viewBox="0 0 16 16" className="size-4 shrink-0 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M3.5 8.5l3 3 6-7" />
                  </svg>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

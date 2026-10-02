'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { switchOrganizationAction } from '@/app/dashboard/actions';

/** Workspace switcher — intentionally compact in the product chrome. */
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
  }, [open]);

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
    <div ref={ref} className="arch-org-switcher">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={pending}
        className="arch-org-trigger"
      >
        <span aria-hidden="true" className="arch-org-avatar">{active.name.slice(0, 1).toUpperCase()}</span>
        <span className="arch-org-copy">
          <span className="arch-org-name">{active.name}</span>
          <span className="arch-org-role">{active.role.toLowerCase()}</span>
        </span>
        <svg viewBox="0 0 16 16" className={`arch-org-chevron${open ? ' is-open' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {open ? (
        <div role="listbox" aria-label="Organizations" className="arch-popover arch-org-popover">
          <p className="arch-popover-label">Switch workspace</p>
          {organizations.map((org) => {
            const isActive = org.id === current;
            return (
              <button
                key={org.id}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => switchTo(org.id)}
                className={`arch-org-option${isActive ? ' is-selected' : ''}`}
              >
                <span aria-hidden="true" className="arch-org-avatar arch-org-avatar--small">{org.name.slice(0, 1).toUpperCase()}</span>
                <span className="arch-org-copy">
                  <span className="arch-org-name">{org.name}</span>
                  <span className="arch-org-role">{org.role.toLowerCase()}</span>
                </span>
                {isActive ? <span className="arch-org-check" aria-hidden>✓</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

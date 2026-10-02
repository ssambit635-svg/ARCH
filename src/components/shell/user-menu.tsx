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
  }, [open]);

  return (
    <div ref={ref} className="arch-user-menu">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="arch-user-menu-trigger"
      >
        <Avatar name={user.name} email={user.email} />
      </button>

      {open ? (
        <div role="menu" className="arch-popover arch-user-popover">
          <div className="arch-user-card">
            <Avatar name={user.name} email={user.email} size="lg" />
            <div className="arch-user-copy">
              <p className="arch-user-name">{user.name ?? 'On-call'}</p>
              <p className="arch-user-email">{user.email}</p>
              <span className="arch-user-role">{role}</span>
            </div>
          </div>
          <div className="arch-popover-divider" />
          <Link href="/dashboard/settings" onClick={() => setOpen(false)} role="menuitem" className="arch-popover-link">
            Workspace settings
          </Link>
          <Link href={`/status/${statusSlug}`} prefetch={false} onClick={() => setOpen(false)} role="menuitem" className="arch-popover-link">
            Public status page
          </Link>
          <div className="arch-popover-divider" />
          <form action={logoutAction}>
            <button type="submit" role="menuitem" className="arch-popover-link arch-popover-link--danger">
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

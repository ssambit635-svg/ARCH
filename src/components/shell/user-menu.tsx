'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Avatar, initialsOf } from '@/components/ui/avatar';
import { usePopupMenu } from '@/components/ui/use-popup-menu';
import { statusPageDestination, type PublishedStatusPage } from '@/lib/workspace-view';
import { logoutAction } from '@/app/(auth)/actions';
import { SystemThemeButton, ThemeToggle } from './workspace-theme';

export function UserMenu({
  user,
  role,
  statusPage,
  onShortcuts,
}: {
  user: { email: string; name: string | null };
  role: string;
  statusPage: PublishedStatusPage;
  onShortcuts: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menu = usePopupMenu(open, setOpen);
  const status = statusPageDestination(statusPage);
  return (
    <div ref={menu.containerRef} className="arch-user-menu">
      <button
        ref={menu.triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        onKeyDown={menu.onTriggerKeyDown}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? 'workspace-account-menu' : undefined}
        aria-label={`Account menu ${initialsOf(user.name, user.email)}`}
        className="arch-user-menu-trigger"
      >
        <Avatar name={user.name} email={user.email} />
      </button>
      {open ? (
        <div
          ref={menu.menuRef}
          id="workspace-account-menu"
          role="menu"
          aria-label="Account"
          className="arch-popover arch-user-popover"
        >
          <div className="arch-user-card" role="presentation">
            <Avatar name={user.name} email={user.email} size="lg" />
            <div className="arch-user-copy">
              <p className="arch-user-name">{user.name ?? 'Your account'}</p>
              <p className="arch-user-email">{user.email}</p>
              <span className="arch-user-role">{role.toLowerCase()}</span>
            </div>
          </div>
          <div className="arch-popover-divider" role="separator" />
          <Link
            href="/dashboard/settings"
            onClick={() => menu.close()}
            role="menuitem"
            tabIndex={-1}
            className="arch-popover-link"
          >
            Workspace settings
          </Link>
          <Link
            href={status.href}
            prefetch={false}
            target={status.public ? '_blank' : undefined}
            rel={status.public ? 'noopener noreferrer' : undefined}
            onClick={() => menu.close()}
            role="menuitem"
            tabIndex={-1}
            className="arch-popover-link"
          >
            {status.public ? 'Public status page' : 'Status pages'}
          </Link>
          <div className="arch-popover-divider" role="separator" />
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            aria-haspopup="dialog"
            className="arch-popover-link"
            onClick={() => {
              menu.close();
              onShortcuts();
            }}
          >
            Keyboard shortcuts <span aria-hidden="true">?</span>
          </button>
          <ThemeToggle menuItem />
          <SystemThemeButton />
          <div className="arch-popover-divider" role="separator" />
          <form action={logoutAction} role="presentation">
            <button
              type="submit"
              role="menuitem"
              tabIndex={-1}
              className="arch-popover-link arch-popover-link--danger"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

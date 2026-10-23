'use client';

import { useState, useTransition } from 'react';
import { switchOrganizationAction } from '@/app/dashboard/actions';
import { usePopupMenu } from '@/components/ui/use-popup-menu';
import { toast } from '@/components/ui/toast';

/** Workspace identity stays visible; switching never trusts the browser's organization or role. */
export function OrgSelector({
  organizations,
  current,
}: {
  organizations: { id: string; name: string; role: string }[];
  current: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const menu = usePopupMenu(open, setOpen);
  const active = organizations.find((org) => org.id === current) ?? organizations[0];
  if (!active) return null;
  const switchTo = (organizationId: string) => {
    menu.close();
    if (organizationId === current) return;
    const formData = new FormData();
    formData.set('organizationId', organizationId);
    startTransition(async () => {
      try {
        await switchOrganizationAction(formData);
      } catch {
        toast('Could not switch workspaces. Please try again.', 'error');
      }
    });
  };
  return (
    <div ref={menu.containerRef} className="arch-org-switcher" aria-busy={pending}>
      <button
        ref={menu.triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        onKeyDown={menu.onTriggerKeyDown}
        aria-label={`${active.name.slice(0, 1).toUpperCase()} ${pending ? 'Switching…' : active.name} ${active.role.toLowerCase()} · Switch workspace`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? 'workspace-organizations' : undefined}
        disabled={pending}
        className="arch-org-trigger"
      >
        <span aria-hidden="true" className="arch-org-avatar">
          <svg width="100%" height="100%" aria-hidden="true" focusable="false">
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="central"
              fill="currentColor"
            >
              {active.name.slice(0, 1).toUpperCase()}
            </text>
          </svg>
        </span>{' '}
        <span className="arch-org-copy">
          <span className="arch-org-name">{pending ? 'Switching…' : active.name}</span>{' '}
          <span className="arch-org-role">{active.role.toLowerCase()}</span>
        </span>
        <svg
          viewBox="0 0 16 16"
          className={`arch-org-chevron${open ? ' is-open' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      {open ? (
        <div
          ref={menu.menuRef}
          id="workspace-organizations"
          role="menu"
          aria-label="Switch workspace"
          className="arch-popover arch-org-popover"
        >
          <p className="arch-popover-label" role="presentation">
            Your workspaces
          </p>
          {organizations.map((org) => (
            <button
              key={org.id}
              type="button"
              role="menuitemradio"
              tabIndex={-1}
              aria-checked={org.id === current}
              onClick={() => switchTo(org.id)}
              className={`arch-org-option${org.id === current ? ' is-selected' : ''}`}
            >
              <span aria-hidden="true" className="arch-org-avatar arch-org-avatar--small">
                <svg width="100%" height="100%" aria-hidden="true" focusable="false">
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="currentColor"
                  >
                    {org.name.slice(0, 1).toUpperCase()}
                  </text>
                </svg>
              </span>
              <span className="arch-org-copy">
                <span className="arch-org-name">{org.name}</span>
                <span className="arch-org-role">{org.role.toLowerCase()}</span>
              </span>
              {org.id === current ? (
                <span className="arch-org-check" aria-hidden="true">
                  ✓
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

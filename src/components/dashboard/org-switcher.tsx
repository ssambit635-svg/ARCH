'use client';

import { useTransition } from 'react';
import { switchOrganizationAction } from '@/app/dashboard/actions';

/** Switches the "current organization" cookie; membership is verified again server-side. */
export function OrganizationSwitcher({
  organizations,
  current,
}: {
  organizations: { id: string; name: string; role: string }[];
  current: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm text-slate-400">
      <span className="sr-only">Current organization</span>
      <select
        className="rounded-lg border border-slate-700 bg-slate-950/60 px-2.5 py-1.5 text-sm text-slate-100 disabled:opacity-60"
        defaultValue={current}
        disabled={pending || organizations.length <= 1}
        onChange={(event) => {
          const formData = new FormData();
          formData.set('organizationId', event.target.value);
          startTransition(() => {
            void switchOrganizationAction(formData);
          });
        }}
      >
        {organizations.map((organization) => (
          <option key={organization.id} value={organization.id}>
            {organization.name} · {organization.role}
          </option>
        ))}
      </select>
    </label>
  );
}

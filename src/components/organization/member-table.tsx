'use client';

import { useMemo, useState } from 'react';
import { timeAgo } from '@/lib/format';
import { ROLES } from '@/lib/roles';
import { Avatar } from '@/components/ui/avatar';
import { Badge, Table } from '@/components/ui';
import { Input, Select } from '@/components/ui/form';
import { ActionForm } from '@/components/dashboard/action-form';
import { changeMemberRoleAction, removeMemberAction } from '@/app/dashboard/actions';
import { filterMembers } from './member-filter';

export type MemberRow = {
  userId: string;
  role: string;
  createdAt: Date;
  user: { name: string | null; email: string };
};

const roleTone: Record<string, 'accent' | 'neutral' | 'success' | 'warning'> = {
  OWNER: 'accent',
  ADMIN: 'success',
  RESPONDER: 'warning',
  VIEWER: 'neutral',
};

function roleLabel(role: string) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

/** Searchable organization roster; membership changes remain server-authorized actions. */
export function MemberTable({ members, currentUserId, canManage }: { members: MemberRow[]; currentUserId: string; canManage: boolean }) {
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const filteredMembers = useMemo(() => filterMembers(members, query, roleFilter), [members, query, roleFilter]);
  const head = canManage ? ['Member', 'Role', 'Joined', 'Actions'] : ['Member', 'Role', 'Joined'];

  return (
    <>
      <div className="grid gap-3 border-b border-white/[0.06] px-5 py-4 sm:grid-cols-[minmax(14rem,1fr)_12rem] sm:items-center">
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or email"
          aria-label="Search team members by name or email"
          autoComplete="off"
        />
        <Select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          aria-label="Filter team members by role"
        >
          <option value="ALL">All roles</option>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {roleLabel(role)}
            </option>
          ))}
        </Select>
        <p className="text-xs tabular-nums text-slate-500 sm:col-span-2" role="status" aria-live="polite">
          {filteredMembers.length === members.length
            ? `${members.length} member${members.length === 1 ? '' : 's'}`
            : `Showing ${filteredMembers.length} of ${members.length} members`}
        </p>
      </div>

      <Table head={head}>
        {filteredMembers.map((member) => (
          <tr key={member.userId} className="link-row hover:bg-white/[0.02]">
            <td className="px-4 py-3 first:pl-5">
              <span className="flex items-center gap-3">
                <Avatar name={member.user.name} email={member.user.email} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-100">
                    {member.user.name ?? '—'}
                    {member.userId === currentUserId ? <span className="ml-2 text-xs font-normal text-slate-500">(you)</span> : null}
                  </span>
                  <span className="block truncate text-xs text-slate-500">{member.user.email}</span>
                </span>
              </span>
            </td>
            <td className="px-4 py-3">
              <Badge tone={roleTone[member.role] ?? 'neutral'}>{member.role}</Badge>
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-[13px] text-slate-400">{timeAgo(member.createdAt)}</td>
            {canManage ? (
              <td className="px-4 py-3 last:pr-5">
                <span className="flex flex-wrap items-center gap-2">
                  <ActionForm action={changeMemberRoleAction} submitLabel="Save" variant="secondary" inline quiet>
                    <input type="hidden" name="userId" value={member.userId} />
                    <Select name="role" defaultValue={member.role} className="w-32 !py-1.5 text-[13px]" aria-label={`Role for ${member.user.email}`}>
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </Select>
                  </ActionForm>
                  {member.userId !== currentUserId ? (
                    <ActionForm
                      action={removeMemberAction}
                      submitLabel="Remove"
                      variant="danger"
                      inline
                      quiet
                      confirm={`Remove ${member.user.name ?? member.user.email} from this organization?`}
                    >
                      <input type="hidden" name="userId" value={member.userId} />
                    </ActionForm>
                  ) : null}
                </span>
              </td>
            ) : null}
          </tr>
        ))}
        {filteredMembers.length === 0 ? (
          <tr>
            <td colSpan={canManage ? 4 : 3} className="px-5 py-8 text-center text-sm text-slate-400">
              {members.length === 0 ? 'No members yet.' : 'No members match. Try another name, email, or role.'}
            </td>
          </tr>
        ) : null}
      </Table>
    </>
  );
}

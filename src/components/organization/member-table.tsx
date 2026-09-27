import { timeAgo } from '@/lib/format';
import { ROLES } from '@/lib/permissions';
import { Avatar } from '@/components/ui/avatar';
import { Badge, Table } from '@/components/ui';
import { Select } from '@/components/ui/form';
import { ActionForm } from '@/components/dashboard/action-form';
import { changeMemberRoleAction, removeMemberAction } from '@/app/dashboard/actions';

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

/** Organization member list with role management. Server component — mutations go through actions. */
export function MemberTable({ members, currentUserId, canManage }: { members: MemberRow[]; currentUserId: string; canManage: boolean }) {
  return (
    <Table head={['Member', 'Role', 'Joined', canManage ? 'Actions' : '']}>
      {members.map((member) => (
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
          <td className="px-4 py-3 last:pr-5">
            {canManage ? (
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
                  <ActionForm action={removeMemberAction} submitLabel="Remove" variant="danger" inline quiet>
                    <input type="hidden" name="userId" value={member.userId} />
                  </ActionForm>
                ) : null}
              </span>
            ) : (
              <span className="text-xs text-slate-600">—</span>
            )}
          </td>
        </tr>
      ))}
    </Table>
  );
}

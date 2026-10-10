export type MemberSearchRecord = {
  role: string;
  user: { name: string | null; email: string };
};

/** Filter a member roster locally; matching is case-insensitive and ignores outer whitespace. */
export function filterMembers<T extends MemberSearchRecord>(members: readonly T[], query: string, role: string): T[] {
  const normalizedQuery = query.trim().toLowerCase();

  return members.filter((member) => {
    if (role !== 'ALL' && member.role !== role) return false;
    if (!normalizedQuery) return true;

    const searchableText = `${member.user.name ?? ''}\n${member.user.email}`.toLowerCase();
    return searchableText.includes(normalizedQuery);
  });
}

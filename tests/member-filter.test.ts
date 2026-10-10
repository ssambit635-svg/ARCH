import { describe, expect, it } from 'vitest';
import { filterMembers } from '@/components/organization/member-filter';

const members = [
  { userId: '1', role: 'OWNER', user: { name: 'Asha Sen', email: 'asha@example.com' } },
  { userId: '2', role: 'RESPONDER', user: { name: 'Dev Patel', email: 'dev@example.com' } },
  { userId: '3', role: 'VIEWER', user: { name: null, email: 'oncall@example.com' } },
];

describe('filterMembers', () => {
  it('returns the full roster for a blank query and all roles', () => {
    expect(filterMembers(members, '   ', 'ALL')).toEqual(members);
  });

  it('matches names and emails without case sensitivity or outer whitespace', () => {
    expect(filterMembers(members, '  ASHA ', 'ALL').map((member) => member.userId)).toEqual(['1']);
    expect(filterMembers(members, 'ONCALL@EXAMPLE.COM', 'ALL').map((member) => member.userId)).toEqual(['3']);
  });

  it('applies the selected role together with the text query', () => {
    expect(filterMembers(members, 'example.com', 'RESPONDER').map((member) => member.userId)).toEqual(['2']);
    expect(filterMembers(members, 'asha', 'VIEWER')).toEqual([]);
  });

  it('does not mutate the source roster', () => {
    const original = [...members];
    filterMembers(members, 'dev', 'ALL');
    expect(members).toEqual(original);
  });
});

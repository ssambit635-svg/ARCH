import { describe, expect, it } from 'vitest';
import { matchGithubHowto } from '@/server/ai/repo-insight/howto';

describe('GitHub how-to (Repo Insight)', () => {
  it('answers making a repo private without offering to change GitHub', () => {
    const hits = matchGithubHowto('mein apne repo ko pvt kaise banaun');
    expect(hits[0]?.id).toBe('make-private');
    expect(hits[0]?.answer).toMatch(/Danger Zone/i);
    expect(hits[0]?.answer).toMatch(/will not flip visibility/i);
  });

  it('answers PAT rotation separately from login OAuth', () => {
    const hits = matchGithubHowto('rotate GITHUB_TOKEN pat scope');
    expect(hits[0]?.id).toBe('pat');
    expect(hits[0]?.answer).toMatch(/AUTH_GITHUB_ID/);
  });

  it('does not match unrelated questions', () => {
    expect(matchGithubHowto('what is a monad')).toEqual([]);
  });
});

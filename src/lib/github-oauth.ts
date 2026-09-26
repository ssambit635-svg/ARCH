import GitHub, { type GitHubProfile } from 'next-auth/providers/github';
import { z } from 'zod';

/**
 * GitHub's default Auth.js profile lookup uses the first email returned by /user/emails when the
 * public email is hidden. That email may not be verified. Only a verified email may become an ARCH
 * user identity (and we never silently link it to an existing password account).
 */
export function verifiedGithubEmail(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const verified = value.filter((entry): entry is { email: string; primary: boolean; verified: true } =>
    entry !== null && typeof entry === 'object' && entry.verified === true &&
    typeof entry.email === 'string' && z.email().safeParse(entry.email).success,
  );
  const preferred = verified.find((entry) => entry.primary === true) ?? verified[0];
  return preferred?.email.toLowerCase() ?? null;
}

/** Fetch a GitHub profile and its *verified* email; never log an access token or API body. */
export async function fetchVerifiedGithubProfile(accessToken: string, fetcher: typeof fetch = fetch): Promise<GitHubProfile> {
  const headers = { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json', 'User-Agent': 'arch-auth' };
  const options = { headers, signal: AbortSignal.timeout(10_000) };
  const [userResponse, emailsResponse] = await Promise.all([
    fetcher('https://api.github.com/user', options),
    fetcher('https://api.github.com/user/emails', options),
  ]);
  if (!userResponse.ok || !emailsResponse.ok) throw new Error('GitHub identity verification failed.');

  const [user, emails]: [unknown, unknown] = await Promise.all([userResponse.json(), emailsResponse.json()]);
  const email = verifiedGithubEmail(emails);
  if (!email || !user || typeof user !== 'object' ||
      typeof (user as GitHubProfile).id !== 'number' || typeof (user as GitHubProfile).login !== 'string') {
    throw new Error('A verified GitHub email is required to sign in.');
  }
  return { ...(user as GitHubProfile), email };
}

export function githubProvider(clientId: string, clientSecret: string) {
  return GitHub({
    clientId,
    clientSecret,
    // GitHub.com OAuth is separate from GITHUB_API_BASE_URL (the server-side PR integration).
    userinfo: {
      url: 'https://api.github.com/user',
      async request({ tokens }: { tokens: { access_token?: string } }) {
        if (!tokens.access_token) throw new Error('GitHub OAuth token missing.');
        return fetchVerifiedGithubProfile(tokens.access_token);
      },
    },
  });
}

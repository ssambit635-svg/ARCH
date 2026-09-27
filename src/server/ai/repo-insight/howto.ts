/**
 * GitHub product how-to — answers operators give at 2am that do not require reading code.
 * ARCH never changes visibility, protection, or secrets on GitHub for you.
 */

export type HowtoHit = { id: string; title: string; answer: string };

const CARDS: Array<{ id: string; title: string; re: RegExp; answer: string }> = [
  {
    id: 'make-private',
    title: 'Make the GitHub repository private',
    re: /\b(private|pvt|visibility|chhupa|chupa|public\s+se\s+private|make\s+(it\s+)?private|repo\s+ko\s+pvt)\b/i,
    answer: `ARCH will not flip visibility — GitHub only lets a repo admin do that.

1. Open the repo on GitHub → Settings → General → Danger Zone → "Change repository visibility" → Private.
2. You need admin on the repo (org owner / repo admin). A Contents:read PAT is not enough.
3. Private repos: watchers without access lose clone/PR. GitHub Actions minutes and Copilot seating follow your plan.
4. If this is an organization repo, the org may forbid private→public (or the reverse) in Member privileges.
5. After switching, confirm Settings still shows Private, and that ARCH's GITHUB_TOKEN still sees the repo (private 404s look like "missing").

If Insight already reports the repo as private, you are done — do not toggle it again.`,
  },
  {
    id: 'make-public',
    title: 'Make the repository public',
    re: /\b(make\s+(it\s+)?public|public\s+karo|unhide)\b/i,
    answer: `Settings → General → Danger Zone → Change repository visibility → Public.

Assume every commit, issue and Actions log becomes world-readable. Rotate any secret that ever lived in git history first (\`git log -p\` / gitleaks). ARCH will not do this for you.`,
  },
  {
    id: 'branch-protection',
    title: 'Protect the default branch',
    re: /\b(branch\s+protect|required\s+review|force\s+push|protect\s+main)\b/i,
    answer: `Settings → Branches → Add branch protection rule (or Rulesets on newer orgs).

Typical baseline: require a pull request, 1+ review, dismiss stale reviews, block force-push, require status checks. ARCH draft PRs still need a human to mark Ready + merge.`,
  },
  {
    id: 'pat',
    title: 'Rotate or scope the ARCH GitHub token',
    re: /\b(pat|personal\s+access\s+token|github_token|rotate\s+token|token\s+scope)\b/i,
    answer: `GITHUB_TOKEN is only for Verified Fix PRs and read-only Insight. It is not GitHub login (AUTH_GITHUB_ID).

Classic PAT: scope \`repo\` (private) or \`public_repo\`.
Fine-grained: Contents Read (Insight) or Read and write (PRs); Pull requests Read and write for Verified Fix.

Revoke leaked tokens at github.com/settings/tokens. Restart ARCH after changing \`.env\`.`,
  },
  {
    id: 'secrets',
    title: 'GitHub Actions secrets',
    re: /\b(actions\s+secret|repo\s+secret|dependabot\s+secret)\b/i,
    answer: `Settings → Secrets and variables → Actions. Never commit \`.env\`. If a secret hit git history, rotate it — rewriting history is not enough if it was pushed. ARCH Insight flags hard-coded secrets in scanned files; it does not remove them.`,
  },
  {
    id: '2fa',
    title: 'Require 2FA for the org',
    re: /\b(2fa|two[- ]factor|mfa)\b/i,
    answer: `Org Settings → Authentication security → Require two-factor authentication. Individuals: GitHub Settings → Password and authentication. This is outside ARCH.`,
  },
];

export function matchGithubHowto(question: string): HowtoHit[] {
  const text = question.trim();
  if (!text) return [];
  return CARDS.filter((card) => card.re.test(text)).map(({ id, title, answer }) => ({ id, title, answer }));
}

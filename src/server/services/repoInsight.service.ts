import { AppError } from '@/lib/errors';
import { requirePermission } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';
import { enforceRateLimit } from '@/lib/rate-limit';
import { analyzeCode } from '@/server/ai/code/analyzer';
import { matchGithubHowto } from '@/server/ai/repo-insight/howto';
import { repoConnectionRepository } from '@/server/repositories/repoConnection.repository';
import { fetchRepoInsightSnapshot, githubMode, type RepoInsightSnapshot } from './github.service';

const RATE = { limit: 10, windowMs: 60_000 };

export type RepoInsightFinding = {
  path: string;
  line: number | null;
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion: string;
};

export type RepoInsightAnswer = {
  fullName: string;
  private: boolean;
  archived: boolean;
  defaultBranch: string;
  commitSha: string;
  mode: 'real' | 'mock';
  touchedRepo: false;
  summary: string;
  explanation: string;
  howto: { id: string; title: string; answer: string }[];
  findings: RepoInsightFinding[];
  filesScanned: string[];
  truncated: boolean;
};

function describeLayout(snapshot: RepoInsightSnapshot): string[] {
  const paths = snapshot.files.map((file) => file.path);
  const lines = [`Scanned ${paths.length} file(s) of ${snapshot.treeSize} tree entries at ${snapshot.commitSha.slice(0, 12)}.`];
  if (paths.some((path) => path === 'package.json')) lines.push('Looks like a Node/JS package (package.json present).');
  if (paths.some((path) => path.startsWith('prisma/'))) lines.push('Prisma schema is in the snapshot — check organizationId on every model.');
  if (paths.some((path) => path.includes('webhook'))) lines.push('Webhook-related files are in the snapshot — HMAC + idempotency first.');
  if (snapshot.private) lines.push('GitHub reports this repository as **private**.');
  else lines.push('GitHub reports this repository as **public**. Anyone can clone it.');
  if (snapshot.archived) lines.push('Repository is archived — GitHub will refuse writes anyway.');
  return lines;
}

function scanFiles(snapshot: RepoInsightSnapshot): RepoInsightFinding[] {
  const findings: RepoInsightFinding[] = [];
  for (const file of snapshot.files) {
    const analysis = analyzeCode(file.text);
    for (const finding of analysis.findings.slice(0, 8)) {
      findings.push({
        path: file.path,
        line: finding.line,
        severity: finding.severity,
        message: finding.message,
        suggestion: finding.suggestion,
      });
    }
    for (const diagnosis of analysis.diagnoses.slice(0, 3)) {
      findings.push({
        path: file.path,
        line: null,
        severity: 'error',
        message: `${diagnosis.title}: ${diagnosis.evidence}`,
        suggestion: diagnosis.fixes[0] ?? diagnosis.explanation,
      });
    }
  }
  const rank = { error: 0, warning: 1, info: 2 };
  return findings.sort((a, b) => rank[a.severity] - rank[b.severity]).slice(0, 40);
}

/**
 * Read-only Q&A over a connected GitHub repo. Never opens a PR, never creates a ref.
 */
export async function askRepoInsight(params: {
  organizationId: string;
  userId: string;
  repoConnectionId: string;
  question: string;
}): Promise<RepoInsightAnswer> {
  await requirePermission(params.organizationId, params.userId, 'repo.read');
  enforceRateLimit(`repo-insight:${params.organizationId}`, RATE);

  const question = params.question.trim();
  if (question.length < 3) throw AppError.badRequest('Ask a short question (how to make it private, where secrets are, what this repo is).');
  if (question.length > 2000) throw AppError.badRequest('Question is too long (max 2,000 characters).');

  const connection = await repoConnectionRepository.findById(params.organizationId, params.repoConnectionId);
  if (!connection || !connection.isActive) throw AppError.notFound('Repository connection not found.');

  const snapshot = await fetchRepoInsightSnapshot({
    owner: connection.owner,
    repo: connection.repo,
    ref: connection.pinnedCommitSha ?? connection.defaultBranch,
  });
  const howto = matchGithubHowto(question);
  const findings = scanFiles(snapshot);
  const layout = describeLayout(snapshot);
  const mode = githubMode();

  const explanation = [
    `ARCH Repo Insight is read-only. It did not push, open a PR, or change ${snapshot.fullName}.`,
    '',
    ...layout,
    '',
    howto.length ? 'GitHub how-to (you do this in github.com, not in ARCH):' : 'No GitHub settings how-to matched. Rephrase, or ask about security / layout of the scanned files.',
    ...howto.map((card) => `## ${card.title}\n${card.answer}`),
    '',
    findings.length ? `${findings.length} issue(s) in the scanned subset (not a full-repo audit).` : 'No analyzer hits in the scanned subset.',
    mode === 'mock' ? 'GITHUB_MODE is mock / no live token — file scan is empty. Set a PAT to analyse contents.' : '',
  ]
    .filter(Boolean)
    .join('\n');

  const summary = howto[0]
    ? howto[0].title
    : findings.some((item) => item.severity === 'error')
      ? `Read-only scan of ${snapshot.fullName}: errors in scanned files`
      : `Read-only scan of ${snapshot.fullName}`;

  await writeAudit({
    organizationId: params.organizationId,
    actorId: params.userId,
    action: 'repo.insight',
    entityType: 'repo_connection',
    entityId: connection.id,
    metadata: { fullName: snapshot.fullName, files: snapshot.files.length, findings: findings.length, howto: howto.map((item) => item.id), touchedRepo: false },
  });

  return {
    fullName: snapshot.fullName,
    private: snapshot.private,
    archived: snapshot.archived,
    defaultBranch: snapshot.defaultBranch,
    commitSha: snapshot.commitSha,
    mode,
    touchedRepo: false,
    summary,
    explanation,
    howto,
    findings,
    filesScanned: snapshot.files.map((file) => file.path),
    truncated: snapshot.truncated,
  };
}

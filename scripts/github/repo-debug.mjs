#!/usr/bin/env node
/**
 * Explore a GitHub repository and identify the bugs — from the terminal, for free.
 *
 *   GITHUB_TOKEN=ghp_… npx tsx scripts/github/repo-debug.mjs --repo acme/api --symptom "checkout returns 502 after deploy"
 *   npx tsx scripts/github/repo-debug.mjs --repo acme/api --issue 42
 *   npx tsx scripts/github/repo-debug.mjs --repo acme/api --symptom "connection pool exhausted" --max-files 20 --out report.md
 *
 * This is the CLI form of "explore my repo and find the bug". ARCH's dashboard cannot browse a
 * repository yet — `github.service.ts` can read files *at a commit it already knows* (to apply a
 * patch), check access and open PRs, but it has no tree listing, no code search and no on-demand
 * file read. This script does the browsing and hands the result back in a form you can paste into
 * the dashboard.
 *
 * How it picks the files it reads (there is no LLM in this loop, and no guessing):
 *   1. `GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1` — the real file inventory;
 *   2. keep source files, drop vendored/generated/lock paths;
 *   3. score every path against your symptom (token overlap with the path and the filename, so
 *      `payments/checkout.ts` wins for a checkout symptom) plus a small size prior;
 *   4. read the top N files and run ARCH's own `analyzeCode()` — the same rules Code Assist uses —
 *      so a finding here is the same finding the product would report;
 *   5. rank by how close the finding sits to a line that mentions your symptom, then by severity.
 *
 * The output is a *ranking of real static findings*, not a diagnosis. It answers "which files should
 * I look at, and what does ARCH already flag in them" — which is the part a human then judges.
 *
 * Reads use the token's `contents:read` scope. This is deliberately independent of
 * `ARCH_OFFLINE_ONLY`: that flag is the AI privacy lock, and this script sends no incident or code
 * data to any model — GitHub is where your code already lives.
 */
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { analyzeCode } from '../../src/server/ai/code/analyzer.ts';
import { keywords, scorePath, isSourceFile } from '../lib/devtools.mjs';

// Same .env discovery as `github:check` — process env wins, .env fills the gaps
// (so an exported GITHUB_TOKEN, e.g. from `gh auth token`, is never shadowed by a stale file).
// `quiet` keeps dotenv's notice off stdout: with `--json`, stdout must carry only the payload.
dotenv.config({ quiet: true });

const args = process.argv.slice(2);
function option(name) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
}

const repo = option('repo');
const symptom = option('symptom') ?? '';
const issue = option('issue');
const ref = option('ref') ?? option('branch');
const maxFilesOption = Number(option('max-files') ?? 12);
const maxFiles = Number.isFinite(maxFilesOption) && maxFilesOption >= 1 ? Math.floor(maxFilesOption) : 12;
const out = option('out');
const asJson = args.includes('--json');

/** Progress goes to stderr so `--json | jq` works: the machine-readable payload is the only thing on stdout. */
function log(message) {
  console.error(`[repo-debug] ${message}`);
}

if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
  console.error('Usage: npx tsx scripts/github/repo-debug.mjs --repo owner/name [--symptom "text"] [--issue 42] [--ref main] [--max-files 12] [--out report.md] [--json]');
  process.exit(1);
}

const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? '';
if (!token) {
  console.error('Set GITHUB_TOKEN (or GH_TOKEN) with contents:read scope. Nothing is read without it.');
  process.exit(1);
}
const [owner, name] = repo.split('/');

// Same override the product uses for GitHub Enterprise — and it makes the script testable against a
// local stub without touching api.github.com.
const API = (process.env.GITHUB_API_BASE_URL ?? 'https://api.github.com').replace(/\/$/, '');
async function get(endpoint) {
  const response = await fetch(`${API}${endpoint}`, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'user-agent': 'arch-repo-debug' },
  });
  if (!response.ok) {
    const body = await response.text().then((text) => text.slice(0, 200));
    throw new Error(`GET ${endpoint} → HTTP ${response.status} ${body}`);
  }
  return response.json();
}

async function main() {
  let target = ref;
  if (!target) {
    const repoInfo = await get(`/repos/${owner}/${name}`);
    target = repoInfo.default_branch;
    log(`no --ref given, using the default branch \`${target}\``);
  }
  const commit = await get(`/repos/${owner}/${name}/commits/${encodeURIComponent(target)}`);
  const sha = commit.sha;
  const subject = commit.commit?.message?.split('\n')[0] ?? '';

  const tree = await get(`/repos/${owner}/${name}/git/trees/${sha}?recursive=1`);
  if (tree.truncated) log('GitHub truncated this tree (huge repository) — the file list is incomplete.');
  const files = (tree.tree ?? []).filter((entry) => entry.type === 'blob' && isSourceFile(entry.path));
  log(`${files.length} source files at ${sha.slice(0, 7)} ("${subject}")`);

  let issueText = '';
  if (issue) {
    const row = await get(`/repos/${owner}/${name}/issues/${issue}`);
    issueText = `${row.title}\n${row.body ?? ''}`;
    log(`loaded issue #${issue}: ${row.title}`);
  }
  const words = keywords(`${symptom} ${issueText}`);
  if (!words.length) log('no symptom given — ranking by path shape only; pass --symptom for a useful ranking');

  const ranked = files
    .map((file) => ({ ...file, score: scorePath(file.path, words) + Math.min(2, (file.size ?? 0) / 20_000) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxFiles);

  const report = [];
  for (const file of ranked) {
    let content;
    try {
      const blob = await get(`/repos/${owner}/${name}/contents/${file.path}?ref=${sha}`);
      content = Buffer.from(blob.content ?? '', 'base64').toString('utf8');
    } catch (error) {
      log(`skipped ${file.path} — ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    const analysis = analyzeCode(content);
    const lines = content.split('\n');
    // A finding next to a line that mentions the symptom is far more likely to be *the* bug.
    const withProximity = analysis.findings.map((finding) => {
      const window = lines.slice(Math.max(0, finding.line - 4), finding.line + 3).join('\n').toLowerCase();
      return { ...finding, proximity: words.filter((word) => window.includes(word)).length };
    });
    const weight = { error: 3, warning: 2, info: 1 };
    withProximity.sort((a, b) => b.proximity - a.proximity || weight[b.severity] - weight[a.severity]);
    report.push({ file: file.path, language: analysis.language, metrics: analysis.metrics, findings: withProximity.slice(0, 6), diagnoses: analysis.diagnoses.slice(0, 3) });
    const top = withProximity[0];
    log(`${file.path} — ${withProximity.length} finding(s)${top ? `, top: ${top.severity} ${top.rule} @${top.line}` : ''}`);
  }

  const summary = {
    repo, ref: target, commit: sha, filesScanned: report.length,
    symptom: symptom || null, issue: issue ?? null,
    totalFindings: report.reduce((sum, entry) => sum + entry.findings.length, 0),
    errors: report.flatMap((entry) => entry.findings.filter((f) => f.severity === 'error').map((f) => `${entry.file}:${f.line} ${f.rule}`)),
    report,
  };

  if (asJson) console.log(JSON.stringify(summary, null, 2));
  else if (out) {
    fs.writeFileSync(path.resolve(out), renderMarkdown(summary));
    log(`wrote ${path.resolve(out)}`);
  } else console.log('\n' + renderMarkdown(summary));

  log(`${summary.filesScanned} files scanned · ${summary.totalFindings} findings · ${summary.errors.length} error-severity`);
  log('this is a ranking of static findings, not a diagnosis — read the top file first, then judge.');
}

function renderMarkdown(summary) {
  const lines = [`# ${summary.repo} @ ${summary.commit.slice(0, 7)} (${summary.ref})`, ''];
  if (summary.symptom) lines.push(`**Symptom:** ${summary.symptom}`, '');
  if (summary.issue) lines.push(`**Issue:** #${summary.issue}`, '');
  lines.push(`${summary.filesScanned} files scanned · ${summary.totalFindings} findings · ${summary.errors.length} at error severity`, '', '---', '');
  for (const entry of summary.report) {
    if (!entry.findings.length) continue;
    lines.push(`## \`${entry.file}\` (${entry.language})`, '');
    for (const finding of entry.findings) {
      lines.push(`- **${finding.severity}** \`${finding.rule}\` — line ${finding.line}${finding.proximity ? ' · near your symptom' : ''}`);
      lines.push(`  - ${finding.message}`);
      lines.push(`  - Fix: ${finding.suggestion}`);
    }
    for (const diagnosis of entry.diagnoses) {
      lines.push(`- **trace** ${diagnosis.title} (${diagnosis.category}) — ${diagnosis.explanation}`);
    }
    lines.push('');
  }
  if (!summary.totalFindings) lines.push('No findings in the files ARCH read. Try a different --symptom or raise --max-files.', '');
  return lines.join('\n');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

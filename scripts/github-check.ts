import dotenv from 'dotenv';
dotenv.config({ override: true });
/**
 * `npm run github:check` — offline-safe diagnosis of the V4 GitHub wiring, without the UI.
 *
 *   npm run github:check                                   # mode + token probe
 *   npm run github:check -- --repo acme/api                # + can ARCH read/push this repo?
 *   npm run github:check -- --repo acme/api --sha 1a2b3c4  # + does that commit exist (and its full SHA)
 *   npm run github:check -- --repo acme/api --preview-patch fix.patch
 *                                                          # + read each file at the pin, apply the hunks
 *                                                            and print the result. Pushes NOTHING.
 *   npm run github:check -- --repo acme/api --open-pr --patch fix.patch --title "Fix: smoke"
 *                                                          # full path: branch + commit + draft PR
 *
 * Exit code is non-zero when something is wrong, so it can gate a deploy. No database, no AI call,
 * no incident data: `--open-pr` is the only mode that writes, and it needs the flag explicitly.
 */
import fs from 'node:fs';
import {
  checkRepoAccess,
  createPullRequest,
  describeGithubConfig,
  previewPullRequest,
  verifyGithubCredentials,
} from '@/server/services/github.service';
import { parseUnifiedDiff } from '@/server/services/github-patch';

const argv = process.argv.slice(2);
function flag(name: string): string | null {
  const index = argv.indexOf(name);
  if (index === -1) return null;
  return argv[index + 1] ?? null;
}

async function main(): Promise<number> {
  const config = describeGithubConfig();
  console.log('ARCH — GitHub configuration (from .env / process.env)\n');
  console.log(`  mode            ${config.mode}${config.mode === 'mock' ? '  (PRs are recorded, nothing is pushed)' : '  (approving a verified fix opens a real PR)'}`);
  console.log(`  token           ${config.tokenConfigured ? `set (${config.tokenHint})` : 'NOT SET'}`);
  console.log(`  api base        ${config.baseUrl}`);
  console.log(`  timeout         ${config.timeoutMs}ms · drafts ${config.openAsDraft ? 'on' : 'off'} · max ${config.maxFiles} files/PR`);
  console.log(`  why             ${config.reason}\n`);

  if (config.mode === 'mock') {
    console.log('GITHUB_MODE keeps this offline, so no network probe was made.');
    console.log('Set GITHUB_TOKEN in .env (and GITHUB_MODE="auto" or "real") to go live.');
    return 0;
  }

  try {
    const credentials = await verifyGithubCredentials();
    console.log('  credential      ' + credentials.message);
    if (credentials.scopes.length) console.log(`  scopes          ${credentials.scopes.join(', ')}`);
  } catch (error) {
    console.error(`\n✗ token probe failed: ${(error as Error).message}`);
    return 1;
  }

  const repoFlag = flag('--repo');
  if (!repoFlag) {
    console.log('\nAdd --repo owner/name to also check repository access.');
    return 0;
  }
  const [owner, repo] = repoFlag.split('/');
  if (!owner || !repo) {
    console.error('✗ --repo must look like owner/name');
    return 1;
  }
  const sha = flag('--sha');

  try {
    const access = await checkRepoAccess({ owner, repo, commitSha: sha, defaultBranch: 'main' });
    console.log('\n  repository      ' + access.message);
    console.log(`  default branch  ${access.defaultBranch} · head ${access.headSha.slice(0, 12)} · ${access.isPrivate ? 'private' : 'public'}`);
    if (access.commitMessage) console.log(`  pinned commit   ${access.baseSha.slice(0, 40)} — ${access.commitMessage}`);
  } catch (error) {
    console.error(`\n✗ repository check failed: ${(error as Error).message}`);
    return 1;
  }

  const previewPath = flag('--preview-patch');
  if (previewPath) {
    const patch = fs.readFileSync(previewPath, 'utf8');
    const parsed = parseUnifiedDiff(patch);
    console.log(`\n  patch           ${patch.length} chars → ${parsed.length} file(s): ${parsed.map((file) => `${file.changeType} ${file.path}`).join(', ') || 'none'}`);
    try {
      const preview = await previewPullRequest({ repoOwner: owner, repoName: repo, baseBranch: 'main', commitSha: sha, patch });
      console.log(`  applies cleanly at ${preview.baseSha.slice(0, 12)} — nothing was pushed:`);
      for (const file of preview.files) {
        console.log(`    ${file.changeType === 'delete' ? 'D' : file.changeType === 'create' ? 'A' : 'M'} ${file.path} (${file.oldBytes} → ${file.bytes} bytes)`);
      }
    } catch (error) {
      console.error(`  ✗ would not push: ${(error as Error).message}`);
      return 1;
    }
  }

  if (argv.includes('--open-pr')) {
    const patchPath = flag('--patch') ?? previewPath;
    if (!patchPath) {
      console.error('\n✗ --open-pr needs --patch <file> with the diff to push');
      return 1;
    }
    const patch = fs.readFileSync(patchPath, 'utf8');
    console.log('\n⚠ --open-pr: creating a real branch and draft pull request on GitHub now.');
    try {
      const result = await createPullRequest({
        organizationId: 'cli',
        repoOwner: owner,
        repoName: repo,
        fullName: `${owner}/${repo}`,
        baseBranch: 'main',
        commitSha: sha,
        title: flag('--title') ?? 'chore(arch): GitHub wiring check',
        body: 'Opened by `npm run github:check -- --open-pr` to verify ARCH’s GitHub wiring. Safe to close.',
        patch,
        incidentId: 'cli-check',
        verificationId: null,
      });
      console.log(`✓ ${result.prNumber ? `PR #${result.prNumber}` : 'PR'}: ${result.externalUrl}`);
      console.log(`  branch ${result.branch} · commit ${result.commitSha?.slice(0, 12)} · files ${result.files.join(', ')}`);
      console.log('  To undo: close the PR, then  gh api -X delete ' + `"repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(result.branch)}"`);
    } catch (error) {
      console.error(`✗ PR creation failed: ${(error as Error).message}`);
      return 1;
    }
  }

  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error('[github:check] unexpected failure', error);
    process.exitCode = 1;
  });

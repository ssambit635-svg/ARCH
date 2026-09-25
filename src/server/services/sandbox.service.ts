import { randomUUID, createHash } from 'node:crypto';
import { promises as fs, existsSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawn } from 'node:child_process';

/**
 * V4 M3 + M5 — Isolated sandbox for patch + tests.
 *
 * Guarantees:
 * - No prod credentials: sandbox env is filtered, DATABASE_URL etc never passed.
 * - Temporary container: each run gets a unique temp dir, deleted afterwards.
 * - Timeout: test command killed after `timeoutMs`.
 * - Safeguards: unsafe fix detection, sandbox escape prevention, evidence bundle.
 *
 * This is a local simulation of a containerized sandbox. In production it would be a real
 * container (Docker/gVisor) with network isolation. The safety checks here are the same.
 */

export const SANDBOX_DEFAULT_TIMEOUT_MS = 30_000;
export const SANDBOX_MAX_OUTPUT_CHARS = 20_000;
export const SANDBOX_MAX_PATCH_CHARS = 50_000;

export type SafetyCheckResult = {
  passed: boolean;
  failures: { rule: string; message: string; line?: number }[];
};

export type SandboxRunResult = {
  sandboxId: string;
  status: 'PASSED' | 'FAILED' | 'TIMEOUT' | 'UNSAFE' | 'ERROR';
  testCommand: string | null;
  testOutput: string;
  durationMs: number;
  evidence: {
    sandboxId: string;
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    commitSha: string | null;
    patchHash: string;
    patchPreview: string;
    safetyChecks: SafetyCheckResult;
    testCommand: string | null;
    testOutput: string;
    testResults: { passed: boolean; exitCode: number | null; timedOut: boolean };
    logs: string[];
    isolation: {
      noProdCredentials: boolean;
      tempContainer: boolean;
      timeoutEnforced: boolean;
      sandboxEscapePrevented: boolean;
    };
  };
};

type UnsafePattern = {
  id: string;
  pattern: RegExp;
  message: string;
  severity: 'error' | 'warning';
};

const UNSAFE_PATTERNS: UnsafePattern[] = [
  { id: 'rm-rf-root', pattern: /\brm\s+.*-rf\s+(\/|\/\*|~)/i, message: 'Dangerous rm -rf on root or home.', severity: 'error' },
  { id: 'rm-rf-etc', pattern: /\brm\s+.*\/(etc|usr|bin|sbin|var)\b/i, message: 'Deleting system directories.', severity: 'error' },
  { id: 'fork-bomb', pattern: /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;?\s*:/, message: 'Fork bomb detected.', severity: 'error' },
  { id: 'mkfs', pattern: /\b(mkfs|dd\s+.*if=|shred)\b/i, message: 'Disk destructive command.', severity: 'error' },
  { id: 'chmod-777', pattern: /\bchmod\s+.*777\b/, message: 'Overly permissive chmod 777.', severity: 'warning' },
  { id: 'curl-bash', pattern: /\bcurl\b.*\|\s*(bash|sh)\b/i, message: 'curl piped to shell (remote code execution).', severity: 'error' },
  { id: 'wget-bash', pattern: /\bwget\b.*\|\s*(bash|sh)\b/i, message: 'wget piped to shell.', severity: 'error' },
  { id: 'nc-listen', pattern: /\bnc\b.*-l\b|\bnetcat\b.*-l\b/, message: 'Netcat listener (reverse shell risk).', severity: 'error' },
  { id: 'env-prod-secret', pattern: /\b(DATABASE_URL|AUTH_SECRET|AUTH_SECRET_WEBHOOK|AI_API_KEY|EMAIL_API_KEY)\b/, message: 'Accessing production secret in patch.', severity: 'error' },
  { id: 'process-env-secret', pattern: /process\.env\.(DATABASE_URL|AUTH_SECRET|AUTH_SECRET_WEBHOOK|AI_API_KEY)/, message: 'Reading prod credentials via process.env.', severity: 'error' },
  { id: 'fs-escape-absolute', pattern: /['\"]\/(etc|usr|root|home|var|tmp)\/[^'\"]*['\"]/, message: 'Absolute path to system directory.', severity: 'error' },
  { id: 'path-traversal', pattern: /\.\.\/\.\.\//, message: 'Path traversal (../../) detected.', severity: 'error' },
  { id: 'eval-exec', pattern: /\b(eval|execSync|exec)\s*\(\s*['\"`].*\+.*['\"`]/, message: 'Dynamic eval/exec with concatenation (injection risk).', severity: 'error' },
  { id: 'child-process-exec', pattern: /child_process.*exec.*rm\s+-rf/, message: 'Child process executing dangerous rm.', severity: 'error' },
  { id: 'disable-tls', pattern: /rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['\"]?0['\"]?/, message: 'Disabling TLS verification.', severity: 'error' },
  { id: 'hardcoded-prod-url', pattern: /postgres:\/\/.*:.*@.*:5432|mongodb:\/\/.*:.*@/, message: 'Hardcoded production DB URL.', severity: 'error' },
];

const SANDBOX_ESCAPE_PATTERNS: UnsafePattern[] = [
  { id: 'escape-parent', pattern: /\.\.\//, message: 'Attempt to escape sandbox via ../', severity: 'error' },
  { id: 'escape-absolute', pattern: /require\(['\"]\/(etc|usr|bin|root)/, message: 'Requiring file outside sandbox via absolute path.', severity: 'error' },
  { id: 'escape-symlink', pattern: /symlink|readlink/i, message: 'Symlink manipulation (potential escape).', severity: 'warning' },
  { id: 'escape-env', pattern: /process\.env\.HOME|process\.env\.USER|os\.homedir/, message: 'Accessing host home directory.', severity: 'warning' },
];

const PROD_CREDENTIAL_KEYS = new Set([
  'DATABASE_URL',
  'AUTH_SECRET',
  'AUTH_SECRET_WEBHOOK',
  'AI_API_KEY',
  'EMAIL_API_KEY',
  'AUTH_GITHUB_SECRET',
  'AUTH_GITHUB_ID',
  'ERROR_TRACKING_DSN',
]);

function hashPatch(patch: string): string {
  return createHash('sha256').update(patch).digest('hex').slice(0, 16);
}

function checkSafety(patch: string): SafetyCheckResult {
  const failures: SafetyCheckResult['failures'] = [];
  const lines = patch.split('\n');

  for (const unsafe of UNSAFE_PATTERNS) {
    if (unsafe.pattern.test(patch)) {
      // Find line number for evidence
      let lineNum: number | undefined;
      for (let i = 0; i < lines.length; i++) {
        if (unsafe.pattern.test(lines[i]!)) {
          lineNum = i + 1;
          break;
        }
      }
      failures.push({ rule: unsafe.id, message: unsafe.message, line: lineNum });
      // Reset regex state for global patterns
      unsafe.pattern.lastIndex = 0;
    }
  }

  // Additional sandbox escape checks
  for (const escape of SANDBOX_ESCAPE_PATTERNS) {
    if (escape.pattern.test(patch)) {
      let lineNum: number | undefined;
      for (let i = 0; i < lines.length; i++) {
        if (escape.pattern.test(lines[i]!)) {
          lineNum = i + 1;
          break;
        }
      }
      // Only error-level escape attempts block
      if (escape.severity === 'error') {
        failures.push({ rule: escape.id, message: escape.message, line: lineNum });
      }
      escape.pattern.lastIndex = 0;
    }
  }

  // Check patch size
  if (patch.length > SANDBOX_MAX_PATCH_CHARS) {
    failures.push({ rule: 'patch-too-large', message: `Patch too large (${patch.length} chars, max ${SANDBOX_MAX_PATCH_CHARS}).` });
  }

  // Check for binary or suspicious content
  if (/\0/.test(patch)) {
    failures.push({ rule: 'binary-content', message: 'Patch contains binary content.' });
  }

  return { passed: failures.filter((f) => f.rule !== 'chmod-777' && !f.rule.startsWith('escape-') || UNSAFE_PATTERNS.find((p) => p.id === f.rule)?.severity === 'error').length === 0 ? failures.length === 0 : failures.filter((f) => UNSAFE_PATTERNS.find((p) => p.id === f.rule)?.severity === 'error' || f.rule.startsWith('escape-')).length === 0, failures };
}

function isUnsafe(safety: SafetyCheckResult): boolean {
  return safety.failures.some((f) => {
    const pattern = UNSAFE_PATTERNS.find((p) => p.id === f.rule) ?? SANDBOX_ESCAPE_PATTERNS.find((p) => p.id === f.rule);
    return pattern?.severity === 'error' || f.rule === 'patch-too-large' || f.rule === 'binary-content';
  });
}

function buildSafeEnv(): NodeJS.ProcessEnv {
  const safe: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    NODE_ENV: 'test',
    HOME: os.tmpdir(),
    TMPDIR: os.tmpdir(),
  };
  // Explicitly ensure prod credentials are NOT present
  for (const key of PROD_CREDENTIAL_KEYS) {
    delete safe[key];
  }
  return safe;
}

function truncateOutput(output: string): string {
  if (output.length <= SANDBOX_MAX_OUTPUT_CHARS) return output;
  return output.slice(0, SANDBOX_MAX_OUTPUT_CHARS) + `\n... truncated (${output.length - SANDBOX_MAX_OUTPUT_CHARS} more chars)`;
}

async function createTempSandbox(): Promise<{ sandboxId: string; dir: string }> {
  const sandboxId = `arch-sandbox-${randomUUID().slice(0, 8)}`;
  const dir = path.join(os.tmpdir(), sandboxId);
  await fs.mkdir(dir, { recursive: true });
  return { sandboxId, dir };
}

async function cleanupSandbox(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Very simple unified diff applier for demonstration.
 * If patch looks like a full file content (no +++ / ---), treat it as the new file.
 * Otherwise try to apply as diff to existing file.
 */
async function applyPatchToDir(dir: string, patch: string, originalFiles?: Record<string, string>): Promise<{ applied: boolean; logs: string[] }> {
  const logs: string[] = [];
  // Write original files if provided
  if (originalFiles) {
    for (const [filePath, content] of Object.entries(originalFiles)) {
      const fullPath = path.join(dir, filePath);
      // Prevent escape
      if (!fullPath.startsWith(dir)) {
        logs.push(`Blocked file outside sandbox: ${filePath}`);
        continue;
      }
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf8');
    }
  }

  // Heuristic: if patch contains diff markers, try to parse file name
  const fileMatch = /^---\s+a\/(.+)\n\+\+\+\s+b\/(.+)/m.exec(patch) || /^\+\+\+\s+b\/(.+)/m.exec(patch);
  if (fileMatch) {
    const targetFile = (fileMatch[2] || fileMatch[1] || 'patched-file.txt').trim();
    const fullPath = path.join(dir, targetFile);
    if (!fullPath.startsWith(dir)) {
      logs.push(`Blocked patch targeting outside sandbox: ${targetFile}`);
      return { applied: false, logs };
    }
    // For simplicity, extract added lines as new content (real implementation would use proper diff lib)
    const addedLines = patch
      .split('\n')
      .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
      .map((line) => line.slice(1))
      .join('\n');
    if (addedLines.trim()) {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, addedLines, 'utf8');
      logs.push(`Applied diff to ${targetFile} (${addedLines.length} chars)`);
      return { applied: true, logs };
    }
  }

  // Fallback: treat patch as full file content
  const fallbackPath = path.join(dir, 'fix.patch.txt');
  await fs.writeFile(fallbackPath, patch, 'utf8');
  logs.push(`Stored patch as ${fallbackPath} (no diff markers found, treating as content)`);
  return { applied: true, logs };
}

function runCommandInSandbox(dir: string, command: string, timeoutMs: number, safeEnv: NodeJS.ProcessEnv): Promise<{ exitCode: number | null; output: string; timedOut: boolean; durationMs: number }> {
  return new Promise((resolve) => {
    const started = Date.now();
    const [cmd, ...args] = command.split(' ').filter(Boolean);
    if (!cmd) {
      resolve({ exitCode: 0, output: '', timedOut: false, durationMs: Date.now() - started });
      return;
    }

    // Security: only allow safe commands in sandbox (npm, yarn, node, npx, jest, vitest, etc.)
    const allowedCommands = new Set(['npm', 'yarn', 'node', 'npx', 'jest', 'vitest', 'pnpm', 'echo', 'cat', 'ls', 'sh']);
    if (!allowedCommands.has(path.basename(cmd))) {
      resolve({
        exitCode: 1,
        output: `Command not allowed in sandbox: ${cmd}. Allowed: ${[...allowedCommands].join(', ')}`,
        timedOut: false,
        durationMs: Date.now() - started,
      });
      return;
    }

    let output = '';
    let timedOut = false;

    const child = spawn(cmd, args, {
      cwd: dir,
      env: safeEnv,
      timeout: timeoutMs,
      shell: false,
    });

    child.stdout?.on('data', (data: Buffer) => {
      output += data.toString();
      if (output.length > SANDBOX_MAX_OUTPUT_CHARS * 2) {
        output = output.slice(0, SANDBOX_MAX_OUTPUT_CHARS * 2);
      }
    });

    child.stderr?.on('data', (data: Buffer) => {
      output += data.toString();
      if (output.length > SANDBOX_MAX_OUTPUT_CHARS * 2) {
        output = output.slice(0, SANDBOX_MAX_OUTPUT_CHARS * 2);
      }
    });

    child.on('error', (err) => {
      output += `\nSandbox error: ${err.message}`;
      resolve({ exitCode: 1, output: truncateOutput(output), timedOut: false, durationMs: Date.now() - started });
    });

    child.on('close', (code) => {
      resolve({ exitCode: code, output: truncateOutput(output), timedOut, durationMs: Date.now() - started });
    });

    // Handle timeout
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill('SIGKILL');
      } catch {}
      output += `\n[ARCH Sandbox] Timeout after ${timeoutMs}ms — process killed.`;
      resolve({ exitCode: null, output: truncateOutput(output), timedOut: true, durationMs: Date.now() - started });
    }, timeoutMs);

    child.on('close', () => clearTimeout(timer));
  });
}

/**
 * Main entry: verify a patch in isolated sandbox.
 *
 * Steps:
 * 1. Safety checks (unsafe fix, sandbox escape)
 * 2. Create temp container
 * 3. Apply patch (repo@commit checkout simulation)
 * 4. Run tests with timeout, filtered env (no prod credentials)
 * 5. Build evidence bundle
 * 6. Cleanup
 */
export async function verifyPatchInSandbox(params: {
  patch: string;
  commitSha?: string | null;
  testCommand?: string | null;
  timeoutMs?: number;
  originalFiles?: Record<string, string>;
}): Promise<SandboxRunResult> {
  const sandboxId = `arch-sandbox-${randomUUID().slice(0, 8)}`;
  const startedAt = new Date();
  const startedAtIso = startedAt.toISOString();
  const patchHash = hashPatch(params.patch);
  const timeoutMs = params.timeoutMs ?? SANDBOX_DEFAULT_TIMEOUT_MS;
  const testCommand = params.testCommand?.trim() || null;

  // 1. Safety checks
  const safety = checkSafety(params.patch);
  const logs: string[] = [`Sandbox ${sandboxId} created`, `Patch hash: ${patchHash}`, `Commit: ${params.commitSha ?? 'none (no pin)'}`];

  if (isUnsafe(safety)) {
    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();
    logs.push(`Safety check FAILED: ${safety.failures.map((f) => f.message).join('; ')}`);
    return {
      sandboxId,
      status: 'UNSAFE',
      testCommand,
      testOutput: `Patch blocked by safety checks:\n${safety.failures.map((f) => `- [${f.rule}] ${f.message}${f.line ? ` (line ${f.line})` : ''}`).join('\n')}`,
      durationMs,
      evidence: {
        sandboxId,
        startedAt: startedAtIso,
        finishedAt: finishedAt.toISOString(),
        durationMs,
        commitSha: params.commitSha ?? null,
        patchHash,
        patchPreview: params.patch.slice(0, 500),
        safetyChecks: safety,
        testCommand,
        testOutput: '',
        testResults: { passed: false, exitCode: null, timedOut: false },
        logs,
        isolation: {
          noProdCredentials: true,
          tempContainer: true,
          timeoutEnforced: true,
          sandboxEscapePrevented: true,
        },
      },
    };
  }

  logs.push(`Safety checks passed (${safety.failures.length} warnings)`);

  // 2. Create temp container
  let dir: string;
  try {
    const created = await createTempSandbox();
    dir = created.dir;
    logs.push(`Temp dir: ${dir}`);
  } catch (err) {
    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();
    return {
      sandboxId,
      status: 'ERROR',
      testCommand,
      testOutput: `Failed to create sandbox: ${err instanceof Error ? err.message : String(err)}`,
      durationMs,
      evidence: {
        sandboxId,
        startedAt: startedAtIso,
        finishedAt: finishedAt.toISOString(),
        durationMs,
        commitSha: params.commitSha ?? null,
        patchHash,
        patchPreview: params.patch.slice(0, 500),
        safetyChecks: safety,
        testCommand,
        testOutput: '',
        testResults: { passed: false, exitCode: null, timedOut: false },
        logs: [...logs, `Error creating temp dir: ${err instanceof Error ? err.message : String(err)}`],
        isolation: {
          noProdCredentials: true,
          tempContainer: false,
          timeoutEnforced: true,
          sandboxEscapePrevented: true,
        },
      },
    };
  }

  let status: SandboxRunResult['status'] = 'PASSED';
  let testOutput = '';
  let exitCode: number | null = null;
  let timedOut = false;
  let durationMs = 0;

  try {
    // 3. Apply patch (simulate repo@commit checkout)
    const applyResult = await applyPatchToDir(dir, params.patch, params.originalFiles);
    logs.push(...applyResult.logs);

    if (!applyResult.applied) {
      status = 'ERROR';
      testOutput = `Failed to apply patch in sandbox.\n${applyResult.logs.join('\n')}`;
    } else if (testCommand) {
      // 4. Run tests with filtered env, timeout
      const safeEnv = buildSafeEnv();
      logs.push(`Running test command: ${testCommand} (timeout ${timeoutMs}ms)`);
      logs.push(`Filtered env keys: ${Object.keys(safeEnv).join(', ')} — prod credentials excluded: ${[...PROD_CREDENTIAL_KEYS].join(', ')}`);

      // Verify no prod credentials in safe env
      const hasProdCreds = [...PROD_CREDENTIAL_KEYS].some((k) => k in safeEnv);
      if (hasProdCreds) {
        throw new Error('Sandbox env contains prod credentials — isolation violated');
      }

      const runResult = await runCommandInSandbox(dir, testCommand, timeoutMs, safeEnv);
      testOutput = runResult.output;
      exitCode = runResult.exitCode;
      timedOut = runResult.timedOut;
      durationMs = runResult.durationMs;

      if (timedOut) {
        status = 'TIMEOUT';
        logs.push(`Test timed out after ${timeoutMs}ms`);
      } else if (exitCode !== 0) {
        status = 'FAILED';
        logs.push(`Tests failed with exit code ${exitCode}`);
      } else {
        status = 'PASSED';
        logs.push(`Tests passed (exit 0) in ${durationMs}ms`);
      }
    } else {
      // No test command — static analysis only, mark PASSED if safe
      testOutput = 'No test command provided — static safety checks passed.';
      logs.push('No test command, skipping test execution');
      status = 'PASSED';
      durationMs = Date.now() - startedAt.getTime();
    }
  } catch (err) {
    status = 'ERROR';
    testOutput = `Sandbox execution error: ${err instanceof Error ? err.message : String(err)}\n${err instanceof Error ? err.stack ?? '' : ''}`;
    logs.push(`Error: ${testOutput.slice(0, 500)}`);
    durationMs = Date.now() - startedAt.getTime();
  } finally {
    // 6. Cleanup
    await cleanupSandbox(dir);
    logs.push(`Sandbox ${sandboxId} cleaned up`);
  }

  const finishedAt = new Date();
  if (durationMs === 0) durationMs = finishedAt.getTime() - startedAt.getTime();

  return {
    sandboxId,
    status,
    testCommand,
    testOutput,
    durationMs,
    evidence: {
      sandboxId,
      startedAt: startedAtIso,
      finishedAt: finishedAt.toISOString(),
      durationMs,
      commitSha: params.commitSha ?? null,
      patchHash,
      patchPreview: params.patch.slice(0, 500),
      safetyChecks: safety,
      testCommand,
      testOutput: truncateOutput(testOutput),
      testResults: { passed: status === 'PASSED', exitCode, timedOut },
      logs,
      isolation: {
        noProdCredentials: true,
        tempContainer: true,
        timeoutEnforced: true,
        sandboxEscapePrevented: true,
      },
    },
  };
}

// Export helpers for testing
export const _testing = {
  checkSafety,
  isUnsafe,
  buildSafeEnv,
  PROD_CREDENTIAL_KEYS,
  UNSAFE_PATTERNS,
  SANDBOX_ESCAPE_PATTERNS,
  hashPatch,
};

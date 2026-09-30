/**
 * The self-correction loop, written the way the spec asks for it:
 *
 *   1. Extract the code from the model's response.
 *   2. Save it to a temporary `.py` file.
 *   3. Run it through Python's native subprocess (here: Node's child_process, which IS the
 *      process-spawning primitive of this runtime — the executed script is plain Python 3).
 *   4. If the subprocess reports an error, bundle that exact error string into a new prompt —
 *      "The code failed with this error: [Error String]. Fix it." — and send it back to the model
 *      engine. Repeat until it passes or the attempt budget runs out.
 *
 * Safety: scripts run in their own temp dir with a credential-free environment, a hard timeout and
 * bounded output. Generated code comes from ARCH's own templates (see `script.ts`) — there is no
 * vendor model in the loop.
 */

import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawn } from 'node:child_process';

export const DEFAULT_SCRIPT_TIMEOUT_MS = 5_000;
const MAX_OUTPUT_CHARS = 20_000;
const MAX_ERROR_CHARS = 2_000;

export type ScriptRun = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  durationMs: number;
};

/** Pull the executable Python block out of a model response (```python preferred, ``` accepted). */
export function extractPythonCode(text: string): string | null {
  const source = text ?? '';
  const pythonBlocks = [...source.matchAll(/```(?:python|py)\s*\n([\s\S]*?)```/gi)].map((match) => match[1]!);
  if (pythonBlocks.length) return longest(pythonBlocks);
  const genericBlocks = [...source.matchAll(/```([a-z0-9]*)\s*\n([\s\S]*?)```/gi)]
    .filter((match) => !match[1] || match[1]!.toLowerCase() === 'text')
    .map((match) => match[2]!);
  if (genericBlocks.length) return longest(genericBlocks);
  // An unterminated fence still counts — models sometimes clip the closer.
  const unterminated = /```(?:python|py)?\s*\n([\s\S]+)$/.exec(source);
  if (unterminated && /(^|\n)\s*(?:import |from |def |print\(|if __name__|[a-z_]+\s*=\s*\[|for |while )/.test(unterminated[1]!)) {
    return unterminated[1]!.trim();
  }
  return null;
}

function longest(blocks: string[]): string {
  return blocks.reduce((best, block) => (block.length > best.length ? block : best), blocks[0]!);
}

function truncateTail(text: string): string {
  if (text.length <= MAX_OUTPUT_CHARS) return text;
  return `… (truncated)\n${text.slice(-MAX_OUTPUT_CHARS)}`;
}

function truncateHead(text: string): string {
  if (text.length <= MAX_OUTPUT_CHARS) return text;
  return `${text.slice(0, MAX_OUTPUT_CHARS)}\n… (truncated, ${text.length} chars total)`;
}

/** Minimal environment: PATH/HOME/TMPDIR only — DATABASE_URL, AUTH_SECRET etc. never reach Python. */
function sandboxedEnv(tmpdir: string): NodeJS.ProcessEnv {
  return {
    NODE_ENV: process.env.NODE_ENV ?? 'development',
    PATH: process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin',
    HOME: tmpdir,
    TMPDIR: tmpdir,
    PYTHONUNBUFFERED: '1',
    PYTHONDONTWRITEBYTECODE: '1',
    LANG: 'C.UTF-8',
    LC_ALL: 'C.UTF-8',
    ARCH_AGENT: 'true',
  };
}

/** Which Python binary exists on this machine ("python3", "python", or none). */
export async function findPython(): Promise<string | null> {
  for (const binary of ['python3', 'python']) {
    const probe = await new Promise<boolean>((resolve) => {
      // The binary comes from a fixed allowlist; it is not a project file to bundle.
      const child = spawn(/* turbopackIgnore: true */ binary, ['--version'], { stdio: 'ignore' });
      child.on('error', () => resolve(false));
      child.on('close', (code) => resolve(code === 0));
    });
    if (probe) return binary;
  }
  return null;
}

/**
 * Save the script to a temporary `.py` file and run it with the Python subprocess. Always cleans
 * the temp dir up. Never throws: failures are values so the correction loop can read them.
 */
export async function runPythonScript(code: string, options: { timeoutMs?: number; signal?: AbortSignal } = {}): Promise<ScriptRun> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_SCRIPT_TIMEOUT_MS;
  const started = Date.now();
  const python = await findPython();
  if (!python) {
    return { exitCode: null, stdout: '', stderr: 'No Python interpreter found on this server (tried python3 and python).', timedOut: false, durationMs: 0 };
  }

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'arch-agent-'));
  const scriptPath = path.join(dir, 'script.py');
  try {
    await fs.writeFile(scriptPath, code, 'utf8');
    return await new Promise<ScriptRun>((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let settled = false;

      const finish = (exitCode: number | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        options.signal?.removeEventListener('abort', onAbort);
        resolve({
          exitCode,
          stdout: truncateHead(stdout),
          stderr: truncateTail(stderr),
          timedOut,
          durationMs: Date.now() - started,
        });
      };

      // Temporary sandbox scripts are created at runtime, outside the deployed bundle.
      const child = spawn(/* turbopackIgnore: true */ python, [scriptPath], { cwd: dir, env: sandboxedEnv(dir), stdio: ['ignore', 'pipe', 'pipe'] });

      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
        if (stdout.length > MAX_OUTPUT_CHARS * 2) stdout = stdout.slice(-MAX_OUTPUT_CHARS * 2);
      });
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
        if (stderr.length > MAX_OUTPUT_CHARS * 2) stderr = stderr.slice(-MAX_OUTPUT_CHARS * 2);
      });
      child.on('error', (error) => {
        stderr += `\n${error.message}`;
        finish(1);
      });
      child.on('close', (code) => finish(code));

      const kill = () => {
        timedOut = true;
        try {
          child.kill('SIGKILL');
        } catch {
          // already gone
        }
        stderr += `\n[ARCH Agent] Script timed out after ${timeoutMs}ms and was killed.`;
        finish(null);
      };

      const timer = setTimeout(kill, timeoutMs);
      const onAbort = () => kill();
      options.signal?.addEventListener('abort', onAbort, { once: true });
    });
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

/** The exact error string that gets bundled back into the fix prompt. */
export function errorStringFrom(run: ScriptRun): string {
  if (run.timedOut) return `Timed out (the script was killed). Output so far:\n${run.stdout.trim() || '(none)'}`;
  const detail = run.stderr.trim() || run.stdout.trim();
  if (detail) return detail.slice(-MAX_ERROR_CHARS);
  return `the process exited with code ${run.exitCode ?? 'unknown'} and produced no output`;
}

export type CorrectionAttempt = {
  /** Which prompt went to the model: 1 = the task, n>1 = the fix request. */
  round: number;
  code: string;
  run: ScriptRun;
  /** The fix prompt sent back after this attempt failed (absent on a passing attempt). */
  fixPrompt?: string;
};

export type CorrectionOutcome =
  | { status: 'passed'; attempts: CorrectionAttempt[]; output: string; code: string }
  | { status: 'exhausted'; attempts: CorrectionAttempt[]; output: string; code: string | null; lastError: string }
  | { status: 'no_code'; attempts: []; output: string; code: null; response: string };

export type SelfCorrectionParams = {
  /** The model engine: takes a raw prompt, returns its raw response. */
  generate: (prompt: string) => Promise<string> | string;
  /** The original user task, re-bundled with every fix prompt so context is never lost. */
  task: string;
  /** A response that already contains the first code block (saves one generation). */
  firstDraft?: string | null;
  maxAttempts?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
};

/**
 * Run the loop: extract → execute → on failure send "The code failed with this error: [exact
 * error]. Fix it." back to the engine → repeat. `maxAttempts` counts executions (the first run
 * included), so `maxAttempts: 3` means at most one initial attempt plus two fixes.
 */
export async function withSelfCorrection(params: SelfCorrectionParams): Promise<CorrectionOutcome> {
  const maxAttempts = Math.max(1, params.maxAttempts ?? 3);
  const attempts: CorrectionAttempt[] = [];

  let response = params.firstDraft ?? (await params.generate(params.task));
  let code = extractPythonCode(response);
  if (!code) return { status: 'no_code', attempts: [], output: '', code: null, response };

  for (let round = 1; round <= maxAttempts; round += 1) {
    if (params.signal?.aborted) break;
    const run = await runPythonScript(code, { timeoutMs: params.timeoutMs, signal: params.signal });
    if (!run.timedOut && run.exitCode === 0) {
      attempts.push({ round, code, run });
      return { status: 'passed', attempts, output: run.stdout.trim(), code };
    }

    const errorString = errorStringFrom(run);
    const fixPrompt = [
      `The code failed with this error: ${errorString}. Fix it.`,
      '',
      `Task: ${params.task}`,
      '',
      'Previous attempt:',
      '```python',
      code,
      '```',
    ].join('\n');
    attempts.push({ round, code, run, fixPrompt });
    if (round === maxAttempts) break;

    response = await params.generate(fixPrompt);
    const nextCode = extractPythonCode(response);
    if (!nextCode) {
      // The engine answered without code: the loop is over, report the last failure honestly.
      return { status: 'exhausted', attempts, output: '', code, lastError: errorString };
    }
    code = nextCode;
  }

  const last = attempts[attempts.length - 1];
  return {
    status: 'exhausted',
    attempts,
    output: '',
    code: code ?? null,
    lastError: last ? errorStringFrom(last.run) : 'aborted before the script could run',
  };
}

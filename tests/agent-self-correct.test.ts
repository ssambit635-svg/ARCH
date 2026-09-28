import { describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { errorStringFrom, extractPythonCode, findPython, runPythonScript, withSelfCorrection } from '@/server/ai/agent';

/**
 * The self-correction loop: extract → temp .py → subprocess → exact error fed back → fix.
 * These tests run real Python (available in CI and the dev sandbox); they are the hard proof
 * that the loop executes, times out, cleans up and prompts the engine the way the spec says.
 */

const PYTHON_AVAILABLE = (await findPython()) !== null;

describe('self-correct — extractPythonCode', () => {
  it('prefers a ```python fence and tolerates unlabeled or unfenced ones', () => {
    expect(extractPythonCode('intro\n```python\nprint("hi")\n```\noutro')).toBe('print("hi")\n');
    expect(extractPythonCode('```\nprint("plain")\n```')).toBe('print("plain")\n');
    expect(extractPythonCode('```python\nprint("a")\n```\nsome text\n```python\nprint("longer code here")\n```')).toBe('print("longer code here")\n');
    expect(extractPythonCode('no code here at all')).toBeNull();
    expect(extractPythonCode('')).toBeNull();
  });

  it('catches an unterminated fence that still looks like code', () => {
    expect(extractPythonCode('```python\nimport math\nprint(math.pi')).toContain('import math');
    expect(extractPythonCode('```python\njust some words')).toBeNull();
  });
});

describe.runIf(PYTHON_AVAILABLE)('self-correct — runPythonScript (real subprocess)', () => {
  it('runs a script saved to a temp .py file and returns stdout', async () => {
    const run = await runPythonScript('print(2 + 3)');
    expect(run.exitCode).toBe(0);
    expect(run.stdout.trim()).toBe('5');
    expect(run.timedOut).toBe(false);
  });

  it('captures stderr and a non-zero exit for a failing script', async () => {
    const run = await runPythonScript('raise ValueError("boom")');
    expect(run.exitCode).not.toBe(0);
    expect(run.stderr).toContain('ValueError: boom');
    expect(run.stderr).toContain('script.py');
  });

  it('kills a runaway script at the timeout', async () => {
    const run = await runPythonScript('import time\ntime.sleep(30)', { timeoutMs: 700 });
    expect(run.timedOut).toBe(true);
    expect(run.durationMs).toBeLessThan(10_000);
  }, 15_000);

  it('never passes server credentials into the script environment', async () => {
    // DATABASE_URL is set for the test process (vitest config); Python must see None.
    const run = await runPythonScript('import os\nprint(os.environ.get("DATABASE_URL"))\nprint(os.environ.get("AUTH_SECRET"))');
    expect(run.exitCode).toBe(0);
    expect(run.stdout).toContain('None');
    expect(run.stdout).not.toContain('postgres://');
  });

  it('cleans the temp directory up after every run', async () => {
    const before = (await fs.readdir(os.tmpdir())).filter((entry) => entry.startsWith('arch-agent-'));
    await runPythonScript('print("bye")');
    await new Promise((resolve) => setTimeout(resolve, 100));
    const after = (await fs.readdir(os.tmpdir())).filter((entry) => entry.startsWith('arch-agent-'));
    expect(after.length).toBeLessThanOrEqual(before.length);
  });
});

describe('self-correct — withSelfCorrection (the loop)', () => {
  it('passes on the first run without asking the model anything', async () => {
    const prompts: string[] = [];
    const outcome = await withSelfCorrection({
      generate: (prompt) => {
        prompts.push(prompt);
        return '```python\nprint("green on first try")\n```';
      },
      task: 'print a message',
    });
    expect(prompts).toEqual(['print a message']); // only the original task
    expect(outcome.status).toBe('passed');
    if (outcome.status === 'passed') {
      expect(outcome.output).toBe('green on first try');
      expect(outcome.attempts).toHaveLength(1);
    }
  });

  it('sends the EXACT error string back — "The code failed with this error: … Fix it."', async () => {
    const prompts: string[] = [];
    let round = 0;
    const outcome = await withSelfCorrection({
      generate: (prompt) => {
        prompts.push(prompt);
        round += 1;
        void round;
        return '```python\nprint("fixed now")\n```';
      },
      task: 'say something',
      firstDraft: '```python\nraise SystemExit("deliberate failure")\n```',
      maxAttempts: 3,
    });

    expect(outcome.status).toBe('passed');
    // The first execution came from firstDraft; the failure produced exactly one fix prompt.
    expect(prompts).toHaveLength(1);
    const fixPrompt = prompts[0]!;
    expect(fixPrompt).toContain('The code failed with this error:');
    expect(fixPrompt).toContain('Fix it.');
    expect(fixPrompt).toContain('Task: say something');
    expect(fixPrompt).toContain('Previous attempt:');
    expect(fixPrompt).toContain('deliberate failure');
    if (outcome.status === 'passed') expect(outcome.attempts).toHaveLength(2);
  });

  it.runIf(PYTHON_AVAILABLE)('feeds a real traceback back verbatim and accepts the repaired code', async () => {
    const prompts: string[] = [];
    const outcome = await withSelfCorrection({
      generate: (prompt) => {
        prompts.push(prompt);
        return '```python\nprint("repaired")\n```';
      },
      task: 'demo',
      firstDraft: '```python\nraise ValueError("custom-boom")\n```',
    });
    expect(outcome.status).toBe('passed');
    expect(prompts[0]).toContain('ValueError: custom-boom');
    expect(prompts[0]!.startsWith('The code failed with this error:')).toBe(true);
  });

  it('stops at the attempt budget and reports the last error honestly', async () => {
    let calls = 0;
    const outcome = await withSelfCorrection({
      generate: () => {
        calls += 1;
        return '```python\nraise RuntimeError("always broken")\n```';
      },
      task: 'never passes',
      maxAttempts: 2,
      firstDraft: '```python\nraise RuntimeError("always broken")\n```',
    });
    expect(outcome.status).toBe('exhausted');
    expect(outcome.attempts).toHaveLength(2);
    expect(calls).toBe(1); // one fix request between the two executions
    if (outcome.status === 'exhausted') expect(outcome.lastError).toContain('always broken');
  });

  it('reports no_code when the engine answers without a script', async () => {
    const outcome = await withSelfCorrection({
      generate: () => 'Sorry, I cannot write that.',
      task: 'write me a script',
    });
    expect(outcome.status).toBe('no_code');
  });

  it('errorStringFrom prefers stderr, falls back to stdout, then the exit code', () => {
    expect(errorStringFrom({ exitCode: 1, stdout: 'out', stderr: 'Traceback: bad', timedOut: false, durationMs: 1 })).toContain('Traceback');
    expect(errorStringFrom({ exitCode: 1, stdout: 'only-out', stderr: '  ', timedOut: false, durationMs: 1 })).toContain('only-out');
    expect(errorStringFrom({ exitCode: 3, stdout: '', stderr: '', timedOut: false, durationMs: 1 })).toContain('code 3');
    expect(errorStringFrom({ exitCode: null, stdout: '', stderr: '', timedOut: true, durationMs: 1 })).toContain('Timed out');
  });
});

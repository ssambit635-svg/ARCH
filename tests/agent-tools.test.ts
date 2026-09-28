import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  buildToolInstruction,
  createNativeTools,
  detectToolRequest,
  evaluateExpression,
  executeToolCall,
  parseToolCall,
} from '@/server/ai/agent';

/**
 * Native tool execution: a plain dictionary of functions, one JSON structure to call them, and a
 * parser/executor that never trusts the model's text blindly.
 */

describe('tools — calculator (own parser, never eval)', () => {
  it('evaluates arithmetic, precedence, parentheses and functions', () => {
    expect(evaluateExpression('12 * 8 + 4')).toEqual({ ok: true, value: 100 });
    expect(evaluateExpression('(2 + 3) * 4')).toEqual({ ok: true, value: 20 });
    expect(evaluateExpression('7 // 2')).toEqual({ ok: true, value: 3 });
    expect(evaluateExpression('2 ** 10')).toEqual({ ok: true, value: 1024 });
    expect(evaluateExpression('10 % 4')).toEqual({ ok: true, value: 2 });
    expect(evaluateExpression('sqrt(196) / 2')).toEqual({ ok: true, value: 7 });
    expect(evaluateExpression('-5 + 3')).toEqual({ ok: true, value: -2 });
  });

  it('refuses code-shaped input instead of evaluating it', () => {
    expect(evaluateExpression('__import__("os").system("id")').ok).toBe(false);
    expect(evaluateExpression('process.exit()').ok).toBe(false);
    expect(evaluateExpression('${7*7}').ok).toBe(false);
    expect(evaluateExpression('1; import os').ok).toBe(false);
  });

  it('reports division by zero as a non-finite result', () => {
    const result = evaluateExpression('10 / 0');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not a finite number/);
  });

  it('detects tool-worthy prompts without swallowing the sentence', () => {
    expect(detectToolRequest('Calculate 12 * 8 + 4 and explain what it means for the budget plan')).toEqual({
      tool: 'calculator',
      arguments: { expression: '12*8+4' },
    });
    expect(detectToolRequest('kitna hoga 1960 / 12 agar 5% tax add karein?')?.tool).toBe('calculator');
    expect(detectToolRequest('what is 2 + 2?')?.tool).toBe('calculator');
    // Dates are not subtraction, ordinary questions are not calculations.
    expect(detectToolRequest('we deployed on 2024-03-01 and again on 2024-04-01')).toBeNull();
    expect(detectToolRequest('what is open right now?')).toBeNull();
  });
});

describe('tools — registry, JSON structure, execution', () => {
  let workdir: string;
  const tools = () => createNativeTools({ workdir, now: () => new Date('2026-09-28T12:00:00Z') });

  beforeAll(async () => {
    workdir = await fs.mkdtemp(path.join(os.tmpdir(), 'arch-agent-tools-'));
    await fs.mkdir(path.join(workdir, 'docs'), { recursive: true });
    await fs.writeFile(path.join(workdir, 'docs', 'runbook.md'), '# Runbook\nStep one. api_key = "sk-abc123abc123abc123"', 'utf8');
    await fs.writeFile(path.join(workdir, '.env'), 'DATABASE_URL=postgres://user:pass@host/db', 'utf8');
    await fs.writeFile(path.join(workdir, 'notes.txt'), 'hello world', 'utf8');
  });

  afterAll(async () => {
    await fs.rm(workdir, { recursive: true, force: true }).catch(() => undefined);
  });

  it('teaches the exact JSON structure with every tool listed', () => {
    const instruction = buildToolInstruction(tools());
    expect(instruction).toContain('{"tool": "<name>", "arguments": {…}}');
    for (const name of ['calculator', 'current_time', 'list_files', 'read_file']) {
      expect(instruction).toContain(name);
    }
  });

  it('parses the tool JSON out of prose and fences, and rejects junk', () => {
    expect(parseToolCall('Sure! {"tool": "calculator", "arguments": {"expression": "2+2"}} hope that helps')).toEqual({
      tool: 'calculator',
      arguments: { expression: '2+2' },
    });
    expect(parseToolCall('```json\n{"tool": "current_time", "args": {}}\n```')).toEqual({ tool: 'current_time', arguments: {} });
    expect(parseToolCall('the tool: "calculator" without a JSON object')).toBeNull();
    expect(parseToolCall('{"arguments": {}}')).toBeNull();
    expect(parseToolCall('{"tool": 42, "arguments": {}}')).toBeNull();
    expect(parseToolCall('not json at all')).toBeNull();
  });

  it('executes known tools and feeds unknown/failing ones back as text', async () => {
    const registry = tools();

    const calc = await executeToolCall({ tool: 'calculator', arguments: { expression: '12 * 8 + 4' } }, registry);
    expect(calc).toEqual({ ok: true, result: '100' });

    const missing = await executeToolCall({ tool: 'calculator', arguments: {} }, registry);
    expect(missing.ok).toBe(false);
    expect(missing.result).toContain('expression');

    const unknown = await executeToolCall({ tool: 'shell', arguments: { cmd: 'rm -rf /' } }, registry);
    expect(unknown.ok).toBe(false);
    expect(unknown.result).toContain('Unknown tool');

    const time = await executeToolCall({ tool: 'current_time', arguments: { timezone: 'Asia/Kolkata' } }, registry);
    expect(time.ok).toBe(true);
    expect(time.result).toContain('Asia/Kolkata');
    expect(await executeToolCall({ tool: 'current_time', arguments: { timezone: 'Mars/Olympus' } }, registry).then((r) => r.result)).toMatch(/Unknown timezone/);
  });

  it('confines file tools to the workdir, refuses secrets, redacts credentials', async () => {
    const registry = tools();

    const list = await executeToolCall({ tool: 'list_files', arguments: {} }, registry);
    expect(list.ok).toBe(true);
    expect(list.result).toContain('docs/');
    expect(list.result).toContain('notes.txt');

    const read = await executeToolCall({ tool: 'read_file', arguments: { path: 'docs/runbook.md' } }, registry);
    expect(read.ok).toBe(true);
    expect(read.result).toContain('# Runbook');
    expect(read.result).not.toContain('sk-abc123abc123abc123'); // redacted
    expect(read.result).toContain('api_key');

    const escape = await executeToolCall({ tool: 'read_file', arguments: { path: '../../etc/passwd' } }, registry);
    expect(escape.ok).toBe(false);
    expect(escape.result).toMatch(/escapes the agent work directory/);

    const envFile = await executeToolCall({ tool: 'read_file', arguments: { path: '.env' } }, registry);
    expect(envFile.ok).toBe(false);
    expect(envFile.result).toMatch(/credentials/);

    const missing = await executeToolCall({ tool: 'read_file', arguments: { path: 'docs/nope.md' } }, registry);
    expect(missing.result).toMatch(/Could not read/);
  });

  it('detects file prompts: listing vs reading a named file', () => {
    expect(detectToolRequest('list the files in this folder')).toEqual({ tool: 'list_files', arguments: {} });
    expect(detectToolRequest('read notes.txt and tell me what it says')).toEqual({ tool: 'read_file', arguments: { path: 'notes.txt' } });
    expect(detectToolRequest('should we page the database team?')).toBeNull();
  });

  it('routes only timezone-qualified time asks to the clock tool; bare date/time stays native', () => {
    expect(detectToolRequest('what is the current time in Asia/Kolkata right now')).toEqual({
      tool: 'current_time',
      arguments: { timezone: 'Asia/Kolkata' },
    });
    expect(detectToolRequest('server ka time batao Europe/London ke hisaab se')).toEqual({
      tool: 'current_time',
      arguments: { timezone: 'Europe/London' },
    });
    // Pinned engine paths: no timezone → the native datetime answer stays in charge.
    expect(detectToolRequest('what is date today ?')).toBeNull();
    expect(detectToolRequest('compare incident volume between America/New_York and Asia/Kolkata')).toBeNull();
  });

  it('reports a not-yet-created work directory as a friendly result, never a raw ENOENT', async () => {
    const absent = path.join(os.tmpdir(), `arch-agent-absent-${Date.now()}`);
    const registry = createNativeTools({ workdir: absent, now: () => new Date('2026-09-28T12:00:00Z') });
    const listed = await executeToolCall({ tool: 'list_files', arguments: {} }, registry);
    expect(listed.ok).toBe(true);
    expect(listed.result).toMatch(/does not exist yet/);
    expect(listed.result).not.toContain(absent);
    const read = await executeToolCall({ tool: 'read_file', arguments: { path: 'notes.txt' } }, registry);
    expect(read.ok).toBe(false);
    expect(read.result).toMatch(/does not exist in the work directory/);
    expect(read.result).not.toContain(absent);
  });
});

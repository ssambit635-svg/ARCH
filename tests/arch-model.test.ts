import { describe, expect, it } from 'vitest';
import { baseArchModel, ArchModelRuntime, loadArchModel } from '@/server/ai/arch-model/runtime';
import { trainArchModel, type TrainingDoc } from '@/server/ai/arch-model/train';
import { archDraft, buildKnowledge } from '@/server/ai/arch-model/engine';
import { analyzeCode, analyzeStackTrace, detectLanguage, looksLikeStackTrace, scrubSecrets } from '@/server/ai/code/analyzer';
import { buildCodeReviewInput, buildCodeReviewOutput } from '@/server/ai/code/review';
import { isLocalEndpoint } from '@/server/ai/local-llm';
import { createArchNativeProvider, createHybridProvider } from '@/server/ai/arch-native';
import { buildCodeReviewPrompt, buildPrompt } from '@/server/ai/prompts';
import { parseCodeFix, parseCodeReview, parsePostmortem, parseStatusUpdate, parseSummary, parseTriage } from '@/server/ai/schemas';
import { AiProviderError, type AiProvider } from '@/server/ai/provider';
import type { CopilotContext } from '@/server/ai/context';

/**
 * ARCH's own model (V3) — pure functions, no database, no network, fully deterministic.
 */

function context(overrides: Partial<CopilotContext['incident']> = {}, texts: string[] = []): CopilotContext {
  const start = new Date('2026-09-20T14:00:00Z');
  return {
    incident: { title: 'Checkout returning 502 errors', severity: 'MEDIUM', status: 'INVESTIGATING', affectedService: 'payments-api', startedAt: start.toISOString(), resolvedAt: null, durationMinutes: 40, ...overrides },
    timeline: texts.map((text, index) => ({ at: new Date(start.getTime() + index * 5 * 60_000).toISOString(), type: 'COMMENT' as const, actor: 'responder' as const, text })),
    omittedTimelineEntries: 0,
    candidates: [],
  };
}

const NOTES = [
  'Alert fired: 502 rate at 18% on checkout.',
  'Errors started right after the 14:05 deploy of payments-api.',
  'Rolled back payments-api to v1.42.0; error rate dropping.',
];

describe('ARCH model — training + inference', () => {
  it('the base model classifies common failure modes without any team data', () => {
    const model = baseArchModel();
    expect(model.classifyCategory('SSL certificate expired on the public API').category).toBe('certificate');
    expect(model.classifyCategory('Disk full on log volume, no space left on device').category).toBe('disk');
    expect(model.classifyCategory('Primary database too many connections, replication lag').category).toBe('database');
    expect(model.classifyCategory('Pods OOMKilled, memory leak after release').category).toBe('memory');
  });

  it('training is deterministic, serializable and learns from team incidents', () => {
    const team: TrainingDoc[] = [
      { id: 'team:a', source: 'team', title: 'Ledger sync stuck', text: 'ledger sync job stuck, kafka consumer lag growing on ledger-writer', severity: 'CRITICAL', rootCause: 'Consumer group rebalance loop after broker upgrade.', mitigation: ['Pinned the consumer client version and restarted ledger-writer.'] },
      { id: 'team:b', source: 'team', title: 'Search slow', text: 'search results slow, elasticsearch heap pressure', severity: 'LOW' },
    ];
    const now = new Date('2026-09-25T00:00:00Z');
    const a = trainArchModel(team, { now });
    const b = trainArchModel(team, { now });
    expect(JSON.stringify({ ...a, metrics: { ...a.metrics, trainingMs: 0 } })).toBe(JSON.stringify({ ...b, metrics: { ...b.metrics, trainingMs: 0 } }));

    const runtime = loadArchModel(JSON.parse(JSON.stringify(a)));
    expect(runtime).toBeInstanceOf(ArchModelRuntime);
    const hits = runtime!.similar('kafka consumer lag on ledger-writer again', { sources: ['team'] });
    expect(hits[0]?.doc.id).toBe('team:a');
    expect(a.metrics.documents.team).toBe(2);
  });

  it('rejects artifacts of an unknown format instead of crashing', () => {
    expect(loadArchModel({ format: 999 })).toBeNull();
    expect(loadArchModel(null)).toBeNull();
  });

  it('knowledge surfaces similar past incidents with their root cause, excluding the incident itself', () => {
    const artifact = trainArchModel([
      { id: 'team:self', source: 'team', title: 'Checkout returning 502 errors', text: 'checkout 502 errors after payments-api deploy', severity: 'HIGH' },
      { id: 'team:old', source: 'team', title: 'Checkout 502s after deploy', text: 'checkout 502 errors payments-api deploy rollback fixed it', severity: 'HIGH', rootCause: 'Bad connection-pool setting shipped in payments-api v1.40.', mitigation: ['Rolled back payments-api.'] },
    ]);
    const knowledge = buildKnowledge(new ArchModelRuntime(artifact), context({}, NOTES), { excludeIds: ['team:self'] });
    const ids = knowledge.similarIncidents.map((hint) => hint.title);
    expect(ids).toContain('Checkout 502s after deploy');
    expect(ids).not.toContain('Checkout returning 502 errors');
    expect(knowledge.similarIncidents.find((hint) => hint.title === 'Checkout 502s after deploy')?.rootCause).toMatch(/connection-pool/);
  });
});

describe('ARCH engine — every Copilot task passes the same validation as an LLM answer', () => {
  const ctx = context({}, [...NOTES, "TypeError: Cannot read properties of undefined (reading 'id')\n    at getUser (src/services/user.ts:42:18)"]);

  it('summary / triage / status update / postmortem / code fix', () => {
    const summary = parseSummary(JSON.stringify(archDraft('summary', ctx)));
    expect(summary.bullets.length).toBeGreaterThan(0);
    expect(summary.bullets.length).toBeLessThanOrEqual(5);

    const triage = parseTriage(JSON.stringify(archDraft('triage', ctx)), new Map());
    expect(['HIGH', 'CRITICAL']).toContain(triage.severity); // 18% errors on checkout is not MEDIUM
    expect(triage.rationale.length).toBeGreaterThan(10);

    const status = parseStatusUpdate(JSON.stringify(archDraft('status_update', ctx)));
    expect(status.body).not.toMatch(/payments-api v1\.42|TypeError|src\//); // customer-safe

    const postmortem = parsePostmortem(JSON.stringify(archDraft('postmortem', { ...ctx, incident: { ...ctx.incident, status: 'RESOLVED', resolvedAt: '2026-09-20T14:40:00Z' } })));
    expect(postmortem.markdown).toMatch(/Root cause/);

    const fix = parseCodeFix(JSON.stringify(archDraft('code_fix', ctx)));
    expect(fix.diagnosis).toMatch(/undefined|null/i);
    expect(fix.suggestedFixes.length).toBeGreaterThan(0);
  });

  it('the native provider answers from the prompt alone (the same prompt an LLM would get)', async () => {
    const provider = createArchNativeProvider();
    const prompt = buildPrompt('summary', ctx);
    const result = await provider.generate(prompt.system, prompt.user, { task: 'summary', maxTokens: 500, signal: new AbortController().signal });
    expect(parseSummary(result.text).bullets.length).toBeGreaterThan(0);
    expect(result.model).toBe('arch-native-1');
  });
});

describe('ARCH Code Assist — analyzer', () => {
  it('detects languages and stack traces', () => {
    expect(detectLanguage('def handler(event):\n    return event["id"]\n')).toBe('python');
    expect(detectLanguage('const x = await fetch(url);')).toMatch(/javascript|typescript/);
    expect(looksLikeStackTrace('Traceback (most recent call last):\n  File "app.py", line 3, in <module>\nKeyError: \'id\'')).toBe(true);
    expect(looksLikeStackTrace('const a = 1;')).toBe(false);
  });

  it('explains a stack trace and points at the first frame in your code', () => {
    const { diagnoses, topFrame } = analyzeStackTrace("TypeError: Cannot read properties of undefined (reading 'id')\n    at getUser (src/services/user.ts:42:18)\n    at node:internal/process/task_queues:95:5");
    expect(diagnoses[0]?.title).toMatch(/undefined|null/i);
    expect(topFrame).toMatchObject({ file: 'src/services/user.ts', line: 42 });
  });

  it('finds the bugs that cause incidents: SQL injection, swallowed errors, missing timeouts, secrets', () => {
    const code = [
      'async function getUser(id) {',
      '  const res = await fetch("https://api.internal/users/" + id);',
      '  const q = "SELECT * FROM orders WHERE user_id = " + id;',
      '  try { audit(id) } catch (e) {}',
      '  const token = "ghp_abcdefghijklmnopqrstuvwxyz0123456789";',
      '  return db.query(q);',
      '}',
    ].join('\n');
    const rules = analyzeCode(code).findings.map((finding) => finding.rule);
    expect(rules).toEqual(expect.arrayContaining(['sql-injection', 'swallowed-error', 'hardcoded-secret']));
    expect(rules.some((rule) => /timeout/.test(rule))).toBe(true);
  });

  it('scrubSecrets removes credentials but keeps line numbers', () => {
    const code = 'const API_KEY = "sk-live-abcdef1234567890abcdef";\nconst url = "postgres://admin:hunter2@db.internal:5432/app";\nconsole.log(url);\n';
    const scrubbed = scrubSecrets(code);
    expect(scrubbed).not.toContain('sk-live-abcdef1234567890abcdef');
    expect(scrubbed).not.toContain('hunter2');
    expect(scrubbed.split('\n')).toHaveLength(code.split('\n').length);
    expect(scrubbed).toContain('process.env.API_KEY');
  });

  it('the native review never echoes a secret in the improved code', () => {
    const code = 'password = "SuperSecret123"\nrequests.get(url)\n';
    const analysis = analyzeCode(code, 'python');
    const output = parseCodeReview(JSON.stringify(buildCodeReviewOutput({ ...buildCodeReviewInput(code, 'fix', analysis), code })));
    expect(output.improvedCode ?? '').not.toContain('SuperSecret123');
    expect(JSON.stringify(output)).not.toContain('SuperSecret123');
  });

  it('the code-review prompt round-trips through the native provider', async () => {
    const code = 'const q = "SELECT * FROM t WHERE id = " + id;';
    const prompt = buildCodeReviewPrompt(buildCodeReviewInput(code, 'review', analyzeCode(code)));
    const result = await createArchNativeProvider().generate(prompt.system, prompt.user, { task: 'code_review', maxTokens: 3000, signal: new AbortController().signal });
    expect(parseCodeReview(result.text).findings.some((finding) => /sql/i.test(finding.message))).toBe(true);
  });
});

describe('arch-hybrid — local LLM with native fallback', () => {
  const signal = () => new AbortController().signal;
  const ctx = context({}, NOTES);
  const prompt = buildPrompt('summary', ctx);

  it('uses the local LLM when it answers with valid output', async () => {
    const llm: AiProvider = { name: 'local', model: 'qwen2.5-coder:7b', generate: async () => ({ text: '{"bullets":["From the LLM."]}', promptTokens: 1, completionTokens: 1, model: 'qwen2.5-coder:7b' }) };
    const result = await createHybridProvider({ llm, llmTimeoutMs: 1000 }).generate(prompt.system, prompt.user, { task: 'summary', maxTokens: 500, signal: signal(), accept: (text) => text.includes('bullets') });
    expect(result.model).toBe('qwen2.5-coder:7b');
  });

  it('falls back to the ARCH model when the LLM is down, slow or returns junk', async () => {
    const reasons: string[] = [];
    const down: AiProvider = { name: 'local', model: 'm', generate: async () => { throw new AiProviderError('ECONNREFUSED', { retryable: true }); } };
    const slow: AiProvider = { name: 'local', model: 'm', generate: (_s, _u, options) => new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason))) };
    const junk: AiProvider = { name: 'local', model: 'm', generate: async () => ({ text: 'Sure! Here is a summary…', promptTokens: 1, completionTokens: 1, model: 'm' }) };
    for (const llm of [down, slow, junk]) {
      const result = await createHybridProvider({ llm, llmTimeoutMs: 50, onFallback: (reason) => reasons.push(reason) }).generate(prompt.system, prompt.user, {
        task: 'summary',
        maxTokens: 500,
        signal: signal(),
        accept: (text) => { try { parseSummary(text); return true; } catch { return false; } },
      });
      expect(parseSummary(result.text).bullets.length).toBeGreaterThan(0);
      expect(result.model).toMatch(/arch-native-1 \(fallback/);
    }
    expect(reasons).toEqual(['llm_unavailable', 'llm_timeout', 'invalid_output']);
  });

  it('only private / local LLM endpoints count as on-premise', () => {
    for (const url of ['http://127.0.0.1:11434', 'http://localhost:8080', 'http://10.0.3.4:11434', 'http://192.168.1.20', 'http://ollama:11434', 'http://llm.internal', 'http://[::1]:11434']) {
      expect(isLocalEndpoint(url), url).toBe(true);
    }
    for (const url of ['https://api.openai.com', 'http://8.8.8.8', 'http://169.254.169.254', 'https://my-llm.example.com', 'not a url']) {
      expect(isLocalEndpoint(url), url).toBe(false);
    }
  });
});

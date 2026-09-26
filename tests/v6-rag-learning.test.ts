import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetRateLimits } from '@/lib/rate-limit';
import { setAiProviderForTesting } from '@/server/ai/provider';
import { createArchNativeProvider } from '@/server/ai/arch-native';
import { resetArchModelCache, getOrganizationModel, trainModel, processTrainingJobs, detectDrift } from '@/server/services/archModel.service';
import {
  assertPublicUrl,
  deleteKnowledgeSource,
  fetchKnowledgeUrl,
  htmlToText,
  ingestKnowledgeSource,
  listKnowledgeSources,
  resetKnowledgeCaches,
  retrieveKnowledge,
} from '@/server/services/knowledge.service';
import { recurringReport, similarIncidents } from '@/server/services/insights.service';
import { changeRiskReport, resetChangeRiskCache } from '@/server/services/changeRisk.service';
import { recordSeverityCorrection } from '@/server/services/modelLearning.service';
import { verifyPatchWithReproduction } from '@/server/services/sandbox.service';
import { approveSuggestion, generateSuggestion } from '@/server/services/copilot.service';
import { modelFeedbackRepository } from '@/server/repositories/modelFeedback.repository';
import { knowledgeSourceRepository } from '@/server/repositories/knowledgeSource.repository';
import { addMember, createTenant, createTestIncident, createTestUser, db, resetDatabase } from './helpers/db';

/**
 * V6 end to end, against a real database:
 *   - the knowledge base (RAG): ingest, retrieve, cite, tenant isolation, RBAC;
 *   - the fetch guard (SSRF) and HTML → text;
 *   - learning: feedback rows, severity corrections folded into training;
 *   - insights: similar incidents, recurring failures, change risk;
 *   - verified fix with reproduction: the test must fail before the patch and pass after it.
 */

const RUNBOOK = `# Runbook: database connection pool exhaustion

Symptoms: queries time out, the pool reports max connections, and error rates spike right after a deploy.

Steps:
1. Check the pool metrics for the affected service.
2. Look for leaked connections in the recent release.
3. Raise the pool size as an immediate mitigation, then fix the leak.
4. If the pool stays saturated for ten minutes, page the database on-call.

# Escalation

Page the database on-call if saturation continues after the mitigation.`;

async function setup(name: string) {
  const tenant = await createTenant(name);
  const responder = await createTestUser(`responder@${name.toLowerCase()}.test`, 'Riya Responder');
  const viewer = await createTestUser(`viewer@${name.toLowerCase()}.test`, 'Vik Viewer');
  await addMember(tenant.organization.id, responder.id, 'RESPONDER');
  await addMember(tenant.organization.id, viewer.id, 'VIEWER');
  return { ...tenant, responder, viewer };
}

async function resolvedIncident(
  tenant: Awaited<ReturnType<typeof setup>>,
  title: string,
  notes: string[],
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'HIGH',
) {
  const incident = await createTestIncident({
    organizationId: tenant.organization.id,
    projectId: tenant.project.id,
    serviceId: tenant.service.id,
    createdById: tenant.owner.id,
    title,
    severity,
  });
  const start = Date.now() - 3 * 60 * 60_000;
  for (const [index, body] of notes.entries()) {
    await db.incidentEvent.create({ data: { incidentId: incident.id, authorId: tenant.responder.id, type: 'COMMENT', body, createdAt: new Date(start + index * 60_000) } });
  }
  await db.incident.update({ where: { id: incident.id }, data: { status: 'RESOLVED', startedAt: new Date(start), resolvedAt: new Date(start + 45 * 60_000) } });
  return incident;
}

describe('V6 knowledge base (RAG)', () => {
  beforeEach(async () => {
    await resetDatabase();
    resetRateLimits();
    resetArchModelCache();
    resetKnowledgeCaches();
    setAiProviderForTesting(createArchNativeProvider());
  });

  it('chunks and embeds a runbook, and records an audit entry', async () => {
    const tenant = await setup('Acme');
    const result = await ingestKnowledgeSource({
      organizationId: tenant.organization.id,
      userId: tenant.responder.id,
      name: 'Database pool runbook',
      kind: 'RUNBOOK',
      text: RUNBOOK,
    });

    expect(result.created).toBe(true);
    expect(result.chunks).toBeGreaterThan(1);
    expect(result.source.status).toBe('READY');

    const chunks = await knowledgeSourceRepository.listChunks(tenant.organization.id);
    expect(chunks.length).toBe(result.chunks);
    // Every chunk carries a dense vector of the same length.
    for (const chunk of chunks) {
      expect(Array.isArray(chunk.embedding)).toBe(true);
      expect((chunk.embedding as number[]).length).toBeGreaterThan(0);
      expect((chunk.embedding as number[]).every((value) => Number.isFinite(value))).toBe(true);
    }

    const audit = await db.auditLog.findFirst({ where: { organizationId: tenant.organization.id, action: 'knowledge.ingest' } });
    expect(audit).not.toBeNull();
  });

  it('does not re-index identical content', async () => {
    const tenant = await setup('Acme');
    const first = await ingestKnowledgeSource({ organizationId: tenant.organization.id, userId: tenant.responder.id, name: 'Runbook', kind: 'RUNBOOK', text: RUNBOOK });
    const second = await ingestKnowledgeSource({ organizationId: tenant.organization.id, userId: tenant.responder.id, name: 'Runbook again', kind: 'RUNBOOK', text: RUNBOOK });
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.source.id).toBe(first.source.id);
  });

  it('retrieves the runbook for a matching failure, and nothing for an unrelated one', async () => {
    const tenant = await setup('Acme');
    await ingestKnowledgeSource({ organizationId: tenant.organization.id, userId: tenant.responder.id, name: 'Database pool runbook', kind: 'RUNBOOK', text: RUNBOOK });

    const hits = await retrieveKnowledge({ organizationId: tenant.organization.id, query: 'database connection pool exhausted, queries timing out' });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]!.sourceName).toBe('Database pool runbook');
    expect(hits[0]!.text.toLowerCase()).toContain('pool');

    const miss = await retrieveKnowledge({ organizationId: tenant.organization.id, query: 'the marketing website font looks wrong' });
    expect(miss).toEqual([]);
  });

  it('keeps one tenant’s knowledge out of another tenant’s retrieval', async () => {
    const acme = await setup('Acme');
    const globex = await setup('Globex');
    await ingestKnowledgeSource({ organizationId: acme.organization.id, userId: acme.responder.id, name: 'Acme secret runbook', kind: 'RUNBOOK', text: RUNBOOK });

    const other = await retrieveKnowledge({ organizationId: globex.organization.id, query: 'database connection pool exhausted' });
    expect(other).toEqual([]);

    // Cross-tenant delete is a 404, not a silent success.
    const [source] = await listKnowledgeSources({ organizationId: acme.organization.id, userId: acme.owner.id });
    expect(source).toBeDefined();
    await expect(deleteKnowledgeSource({ organizationId: globex.organization.id, userId: globex.owner.id, sourceId: source!.id })).rejects.toThrow();
    expect(await knowledgeSourceRepository.findById(acme.organization.id, source!.id)).not.toBeNull();
  });

  it('enforces the knowledge permissions', async () => {
    const tenant = await setup('Acme');
    await expect(
      ingestKnowledgeSource({ organizationId: tenant.organization.id, userId: tenant.viewer.id, name: 'x', kind: 'NOTE', text: RUNBOOK }),
    ).rejects.toThrow(/role/i);

    const source = await ingestKnowledgeSource({ organizationId: tenant.organization.id, userId: tenant.responder.id, name: 'Runbook', kind: 'RUNBOOK', text: RUNBOOK });
    await expect(listKnowledgeSources({ organizationId: tenant.organization.id, userId: tenant.viewer.id })).resolves.toHaveLength(1);
    await expect(deleteKnowledgeSource({ organizationId: tenant.organization.id, userId: tenant.responder.id, sourceId: source.source.id })).rejects.toThrow(/role/i);
    await expect(deleteKnowledgeSource({ organizationId: tenant.organization.id, userId: tenant.owner.id, sourceId: source.source.id })).resolves.toEqual({ id: source.source.id });
  });

  it('cites the runbook in a Copilot draft', async () => {
    const tenant = await setup('Acme');
    await ingestKnowledgeSource({ organizationId: tenant.organization.id, userId: tenant.responder.id, name: 'Database pool runbook', kind: 'RUNBOOK', text: RUNBOOK });
    const incident = await createTestIncident({
      organizationId: tenant.organization.id,
      projectId: tenant.project.id,
      serviceId: tenant.service.id,
      createdById: tenant.responder.id,
      title: 'Database connection pool exhausted, queries timing out',
      severity: 'HIGH',
    });

    const suggestion = await generateSuggestion({ organizationId: tenant.organization.id, userId: tenant.responder.id, incidentId: incident.id, type: 'POSTMORTEM' });
    const audit = await db.auditLog.findFirst({ where: { organizationId: tenant.organization.id, action: 'copilot.generate' }, orderBy: { createdAt: 'desc' } });
    const knowledge = (audit?.metadata as { knowledge?: { knowledgeChunks?: number } }).knowledge;
    expect(knowledge?.knowledgeChunks).toBeGreaterThan(0);

    // The draft itself points at the documented procedure.
    const text = JSON.stringify(suggestion.output);
    expect(text).toMatch(/Database pool runbook|pool/i);
  });
});

describe('V6 fetch guard', () => {
  beforeEach(async () => {
    await resetDatabase();
    resetRateLimits();
  });

  it('refuses internal, private and non-http URLs', async () => {
    for (const url of [
      'http://localhost:8080/admin',
      'http://127.0.0.1/',
      'http://169.254.169.254/latest/meta-data/',
      'http://10.1.2.3/internal',
      'http://192.168.0.1/',
      'http://[::1]/',
      'file:///etc/passwd',
      'ftp://example.com/x',
      'http://user:pass@example.com/',
      'http://metadata.internal/',
      'not a url',
    ]) {
      await expect(assertPublicUrl(url)).rejects.toThrow();
    }
  });

  it('accepts a public http(s) URL', async () => {
    await expect(assertPublicUrl('https://example.com/runbook.md')).resolves.toBeInstanceOf(URL);
  });

  it('strips scripts, styles and tags from fetched HTML', async () => {
    const text = htmlToText('<html><head><style>p{color:red}</style><script>alert(1)</script></head><body><h1>Runbook</h1><p>Raise the&nbsp;pool.</p><script>steal()</script></body></html>');
    expect(text).toContain('Runbook');
    expect(text).toContain('Raise the pool.');
    expect(text).not.toContain('alert');
    expect(text).not.toContain('steal');
    expect(text).not.toContain('color:red');
  });

  it('reports fetch as disabled when the deployment is offline-only', async () => {
    // ARCH_OFFLINE_ONLY defaults to true in tests; the endpoint must say so rather than try.
    await expect(fetchKnowledgeUrl({ organizationId: 'org', userId: 'user', url: 'https://example.com' })).rejects.toThrow();
  });
});

describe('V6 learning', () => {
  beforeEach(async () => {
    await resetDatabase();
    resetRateLimits();
    resetArchModelCache();
    setAiProviderForTesting(createArchNativeProvider());
  });

  it('records a human severity correction', async () => {
    const tenant = await setup('Acme');
    const incident = await createTestIncident({ organizationId: tenant.organization.id, projectId: tenant.project.id, title: 'Checkout 502s' });
    await recordSeverityCorrection({
      organizationId: tenant.organization.id,
      userId: tenant.responder.id,
      incidentId: incident.id,
      task: 'severity',
      incidentText: 'Checkout 502s after deploy',
      predicted: 'MEDIUM',
      actual: 'CRITICAL',
    });
    // Agreement is not a correction.
    await recordSeverityCorrection({
      organizationId: tenant.organization.id,
      userId: tenant.responder.id,
      incidentId: incident.id,
      task: 'severity',
      incidentText: 'Checkout 502s after deploy',
      predicted: 'HIGH',
      actual: 'HIGH',
    });

    const rows = await modelFeedbackRepository.list(tenant.organization.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.kind).toBe('SEVERITY_CORRECTED');
    expect(rows[0]!.corrected).toMatchObject({ severity: 'CRITICAL' });
  });

  it('folds a human correction into the next training run', async () => {
    const tenant = await setup('Acme');
    // A typo incident the team resolved as LOW.
    await resolvedIncident(tenant, 'Typo on the pricing page', ['Copy fix, no customer impact at all.'], 'LOW');
    const incident = await resolvedIncident(tenant, 'Checkout 502s after deploy', ['Error rate spiked to 40%, rollback restored service.'], 'LOW');

    await recordSeverityCorrection({
      organizationId: tenant.organization.id,
      userId: tenant.responder.id,
      incidentId: incident.id,
      task: 'severity',
      incidentText: 'Checkout 502s after deploy. Error rate spiked to 40%, rollback restored service.',
      predicted: 'LOW',
      actual: 'CRITICAL',
    });

    await trainModel({ organizationId: tenant.organization.id, userId: tenant.owner.id });
    const processed = await processTrainingJobs();
    expect(processed.promoted + processed.rejected).toBe(1);

    const model = await getOrganizationModel(tenant.organization.id);
    expect(model.artifact.metrics.feedbackExamples).toBe(1);
    // The corrected label now outweighs the incident's stored severity.
    expect(model.classifySeverity('Checkout 502s after deploy, error rate spiked to 40%').severity).toBe('CRITICAL');
  });

  it('indexes knowledge chunks into the training corpus', async () => {
    const tenant = await setup('Acme');
    await resolvedIncident(tenant, 'Kafka consumer lag', ['Root cause: consumer group rebalance loop after the broker upgrade.']);
    await ingestKnowledgeSource({ organizationId: tenant.organization.id, userId: tenant.responder.id, name: 'Kafka runbook', kind: 'RUNBOOK', text: RUNBOOK });
    await trainModel({ organizationId: tenant.organization.id, userId: tenant.owner.id });
    await processTrainingJobs();

    const model = await getOrganizationModel(tenant.organization.id);
    expect(model.artifact.metrics.documents.knowledge).toBeGreaterThan(0);
    const hit = model.similarDense('database connection pool exhausted', { k: 20, sources: ['knowledge'], minScore: 0 });
    expect(hit.length).toBeGreaterThan(0);
  });

  it('flags drift only when a measured accuracy actually drops', async () => {
    const base = {
      documents: { team: 5, pattern: 44, public: 0, code: 0, review: 0, knowledge: 0 },
      severity: { trainedOn: 20, holdoutAccuracy: 0.8, holdoutSize: 10, baseline: 0.5 },
      category: { trainedOn: 20, holdoutAccuracy: 0.9, holdoutSize: 10 },
      team: { severityCounts: {}, medianResolveMinutes: {}, topCategories: [] },
      feedbackExamples: 0,
      vocabularySize: 100,
      trainingMs: 10,
    };
    expect(detectDrift(base, null)).toBeNull();
    expect(detectDrift(base, base)).toBeNull();
    expect(detectDrift({ ...base, severity: { ...base.severity, holdoutAccuracy: 0.79 } }, base)).toBeNull();
    const drift = detectDrift({ ...base, severity: { ...base.severity, holdoutAccuracy: 0.6 } }, base);
    expect(drift).toMatchObject({ metric: 'severityAccuracy', previous: 0.8, current: 0.6 });
  });

  it('learns from an edited draft without breaking the approval flow', async () => {
    const tenant = await setup('Acme');
    const incident = await createTestIncident({
      organizationId: tenant.organization.id,
      projectId: tenant.project.id,
      serviceId: tenant.service.id,
      createdById: tenant.responder.id,
      title: 'Payments API latency spike',
      severity: 'HIGH',
    });
    const suggestion = await generateSuggestion({ organizationId: tenant.organization.id, userId: tenant.responder.id, incidentId: incident.id, type: 'STATUS_UPDATE' });
    const approved = (await approveSuggestion({
      organizationId: tenant.organization.id,
      userId: tenant.responder.id,
      suggestionId: suggestion.id,
      text: 'We are investigating elevated latency on payments and will update within 30 minutes.',
    }))!;
    expect(approved.status).toBe('APPROVED');

    const rows = await modelFeedbackRepository.list(tenant.organization.id, { kind: 'DRAFT_EDITED' });
    expect(rows.length).toBe(1);
    expect(JSON.stringify(rows[0]!.corrected)).toContain('elevated latency');
  });
});

describe('V6 insights', () => {
  beforeEach(async () => {
    await resetDatabase();
    resetRateLimits();
    resetArchModelCache();
    resetKnowledgeCaches();
    setAiProviderForTesting(createArchNativeProvider());
  });

  it('finds the past incidents that look like this one, with what fixed them', async () => {
    const tenant = await setup('Acme');
    await resolvedIncident(tenant, 'Checkout 502s after payments deploy', ['Root cause: missing DB migration exhausted the pool.', 'Rolled back payments-api to v128; error rate dropped to baseline.']);
    const incident = await createTestIncident({
      organizationId: tenant.organization.id,
      projectId: tenant.project.id,
      serviceId: tenant.service.id,
      createdById: tenant.responder.id,
      title: 'Checkout returning 502s right after the payments deploy',
      severity: 'HIGH',
    });

    // The team's own incidents only enter the index once a model has been trained on them.
    await trainModel({ organizationId: tenant.organization.id, userId: tenant.owner.id });
    await processTrainingJobs();

    const result = await similarIncidents({ organizationId: tenant.organization.id, userId: tenant.responder.id, incidentId: incident.id });
    expect(result.incidents.length).toBeGreaterThan(0);
    expect(result.incidents[0]!.title).toMatch(/Checkout 502s/);
    expect(result.incidents[0]!.fix?.join(' ')).toMatch(/roll|rollback/i);
    // The incident itself is never its own match.
    expect(result.incidents.map((row) => row.id)).not.toContain(incident.id);
  });

  it('groups recurring failures and marks the repeats', async () => {
    const tenant = await setup('Acme');
    for (const index of [1, 2, 3]) {
      await resolvedIncident(tenant, `Checkout 502s after deploy ${index}`, ['Root cause: missing migration.', 'Rolled back; error rate dropped.']);
    }
    await resolvedIncident(tenant, 'Typo on the pricing page', ['Copy fix.'], 'LOW');

    await trainModel({ organizationId: tenant.organization.id, userId: tenant.owner.id });
    await processTrainingJobs();

    const patterns = await recurringReport({ organizationId: tenant.organization.id, userId: tenant.responder.id });
    const deploy = patterns.find((pattern) => pattern.category === 'deploy');
    expect(deploy?.occurrences).toBe(3);
    expect(deploy?.repeat).toBe(true);
    // The one-off incident is its own pattern and is not marked as a repeat, whatever category
    // the classifier puts it in.
    const singles = patterns.filter((pattern) => pattern.occurrences === 1);
    expect(singles.length).toBeGreaterThan(0);
    expect(singles.every((pattern) => !pattern.repeat)).toBe(true);
    // Every occurrence is accounted for exactly once.
    expect(patterns.reduce((sum, pattern) => sum + pattern.occurrences, 0)).toBe(4);
  });

  it('ranks the changes that were followed by incidents', async () => {
    const tenant = await setup('Acme');
    const occurredAt = new Date(Date.now() - 30 * 60_000);
    // A change that was followed by an incident on the same service, repeated.
    for (const index of [1, 2, 3, 4, 5]) {
      await db.changeEvent.create({
        data: {
          organizationId: tenant.organization.id,
          serviceId: tenant.service.id,
          projectId: tenant.project.id,
          title: `deploy payments-api ${index}`,
          type: 'DEPLOYMENT',
          author: 'riya',
          source: 'MANUAL',
          occurredAt: new Date(occurredAt.getTime() - index * 3_600_000),
        },
      });
      await createTestIncident({
        organizationId: tenant.organization.id,
        projectId: tenant.project.id,
        serviceId: tenant.service.id,
        createdById: tenant.responder.id,
        title: `checkout 502s after deploy ${index}`,
        severity: 'HIGH',
      });
      await db.incident.updateMany({
        where: { organizationId: tenant.organization.id, title: `checkout 502s after deploy ${index}` },
        data: { startedAt: new Date(occurredAt.getTime() - index * 3_600_000 + 10 * 60_000) },
      });
    }
    // Plenty of calm changes, so the classifier has negatives to learn from (and enough examples).
    for (const index of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]) {
      await db.changeEvent.create({
        data: {
          organizationId: tenant.organization.id,
          serviceId: tenant.service.id,
          projectId: tenant.project.id,
          title: `config tweak ${index}`,
          type: 'CONFIG_CHANGE',
          author: 'ci',
          source: 'MANUAL',
          occurredAt: new Date(occurredAt.getTime() - index * 7_200_000),
        },
      });
    }

    const report = await changeRiskReport({ organizationId: tenant.organization.id, userId: tenant.responder.id, take: 25 });
    expect(report.trained).toBe(true);
    expect(report.changes.length).toBeGreaterThan(0);
    const risky = report.changes.filter((change) => change.risk.probability > 0.5);
    expect(risky.length).toBeGreaterThan(0);
    // Riskiest first.
    expect(report.changes[0]!.risk.probability).toBeGreaterThanOrEqual(report.changes[report.changes.length - 1]!.risk.probability);
  });
});

describe('V6 verified fix with reproduction', () => {
  beforeEach(async () => {
    await resetDatabase();
    resetRateLimits();
  });

  const buggy = 'function readPool() { throw new Error("pool exhausted"); }\nmodule.exports = { readPool };\n';
  const fixed = 'function readPool() { return { size: 10 }; }\nmodule.exports = { readPool };\n';
  const reproduction = [
    'const { readPool } = require("./bug");',
    'try {',
    '  readPool();',
    '  console.log("NO FAILURE");',
    '  process.exit(0);',
    '} catch (error) {',
    '  console.log("REPRODUCED:", error.message);',
    '  process.exit(1);',
    '}',
    '',
  ].join('\n');
  const patch = ['--- a/bug.js', '+++ b/bug.js', '@@', '-function readPool() { throw new Error("pool exhausted"); }', ...fixed.split('\n').map((line) => `+${line}`), ''].join('\n');

  it('passes only when the test fails before the patch and passes after it', async () => {
    const result = await verifyPatchWithReproduction({
      patch,
      testPath: 'repro.test.js',
      reproductionTest: reproduction,
      testCommand: 'node repro.test.js',
      originalFiles: { 'bug.js': buggy },
    });
    expect(result.status).toBe('PASSED');
    expect(result.reproduction.ran).toBe(true);
    expect(result.reproduction.failedBeforePatch).toBe(true);
    expect(result.reproduction.passedAfterPatch).toBe(true);
    expect(result.reproduction.beforeOutput).toContain('REPRODUCED');
  });

  it('fails when the test never reproduced the failure', async () => {
    const passingTest = 'console.log("always green");\n';
    const result = await verifyPatchWithReproduction({
      patch,
      testPath: 'repro.test.js',
      reproductionTest: passingTest,
      testCommand: 'node repro.test.js',
      originalFiles: { 'bug.js': buggy },
    });
    expect(result.status).toBe('FAILED');
    expect(result.reproduction.failedBeforePatch).toBe(false);
    expect(result.testOutput).toMatch(/does not reproduce/i);
  });

  it('refuses to claim reproduction without repository files', async () => {
    const result = await verifyPatchWithReproduction({
      patch,
      testPath: 'repro.test.js',
      reproductionTest: reproduction,
      testCommand: 'node repro.test.js',
    });
    expect(result.status).toBe('ERROR');
    expect(result.reproduction.ran).toBe(false);
    expect(result.reproduction.reason).toMatch(/repository/i);
  });

  it('blocks an unsafe patch before anything runs', async () => {
    const result = await verifyPatchWithReproduction({
      patch: 'rm -rf /\n',
      testPath: 'repro.test.js',
      reproductionTest: reproduction,
      testCommand: 'node repro.test.js',
      originalFiles: { 'bug.js': buggy },
    });
    expect(result.status).toBe('UNSAFE');
    expect(result.reproduction.ran).toBe(false);
  });

  it('blocks a test path that tries to escape the sandbox', async () => {
    const result = await verifyPatchWithReproduction({
      patch,
      testPath: '../../etc/passwd',
      reproductionTest: reproduction,
      testCommand: 'node repro.test.js',
      originalFiles: { 'bug.js': buggy },
    });
    expect(result.status).toBe('UNSAFE');
    expect(result.testOutput).toMatch(/Blocked test path/);
  });
});

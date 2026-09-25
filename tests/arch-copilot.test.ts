import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetRateLimits } from '@/lib/rate-limit';
import { setAiProviderForTesting, type AiProvider } from '@/server/ai/provider';
import { createMockProvider } from '@/server/ai/mock';
import { createArchNativeProvider } from '@/server/ai/arch-native';
import { approveSuggestion, generateSuggestion } from '@/server/services/copilot.service';
import { reviewCode } from '@/server/services/codeAssist.service';
import { getModelStatus, getOrganizationModel, resetArchModelCache, retrainStaleModels, trainModel } from '@/server/services/archModel.service';
import { addMember, createTenant, createTestIncident, createTestUser, db, resetDatabase } from './helpers/db';

/**
 * ARCH's own model end to end (V3), against a real database:
 * training on resolved incidents (tenant-scoped), knowledge in Copilot drafts, CODE_FIX,
 * Code Assist, permissions, audit (metadata only) and what leaves the process.
 */

function spyingProvider(inner: AiProvider) {
  const calls: { system: string; user: string; task: string }[] = [];
  const provider: AiProvider = {
    name: inner.name,
    model: inner.model,
    generate(system, user, options) {
      calls.push({ system, user, task: options.task });
      return inner.generate(system, user, options);
    },
  };
  return { provider, calls };
}

async function setup(name = 'Acme') {
  const tenant = await createTenant(name);
  const responder = await createTestUser(`responder@${name.toLowerCase()}.test`, 'Riya Responder');
  const viewer = await createTestUser(`viewer@${name.toLowerCase()}.test`, 'Vik Viewer');
  await addMember(tenant.organization.id, responder.id, 'RESPONDER');
  await addMember(tenant.organization.id, viewer.id, 'VIEWER');
  return { ...tenant, responder, viewer };
}

/** A resolved incident with a human timeline — the training data. */
async function resolvedIncident(tenant: Awaited<ReturnType<typeof setup>>, title: string, notes: string[], severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'HIGH') {
  const incident = await createTestIncident({ organizationId: tenant.organization.id, projectId: tenant.project.id, serviceId: tenant.service.id, createdById: tenant.owner.id, title, severity });
  const start = Date.now() - 3 * 60 * 60_000;
  for (const [index, body] of notes.entries()) {
    await db.incidentEvent.create({ data: { incidentId: incident.id, authorId: tenant.responder.id, type: 'COMMENT', body, createdAt: new Date(start + index * 60_000) } });
  }
  await db.incident.update({ where: { id: incident.id }, data: { status: 'RESOLVED', startedAt: new Date(start), resolvedAt: new Date(start + 45 * 60_000) } });
  return incident;
}

const LEDGER_NOTES = [
  'ledger-writer kafka consumer lag growing, payouts delayed.',
  'Root cause: consumer group rebalance loop after the broker upgrade.',
  'Pinned the kafka client version and restarted ledger-writer; lag draining.',
];

describe('ARCH model (V3)', () => {
  beforeEach(async () => {
    await resetDatabase();
    resetRateLimits();
    resetArchModelCache();
    setAiProviderForTesting(createArchNativeProvider());
  });

  afterEach(() => {
    setAiProviderForTesting(null);
  });

  it('trains on resolved incidents only, versioned and audited; RESPONDER cannot retrain', async () => {
    const acme = await setup();
    await resolvedIncident(acme, 'Payouts delayed: ledger consumer lag', LEDGER_NOTES, 'CRITICAL');
    await createTestIncident({ organizationId: acme.organization.id, projectId: acme.project.id, title: 'Still open — must not be learned', severity: 'LOW' });

    await expect(trainModel({ organizationId: acme.organization.id, userId: acme.responder.id })).rejects.toMatchObject({ status: 403 });

    const first = await trainModel({ organizationId: acme.organization.id, userId: acme.owner.id });
    expect(first).toMatchObject({ version: 1, teamDocuments: 1 });
    const second = await trainModel({ organizationId: acme.organization.id, userId: acme.owner.id });
    expect(second.version).toBe(2);

    const row = await db.archModel.findUniqueOrThrow({ where: { organizationId: acme.organization.id } });
    expect(JSON.stringify(row.artifact)).not.toContain('Still open');
    const audit = await db.auditLog.findFirstOrThrow({ where: { organizationId: acme.organization.id, action: 'arch_model.train' } });
    expect(audit.actorId).toBe(acme.owner.id);

    const status = await getModelStatus({ organizationId: acme.organization.id, userId: acme.viewer.id });
    expect(status.model).toMatchObject({ trained: true, version: 2, teamDocuments: 1 });
    expect(status.config.onPremise).toBe(true);
  });

  it("an organization's model never contains another organization's incidents", async () => {
    const acme = await setup('Acme');
    const globex = await setup('Globex');
    await resolvedIncident(acme, 'Acme secret project outage', ['acme-only hostname zeta-7 failed']);
    await resolvedIncident(globex, 'Globex CDN purge failed', ['cdn purge api returned 500']);
    await trainModel({ organizationId: acme.organization.id, userId: acme.owner.id });
    await trainModel({ organizationId: globex.organization.id, userId: globex.owner.id });

    const globexArtifact = JSON.stringify((await db.archModel.findUniqueOrThrow({ where: { organizationId: globex.organization.id } })).artifact);
    expect(globexArtifact).not.toContain('zeta-7');
    expect(globexArtifact).not.toContain('Acme secret project');

    const model = await getOrganizationModel(globex.organization.id);
    expect(model.similar('zeta-7 acme secret project outage', { sources: ['team'] }).map((hit) => hit.doc.title)).not.toContain('Acme secret project outage');
  });

  it('the worker retrains only organizations with newly resolved incidents', async () => {
    const acme = await setup('Acme');
    const globex = await setup('Globex');
    await resolvedIncident(acme, 'Payouts delayed', LEDGER_NOTES);
    expect((await retrainStaleModels()).trained).toEqual([acme.organization.id]);
    expect((await retrainStaleModels()).trained).toEqual([]);
    await resolvedIncident(globex, 'Globex API down', ['api 503']);
    expect((await retrainStaleModels()).trained).toEqual([globex.organization.id]);
    const audit = await db.auditLog.findFirstOrThrow({ where: { organizationId: globex.organization.id, action: 'arch_model.train' } });
    expect(audit).toMatchObject({ actorId: null, actorLabel: 'system:arch-model' });
  });

  it('Copilot drafts use what the team learned: similar past incident + its root cause', async () => {
    const acme = await setup();
    await resolvedIncident(acme, 'Payouts delayed: ledger consumer lag', LEDGER_NOTES, 'CRITICAL');
    await trainModel({ organizationId: acme.organization.id, userId: acme.owner.id });

    const incident = await createTestIncident({ organizationId: acme.organization.id, projectId: acme.project.id, serviceId: acme.service.id, createdById: acme.owner.id, title: 'Payouts stuck again — ledger-writer lag', severity: 'MEDIUM' });
    await db.incidentEvent.create({ data: { incidentId: incident.id, authorId: acme.responder.id, type: 'COMMENT', body: 'kafka consumer lag on ledger-writer climbing' } });

    const spy = spyingProvider(createArchNativeProvider());
    setAiProviderForTesting(spy.provider);
    const draft = await generateSuggestion({ organizationId: acme.organization.id, userId: acme.responder.id, incidentId: incident.id, type: 'SUMMARY' });
    expect(draft).toMatchObject({ status: 'PENDING', provider: 'arch', model: 'arch-native-1' });
    expect(spy.calls[0]!.user).toContain('Payouts delayed: ledger consumer lag');

    const audit = await db.auditLog.findFirstOrThrow({ where: { organizationId: acme.organization.id, action: 'copilot.generate' } });
    expect((audit.metadata as { knowledge?: { similarIncidents: number } }).knowledge?.similarIncidents).toBeGreaterThan(0);
  });

  it('every existing Copilot feature works on ARCH\'s own model, including approval', async () => {
    const acme = await setup();
    const incident = await createTestIncident({ organizationId: acme.organization.id, projectId: acme.project.id, serviceId: acme.service.id, createdById: acme.owner.id, title: 'Checkout returning 502 errors', severity: 'MEDIUM' });
    await db.incidentEvent.create({ data: { incidentId: incident.id, authorId: acme.responder.id, type: 'COMMENT', body: 'Errors at 18% right after the payments-api deploy; rolling back.' } });

    for (const type of ['SUMMARY', 'TRIAGE', 'STATUS_UPDATE', 'POSTMORTEM', 'CODE_FIX'] as const) {
      const draft = await generateSuggestion({ organizationId: acme.organization.id, userId: acme.responder.id, incidentId: incident.id, type });
      expect(draft.status, type).toBe('PENDING');
    }
    const summary = await db.aiSuggestion.findFirstOrThrow({ where: { incidentId: incident.id, type: 'SUMMARY' } });
    const approved = await approveSuggestion({ organizationId: acme.organization.id, userId: acme.responder.id, suggestionId: summary.id });
    expect(approved?.status).toBe('APPROVED');
  });

  it('CODE_FIX: a pasted stack trace is diagnosed, and secrets in it never reach the model', async () => {
    const acme = await setup();
    const incident = await createTestIncident({ organizationId: acme.organization.id, projectId: acme.project.id, serviceId: acme.service.id, createdById: acme.owner.id, title: 'Profile page 500s', severity: 'HIGH' });
    const spy = spyingProvider(createMockProvider());
    setAiProviderForTesting(spy.provider);

    const attachment = [
      "TypeError: Cannot read properties of undefined (reading 'id')",
      '    at getUser (src/services/user.ts:42:18)',
      'DATABASE_URL=postgres://admin:hunter2@db-primary.prod:5432/app',
      'api_key = "sk-live-abcdef1234567890abcdef"',
    ].join('\n');
    const draft = await generateSuggestion({ organizationId: acme.organization.id, userId: acme.responder.id, incidentId: incident.id, type: 'CODE_FIX', attachment });
    expect(draft.type).toBe('CODE_FIX');

    const sent = spy.calls[0]!.user;
    expect(sent).toContain('Cannot read properties of undefined');
    expect(sent).not.toContain('hunter2');
    expect(sent).not.toContain('sk-live-abcdef1234567890abcdef');
  });

  describe('Code Assist', () => {
    const CODE = [
      'async function getUser(id) {',
      '  const res = await fetch("https://api.internal/users/" + id);',
      '  const q = "SELECT * FROM orders WHERE user_id = " + id;',
      '  const token = "ghp_abcdefghijklmnopqrstuvwxyz0123456789";',
      '  try { audit(id) } catch (e) {}',
      '  return db.query(q);',
      '}',
    ].join('\n');

    it('ARCH model: finds the bugs, gives safer code, and audits metadata only (never the code)', async () => {
      const acme = await setup();
      const result = await reviewCode({ organizationId: acme.organization.id, userId: acme.responder.id, code: CODE, mode: 'fix' });
      expect(result.provider).toBe('arch');
      const messages = result.findings.map((finding) => finding.message).join(' ');
      expect(messages).toMatch(/SQL/i);
      expect(messages).toMatch(/secret|credential|token/i);
      expect(result.improvedCode ?? '').not.toContain('ghp_abcdefghijklmnopqrstuvwxyz0123456789');

      const audit = await db.auditLog.findFirstOrThrow({ where: { organizationId: acme.organization.id, action: 'copilot.code_review' } });
      expect(JSON.stringify(audit.metadata)).not.toContain('SELECT');
      expect(JSON.stringify(audit.metadata)).not.toContain('ghp_');
      expect(audit.metadata).toMatchObject({ mode: 'fix', provider: 'arch' });
      expect(await db.aiSuggestion.count()).toBe(0); // stateless
    });

    it('other providers receive scrubbed code; hard-coded secrets are still reported', async () => {
      const acme = await setup();
      const spy = spyingProvider(createMockProvider());
      setAiProviderForTesting(spy.provider);
      const result = await reviewCode({ organizationId: acme.organization.id, userId: acme.responder.id, code: CODE, mode: 'review' });
      expect(spy.calls[0]!.task).toBe('code_review');
      expect(spy.calls[0]!.user).not.toContain('ghp_abcdefghijklmnopqrstuvwxyz0123456789');
      expect(result.findings.some((finding) => /secret|credential|token/i.test(finding.message))).toBe(true);
    });

    it('explains a stack trace', async () => {
      const acme = await setup();
      const result = await reviewCode({ organizationId: acme.organization.id, userId: acme.responder.id, mode: 'explain', code: 'Traceback (most recent call last):\n  File "app/handlers.py", line 12, in handle\n    user = users[event["id"]]\nKeyError: \'id\'' });
      expect(result.kind).toBe('stack_trace');
      expect(result.diagnoses[0]?.title).toMatch(/key/i);
      expect(result.topFrame).toMatchObject({ file: 'app/handlers.py', line: 12 });
    });

    it('VIEWER cannot use it; empty and oversized input is rejected', async () => {
      const acme = await setup();
      await expect(reviewCode({ organizationId: acme.organization.id, userId: acme.viewer.id, code: CODE, mode: 'review' })).rejects.toMatchObject({ status: 403 });
      await expect(reviewCode({ organizationId: acme.organization.id, userId: acme.responder.id, code: '   ', mode: 'review' })).rejects.toMatchObject({ status: 400 });
      await expect(reviewCode({ organizationId: acme.organization.id, userId: acme.responder.id, code: 'x'.repeat(20_001), mode: 'review' })).rejects.toMatchObject({ status: 400 });
    });
  });
});

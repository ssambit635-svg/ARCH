import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetRateLimits } from '@/lib/rate-limit';
import { setAiProviderForTesting, type AiProvider } from '@/server/ai/provider';
import { createMockProvider } from '@/server/ai/mock';
import { approveSuggestion, dismissSuggestion, generateSuggestion, listSuggestions } from '@/server/services/copilot.service';
import { getPublicStatusPage, createStatusPage, setStatusPagePublished } from '@/server/services/statusPage.service';
import { addMember, createTenant, createTestIncident, createTestUser, db, resetDatabase } from './helpers/db';

/**
 * ARCH Copilot (AGENTS-V2.md) against a real database with the mock provider.
 * Covers the V2 acceptance criteria: drafts persist as PENDING with token usage, summary/triage/
 * status/postmortem contracts, approval permissions + reviewer recording, dismiss, audit,
 * cross-tenant 404s, per-org rate limit, redaction on the wire and the timeout path.
 */

/** Wraps the mock provider and records exactly what would have been sent to a vendor. */
function spyingProvider(inner: AiProvider = createMockProvider()) {
  const calls: { system: string; user: string }[] = [];
  const provider: AiProvider = {
    name: inner.name,
    model: inner.model,
    generate(system, user, options) {
      calls.push({ system, user });
      return inner.generate(system, user, options);
    },
  };
  return { provider, calls };
}

async function tenantWithIncident(name = 'Acme') {
  const tenant = await createTenant(name);
  const responder = await createTestUser(`responder@${name.toLowerCase()}.test`, 'Riya Responder');
  const viewer = await createTestUser(`viewer@${name.toLowerCase()}.test`, 'Vik Viewer');
  await addMember(tenant.organization.id, responder.id, 'RESPONDER');
  await addMember(tenant.organization.id, viewer.id, 'VIEWER');
  const incident = await createTestIncident({
    organizationId: tenant.organization.id,
    projectId: tenant.project.id,
    serviceId: tenant.service.id,
    createdById: tenant.owner.id,
    title: 'Checkout returning 502 errors',
    severity: 'MEDIUM',
  });
  const notes = [
    'Alert fired: 502 rate at 18% on checkout.',
    'Errors started right after the 14:05 deploy of payments-api.',
    'db-primary-03.prod.acme.net CPU pinned at 100%, connections exhausted.',
    'Rolled back payments-api to v1.42.0; error rate dropping.',
    'Error rate back to baseline, monitoring for 30 minutes.',
  ];
  for (const [index, body] of notes.entries()) {
    await db.incidentEvent.create({
      data: { incidentId: incident.id, authorId: index % 2 ? responder.id : tenant.owner.id, type: 'COMMENT', body, createdAt: new Date(Date.now() - (notes.length - index) * 60_000) },
    });
  }
  return { ...tenant, responder, viewer, incident };
}

describe('ARCH Copilot', () => {
  beforeEach(async () => {
    await resetDatabase();
    resetRateLimits();
    setAiProviderForTesting(null);
  });

  afterEach(() => {
    setAiProviderForTesting(null);
  });

  // ------------------------------------------------------------------ M1

  it('M1: a mock call persists a PENDING suggestion with token usage and an audit entry', async () => {
    const { organization, responder, incident } = await tenantWithIncident();

    const suggestion = await generateSuggestion({ organizationId: organization.id, userId: responder.id, incidentId: incident.id, type: 'SUMMARY' });

    const row = await db.aiSuggestion.findUniqueOrThrow({ where: { id: suggestion.id } });
    expect(row).toMatchObject({ status: 'PENDING', type: 'SUMMARY', provider: 'mock', model: 'mock-copilot-1', createdById: responder.id, organizationId: organization.id });
    expect(row.promptTokens).toBeGreaterThan(0);
    expect(row.completionTokens).toBeGreaterThan(0);
    expect(row.reviewedById).toBeNull();

    const audit = await db.auditLog.findFirstOrThrow({ where: { organizationId: organization.id, action: 'copilot.generate' } });
    expect(audit).toMatchObject({ actorId: responder.id, entityType: 'ai_suggestion', entityId: suggestion.id });
    expect(audit.metadata).toMatchObject({ type: 'SUMMARY', promptTokens: row.promptTokens, completionTokens: row.completionTokens });

    // Nothing was applied to the incident: AI output is a draft.
    const events = await db.incidentEvent.count({ where: { incidentId: incident.id } });
    expect(events).toBe(5);
  });

  // ------------------------------------------------------------------ M2: summary + triage

  it('summary: incident with ≥5 events → at most 5 bullets, well under 10 seconds', async () => {
    const { organization, responder, incident } = await tenantWithIncident();
    const started = Date.now();
    const suggestion = await generateSuggestion({ organizationId: organization.id, userId: responder.id, incidentId: incident.id, type: 'SUMMARY' });
    expect(Date.now() - started).toBeLessThan(10_000);
    const bullets = (suggestion.output as { bullets: string[] }).bullets;
    expect(bullets.length).toBeGreaterThan(0);
    expect(bullets.length).toBeLessThanOrEqual(5);
  });

  it('triage: returns a severity and an assigneeId that is a real member of the organization', async () => {
    const { organization, responder, viewer, incident } = await tenantWithIncident();
    const suggestion = await generateSuggestion({ organizationId: organization.id, userId: responder.id, incidentId: incident.id, type: 'TRIAGE' });
    const output = suggestion.output as { severity: string; assigneeId?: string; rationale: string };

    expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(output.severity);
    expect(output.assigneeId).toBeDefined();
    const membership = await db.membership.findFirst({ where: { organizationId: organization.id, userId: output.assigneeId } });
    expect(membership).not.toBeNull();
    // Viewers cannot be assigned, so they are never offered to the model.
    expect(output.assigneeId).not.toBe(viewer.id);
  });

  it('triage: an assignee the model made up is omitted, never stored', async () => {
    const { organization, responder, incident } = await tenantWithIncident();
    setAiProviderForTesting({
      name: 'test',
      model: 'test',
      async generate() {
        return { text: JSON.stringify({ severity: 'HIGH', assigneeRef: 'm99', rationale: 'Looks bad.' }), promptTokens: 1, completionTokens: 1, model: 'test' };
      },
    });
    const suggestion = await generateSuggestion({ organizationId: organization.id, userId: responder.id, incidentId: incident.id, type: 'TRIAGE' });
    expect(suggestion.output).toEqual({ severity: 'HIGH', rationale: 'Looks bad.' });
  });

  // ------------------------------------------------------------------ M3: status draft + postmortem

  it('status draft: customer-safe text with no internal hostnames, even if the model leaks them', async () => {
    const { organization, responder, incident } = await tenantWithIncident();
    setAiProviderForTesting({
      name: 'test',
      model: 'test',
      async generate() {
        return {
          text: JSON.stringify({ body: 'Checkout errors were caused by db-primary-03.prod.acme.net (10.0.4.17). We rolled back payments-api-7d9f8b6c5d-x2kq9.' }),
          promptTokens: 1,
          completionTokens: 1,
          model: 'test',
        };
      },
    });
    const suggestion = await generateSuggestion({ organizationId: organization.id, userId: responder.id, incidentId: incident.id, type: 'STATUS_UPDATE' });
    const body = (suggestion.output as { body: string }).body;
    expect(body).not.toMatch(/db-primary|10\.0\.4\.17|prod\.acme\.net|7d9f8b6c5d/);
    expect(body).toContain('Checkout errors');

    // The default mock is customer-safe too.
    setAiProviderForTesting(null);
    const mockDraft = await generateSuggestion({ organizationId: organization.id, userId: responder.id, incidentId: incident.id, type: 'STATUS_UPDATE' });
    expect((mockDraft.output as { body: string }).body).not.toMatch(/prod\.acme\.net/);
  });

  it('postmortem: Timeline / Impact / Root cause / Action items', async () => {
    const { organization, responder, incident } = await tenantWithIncident();
    const suggestion = await generateSuggestion({ organizationId: organization.id, userId: responder.id, incidentId: incident.id, type: 'POSTMORTEM' });
    const output = suggestion.output as { timeline: string[]; impact: string; rootCause: string; actionItems: string[]; markdown: string };
    expect(output.timeline.length).toBeGreaterThan(0);
    expect(output.impact).toBeTruthy();
    expect(output.rootCause).toBeTruthy();
    expect(output.actionItems.length).toBeGreaterThan(0);
    expect(output.markdown).toMatch(/## Timeline[\s\S]*## Impact[\s\S]*## Root cause[\s\S]*## Action items/);
  });

  // ------------------------------------------------------------------ approval / dismissal

  it('approve: VIEWER gets 403; RESPONDER approval records reviewer + timestamp and posts to the timeline', async () => {
    const { organization, responder, viewer, incident } = await tenantWithIncident();
    const draft = await generateSuggestion({ organizationId: organization.id, userId: responder.id, incidentId: incident.id, type: 'STATUS_UPDATE' });

    await expect(approveSuggestion({ organizationId: organization.id, userId: viewer.id, suggestionId: draft.id })).rejects.toMatchObject({ status: 403 });
    await expect(dismissSuggestion({ organizationId: organization.id, userId: viewer.id, suggestionId: draft.id })).rejects.toMatchObject({ status: 403 });
    await expect(generateSuggestion({ organizationId: organization.id, userId: viewer.id, incidentId: incident.id, type: 'SUMMARY' })).rejects.toMatchObject({ status: 403 });

    const before = Date.now();
    const approved = await approveSuggestion({ organizationId: organization.id, userId: responder.id, suggestionId: draft.id });
    expect(approved?.status).toBe('APPROVED');
    expect(approved?.reviewedById).toBe(responder.id);
    expect(approved?.reviewedAt?.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(approved?.appliedEventId).toBeTruthy();

    const event = await db.incidentEvent.findUniqueOrThrow({ where: { id: approved!.appliedEventId! } });
    expect(event).toMatchObject({ type: 'COMMENT', authorId: responder.id, body: (draft.output as { body: string }).body });
    expect(event.metadata).toMatchObject({ source: 'copilot', suggestionId: draft.id, suggestionType: 'STATUS_UPDATE' });

    const audit = await db.auditLog.findFirstOrThrow({ where: { organizationId: organization.id, action: 'copilot.approve' } });
    expect(audit).toMatchObject({ actorId: responder.id, entityId: draft.id });

    // Cannot be approved twice.
    await expect(approveSuggestion({ organizationId: organization.id, userId: responder.id, suggestionId: draft.id })).rejects.toMatchObject({ status: 409 });
  });

  it('approve: a reviewer can edit a draft before posting it', async () => {
    const { organization, owner, incident } = await tenantWithIncident();
    const draft = await generateSuggestion({ organizationId: organization.id, userId: owner.id, incidentId: incident.id, type: 'SUMMARY' });
    const approved = await approveSuggestion({ organizationId: organization.id, userId: owner.id, suggestionId: draft.id, text: 'Hand-edited summary.' });
    const event = await db.incidentEvent.findUniqueOrThrow({ where: { id: approved!.appliedEventId! } });
    expect(event.body).toBe('Hand-edited summary.');
    expect(event.metadata).toMatchObject({ edited: true });
  });

  it('approved status update becomes the latest update on the published status page', async () => {
    const { organization, owner, service, incident } = await tenantWithIncident();
    const page = await createStatusPage({ organizationId: organization.id, userId: owner.id, name: 'Acme status', slug: 'acme-status', serviceIds: [service.id] });
    await setStatusPagePublished({ organizationId: organization.id, userId: owner.id, statusPageId: page.id, isPublished: true });

    const draft = await generateSuggestion({ organizationId: organization.id, userId: owner.id, incidentId: incident.id, type: 'STATUS_UPDATE' });
    // Draft alone changes nothing publicly.
    const beforeApproval = await getPublicStatusPage('acme-status');
    const bodyBefore = beforeApproval?.activeIncidents.find((item) => item.id === incident.id)?.latestUpdate?.body;
    expect(bodyBefore).not.toBe((draft.output as { body: string }).body);

    await approveSuggestion({ organizationId: organization.id, userId: owner.id, suggestionId: draft.id });
    const afterApproval = await getPublicStatusPage('acme-status');
    const latest = afterApproval?.activeIncidents.find((item) => item.id === incident.id)?.latestUpdate;
    expect(latest?.body).toBe((draft.output as { body: string }).body);
  });

  it('approve triage: applies severity + assignee through the incident service, with events and audit', async () => {
    const { organization, owner, responder, incident } = await tenantWithIncident();
    const draft = await generateSuggestion({ organizationId: organization.id, userId: owner.id, incidentId: incident.id, type: 'TRIAGE' });
    const output = draft.output as { severity: string; assigneeId?: string };

    await approveSuggestion({ organizationId: organization.id, userId: responder.id, suggestionId: draft.id });

    const updated = await db.incident.findUniqueOrThrow({ where: { id: incident.id } });
    expect(updated.severity).toBe(output.severity);
    expect(updated.assignedToId).toBe(output.assigneeId);
    const actions = (await db.auditLog.findMany({ where: { organizationId: organization.id } })).map((row) => row.action);
    expect(actions).toEqual(expect.arrayContaining(['copilot.generate', 'incident.severity_change', 'incident.assign', 'copilot.approve']));
  });

  it('dismiss: leaves the pending list but keeps the record for audit', async () => {
    const { organization, responder, incident } = await tenantWithIncident();
    const draft = await generateSuggestion({ organizationId: organization.id, userId: responder.id, incidentId: incident.id, type: 'POSTMORTEM' });

    const pendingBefore = await listSuggestions({ organizationId: organization.id, userId: responder.id, incidentId: incident.id, status: 'PENDING' });
    expect(pendingBefore.map((item) => item.id)).toEqual([draft.id]);

    const dismissed = await dismissSuggestion({ organizationId: organization.id, userId: responder.id, suggestionId: draft.id });
    expect(dismissed).toMatchObject({ status: 'DISMISSED', reviewedById: responder.id });

    const pendingAfter = await listSuggestions({ organizationId: organization.id, userId: responder.id, incidentId: incident.id, status: 'PENDING' });
    expect(pendingAfter).toHaveLength(0);
    const all = await listSuggestions({ organizationId: organization.id, userId: responder.id, incidentId: incident.id });
    expect(all.map((item) => item.id)).toEqual([draft.id]);
    expect(await db.auditLog.count({ where: { organizationId: organization.id, action: 'copilot.dismiss', entityId: draft.id } })).toBe(1);
    // Nothing was posted.
    expect(await db.incidentEvent.count({ where: { incidentId: incident.id } })).toBe(5);
  });

  // ------------------------------------------------------------------ tenancy

  it('cross-tenant: org B cannot generate on, list, approve or dismiss org A’s data (404)', async () => {
    const acme = await tenantWithIncident('Acme');
    const globex = await tenantWithIncident('Globex');
    const draft = await generateSuggestion({ organizationId: acme.organization.id, userId: acme.owner.id, incidentId: acme.incident.id, type: 'SUMMARY' });

    const asGlobex = { organizationId: globex.organization.id, userId: globex.owner.id };
    await expect(generateSuggestion({ ...asGlobex, incidentId: acme.incident.id, type: 'SUMMARY' })).rejects.toMatchObject({ status: 404 });
    await expect(listSuggestions({ ...asGlobex, incidentId: acme.incident.id })).rejects.toMatchObject({ status: 404 });
    await expect(approveSuggestion({ ...asGlobex, suggestionId: draft.id })).rejects.toMatchObject({ status: 404 });
    await expect(dismissSuggestion({ ...asGlobex, suggestionId: draft.id })).rejects.toMatchObject({ status: 404 });

    // A Globex user naming Acme's organization directly is not a member → 404 as well.
    await expect(generateSuggestion({ organizationId: acme.organization.id, userId: globex.owner.id, incidentId: acme.incident.id, type: 'SUMMARY' })).rejects.toMatchObject({
      status: 404,
    });

    const untouched = await db.aiSuggestion.findUniqueOrThrow({ where: { id: draft.id } });
    expect(untouched.status).toBe('PENDING');
  });

  it('context never contains another organization’s data', async () => {
    const acme = await tenantWithIncident('Acme');
    const globex = await tenantWithIncident('Globex');
    await db.incidentEvent.create({ data: { incidentId: globex.incident.id, authorId: globex.owner.id, type: 'COMMENT', body: 'GLOBEX-CONFIDENTIAL-MARKER' } });

    const spy = spyingProvider();
    setAiProviderForTesting(spy.provider);
    await generateSuggestion({ organizationId: acme.organization.id, userId: acme.owner.id, incidentId: acme.incident.id, type: 'TRIAGE' });

    const sent = spy.calls.map((call) => call.system + call.user).join('\n');
    expect(sent).not.toContain('GLOBEX-CONFIDENTIAL-MARKER');
    expect(sent).not.toContain(globex.owner.id);
    expect(sent).not.toContain(acme.owner.id); // real ids are never sent, only opaque refs
    expect(sent).not.toContain('owner@acme.test');
  });

  // ------------------------------------------------------------------ guardrails end-to-end

  it('redaction: secrets in the timeline never reach the provider', async () => {
    const { organization, responder, incident } = await tenantWithIncident();
    await db.incidentEvent.create({
      data: {
        incidentId: incident.id,
        authorId: responder.id,
        type: 'COMMENT',
        body: 'Rotated creds. old key sk-proj-abcdefghijklmnopqrstuvwxyz123456, DB_PASSWORD=hunter2-super-secret, postgres://admin:s3cr3tpass@db:5432/app, ping riya@acme.test',
      },
    });

    const spy = spyingProvider();
    setAiProviderForTesting(spy.provider);
    await generateSuggestion({ organizationId: organization.id, userId: responder.id, incidentId: incident.id, type: 'SUMMARY' });

    expect(spy.calls).toHaveLength(1);
    const sent = spy.calls[0]!.user;
    expect(sent).toContain('Rotated creds');
    for (const secret of ['sk-proj-abcdefghijklmnopqrstuvwxyz123456', 'hunter2-super-secret', 's3cr3tpass', 'riya@acme.test']) {
      expect(sent).not.toContain(secret);
    }
  });

  it('rate limit: 20 AI calls per minute per organization, then 429 — other organizations unaffected', async () => {
    const acme = await tenantWithIncident('Acme');
    const globex = await tenantWithIncident('Globex');

    for (let index = 0; index < 20; index += 1) {
      await generateSuggestion({ organizationId: acme.organization.id, userId: acme.responder.id, incidentId: acme.incident.id, type: 'SUMMARY' });
    }
    await expect(
      generateSuggestion({ organizationId: acme.organization.id, userId: acme.owner.id, incidentId: acme.incident.id, type: 'SUMMARY' }),
    ).rejects.toMatchObject({ status: 429, code: 'RATE_LIMITED' });
    expect(await db.aiSuggestion.count({ where: { organizationId: acme.organization.id } })).toBe(20);

    await expect(
      generateSuggestion({ organizationId: globex.organization.id, userId: globex.owner.id, incidentId: globex.incident.id, type: 'SUMMARY' }),
    ).resolves.toMatchObject({ status: 'PENDING' });
  });

  it('timeout: a hanging provider is retried once, then a friendly 503 — nothing persisted, failure audited', async () => {
    const { organization, responder, incident } = await tenantWithIncident();
    let calls = 0;
    setAiProviderForTesting({
      name: 'test',
      model: 'slow-model',
      generate: () => {
        calls += 1;
        return new Promise(() => undefined);
      },
    });

    const error = await generateSuggestion({ organizationId: organization.id, userId: responder.id, incidentId: incident.id, type: 'SUMMARY' }).catch(
      (caught: unknown) => caught,
    );
    expect(error).toMatchObject({ status: 503, code: 'SERVICE_UNAVAILABLE' });
    expect((error as Error).message).toMatch(/took too long/);
    expect(calls).toBe(2);
    expect(await db.aiSuggestion.count()).toBe(0);

    const audit = await db.auditLog.findFirstOrThrow({ where: { organizationId: organization.id, action: 'copilot.generate_failed' } });
    expect(audit.metadata).toMatchObject({ type: 'SUMMARY', reason: 'timeout', attempts: 2 });
  });
});

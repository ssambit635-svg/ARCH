import { beforeEach, describe, expect, it } from 'vitest';
import { resetRateLimits } from '@/lib/rate-limit';
import { env } from '@/lib/env';
import {
  chatCorpusSummary,
  createChatSession,
  deleteAllChatSessions,
  deleteChatSession,
  getChatSession,
  listChatSessions,
  regenerateChatAnswer,
  renameChatSession,
  sendChatMessage,
  titleFromMessage,
} from '@/server/services/archChat.service';
import { ingestKnowledgeSource, resetKnowledgeCaches } from '@/server/services/knowledge.service';
import { approveSuggestion, generateSuggestion } from '@/server/services/copilot.service';
import { processTrainingJobs, resetArchModelCache, trainModel } from '@/server/services/archModel.service';
import { addMember, createTenant, createTestIncident, createTestUser, db, resetDatabase } from './helpers/db';

/**
 * Chat with ARCH, end to end against a real database.
 *
 * What matters here (and cannot be proven by the pure engine tests):
 *   - transcripts persist and come back in order, with citations;
 *   - conversations are personal and tenant-scoped: another member or another workspace gets 404;
 *   - rename, delete and clear-all behave, and are audited;
 *   - the rate limit is the same budget as the rest of Copilot;
 *   - answers are grounded on real workspace data (open queue, history, runbooks).
 */

const RUNBOOK = `# Runbook: Redis cache misses\n\nSymptoms: hit rate collapses and backend calls spike.\n\nSteps:\n1. Compare the current hit rate with an hour ago.\n2. Check evictions and memory — a working set that no longer fits evicts hot keys.\n3. Warm the hottest keys and add jittered TTLs before retrying.`;

async function setup(name: string) {
  const tenant = await createTenant(name);
  const responder = await createTestUser(`responder@${name.toLowerCase()}.test`, `${name} Responder`);
  await addMember(tenant.organization.id, responder.id, 'RESPONDER');
  const viewer = await createTestUser(`viewer@${name.toLowerCase()}.test`, `${name} Viewer`);
  await addMember(tenant.organization.id, viewer.id, 'VIEWER');
  return { ...tenant, responder, viewer };
}

describe('Chat with ARCH (service)', () => {
  beforeEach(async () => {
    await resetDatabase();
    resetRateLimits();
    resetArchModelCache();
    resetKnowledgeCaches();
  });

  it('creates a conversation, answers the first message, and titles the chat from it', async () => {
    const { organization, owner, project, service } = await setup('chat');
    await createTestIncident({ organizationId: organization.id, projectId: project.id, serviceId: service.id, title: 'Checkout latency spike', severity: 'HIGH' });

    const session = await createChatSession({ organizationId: organization.id, userId: owner.id });
    expect(session.title).toBe('New chat');
    expect(session.messageCount).toBe(0);

    const result = await sendChatMessage({
      organizationId: organization.id,
      userId: owner.id,
      sessionId: session.id,
      content: 'what is open right now?',
    });

    expect(result.archMessage.role).toBe('ARCH');
    expect(result.archMessage.intent).toBe('open_incidents');
    expect(result.archMessage.content).toContain('Checkout latency spike');
    expect(result.archMessage.citations[0]?.href).toBe(`/dashboard/incidents/${(await db.incident.findFirstOrThrow({ where: { organizationId: organization.id } })).id}`);
    // Auto-title comes from the first user message, and the count includes both turns.
    expect(result.session.title).toBe(titleFromMessage('what is open right now?'));
    expect(result.session.messageCount).toBe(2);
    expect(result.session.titleSource).toBe('AUTO');
  });

  it('persists the transcript and returns it oldest-first', async () => {
    const { organization, owner } = await setup('persist');
    const session = await createChatSession({ organizationId: organization.id, userId: owner.id });
    await sendChatMessage({ organizationId: organization.id, userId: owner.id, sessionId: session.id, content: 'hello' });
    await sendChatMessage({ organizationId: organization.id, userId: owner.id, sessionId: session.id, content: 'what can you do?' });

    const view = await getChatSession({ organizationId: organization.id, userId: owner.id, sessionId: session.id });
    expect(view.messages).toHaveLength(4);
    expect(view.messages.map((message) => message.role)).toEqual(['USER', 'ARCH', 'USER', 'ARCH']);
    expect(view.messages[0]!.content).toBe('hello');
    expect(view.messages[1]!.suggestions.length).toBeGreaterThan(0);

    const list = await listChatSessions({ organizationId: organization.id, userId: owner.id });
    expect(list).toHaveLength(1);
    expect(list[0]!.preview).toBeTruthy();
  });

  it('keeps one member’s chats invisible to another member of the same workspace', async () => {
    const { organization, owner, responder } = await setup('personal');
    const session = await createChatSession({ organizationId: organization.id, userId: owner.id });
    await sendChatMessage({ organizationId: organization.id, userId: owner.id, sessionId: session.id, content: 'what is open?' });

    expect(await listChatSessions({ organizationId: organization.id, userId: responder.id })).toHaveLength(0);
    await expect(getChatSession({ organizationId: organization.id, userId: responder.id, sessionId: session.id })).rejects.toMatchObject({ status: 404 });
    await expect(
      sendChatMessage({ organizationId: organization.id, userId: responder.id, sessionId: session.id, content: 'sneaking in' }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(deleteChatSession({ organizationId: organization.id, userId: responder.id, sessionId: session.id })).rejects.toMatchObject({ status: 404 });
    await expect(renameChatSession({ organizationId: organization.id, userId: responder.id, sessionId: session.id, title: 'mine now' })).rejects.toMatchObject({ status: 404 });
  });

  it('isolates chats across workspaces', async () => {
    const a = await setup('tenant-a');
    const b = await setup('tenant-b');
    const session = await createChatSession({ organizationId: a.organization.id, userId: a.owner.id });
    await sendChatMessage({ organizationId: a.organization.id, userId: a.owner.id, sessionId: session.id, content: 'what is open?' });
    await expect(getChatSession({ organizationId: b.organization.id, userId: b.owner.id, sessionId: session.id })).rejects.toMatchObject({ status: 404 });
    expect(await listChatSessions({ organizationId: b.organization.id, userId: b.owner.id })).toHaveLength(0);
  });

  it('renames a chat, keeps the human title sticky, and deletes it', async () => {
    const { organization, owner } = await setup('rename');
    const session = await createChatSession({ organizationId: organization.id, userId: owner.id });
    await sendChatMessage({ organizationId: organization.id, userId: owner.id, sessionId: session.id, content: 'what is open?' });
    const renamed = await renameChatSession({ organizationId: organization.id, userId: owner.id, sessionId: session.id, title: 'On-call handover notes' });
    expect(renamed.title).toBe('On-call handover notes');
    expect(renamed.titleSource).toBe('USER');

    // A second turn must not overwrite the human title with an auto one.
    await sendChatMessage({ organizationId: organization.id, userId: owner.id, sessionId: session.id, content: 'how are we doing?' });
    const reloaded = await getChatSession({ organizationId: organization.id, userId: owner.id, sessionId: session.id });
    expect(reloaded.title).toBe('On-call handover notes');

    await deleteChatSession({ organizationId: organization.id, userId: owner.id, sessionId: session.id });
    expect(await listChatSessions({ organizationId: organization.id, userId: owner.id })).toHaveLength(0);
    await expect(getChatSession({ organizationId: organization.id, userId: owner.id, sessionId: session.id })).rejects.toMatchObject({ status: 404 });
  });

  it('clears every chat for the caller only', async () => {
    const { organization, owner, responder } = await setup('clear');
    await createChatSession({ organizationId: organization.id, userId: owner.id });
    await createChatSession({ organizationId: organization.id, userId: owner.id });
    const other = await createChatSession({ organizationId: organization.id, userId: responder.id });

    const result = await deleteAllChatSessions({ organizationId: organization.id, userId: owner.id });
    expect(result.deleted).toBe(2);
    expect(await listChatSessions({ organizationId: organization.id, userId: owner.id })).toHaveLength(0);
    expect(await listChatSessions({ organizationId: organization.id, userId: responder.id })).toHaveLength(1);
    expect(other.id).toBeTruthy();
  });

  it('writes an audit entry for session lifecycle and messages — never the message text', async () => {
    const { organization, owner } = await setup('audit');
    const session = await createChatSession({ organizationId: organization.id, userId: owner.id });
    await sendChatMessage({ organizationId: organization.id, userId: owner.id, sessionId: session.id, content: 'the secret answer is 42, what is open?' });
    await renameChatSession({ organizationId: organization.id, userId: owner.id, sessionId: session.id, title: 'Handover' });
    await deleteChatSession({ organizationId: organization.id, userId: owner.id, sessionId: session.id });

    const actions = (await db.auditLog.findMany({ where: { organizationId: organization.id }, orderBy: { createdAt: 'asc' } })).map((row) => row.action);
    expect(actions).toContain('chat.session.create');
    expect(actions).toContain('chat.message');
    expect(actions).toContain('chat.session.rename');
    expect(actions).toContain('chat.session.delete');

    const message = await db.auditLog.findFirstOrThrow({ where: { organizationId: organization.id, action: 'chat.message' } });
    expect(JSON.stringify(message.metadata)).not.toContain('the secret answer');
    expect((message.metadata as { intent?: string }).intent).toBeDefined();
  });

  it('enforces the Copilot rate limit per organization', async () => {
    const { organization, owner } = await setup('ratelimit');
    const session = await createChatSession({ organizationId: organization.id, userId: owner.id });
    let limited = 0;
    for (let index = 0; index < env.AI_RATE_LIMIT_PER_MINUTE + 2; index += 1) {
      try {
        await sendChatMessage({ organizationId: organization.id, userId: owner.id, sessionId: session.id, content: `hello number ${index}` });
      } catch (error) {
        limited += 1;
        expect(error).toMatchObject({ status: 429 });
      }
    }
    expect(limited).toBeGreaterThan(0);
  }, 60_000);

  it('refuses a VIEWER (403) and lets them read their own — empty — inbox', async () => {
    const { organization, viewer } = await setup('rbac');
    expect(await listChatSessions({ organizationId: organization.id, userId: viewer.id })).toHaveLength(0);
    await expect(createChatSession({ organizationId: organization.id, userId: viewer.id })).rejects.toMatchObject({ status: 403 });
    await expect(sendChatMessage({ organizationId: organization.id, userId: viewer.id, content: 'what is open?' })).rejects.toMatchObject({ status: 403 });
  });

  it('rejects empty, oversized and unknown-session requests', async () => {
    const { organization, owner } = await setup('validation');
    await expect(sendChatMessage({ organizationId: organization.id, userId: owner.id, content: ' ' })).rejects.toMatchObject({ status: 400 });
    await expect(sendChatMessage({ organizationId: organization.id, userId: owner.id, content: 'x'.repeat(1_500) })).rejects.toMatchObject({ status: 400 });
    await expect(sendChatMessage({ organizationId: organization.id, userId: owner.id, sessionId: 'nope', content: 'hello there' })).rejects.toMatchObject({ status: 404 });
    await expect(renameChatSession({ organizationId: organization.id, userId: owner.id, sessionId: 'nope', title: 'x' })).rejects.toMatchObject({ status: 404 });
  });

  it('answers history questions from the trained model, with the learned root cause', async () => {
    const { organization, owner, project, service } = await setup('history');
    const incident = await createTestIncident({
      organizationId: organization.id,
      projectId: project.id,
      serviceId: service.id,
      title: 'Payment timeouts after deploy',
      severity: 'CRITICAL',
    });
    await db.incident.update({ where: { id: incident.id }, data: { status: 'RESOLVED', resolvedAt: new Date(), startedAt: new Date(Date.now() - 73 * 60_000) } });
    await db.incidentEvent.create({
      data: {
        incidentId: incident.id,
        type: 'COMMENT',
        body: 'Root cause: a slow query added in the release exhausted the database connection pool. Rolling back the deploy fixed it.',
      },
    });

    // Train the organization's model so the resolved incident becomes retrievable history.
    // `trainModel` enqueues (training never runs inside a web request); the worker drains it.
    await trainModel({ organizationId: organization.id, userId: owner.id });
    const training = await processTrainingJobs({ limit: 1 });
    expect(training.processed).toBe(1);
    resetArchModelCache();

    const result = await sendChatMessage({
      organizationId: organization.id,
      userId: owner.id,
      content: 'have we seen payment timeouts before?',
    });
    expect(result.archMessage.intent).toBe('incident_search');
    expect(result.archMessage.content).toContain('Payment timeouts after deploy');
    expect(result.archMessage.content.toLowerCase()).toContain('connection pool');
    expect(result.archMessage.citations.some((citation) => citation.href?.includes(incident.id))).toBe(true);
  }, 60_000);

  it('answers runbook questions from the workspace knowledge base', async () => {
    const { organization, owner } = await setup('runbook');
    await ingestKnowledgeSource({ organizationId: organization.id, userId: owner.id, name: 'Redis runbook', kind: 'RUNBOOK', text: RUNBOOK });
    const result = await sendChatMessage({
      organizationId: organization.id,
      userId: owner.id,
      content: 'what does our runbook say about redis cache misses?',
    });
    expect(result.archMessage.intent).toBe('runbook');
    expect(result.archMessage.content).toContain('Redis runbook');
    expect(result.archMessage.citations.some((citation) => citation.source === 'runbook')).toBe(true);
  });

  it('uses real numbers — open severity mix, resolved counts and the measured median — in the stats answer', async () => {
    const { organization, owner, project, service } = await setup('stats');
    const open = await createTestIncident({
      organizationId: organization.id,
      projectId: project.id,
      serviceId: service.id,
      title: 'Payments API down',
      severity: 'CRITICAL',
    });
    // Three resolved incidents (10m / 30m / 50m) so the median is measurable, not guessed.
    for (const minutes of [10, 30, 50]) {
      const resolved = await createTestIncident({
        organizationId: organization.id,
        projectId: project.id,
        serviceId: service.id,
        title: `Resolved incident ${minutes}`,
        severity: 'MEDIUM',
      });
      await db.incident.update({
        where: { id: resolved.id },
        data: { status: 'RESOLVED', resolvedAt: new Date(), startedAt: new Date(Date.now() - minutes * 60_000) },
      });
    }
    // The open critical one shows up in the live mix; the resolved ones in the counts.
    await db.incident.update({ where: { id: open.id }, data: { startedAt: new Date(Date.now() - 12 * 60_000) } });

    const answer = await sendChatMessage({ organizationId: organization.id, userId: owner.id, content: 'how are we doing this month?' });
    expect(answer.archMessage.intent).toBe('stats');
    expect(answer.archMessage.content).toMatch(/Open now: 1/);
    expect(answer.archMessage.content).toMatch(/CRITICAL: 1/);
    expect(answer.archMessage.content).toMatch(/Resolved \(30 days\): 3/);
    expect(answer.archMessage.content).toMatch(/30m|30 min/);
    expect(answer.archMessage.citations.some((citation) => citation.source === 'workspace')).toBe(true);
  });

  it('lists the live open queue with service, severity and age', async () => {
    const { organization, owner, project, service } = await setup('queue');
    await createTestIncident({
      organizationId: organization.id,
      projectId: project.id,
      serviceId: service.id,
      title: 'Payments API down',
      severity: 'CRITICAL',
    });
    const answer = await sendChatMessage({ organizationId: organization.id, userId: owner.id, content: 'what is open right now?' });
    expect(answer.archMessage.intent).toBe('open_incidents');
    expect(answer.archMessage.content).toContain('Payments API down');
    expect(answer.archMessage.content).toMatch(/CRITICAL/);
    expect(answer.archMessage.content).toMatch(/1 incident/);
  });

  it('answers follow-ups without repeating the subject', async () => {
    const { organization, owner, project, service } = await setup('followup');
    await createTestIncident({ organizationId: organization.id, projectId: project.id, serviceId: service.id, title: 'Cart errors', severity: 'HIGH' });
    const session = await createChatSession({ organizationId: organization.id, userId: owner.id });
    await sendChatMessage({ organizationId: organization.id, userId: owner.id, sessionId: session.id, content: 'what is open right now?' });
    const followUp = await sendChatMessage({ organizationId: organization.id, userId: owner.id, sessionId: session.id, content: 'and what should I do?' });
    expect(followUp.archMessage.content.length).toBeGreaterThan(40);
    expect(followUp.archMessage.intent).not.toBe('unknown');
  });

  it('never invents a fact when the workspace is empty', async () => {
    const { organization, owner } = await setup('empty');
    const answer = await sendChatMessage({ organizationId: organization.id, userId: owner.id, content: 'have we seen a database deadlock before?' });
    // It may still cite the built-in pattern library — but it must say out loud that the workspace's
    // own history has nothing, and it must not invent an incident.
    expect(answer.archMessage.content).toMatch(/nothing in your own incident history|pehli baar/i);
    expect(answer.archMessage.citations.some((citation) => citation.source === 'incident' || citation.source === 'past_incident')).toBe(false);
  });

  it('counts what chat can answer from (corpus summary)', async () => {
    const { organization, owner, project, service } = await setup('corpus');
    await createTestIncident({ organizationId: organization.id, projectId: project.id, serviceId: service.id, title: 'One incident' });
    const summary = await chatCorpusSummary({ organizationId: organization.id, userId: owner.id });
    expect(summary.incidents).toBe(1);
    expect(summary.members).toBe(3);
    expect(summary.modelVersion).toBeGreaterThanOrEqual(1);
    expect(summary.modelTrained).toBe(false);
  });

  it('is cheap: a chat turn stays well under the request budget', async () => {
    const { organization, owner, project, service } = await setup('perf');
    for (let index = 0; index < 12; index += 1) {
      await createTestIncident({
        organizationId: organization.id,
        projectId: project.id,
        serviceId: service.id,
        title: `Incident number ${index}`,
        severity: index % 4 === 0 ? 'CRITICAL' : 'MEDIUM',
      });
    }
    const startedAt = Date.now();
    const answer = await sendChatMessage({ organizationId: organization.id, userId: owner.id, content: 'what is open right now?' });
    const elapsed = Date.now() - startedAt;
    expect(answer.archMessage.latencyMs).toBeGreaterThanOrEqual(0);
    expect(answer.archMessage.latencyMs!).toBeLessThan(2_000);
    expect(elapsed).toBeLessThan(5_000);
  });

  it('supports conversational multi-turn flow with memory, date, and language continuity', async () => {
    const { organization, owner } = await setup('convo');
    const session = await createChatSession({ organizationId: organization.id, userId: owner.id });

    // Turn 1: User introduces themselves and tech stack in Hinglish
    const turn1 = await sendChatMessage({
      organizationId: organization.id,
      userId: owner.id,
      sessionId: session.id,
      content: 'mera naam Vikram hai aur hum python and redis use karte hain',
    });
    expect(turn1.archMessage.intent).toBe('memory_store');
    expect(turn1.archMessage.content).toContain('Vikram');

    // Turn 2: User asks date, ARCH maintains Hinglish continuity and reports date
    const turn2 = await sendChatMessage({
      organizationId: organization.id,
      userId: owner.id,
      sessionId: session.id,
      content: 'what is date today ?',
    });
    expect(turn2.archMessage.intent).toBe('datetime');
    expect(turn2.archMessage.content).toMatch(/2026/);

    // Turn 3: User asks for their name from memory
    const turn3 = await sendChatMessage({
      organizationId: organization.id,
      userId: owner.id,
      sessionId: session.id,
      content: 'mera naam kya hai?',
    });
    expect(turn3.archMessage.intent).toBe('memory_recall');
    expect(turn3.archMessage.content).toContain('Vikram');

    // Turn 4: User asks guidance on what to do
    const turn4 = await sendChatMessage({
      organizationId: organization.id,
      userId: owner.id,
      sessionId: session.id,
      content: 'main yahan kya karu',
    });
    expect(turn4.archMessage.intent).toBe('workflow_guide');
    expect(turn4.archMessage.content).toMatch(/ARCH workspace/);

    // Turn 5: User asks tech stack advice
    const turn5 = await sendChatMessage({
      organizationId: organization.id,
      userId: owner.id,
      sessionId: session.id,
      content: 'which language should i use for microservices?',
    });
    expect(turn5.archMessage.intent).toBe('tech_stack_advice');
    expect(turn5.archMessage.content).toMatch(/Go|Rust/);
  });

  it('regenerates the last answer in place — same row, no second answer, count unchanged', async () => {
    const { organization, owner, project, service } = await setup('regen');
    await createTestIncident({ organizationId: organization.id, projectId: project.id, serviceId: service.id, title: 'Queue backlog' });
    const session = await createChatSession({ organizationId: organization.id, userId: owner.id });
    const turn = await sendChatMessage({ organizationId: organization.id, userId: owner.id, sessionId: session.id, content: 'what is open right now?' });
    expect(turn.session.messageCount).toBe(2);

    const regenerated = await regenerateChatAnswer({ organizationId: organization.id, userId: owner.id, sessionId: session.id });

    // The transcript keeps its shape: the same ARCH row is rewritten, nothing is appended.
    expect(regenerated.archMessage.id).toBe(turn.archMessage.id);
    expect(regenerated.archMessage.content.length).toBeGreaterThan(0);
    expect(regenerated.archMessage.content).toContain('Queue backlog');
    expect(regenerated.session.messageCount).toBe(2);
    const stored = await db.archChatMessage.findMany({ where: { sessionId: session.id }, orderBy: { createdAt: 'asc' } });
    expect(stored).toHaveLength(2);
    expect(stored[0]!.role).toBe('USER');
    expect(stored[1]!.role).toBe('ARCH');
    expect(stored[1]!.content).toBe(regenerated.archMessage.content);
    // …and the conversation still works as a thread afterwards.
    const followUp = await sendChatMessage({ organizationId: organization.id, userId: owner.id, sessionId: session.id, content: 'what should I do about it?' });
    expect(followUp.session.messageCount).toBe(4);
  }, 60_000);

  it('regenerates against the workspace as it is now, and audits the retry without any text', async () => {
    const { organization, owner, project, service } = await setup('regen-fresh');
    const session = await createChatSession({ organizationId: organization.id, userId: owner.id });
    const before = await sendChatMessage({ organizationId: organization.id, userId: owner.id, sessionId: session.id, content: 'what is open right now?' });
    expect(before.archMessage.content).not.toContain('Fresh outage after deploy');

    // The workspace changed between the question and the retry — that is the point of "Try again".
    await createTestIncident({ organizationId: organization.id, projectId: project.id, serviceId: service.id, title: 'Fresh outage after deploy', severity: 'CRITICAL' });
    await regenerateChatAnswer({ organizationId: organization.id, userId: owner.id, sessionId: session.id });

    const stored = await db.archChatMessage.findFirstOrThrow({ where: { sessionId: session.id, role: 'ARCH' } });
    expect(stored.content).toContain('Fresh outage after deploy');

    const audit = await db.auditLog.findFirstOrThrow({ where: { organizationId: organization.id, action: 'chat.message.regenerate' } });
    const metadata = JSON.stringify(audit.metadata);
    expect(metadata).not.toContain('Fresh outage after deploy');
    expect(metadata).not.toContain('what is open right now');
    expect((audit.metadata as { intent?: string }).intent).toBe('open_incidents');
  }, 60_000);

  it('refuses regenerating someone else’s chat, a chat with no answer, and a VIEWER', async () => {
    const { organization, owner, viewer } = await setup('regen-scope');
    const stranger = await createTestUser('stranger-regen@regen-scope.test', 'Regen Stranger');
    await addMember(organization.id, stranger.id, 'RESPONDER');
    const session = await createChatSession({ organizationId: organization.id, userId: owner.id });
    await sendChatMessage({ organizationId: organization.id, userId: owner.id, sessionId: session.id, content: 'what is open right now?' });

    // Another member of the same workspace gets the same 404 as an id that never existed.
    await expect(regenerateChatAnswer({ organizationId: organization.id, userId: stranger.id, sessionId: session.id })).rejects.toMatchObject({ status: 404 });
    await expect(regenerateChatAnswer({ organizationId: organization.id, userId: viewer.id, sessionId: session.id })).rejects.toMatchObject({ status: 403 });

    const empty = await createChatSession({ organizationId: organization.id, userId: owner.id });
    await expect(regenerateChatAnswer({ organizationId: organization.id, userId: owner.id, sessionId: empty.id })).rejects.toMatchObject({ status: 400 });
  }, 60_000);

  it('does not train on chat text: turns are not feedback rows', async () => {
    const { organization, owner } = await setup('nolearn');
    await sendChatMessage({ organizationId: organization.id, userId: owner.id, content: 'what is open right now?' });
    expect(await db.archModelFeedback.count({ where: { organizationId: organization.id } })).toBe(0);
    // …but approval feedback still works, so the learning path is untouched.
    const { project, service } = await setup('nolearn-2');
    const incident = await createTestIncident({ organizationId: organization.id, projectId: project.id, serviceId: service.id, title: 'Something broke' });
    const suggestion = await generateSuggestion({ organizationId: organization.id, userId: owner.id, incidentId: incident.id, type: 'SUMMARY' });
    await approveSuggestion({ organizationId: organization.id, userId: owner.id, suggestionId: suggestion.id });
    expect(await db.archModelFeedback.count({ where: { organizationId: organization.id } })).toBeGreaterThan(0);
  }, 60_000);
});

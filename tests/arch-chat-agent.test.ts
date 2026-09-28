import { describe, expect, it } from 'vitest';
import {
  generateLocalChatAnswer,
  planLocalChatTask,
  shouldUseLocalChat,
} from '../src/server/ai/arch-model/chat-agent';
import type { LocalChatModel } from '../src/server/ai/local-chat';
import type { ChatAnswer, ChatSnapshot } from '../src/server/ai/arch-model/chat';

function snapshot(overrides: Partial<ChatSnapshot> = {}): ChatSnapshot {
  return {
    organizationName: 'Acme',
    now: '2026-09-28T12:00:00.000Z',
    user: { name: 'Asha', email: 'private@example.test' },
    memory: { userName: 'Asha', userRole: 'SRE', techStack: ['PostgreSQL'], notes: ['Prefer concise answers'] },
    model: { name: 'arch-native-1', version: 1, trainedAt: null, teamDocuments: 0, totalDocuments: 0 },
    counts: { open: 0, bySeverity: {}, resolvedLast7Days: 0, resolvedLast30Days: 0, totalTracked: 0, medianResolveMinutes: null },
    openIncidents: [],
    recentIncidents: [],
    services: [],
    members: [],
    matches: [],
    generalMatches: [],
    knowledgeChunks: [
      { sourceName: 'DB runbook', heading: 'Pool exhaustion', text: 'Check pool metrics, then find leaked connections.', similarity: 0.82 },
    ],
    hasKnowledge: true,
    ...overrides,
  };
}

const baseAnswer: ChatAnswer = {
  answer: 'A database pool playbook applies.',
  intent: 'advice',
  confidence: 'medium',
  citations: [{ source: 'playbook', label: 'Database playbook', detail: 'Check connections.' }],
  suggestions: ['What does the runbook say?'],
  lang: 'en',
};

function fakeModel(responses: string[], calls: Array<{ system: string; user: string }> = []): LocalChatModel {
  return {
    model: 'local-test-model',
    async generate(system, user) {
      calls.push({ system, user });
      const text = responses.shift();
      if (text === undefined) throw new Error('No fake response configured.');
      return { text, model: 'local-test-model' };
    },
  };
}

describe('local ARCH chat agent', () => {
  it('keeps live/workspace commands native and plans open-ended tasks without exposing chain-of-thought', () => {
    expect(shouldUseLocalChat('unknown')).toBe(true);
    expect(shouldUseLocalChat('advice')).toBe(true);
    expect(shouldUseLocalChat('open_incidents')).toBe(false);
    expect(shouldUseLocalChat('code_request')).toBe(false);
    expect(planLocalChatTask('advice')).toMatchObject({ task: 'troubleshoot' });
    expect(planLocalChatTask('unknown')).toMatchObject({ task: 'explain' });
    expect(planLocalChatTask('code_request')).toBeNull();
  });

  it('generates a flexible answer from retrieved evidence, reflects once, and maps source markers to real citations', async () => {
    const calls: Array<{ system: string; user: string }> = [];
    const model = fakeModel([
      'First draft: check [[R1]] before increasing pool size.',
      'Start with the pool metrics and look for leaked connections [[R1]]. Avoid raising limits until you know what is holding the connections.',
    ], calls);
    const answer = await generateLocalChatAnswer({
      model,
      question: 'database slow hai, kya check karu?',
      snapshot: snapshot(),
      history: [],
      nativeAnswer: baseAnswer,
      signal: new AbortController().signal,
      reflect: true,
    });

    expect(calls).toHaveLength(2);
    expect(calls[0]!.user).toContain('DB runbook');
    expect(calls[0]!.user).toContain('Check pool metrics');
    expect(calls[0]!.user).toContain('Common mitigations:');
    expect(calls[0]!.user).not.toContain(baseAnswer.answer);
    expect(calls[0]!.user).not.toContain('private@example.test');
    expect(calls[0]!.user).toContain('Prefer concise answers');
    expect(calls[0]!.system).toMatch(/Do not reveal hidden chain-of-thought/);
    expect(calls[1]!.system).toMatch(/private answer reviewer/);
    expect(answer?.answer).toMatch(/Start with the pool metrics/);
    expect(answer?.answer).not.toContain('[[R1]]');
    expect(answer?.citations).toHaveLength(1);
    expect(answer?.citations[0]).toMatchObject({ source: 'runbook', label: 'DB runbook — Pool exhaustion' });
  });

  it('maps playbook citations to the matching entry, not a composed native answer', async () => {
    const calls: Array<{ system: string; user: string }> = [];
    const answer = await generateLocalChatAnswer({
      model: fakeModel(['Check the playbook guidance [[R2]].'], calls),
      question: 'database slow hai, kya check karu?',
      snapshot: snapshot(),
      history: [],
      nativeAnswer: baseAnswer,
      signal: new AbortController().signal,
      reflect: false,
    });

    expect(calls[0]!.user).toContain('Common mitigations:');
    expect(calls[0]!.user).not.toContain(baseAnswer.answer);
    expect(answer?.citations).toEqual([
      expect.objectContaining({ source: 'playbook', label: 'Database slowness or overload playbook' }),
    ]);
  });

  it('supports open-domain questions outside the fixed tech pack and does not invent a citation', async () => {
    const answer = await generateLocalChatAnswer({
      model: fakeModel(['A useful general answer in Hinglish.']),
      question: 'dost se maafi kaise maangu?',
      snapshot: snapshot({ knowledgeChunks: [], matches: [], generalMatches: [] }),
      history: [],
      nativeAnswer: {
        answer: 'I did not quite catch what you are after.',
        intent: 'unknown',
        confidence: 'low',
        citations: [],
        suggestions: [],
        lang: 'hinglish',
      },
      signal: new AbortController().signal,
      reflect: false,
    });

    expect(answer?.answer).toBe('A useful general answer in Hinglish.');
    expect(answer?.confidence).toBe('medium');
    expect(answer?.citations).toEqual([]);
    expect(answer?.suggestions[0]).toMatch(/example/i);
  });

  it('strips leaked private thinking blocks and ignores fabricated citation ids', async () => {
    const answer = await generateLocalChatAnswer({
      model: fakeModel(['<think>private scratch work</think>Public answer [[R99]]. <thinking>unfinished private scratch']),
      question: 'What is happening?',
      snapshot: snapshot({ knowledgeChunks: [], matches: [], generalMatches: [] }),
      history: [],
      nativeAnswer: { ...baseAnswer, intent: 'unknown', citations: [] },
      signal: new AbortController().signal,
      reflect: false,
    });

    expect(answer?.answer).toBe('Public answer.');
    expect(answer?.answer).not.toContain('private scratch work');
    expect(answer?.citations).toEqual([]);
  });

  it('keeps the usable first draft if the reflection pass fails', async () => {
    let calls = 0;
    const model: LocalChatModel = {
      model: 'local-test-model',
      async generate() {
        calls += 1;
        if (calls === 1) return { text: 'Draft answer [[R1]].', model: 'local-test-model' };
        throw new Error('review timeout');
      },
    };
    const answer = await generateLocalChatAnswer({
      model,
      question: 'database pool slow hai?',
      snapshot: snapshot(),
      history: [],
      nativeAnswer: baseAnswer,
      signal: new AbortController().signal,
      reflect: true,
    });
    expect(answer?.answer).toBe('Draft answer.');
    expect(calls).toBe(2);
  });
});

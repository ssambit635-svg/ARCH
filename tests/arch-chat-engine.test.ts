import { describe, expect, it } from 'vitest';
import {
  answerChat,
  CHAT_LIMITS,
  classifyChatIntent,
  detectChatLanguage,
  titleFromMessage,
  type ChatIncident,
  type ChatSnapshot,
} from '../src/server/ai/arch-model/chat';

/**
 * The chat engine is pure and deterministic, so it is tested without a database: intents, language,
 * grounding (a fact-free workspace must not produce invented facts), citations and the code refusal.
 */

function incident(overrides: Partial<ChatIncident> = {}): ChatIncident {
  return {
    id: overrides.id ?? 'inc_1',
    title: overrides.title ?? 'Checkout latency spike',
    severity: overrides.severity ?? 'HIGH',
    status: overrides.status ?? 'INVESTIGATING',
    service: overrides.service ?? 'checkout',
    startedAt: overrides.startedAt ?? new Date(Date.now() - 42 * 60_000).toISOString(),
    resolvedAt: overrides.resolvedAt ?? null,
    durationMinutes: overrides.durationMinutes ?? 42,
    category: overrides.category ?? 'latency',
    categoryLabel: overrides.categoryLabel ?? 'Latency / performance',
    rootCause: overrides.rootCause ?? null,
    fix: overrides.fix ?? [],
    prevention: overrides.prevention ?? [],
    assignedTo: overrides.assignedTo ?? null,
    ...(overrides.similarity !== undefined ? { similarity: overrides.similarity } : {}),
    ...(overrides.matchSource ? { matchSource: overrides.matchSource } : {}),
  };
}

function snapshot(overrides: Partial<ChatSnapshot> = {}): ChatSnapshot {
  return {
    organizationName: 'Acme',
    now: new Date().toISOString(),
    model: { name: 'arch-native-1', version: 3, trainedAt: new Date().toISOString(), teamDocuments: 12, totalDocuments: 400 },
    counts: {
      open: 1,
      bySeverity: { HIGH: 1 },
      resolvedLast7Days: 4,
      resolvedLast30Days: 9,
      totalTracked: 30,
      medianResolveMinutes: 55,
    },
    openIncidents: [incident()],
    recentIncidents: [
      incident({
        id: 'inc_2',
        title: 'Payment timeouts after deploy',
        status: 'RESOLVED',
        severity: 'CRITICAL',
        resolvedAt: new Date(Date.now() - 3_600_000).toISOString(),
        durationMinutes: 73,
        category: 'deploy',
        categoryLabel: 'Deployment / release',
        rootCause: 'Connection pool exhausted by a slow query added in the release.',
        fix: ['Rolled back the deploy', 'Raised the pool size while the query was fixed'],
      }),
    ],
    services: [
      { name: 'checkout', status: 'DEGRADED', openIncidents: 1 },
      { name: 'billing', status: 'OPERATIONAL', openIncidents: 0 },
    ],
    members: [
      { name: 'Asha', role: 'OWNER', openIncidents: 1 },
      { name: 'Ravi', role: 'RESPONDER', openIncidents: 0 },
    ],
    matches: [],
    generalMatches: [],
    knowledgeChunks: [],
    hasKnowledge: false,
    ...overrides,
  };
}

describe('chat language detection', () => {
  it('answers Hinglish questions in Hinglish and English ones in English', () => {
    expect(detectChatLanguage('kaise ho bhai')).toBe('hinglish');
    expect(detectChatLanguage('abhi kya open hai?')).toBe('hinglish');
    expect(detectChatLanguage('क्या चल रहा है')).toBe('hinglish');
    expect(detectChatLanguage('what is open right now?')).toBe('en');
    expect(detectChatLanguage('thanks')).toBe('en');
  });
});

describe('chat intent classification', () => {
  it('classifies the questions a responder actually asks', () => {
    expect(classifyChatIntent('what is open right now?')).toBe('open_incidents');
    expect(classifyChatIntent('show me recent incidents')).toBe('recent_incidents');
    expect(classifyChatIntent('have we seen payment timeouts before?')).toBe('incident_search');
    expect(classifyChatIntent('how many incidents did we have this month?')).toBe('stats');
    expect(classifyChatIntent('who is on call?')).toBe('team');
    expect(classifyChatIntent('what does our runbook say about deploys?')).toBe('runbook');
    expect(classifyChatIntent('tell me about the payment outage')).toBe('explain_incident');
    expect(classifyChatIntent('hi')).toBe('greet');
    expect(classifyChatIntent('shukriya bhai')).toBe('thanks');
  });

  it('wins over small talk when a real question follows a social word', () => {
    expect(classifyChatIntent('thanks — what is open right now?')).toBe('open_incidents');
  });

  it('recognises code-generation requests instead of silently answering them', () => {
    expect(classifyChatIntent('write me a function that parses logs')).toBe('code_request');
    expect(classifyChatIntent('generate code for a REST endpoint')).toBe('code_request');
    expect(classifyChatIntent('code likh do iske liye')).toBe('code_request');
  });
});

describe('chat answers', () => {
  it('greets, and says who it is without pretending to be another vendor', () => {
    const greeting = answerChat({ question: 'namaste', snapshot: snapshot() });
    expect(greeting.intent).toBe('greet');
    expect(greeting.answer).toMatch(/ARCH/);
    expect(greeting.suggestions.length).toBeGreaterThan(0);

    const identity = answerChat({ question: 'are you chatgpt?', snapshot: snapshot() });
    expect(identity.intent).toBe('identity');
    expect(identity.answer).toMatch(/arch-native-1/);
    expect(identity.answer).not.toMatch(/OpenAI made|I am GPT/i);
  });

  it('lists the open queue with severity and how long it has been running', () => {
    const answer = answerChat({ question: 'what is open right now?', snapshot: snapshot() });
    expect(answer.intent).toBe('open_incidents');
    expect(answer.answer).toContain('Checkout latency spike');
    expect(answer.answer).toMatch(/HIGH/);
    expect(answer.citations[0]?.href).toBe('/dashboard/incidents/inc_1');
    expect(answer.confidence).toBe('high');
  });

  it('says all clear when nothing is open, with the resolved counts', () => {
    const answer = answerChat({ question: 'kya open hai?', snapshot: snapshot({ openIncidents: [], counts: { ...snapshot().counts, open: 0 } }) });
    expect(answer.answer).toMatch(/shaant|quiet/i);
    expect(answer.answer).toContain('4');
  });

  it('reports numbers from the snapshot, never invented ones', () => {
    const answer = answerChat({ question: 'how are we doing this month?', snapshot: snapshot() });
    expect(answer.intent).toBe('stats');
    expect(answer.answer).toContain('4');
    expect(answer.answer).toContain('9');
    expect(answer.answer).toMatch(/55m|55 min/);
    expect(answer.citations.some((citation) => citation.source === 'workspace')).toBe(true);
  });

  it('searches history and cites the past incident, its root cause and its fix', () => {
    const past = incident({
      id: 'inc_2',
      title: 'Payment timeouts after deploy',
      status: 'RESOLVED',
      rootCause: 'Connection pool exhausted by a slow query.',
      fix: ['Rolled back the deploy'],
      similarity: 0.62,
      matchSource: 'team',
      resolvedAt: new Date().toISOString(),
    });
    const answer = answerChat({ question: 'have we seen payment timeouts before?', snapshot: snapshot({ matches: [past] }) });
    expect(answer.intent).toBe('incident_search');
    expect(answer.answer).toContain('Payment timeouts after deploy');
    expect(answer.answer).toMatch(/root cause/i);
    expect(answer.citations[0]?.href).toBe('/dashboard/incidents/inc_2');
    expect(answer.citations[0]?.similarity).toBe(0.62);
  });

  it('admits when history has nothing, instead of making something up', () => {
    const answer = answerChat({ question: 'have we seen a redis cluster failover?', snapshot: snapshot() });
    expect(answer.answer).toMatch(/nothing in this workspace|pehli baar/i);
    expect(answer.confidence).toBe('low');
    expect(answer.citations).toHaveLength(0);
  });

  it('refuses to write code and points to Code Assist instead', () => {
    const answer = answerChat({ question: 'write me a function to retry requests', snapshot: snapshot() });
    expect(answer.intent).toBe('code_request');
    expect(answer.answer).toMatch(/Code Assist/);
    expect(answer.answer).not.toMatch(/function retry|```/);
  });

  it('gives a structured ops playbook for a described problem', () => {
    const answer = answerChat({ question: 'redis cache misses are spiking, kya karu?', snapshot: snapshot() });
    expect(answer.intent).toBe('advice');
    expect(answer.answer).toMatch(/Check first|Pehle yeh dekho/);
    expect(answer.answer).toMatch(/cache|redis/i);
    expect(answer.citations.some((citation) => citation.source === 'playbook')).toBe(true);
    expect(answer.answer).not.toMatch(/```/);
  });

  it('answers runbook questions from the knowledge base with citations', () => {
    const answer = answerChat({
      question: 'what does the runbook say about deploys?',
      snapshot: snapshot({
        hasKnowledge: true,
        knowledgeChunks: [{ sourceName: 'Deploy runbook', heading: 'Rollback', text: 'Roll back with the previous release tag.', similarity: 0.44 }],
      }),
    });
    expect(answer.intent).toBe('runbook');
    expect(answer.answer).toContain('Deploy runbook');
    expect(answer.citations[0]?.source).toBe('runbook');
  });

  it('says the knowledge base is empty rather than inventing a runbook', () => {
    const answer = answerChat({ question: 'what does our runbook say about failover?', snapshot: snapshot() });
    expect(answer.intent).toBe('runbook');
    expect(answer.answer).toMatch(/knowledge base is empty|empty/i);
    expect(answer.citations).toHaveLength(0);
  });

  it('explains a named incident using the learned root cause and fix', () => {
    const learned = incident({
      id: 'inc_2',
      title: 'Payment timeouts after deploy',
      status: 'RESOLVED',
      rootCause: 'A slow query added in the release exhausted the connection pool.',
      fix: ['Rolled back the release', 'Added an index for the hot query'],
      prevention: ['Add slow-query checks to the deploy pipeline'],
      resolvedAt: new Date().toISOString(),
      durationMinutes: 73,
      matchSource: 'team',
      similarity: 0.7,
    });
    const answer = answerChat({ question: 'what did we learn from the payment timeouts?', snapshot: snapshot({ matches: [learned] }) });
    expect(answer.intent).toBe('lessons');
    expect(answer.answer).toMatch(/connection pool/i);
    expect(answer.answer).toMatch(/index/i);
    expect(answer.citations[0]?.href).toBe('/dashboard/incidents/inc_2');
  });

  it('will not fabricate a root cause when the record has none', () => {
    const answer = answerChat({
      question: 'what was the root cause of the checkout incident?',
      snapshot: snapshot({ matches: [incident({ id: 'inc_1', title: 'Checkout latency spike' })] }),
    });
    expect(answer.intent).toBe('lessons');
    expect(answer.answer).toMatch(/will not invent|nahi banaunga|no recorded root cause/i);
  });

  it('resolves a follow-up that carries no subject of its own', () => {
    const history = [
      { role: 'user' as const, content: 'have we seen payment timeouts before?' },
      { role: 'arch' as const, content: 'Yes — one matching incident.' },
    ];
    const answer = answerChat({ question: 'and the fix?', snapshot: snapshot({ matches: [incident({ id: 'inc_1', matchSource: 'team', similarity: 0.5 })] }), history });
    expect(answer.intent).not.toBe('unknown');
  });

  it('answers unknown questions honestly instead of pretending', () => {
    const answer = answerChat({ question: 'zzzz qqqq', snapshot: snapshot() });
    expect(answer.intent).toBe('unknown');
    expect(answer.answer).toMatch(/strongest on|sabse acha/i);
    expect(answer.confidence).toBe('low');
  });

  it('never returns an empty answer or an empty suggestion list', () => {
    const questions = ['hi', 'thanks', 'what can you do?', 'what is open?', 'stats?', 'runbook?', 'who is on the team?', 'kaise ho', 'asdfgh'];
    for (const question of questions) {
      const answer = answerChat({ question, snapshot: snapshot() });
      expect(answer.answer.trim().length).toBeGreaterThan(20);
      expect(answer.suggestions.length).toBeGreaterThan(0);
      expect(answer.suggestions.length).toBeLessThanOrEqual(4);
    }
  });

  it('does not leak privacy-sensitive text: no emails, tokens or ids in answers', () => {
    const answer = answerChat({ question: 'what is open and how are we doing?', snapshot: snapshot() });
    expect(answer.answer).not.toMatch(/@|Bearer|sk-|ghp_/);
  });
});

describe('chat session titles', () => {
  it('turns the first message into a compact, single-line title', () => {
    expect(titleFromMessage('what is open right now?')).toBe('What is open right now');
    expect(titleFromMessage('**Payment**   timeouts\nhappened again')).toBe('Payment timeouts happened again');
    expect(titleFromMessage('   ')).toBe('New chat');
    const long = titleFromMessage('explain everything that happened during the checkout latency incident last tuesday afternoon please');
    expect(long.length).toBeLessThanOrEqual(61);
    expect(long.endsWith('…')).toBe(true);
  });

  it('keeps its own limits tight enough to bound a request', () => {
    expect(CHAT_LIMITS.maxQuestionChars).toBeLessThanOrEqual(2_000);
    expect(CHAT_LIMITS.maxHistoryTurns).toBeLessThanOrEqual(12);
  });
});

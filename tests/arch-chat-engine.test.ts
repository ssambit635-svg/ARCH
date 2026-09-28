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
import { matchTechFact, TECH_FACTS, TECH_PACK_STATS } from '../src/server/ai/arch-model/tech-knowledge';

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

  it('maintains language continuity based on conversation history', () => {
    const hinglishHistory = [{ role: 'user' as const, content: 'kaise ho bhai' }];
    expect(detectChatLanguage('what is date today ?', hinglishHistory)).toBe('hinglish');
    expect(detectChatLanguage('what should i do in here', hinglishHistory)).toBe('hinglish');
    expect(detectChatLanguage('status', hinglishHistory)).toBe('hinglish');

    const englishHistory = [{ role: 'user' as const, content: 'hello how are you' }];
    expect(detectChatLanguage('what is date today ?', englishHistory)).toBe('en');
    expect(detectChatLanguage('aaj kya date hai', englishHistory)).toBe('hinglish');
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

  it('answers date and time questions accurately from the snapshot clock', () => {
    const answer = answerChat({ question: 'what is date today ?', snapshot: snapshot() });
    expect(answer.intent).toBe('datetime');
    expect(answer.answer).toMatch(/Today is|UTC/);
    expect(answer.citations[0]?.source).toBe('workspace');

    const hinglishAnswer = answerChat({ question: 'aaj kya date hai', snapshot: snapshot() });
    expect(hinglishAnswer.intent).toBe('datetime');
    expect(hinglishAnswer.lang).toBe('hinglish');
    expect(hinglishAnswer.answer).toMatch(/Aaj ki date/);
  });

  it('guides the developer on what to do in the workspace', () => {
    const answer = answerChat({ question: 'what should i do in here', snapshot: snapshot() });
    expect(answer.intent).toBe('workflow_guide');
    expect(answer.answer).toMatch(/Welcome to ARCH/);
    expect(answer.answer).toMatch(/Check Live Incidents|Code Assist/);

    const hinglishAnswer = answerChat({ question: 'main yahan kya karu', snapshot: snapshot() });
    expect(hinglishAnswer.intent).toBe('workflow_guide');
    expect(hinglishAnswer.lang).toBe('hinglish');
    expect(hinglishAnswer.answer).toMatch(/ARCH workspace mein aapka swagat hai/);
  });

  it('provides technology and programming language guidance', () => {
    const answer = answerChat({ question: 'which language should i use for microservices?', snapshot: snapshot() });
    expect(answer.intent).toBe('tech_stack_advice');
    expect(answer.answer).toMatch(/Go|Rust/);
    expect(answer.answer).toMatch(/TypeScript|Python/);
    expect(answer.answer).toMatch(/Code Assist/);
  });

  it('stores and recalls user memory across conversation turns', () => {
    const history = [
      { role: 'user' as const, content: 'mera naam Vikram hai aur hum python and redis use karte hain' },
      { role: 'arch' as const, content: 'Samajh gaya Vikram!' },
    ];

    const recallName = answerChat({ question: 'mera naam kya hai?', snapshot: snapshot(), history });
    expect(recallName.intent).toBe('memory_recall');
    expect(recallName.answer).toContain('Vikram');

    const recallStack = answerChat({ question: 'what is my stack?', snapshot: snapshot(), history });
    expect(recallStack.intent).toBe('memory_recall');
    expect(recallStack.answer).toMatch(/Redis|Python/);

    const clearedHistory = [
      ...history,
      { role: 'user' as const, content: 'clear memory' },
      { role: 'arch' as const, content: 'Memory cleared!' },
    ];
    const afterClear = answerChat({ question: 'what do you remember about me?', snapshot: snapshot(), history: clearedHistory });
    expect(afterClear.answer).toMatch(/kuch bhi saved nahi hai|nothing saved about you/i);
    expect(afterClear.answer).not.toContain('Vikram');
  });

  it('answers from stored memory (V9) even when the conversation history is empty', () => {
    // The facts live in the workspace database now, so a brand-new chat still knows them.
    const stored = { userName: 'Vikram', userRole: 'SRE', techStack: ['Postgres'], notes: ['Deploys are Thursdays'] };

    const recall = answerChat({ question: 'what do you remember about me?', snapshot: snapshot({ memory: stored }) });
    expect(recall.intent).toBe('memory_recall');
    expect(recall.answer).toContain('Vikram');
    expect(recall.answer).toContain('Postgres');
    expect(recall.answer).toContain('Deploys are Thursdays');

    // The stored stack also feeds the tech-advice answer, the way a colleague would use it.
    const advice = answerChat({ question: 'which language should i use for microservices?', snapshot: snapshot({ memory: stored }) });
    expect(advice.intent).toBe('tech_stack_advice');
    expect(advice.answer).toContain('Postgres');

    // Something said now beats something stored earlier (people correct themselves).
    const corrected = answerChat({ question: 'my name is Asha', snapshot: snapshot({ memory: stored }) });
    expect(corrected.answer).toContain('Asha');
  });

  it('explains engineering concepts such as MTTR and SLO', () => {
    const mttr = answerChat({ question: 'what is MTTR?', snapshot: snapshot() });
    expect(mttr.intent).toBe('concept_explain');
    expect(mttr.answer).toMatch(/Mean Time to Resolve/);
    expect(mttr.answer).toContain('55 min');

    const slo = answerChat({ question: 'what is an SLO?', snapshot: snapshot() });
    expect(slo.intent).toBe('concept_explain');
    expect(slo.answer).toMatch(/Service Level Objective/);
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

describe('built-in tech knowledge pack', () => {
  it('answers general engineering questions from the pack, with a pack citation', () => {
    const cases: { question: string; intent?: string; expect: RegExp }[] = [
      { question: 'which language is the oldest in tech?', expect: /Fortran/ },
      { question: 'what is the CAP theorem', expect: /PACELC/ },
      { question: 'what is the difference between docker and kubernetes', expect: /Container|scheduler/i },
      { question: 'what is a bloom filter', expect: /probabilistic/i },
      { question: 'explain the CAP theorem', expect: /vailability/ },
    ];
    for (const testCase of cases) {
      const answer = answerChat({ question: testCase.question, snapshot: snapshot({ openIncidents: [] }) });
      expect(answer.intent, testCase.question).toBe('tech_fact');
      expect(answer.confidence, testCase.question).toBe('high');
      expect(answer.answer, testCase.question).toMatch(testCase.expect);
      expect(answer.citations[0]?.source, testCase.question).toBe('reference');
      expect(answer.citations[0]?.detail, testCase.question).toContain('built-in tech pack');
    }
  });

  it('does not let a status code turn a definition question into incident triage', () => {
    // "what does 503 mean" is general knowledge…
    const definition = answerChat({ question: 'what does HTTP 503 mean?', snapshot: snapshot() });
    expect(definition.intent).toBe('tech_fact');
    expect(definition.answer).toMatch(/5xx|server/i);

    // …but the same words about *this* workspace stay with the incident advisor.
    const ours = answerChat({ question: 'we keep seeing 503s after the deploy, what should we do?', snapshot: snapshot() });
    expect(ours.intent).toBe('advice');
    expect(ours.citations.some((citation) => citation.source === 'reference')).toBe(false);
  });

  it('keeps workspace questions out of the pack (no shadowing)', () => {
    expect(answerChat({ question: 'what is open right now?', snapshot: snapshot() }).intent).toBe('open_incidents');
    expect(answerChat({ question: 'what happened last week?', snapshot: snapshot() }).intent).toBe('recent_incidents');
    expect(answerChat({ question: 'which language should i use for microservices?', snapshot: snapshot() }).intent).toBe('tech_stack_advice');

    // The matcher refuses below its confidence bar, so a workspace sentence never becomes a lecture.
    for (const question of ['our cache incident yesterday', 'what is good for lunch', 'who is on call tonight', 'how do i add a service']) {
      expect(matchTechFact(question), question).toBeNull();
    }
  });

  it('answers in Hinglish when the question is Hinglish', () => {
    const answer = answerChat({ question: 'event sourcing kya hai', snapshot: snapshot() });
    expect(answer.intent).toBe('tech_fact');
    expect(answer.lang).toBe('hinglish');
    expect(answer.answer).toMatch(/event sourcing/i);
  });

  it('offers the pack as the fallback, and admits when a topic is not covered', () => {
    const answer = answerChat({ question: 'what is quantum tunnelling in GPUs?', snapshot: snapshot({ openIncidents: [] }) });
    expect(answer.intent).toBe('unknown');
    expect(answer.confidence).toBe('low');
    // Honest limits, stated with the number of topics actually covered and how to extend them.
    expect(answer.answer).toContain(String(TECH_PACK_STATS.topics));
    expect(answer.answer).toMatch(/Knowledge/);
  });

  it('keeps the pack data well formed', () => {
    const ids = new Set<string>();
    for (const fact of TECH_FACTS) {
      expect(ids.has(fact.id), `duplicate id ${fact.id}`).toBe(false);
      ids.add(fact.id);
      expect(fact.aliases.length, fact.id).toBeGreaterThan(0);
      expect(fact.en.length, fact.id).toBeGreaterThan(80);
      expect(fact.hi.length, fact.id).toBeGreaterThan(80);
      for (const related of fact.related ?? []) {
        expect(ids.has(related) || TECH_FACTS.some((other) => other.id === related), `${fact.id} -> ${related}`).toBe(true);
      }
      // The pack is offline reference material: no vendor names as the *source* of an answer.
      expect(fact.en).not.toMatch(/chatgpt|openai|anthropic/i);
    }
    expect(TECH_PACK_STATS.topics).toBe(TECH_FACTS.length);
    expect(TECH_PACK_STATS.topics).toBeGreaterThanOrEqual(80);
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

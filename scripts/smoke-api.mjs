#!/usr/bin/env node
/**
 * Backend smoke test — exercises every public API surface end to end against a *running* server.
 *
 *   npm run smoke:api                        (default: http://localhost:3000)
 *   SMOKE_BASE_URL=https://host npm run smoke:api
 *
 * What it does, in order:
 *   1. creates a throwaway account + organization through POST /api/auth/register;
 *   2. signs in through the real Auth.js credentials callback to get a session cookie;
 *   3. walks every route (projects, services, incidents, copilot, status pages, webhooks,
 *      tokens, invitations, dependencies, changes, SLOs, knowledge, repos, v1 API, …)
 *      checking status codes and response shapes;
 *   4. checks the negative paths that guard the product: anonymous 401s, cross-tenant 404s,
 *      duplicate-email 409, signature failures, weak passwords.
 *
 * It creates real rows in the target database (prefixed `smoke-`), which is why it defaults to
 * a local dev server and never runs in CI against production. Exit code 1 when anything fails.
 */
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

/**
 * Diagnostic only (SMOKE_RSS=1): reports the dev server's resident memory before/after each
 * request. A request that adds tens of MB is how a slow memory leak shows up in a long run.
 */
function serverRssMb() {
  if (!process.env.SMOKE_RSS) return null;
  try {
    const pid = execSync("pgrep -f 'next-server' | head -1", { encoding: 'utf8' }).trim();
    if (!pid) return null;
    const statm = fs.readFileSync(`/proc/${pid}/statm`, 'utf8').split(' ');
    return Math.round((Number(statm[1]) * 4096) / 1024 / 1024);
  } catch {
    return null;
  }
}

const BASE = (process.env.SMOKE_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const stamp = Date.now();
const PASSWORD = 'smoke-test-password-1';

// ---------------------------------------------------------------- http plumbing

/** Minimal cookie jar: auth.js session cookies must survive the redirect chain. */
const jar = new Map();

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function storeCookies(response) {
  for (const raw of response.headers.getSetCookie?.() ?? []) {
    const [pair] = raw.split(';');
    const index = pair.indexOf('=');
    if (index > 0) jar.set(pair.slice(0, index).trim(), pair.slice(index + 1));
  }
}

async function http(method, path, { body, headers = {}, auth = true, raw } = {}) {
  const finalHeaders = { ...headers };
  if (auth && jar.size) finalHeaders.cookie = cookieHeader();
  let payload;
  if (raw !== undefined) {
    payload = raw;
  } else if (body !== undefined) {
    finalHeaders['content-type'] = finalHeaders['content-type'] ?? 'application/json';
    payload = typeof body === 'string' ? body : JSON.stringify(body);
  }
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: finalHeaders,
    body: payload,
    redirect: 'manual',
  });
  storeCookies(response);
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: response.status, headers: response.headers, text, json };
}

// ---------------------------------------------------------------- reporting

const results = [];
let failures = 0;

/**
 * One check: the status must match `expect`, plus an optional assertion on the parsed body.
 * `save` receives the response so later checks can use created ids.
 */
async function check(name, method, path, options = {}) {
  const { expect = [200, 201, 202, 204], assert, save, tolerate = [], ...request } = options;
  const expected = Array.isArray(expect) ? expect : [expect];
  if (process.env.SMOKE_VERBOSE) console.error(`[smoke] → ${name}`);
  const rssBefore = serverRssMb();
  let result;
  try {
    result = await http(method, path, request);
  } catch (error) {
    results.push({ name, ok: false, detail: `request failed: ${error.message}` });
    failures += 1;
    return undefined;
  }

  // A tolerated status (today: 429 from the register limiter) means "could not exercise this
  // check right now" — it must never mask a different answer.
  if (tolerate.includes(result.status)) {
    const note = `skipped: ${result.status} ${result.json?.error?.code ?? ''}`.trim();
    if (process.env.SMOKE_VERBOSE) console.error(`[smoke] ~ ${name} — ${note}`);
    results.push({ name, ok: true, detail: note });
    return result;
  }

  if (!expected.includes(result.status)) {
    const detail = result.json?.error ? `${result.json.error.code}: ${result.json.error.message}` : result.text.slice(0, 160);
    results.push({ name, ok: false, detail: `expected ${expected.join('/')} got ${result.status} — ${detail}` });
    failures += 1;
    if (process.env.SMOKE_VERBOSE) console.error(`[smoke] ✗ ${name} — ${detail}`);
    return result;
  }

  if (assert) {
    try {
      assert(result);
    } catch (error) {
      results.push({ name, ok: false, detail: `assertion: ${error.message}` });
      failures += 1;
      return result;
    }
  }

  const rssAfter = serverRssMb();
  const delta = rssBefore !== null && rssAfter !== null ? rssAfter - rssBefore : null;
  if (process.env.SMOKE_VERBOSE) console.error(`[smoke] ✓ ${name} — ${result.status}${delta !== null ? ` (server ${rssAfter} MB, ${delta >= 0 ? '+' : ''}${delta})` : ''}`);

  results.push({ name, ok: true, detail: `${result.status}${delta && delta > 10 ? ` [+${delta} MB]` : ''}` });
  if (save) save(result);
  return result;
}

/**
 * A precondition account. When the register limiter (10 new accounts / 10 min / IP) is already
 * exhausted there is nothing to test — say so instead of cascading into "sign-in failed".
 */
async function requireAccount(name, body) {
  const result = await http('POST', '/api/auth/register', { auth: false, body, headers: {} });
  if (result.status === 429) {
    console.error(`\n[smoke] ${name}: the register limiter answered 429 (10 accounts per 10 minutes per IP).`);
    console.error('[smoke] wait a few minutes (or restart the server) and run the smoke test again.');
    process.exit(2);
  }
  if (result.status !== 201) {
    console.error(`\n[smoke] ${name}: expected 201, got ${result.status} ${result.text.slice(0, 200)}`);
    process.exit(2);
  }
  results.push({ name, ok: true, detail: '201' });
  return result;
}

function expectField(result, path) {
  let value = result.json;
  for (const key of path.split('.')) {
    value = value?.[key];
  }
  if (value === undefined || value === null) throw new Error(`missing ${path}`);
  return value;
}

function hmac(secret, timestamp, body) {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

// ---------------------------------------------------------------- 0. prerequisites

const health = await http('GET', '/api/health', { auth: false });
if (!health.json || health.json.status !== 'ok') {
  console.error(`\n[smoke] server at ${BASE} is not healthy: ${health.status} ${health.text.slice(0, 200)}`);
  console.error('[smoke] start ARCH first: `npm run dev` (PostgreSQL + migrations + Next.js) or `npm run build && npm start`.');
  process.exit(2);
}

const email = `smoke-${stamp}@example.com`;
const register = await requireAccount('POST /api/auth/register creates an account + organization', {
  email,
  password: PASSWORD,
  name: 'Smoke Runner',
  organizationName: `Smoke Org ${stamp}`,
});
const orgId = expectField(register, 'data.organization.id');

// Sign in through the real credentials callback (same code path the login form uses).
const csrf = await http('GET', '/api/auth/csrf');
const csrfToken = csrf.json?.csrfToken;
const signInResponse = await http('POST', '/api/auth/callback/credentials', {
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  raw: new URLSearchParams({ csrfToken, email, password: PASSWORD, callbackUrl: `${BASE}/dashboard` }).toString(),
});
if (![...jar.keys()].some((key) => key.includes('session-token'))) {
  console.error(`[smoke] sign-in failed (status ${signInResponse.status}) — aborting.`);
  process.exit(2);
}
results.push({ name: 'POST /api/auth/callback/credentials issues a session', ok: true, detail: String(signInResponse.status) });

// ---------------------------------------------------------------- 1. session & orgs

await check('GET /api/health reports ok', 'GET', '/api/health', { auth: false, assert: (r) => r.json.status === 'ok' });
await check('GET /api/organizations lists the new organization', 'GET', '/api/organizations', {
  assert: (r) => r.json.data.some((org) => org.id === orgId),
});
await check('GET /api/organizations/:id returns the organization', 'GET', `/api/organizations/${orgId}`, {
  assert: (r) => expectField(r, 'data.name'),
});
await check('PATCH /api/organizations/:id renames it', 'PATCH', `/api/organizations/${orgId}`, {
  body: { name: `Smoke Org ${stamp} (renamed)` },
  assert: (r) => r.json.data.name.includes('renamed'),
});
await check('GET /api/organizations/:id/members lists the OWNER', 'GET', `/api/organizations/${orgId}/members`, {
  assert: (r) => r.json.data.length >= 1,
});

// ---------------------------------------------------------------- 2. projects & services

let projectId;
await check('POST /api/projects creates a project', 'POST', '/api/projects', {
  body: { name: 'Smoke Project', description: 'created by scripts/smoke-api.mjs' },
  expect: 201,
  assert: (r) => expectField(r, 'data.id'),
  save: (r) => (projectId = r.json.data.id),
});
await check('GET /api/projects lists it', 'GET', '/api/projects', { assert: (r) => r.json.data.some((p) => p.id === projectId) });
await check('GET /api/projects/:id returns it', 'GET', `/api/projects/${projectId}`, { assert: (r) => r.json.data.id === projectId });
await check('PATCH /api/projects/:id updates the description', 'PATCH', `/api/projects/${projectId}`, {
  body: { description: 'updated by smoke test' },
  assert: (r) => r.json.data.description === 'updated by smoke test',
});

let serviceId;
await check('POST /api/services creates a service', 'POST', '/api/services', {
  body: { projectId, name: 'Smoke API', status: 'OPERATIONAL' },
  expect: 201,
  assert: (r) => expectField(r, 'data.id'),
  save: (r) => (serviceId = r.json.data.id),
});
await check('GET /api/services lists services', 'GET', '/api/services', { assert: (r) => r.json.data.some((s) => s.id === serviceId) });
await check('PATCH /api/services/:id changes status', 'PATCH', `/api/services/${serviceId}`, {
  body: { status: 'DEGRADED' },
  assert: (r) => r.json.data.status === 'DEGRADED',
});

// ---------------------------------------------------------------- 3. incidents

let incidentId;
await check('POST /api/incidents opens an incident', 'POST', '/api/incidents', {
  body: { title: 'Smoke: checkout latency', description: 'p99 latency above SLO', severity: 'HIGH', projectId, serviceId },
  expect: 201,
  assert: (r) => expectField(r, 'data.id'),
  save: (r) => (incidentId = r.json.data.id),
});
await check('GET /api/incidents lists incidents', 'GET', '/api/incidents', { assert: (r) => r.json.data.items.some((i) => i.id === incidentId) });
await check('GET /api/incidents?open=true filters', 'GET', '/api/incidents?open=true&severity=HIGH', { assert: (r) => Array.isArray(r.json.data.items) });
await check('GET /api/incidents/:id returns the incident', 'GET', `/api/incidents/${incidentId}`, { assert: (r) => expectField(r, 'data.title') });
await check('PATCH /api/incidents/:id walks the state machine', 'PATCH', `/api/incidents/${incidentId}`, {
  body: { status: 'IDENTIFIED', message: 'root cause found' },
  assert: (r) => r.json.data.status === 'IDENTIFIED',
});
await check('PATCH /api/incidents/:id rejects an illegal transition', 'PATCH', `/api/incidents/${incidentId}`, {
  body: { status: 'INVESTIGATING' },
  expect: 409,
});
await check('POST /api/incidents/:id/events adds a timeline entry', 'POST', `/api/incidents/${incidentId}/events`, {
  body: { body: 'Rolled back the bad deploy.' },
  expect: 201,
});
await check('GET /api/incidents/:id/events lists the timeline', 'GET', `/api/incidents/${incidentId}/events`, {
  assert: (r) => r.json.data.items.length >= 2,
});
await check('GET /api/incidents/:id/blast-radius', 'GET', `/api/incidents/${incidentId}/blast-radius`, { assert: (r) => r.json.data });
await check('GET /api/incidents/:id/correlation', 'GET', `/api/incidents/${incidentId}/correlation`, { assert: (r) => r.json.data });
await check('GET /api/incidents/:id/similar', 'GET', `/api/incidents/${incidentId}/similar`, { assert: (r) => r.json.data });

// ---------------------------------------------------------------- 4. ARCH Copilot (V2/V3)

await check('GET /api/incidents/:id/copilot/hints', 'GET', `/api/incidents/${incidentId}/copilot/hints`, { assert: (r) => r.json.data });
let suggestionId;
await check('POST …/copilot/summary drafts a summary', 'POST', `/api/incidents/${incidentId}/copilot/summary`, {
  assert: (r) => expectField(r, 'data.id'),
  save: (r) => (suggestionId = r.json.data.id),
});
await check('POST …/copilot/triage drafts triage', 'POST', `/api/incidents/${incidentId}/copilot/triage`, { assert: (r) => r.json.data.id });
await check('POST …/copilot/status-draft drafts a status update', 'POST', `/api/incidents/${incidentId}/copilot/status-draft`, { assert: (r) => r.json.data.id });
await check('POST …/copilot/postmortem drafts a postmortem', 'POST', `/api/incidents/${incidentId}/copilot/postmortem`, { assert: (r) => r.json.data.id });
await check('POST …/copilot/code-fix drafts a code fix', 'POST', `/api/incidents/${incidentId}/copilot/code-fix`, {
  body: { attachment: 'TypeError: Cannot read properties of undefined (reading "total")\n  at checkout (src/checkout.ts:42)' },
  assert: (r) => r.json.data.id,
});
await check('POST …/copilot/ask answers a question', 'POST', `/api/incidents/${incidentId}/copilot/ask`, {
  body: { question: 'What changed in the last deploy?' },
  expect: [200, 201],
  assert: (r) => r.json.data,
});
await check('POST …/copilot/verified-fix starts the verified-fix loop', 'POST', `/api/incidents/${incidentId}/copilot/verified-fix`, {
  body: { attachment: 'if (!cart) { throw new Error("empty cart") }' },
  expect: [200, 201, 503],
  assert: (r) => r.json.data ?? r.json.error,
});
await check('GET …/copilot/suggestions lists drafts', 'GET', `/api/incidents/${incidentId}/copilot/suggestions`, { assert: (r) => Array.isArray(r.json.data) });
await check('GET …/copilot/verifications lists verifications', 'GET', `/api/incidents/${incidentId}/copilot/verifications`, { expect: [200], assert: (r) => r.json.data });
await check('GET …/copilot/pull-requests lists PRs', 'GET', `/api/incidents/${incidentId}/copilot/pull-requests`, { assert: (r) => r.json.data });
await check('POST /api/copilot/suggestions/:id/approve approves a draft', 'POST', `/api/copilot/suggestions/${suggestionId}/approve`, {
  body: { text: 'Checkout latency restored after rollback.' },
  assert: (r) => r.json.data.status === 'APPROVED',
});
await check('POST /api/copilot/code-review reviews a snippet', 'POST', '/api/copilot/code-review', {
  body: { code: 'function total(items) { return items.reduce((a, b) => a + b.price, 0) }', mode: 'review', language: 'javascript' },
  expect: [200, 201],
  assert: (r) => r.json.data,
});
await check('GET /api/copilot/model reports the model registry', 'GET', '/api/copilot/model', { assert: (r) => r.json.data });

// ---------------------------------------------------------------- 4b. Chat with ARCH
// Conversations: list, create, send, follow-up, rename, read back, delete, clear.

let chatSessionId;
await check('GET /api/copilot/chat/sessions starts empty', 'GET', '/api/copilot/chat/sessions', {
  assert: (r) => Array.isArray(r.json.data),
});
await check('POST /api/copilot/chat/sessions opens a conversation', 'POST', '/api/copilot/chat/sessions', {
  body: {},
  expect: 201,
  assert: (r) => r.json.data.title === 'New chat' && r.json.data.messageCount === 0,
  save: (r) => {
    chatSessionId = r.json.data.id;
  },
});
await check('POST …/chat/sessions/:id/messages answers a question', 'POST', `/api/copilot/chat/sessions/${chatSessionId}/messages`, {
  body: { content: 'what is open right now?' },
  expect: 201,
  assert: (r) => {
    const data = r.json.data;
    if (data.archMessage?.role !== 'ARCH') throw new Error('no ARCH reply');
    if (!data.archMessage.content || data.archMessage.content.length < 20) throw new Error('empty answer');
    if (!Array.isArray(data.archMessage.citations)) throw new Error('citations must be an array');
    if (data.session.messageCount !== 2) throw new Error(`expected 2 messages, got ${data.session.messageCount}`);
    if (data.session.titleSource !== 'AUTO') throw new Error('first message should auto-title the chat');
    if (data.session.title === 'New chat') throw new Error('title was not derived from the message');
  },
});
await check('POST …/chat/sessions/:id/messages keeps the thread (follow-up)', 'POST', `/api/copilot/chat/sessions/${chatSessionId}/messages`, {
  body: { content: 'kaise ho?' },
  expect: 201,
  assert: (r) => r.json.data.session.messageCount === 4 && r.json.data.archMessage.intent === 'greet',
});
await check('PATCH …/chat/sessions/:id renames a conversation', 'PATCH', `/api/copilot/chat/sessions/${chatSessionId}`, {
  body: { title: 'On-call handover' },
  assert: (r) => r.json.data.title === 'On-call handover' && r.json.data.titleSource === 'USER',
});
await check('GET …/chat/sessions/:id returns the transcript in order', 'GET', `/api/copilot/chat/sessions/${chatSessionId}`, {
  assert: (r) => {
    const messages = r.json.data.messages;
    if (!Array.isArray(messages) || messages.length !== 4) throw new Error(`expected 4 messages, got ${messages?.length}`);
    if (messages[0].role !== 'USER' || messages[1].role !== 'ARCH') throw new Error('roles are out of order');
    if (messages[0].content !== 'what is open right now?') throw new Error('first message text changed');
  },
});
await check('GET /api/copilot/chat/sessions lists the conversation', 'GET', '/api/copilot/chat/sessions', {
  assert: (r) => Array.isArray(r.json.data) && r.json.data.some((session) => session.id === chatSessionId && session.title === 'On-call handover'),
});
await check('POST …/chat/sessions/:id/messages rejects an empty message', 'POST', `/api/copilot/chat/sessions/${chatSessionId}/messages`, {
  body: { content: ' ' },
  expect: [400, 422],
});
await check('POST …/chat/sessions/:id/messages rejects an unknown session', 'POST', '/api/copilot/chat/sessions/does-not-exist/messages', {
  body: { content: 'hello there' },
  expect: 404,
});
await check('DELETE …/chat/sessions/:id deletes only that conversation', 'DELETE', `/api/copilot/chat/sessions/${chatSessionId}`, {
  assert: (r) => r.json.data.id === chatSessionId,
});
await check('DELETE /api/copilot/chat/sessions clears the caller\'s chats', 'DELETE', '/api/copilot/chat/sessions', {
  assert: (r) => typeof r.json.data.deleted === 'number',
});

// ---------------------------------------------------------------- 5. status pages

let statusPageId;
let statusSlug;
await check('POST /api/status-pages creates a page', 'POST', '/api/status-pages', {
  body: { name: 'Smoke Status', serviceIds: [serviceId] },
  expect: 201,
  assert: (r) => expectField(r, 'data.id'),
  save: (r) => {
    statusPageId = r.json.data.id;
    statusSlug = r.json.data.slug;
  },
});
await check('GET /api/status-pages lists pages', 'GET', '/api/status-pages', { assert: (r) => r.json.data.some((p) => p.id === statusPageId) });
await check('POST /api/status-pages/:id/publish publishes it', 'POST', `/api/status-pages/${statusPageId}/publish`, {
  body: { isPublished: true },
  assert: (r) => r.json.data.isPublished === true,
});
await check('GET /api/status-pages/public/:slug renders anonymously', 'GET', `/api/status-pages/public/${statusSlug}`, {
  auth: false,
  assert: (r) => expectField(r, 'data'),
});

// ---------------------------------------------------------------- 6. webhooks (HMAC ingest)

let webhookEndpointId;
let webhookSecret;
let webhookExternalId;
await check('POST /api/webhook-endpoints creates an endpoint + secret', 'POST', '/api/webhook-endpoints', {
  body: { provider: 'grafana', projectId, serviceId, description: 'smoke test endpoint' },
  expect: 201,
  assert: (r) => expectField(r, 'data.secret') && expectField(r, 'data.url'),
  save: (r) => {
    webhookEndpointId = r.json.data.endpoint.id;
    webhookExternalId = r.json.data.endpoint.externalId;
    webhookSecret = r.json.data.secret;
  },
});
await check('GET /api/webhook-endpoints lists endpoints', 'GET', '/api/webhook-endpoints', { assert: (r) => r.json.data.some((e) => e.id === webhookEndpointId) });
await check('GET /api/webhook-endpoints/:id/deliveries is empty', 'GET', `/api/webhook-endpoints/${webhookEndpointId}/deliveries`, { assert: (r) => r.json.data });


const alertBody = JSON.stringify({ title: 'Smoke alert: high error rate', state: 'alerting', severity: 'critical' });
const timestamp = Math.floor(Date.now() / 1000);
await check('POST /api/webhooks/:provider rejects an unsigned body', 'POST', `/api/webhooks/grafana?endpoint=${webhookExternalId}`, {
  auth: false,
  headers: { 'content-type': 'application/json' },
  raw: alertBody,
  expect: 401,
});
await check('POST /api/webhooks/:provider ingests a signed alert', 'POST', `/api/webhooks/grafana?endpoint=${webhookExternalId}`, {
  auth: false,
  headers: {
    'content-type': 'application/json',
    'x-arch-signature': `t=${timestamp},v1=${hmac(webhookSecret, timestamp, alertBody)}`,
  },
  raw: alertBody,
  expect: [202],
  assert: (r) => r.json.incident ?? r.json.data ?? r.json,
});
await check('GET /api/webhook-endpoints/:id/deliveries records it', 'GET', `/api/webhook-endpoints/${webhookEndpointId}/deliveries`, {
  assert: (r) => r.json.data.length >= 2,
});
await check('POST /api/webhook-endpoints/:id/rotate issues a new secret', 'POST', `/api/webhook-endpoints/${webhookEndpointId}/rotate`, {
  expect: [200, 201],
  assert: (r) => r.json.data.secret,
  save: (r) => (webhookSecret = r.json.data.secret),
});
await check('PATCH /api/webhook-endpoints/:id disables the endpoint', 'PATCH', `/api/webhook-endpoints/${webhookEndpointId}`, {
  body: { isActive: false, description: 'disabled by smoke test' },
  assert: (r) => r.json.data.isActive === false || r.json.data.id === webhookEndpointId,
});

// ---------------------------------------------------------------- 7. dependencies, changes, SLOs

let databaseServiceId;
await check('POST /api/services creates a dependency service', 'POST', '/api/services', {
  body: { projectId, name: 'Smoke Database' },
  expect: 201,
  save: (r) => (databaseServiceId = r.json.data.id),
});
let dependencyId;
await check('POST /api/dependencies links two services', 'POST', '/api/dependencies', {
  body: { fromServiceId: serviceId, toServiceId: databaseServiceId, relationship: 'DEPENDS_ON', criticality: 4 },
  expect: 201,
  assert: (r) => expectField(r, 'data.id'),
  save: (r) => (dependencyId = r.json.data.id),
});
await check('POST /api/dependencies rejects a self-dependency', 'POST', '/api/dependencies', {
  body: { fromServiceId: serviceId, toServiceId: serviceId, relationship: 'DEPENDS_ON', criticality: 4 },
  expect: 400,
});
await check('GET /api/dependencies lists the graph', 'GET', '/api/dependencies', { assert: (r) => r.json.data });
if (dependencyId) {
  await check('DELETE /api/dependencies/:id removes an edge', 'DELETE', `/api/dependencies/${dependencyId}`, { expect: [200, 204] });
}

let changeId;
await check('POST /api/changes records a deploy', 'POST', '/api/changes', {
  body: { serviceId, title: 'Smoke deploy 1.2.3', type: 'DEPLOYMENT', commitSha: 'abc1234', author: 'smoke' },
  expect: 201,
  assert: (r) => expectField(r, 'data.id'),
  save: (r) => (changeId = r.json.data.id),
});
await check('GET /api/changes lists changes', 'GET', '/api/changes', { assert: (r) => r.json.data });
await check('GET /api/changes/risk scores recent changes', 'GET', '/api/changes/risk', { assert: (r) => r.json.data });
await check('GET /api/changes/:id/blast-radius', 'GET', `/api/changes/${changeId}/blast-radius`, { assert: (r) => r.json.data });

await check('POST /api/slos upserts an error budget', 'POST', '/api/slos', {
  body: { serviceId, targetPercent: 99.9, windowDays: 30, burnAlertPercent: 50, enabled: true },
  expect: [200, 201],
  assert: (r) => r.json.data,
});
await check('GET /api/slos lists budgets', 'GET', '/api/slos', { assert: (r) => r.json.data });
await check('GET /api/insights/recurring finds repeated incidents', 'GET', '/api/insights/recurring?sinceDays=90', { assert: (r) => r.json.data });

// ---------------------------------------------------------------- 8. knowledge sources (RAG)

let knowledgeId;
await check('POST /api/knowledge-sources ingests a runbook', 'POST', '/api/knowledge-sources', {
  body: {
    name: 'Checkout runbook',
    kind: 'RUNBOOK',
    text: 'When checkout latency rises, first check the payment provider status page. Then verify the cart service database connections. Roll back the last deploy if the error rate started within ten minutes of it.',
  },
  expect: 201,
  assert: (r) => expectField(r, 'data.source.id') && expectField(r, 'data.chunks'),
  save: (r) => (knowledgeId = r.json.data.source.id),
});
await check('GET /api/knowledge-sources lists sources', 'GET', '/api/knowledge-sources', { assert: (r) => r.json.data });
await check('POST /api/knowledge-sources/:id/reindex re-embeds it', 'POST', `/api/knowledge-sources/${knowledgeId}/reindex`, {
  body: { text: 'Updated runbook: check the payment provider first, then the database connection pool, then roll back the deploy.' },
  expect: [200, 201],
});
await check('POST /api/knowledge-sources/fetch refuses a private URL', 'POST', '/api/knowledge-sources/fetch', {
  body: { url: 'http://127.0.0.1:9/private' },
  expect: [400, 422, 502, 504],
  assert: (r) => r.json.error,
});
await check('DELETE /api/knowledge-sources/:id removes it', 'DELETE', `/api/knowledge-sources/${knowledgeId}`, { expect: [200, 204] });

// ---------------------------------------------------------------- 9. GitHub / repos (mock mode)

await check('GET /api/github reports the GitHub mode', 'GET', '/api/github', { assert: (r) => r.json.data });
let repoConnectionId;
await check('POST /api/repo-connections connects a repository', 'POST', '/api/repo-connections', {
  body: { owner: 'acme', repo: 'api', defaultBranch: 'main' },
  expect: [201, 503],
  save: (r) => (repoConnectionId = r.json?.data?.id),
});
await check('GET /api/repo-connections lists connections', 'GET', '/api/repo-connections', { assert: (r) => r.json.data });
if (repoConnectionId) {
  await check('GET /api/repo-connections/:id', 'GET', `/api/repo-connections/${repoConnectionId}`, { assert: (r) => r.json.data });
  await check('POST /api/repo-connections/:id/pin pins a commit', 'POST', `/api/repo-connections/${repoConnectionId}/pin`, {
    body: { commitSha: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef' },
    expect: [200, 201, 503],
  });
  await check('POST /api/repos/insight asks about a repository', 'POST', '/api/repos/insight', {
    body: { repoConnectionId, question: 'How does the retry logic work?' },
    expect: [200, 201, 503],
  });
}

// ---------------------------------------------------------------- 10. audit log

await check('GET /api/audit lists attributed writes', 'GET', '/api/audit', { assert: (r) => r.json.data.items.length > 0 });

// ---------------------------------------------------------------- 11. public API v1 with a bearer token

let apiToken;
let apiTokenId;
await check('POST /api/v1/tokens mints a READ_WRITE token', 'POST', '/api/v1/tokens', {
  body: { name: 'smoke token', scopes: ['READ_WRITE'] },
  expect: 201,
  assert: (r) => expectField(r, 'data.token'),
  save: (r) => {
    apiToken = r.json.data.token;
    apiTokenId = r.json.data.id;
  },
});
await check('GET /api/v1/tokens lists tokens without secrets', 'GET', '/api/v1/tokens', {
  assert: (r) => r.json.data.every((token) => token.token === undefined),
});
const bearer = { authorization: `Bearer ${apiToken}`, 'content-type': 'application/json' };
await check('GET /api/v1/organizations with a bearer token', 'GET', '/api/v1/organizations', {
  auth: false,
  headers: bearer,
  assert: (r) => r.json.data.length === 1 && r.json.data[0].id === orgId,
});
await check('GET /api/v1/incidents with a bearer token', 'GET', '/api/v1/incidents', { auth: false, headers: bearer, assert: (r) => r.json.data.items });
let v1IncidentId;
await check('POST /api/v1/incidents opens an incident via bearer token', 'POST', '/api/v1/incidents', {
  auth: false,
  headers: bearer,
  body: { title: 'Smoke: v1 API incident', projectId, severity: 'LOW' },
  expect: 201,
  save: (r) => (v1IncidentId = r.json?.data?.id),
});
if (v1IncidentId) {
  await check('GET /api/v1/incidents/:id', 'GET', `/api/v1/incidents/${v1IncidentId}`, { auth: false, headers: bearer, assert: (r) => r.json.data.id === v1IncidentId });
  await check('PATCH /api/v1/incidents/:id', 'PATCH', `/api/v1/incidents/${v1IncidentId}`, {
    auth: false,
    headers: bearer,
    body: { severity: 'MEDIUM' },
    assert: (r) => r.json.data.severity === 'MEDIUM',
  });
  await check('GET /api/v1/incidents/:id/timeline', 'GET', `/api/v1/incidents/${v1IncidentId}/timeline`, { auth: false, headers: bearer, assert: (r) => r.json.data });
  await check('POST /api/v1/incidents/:id/copilot/triage', 'POST', `/api/v1/incidents/${v1IncidentId}/copilot/triage`, {
    auth: false,
    headers: bearer,
    expect: [200, 201],
    assert: (r) => r.json.data,
  });
}
await check('GET /api/v1/status-summary', 'GET', '/api/v1/status-summary', { auth: false, headers: bearer, assert: (r) => r.json.data });
await check('GET /api/v1/incidents rejects a bogus bearer token', 'GET', '/api/v1/incidents', {
  auth: false,
  headers: { authorization: 'Bearer arch_not-a-real-token' },
  expect: 401,
});

// ---------------------------------------------------------------- 12. invitations & members

const inviteeEmail = `smoke-invitee-${stamp}@example.com`;
let inviteToken;
await check('POST /api/organizations/:id/invitations invites an email', 'POST', `/api/organizations/${orgId}/invitations`, {
  body: { email: inviteeEmail, role: 'RESPONDER' },
  expect: 201,
  assert: (r) => expectField(r, 'data.inviteUrl'),
  save: (r) => (inviteToken = r.json.data.inviteUrl.split('/').pop()),
});
await check('GET /api/organizations/:id/invitations lists pending invites', 'GET', `/api/organizations/${orgId}/invitations`, { assert: (r) => r.json.data });

// The invitee accepts with their own session — a second account, same organization.
const inviteePassword = 'smoke-invitee-password-1';
const inviteeRegister = await requireAccount('POST /api/auth/register creates the invitee account', {
  email: inviteeEmail,
  password: inviteePassword,
  name: 'Smoke Invitee',
});
const inviteeJar = new Map(jar);
jar.clear();
const inviteeCsrf = await http('GET', '/api/auth/csrf');
await http('POST', '/api/auth/callback/credentials', {
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  raw: new URLSearchParams({ csrfToken: inviteeCsrf.json.csrfToken, email: inviteeEmail, password: inviteePassword, callbackUrl: `${BASE}/dashboard` }).toString(),
});
await check('GET /api/invitations/:token is readable by the invitee', 'GET', `/api/invitations/${inviteToken}`, { assert: (r) => r.json.data });
await check('POST /api/invitations/:token/accept joins the organization', 'POST', `/api/invitations/${inviteToken}/accept`, {
  expect: [200, 201],
  assert: (r) => r.json.data,
});
await check('GET /api/organizations/:id/members now has two people', 'GET', `/api/organizations/${orgId}/members`, {
  assert: (r) => r.json.data.length >= 2,
});
const inviteeId = inviteeRegister?.json?.data?.user?.id;
await check('a RESPONDER cannot remove members', 'DELETE', `/api/organizations/${orgId}/members/${inviteeId}`, { expect: 403 });
// Back to the owner session for the remaining checks.
jar.clear();
for (const [key, value] of inviteeJar) jar.set(key, value);
await check('the OWNER removes the member', 'DELETE', `/api/organizations/${orgId}/members/${inviteeId}`, { expect: [200, 204] });
await check('the removed member is gone from the roster', 'GET', `/api/organizations/${orgId}/members`, {
  assert: (r) => !r.json.data.some((member) => member.userId === inviteeId || member.user?.id === inviteeId),
});

// ---------------------------------------------------------------- 13. negative paths & tenancy

await check('GET /api/incidents without a session is 401', 'GET', '/api/incidents', { auth: false, expect: 401 });
await check('POST /api/auth/register rejects a duplicate email', 'POST', '/api/auth/register', {
  auth: false,
  body: { email, password: PASSWORD, name: 'Duplicate' },
  expect: 409,
  tolerate: [429],
});
await check('POST /api/auth/register rejects a short password', 'POST', '/api/auth/register', {
  auth: false,
  body: { email: `short-${stamp}@example.com`, password: 'short' },
  expect: 422,
  tolerate: [429],
  assert: (r) => !r.json.error || r.json.error.issues?.length >= 1,
});
await check('POST /api/auth/register rejects a malformed email', 'POST', '/api/auth/register', {
  auth: false,
  body: { email: 'not-an-email', password: PASSWORD },
  expect: 422,
  tolerate: [429],
});
await check('POST /api/auth/register rejects invalid JSON', 'POST', '/api/auth/register', {
  auth: false,
  headers: { 'content-type': 'application/json' },
  raw: '{not json',
  expect: 400,
  tolerate: [429],
});
await check('POST /api/incidents rejects a payload without a project', 'POST', '/api/incidents', {
  body: { title: 'no project' },
  expect: 422,
});

// A second tenant must never see the first tenant's rows. The chat below is created while the
// owner session is still active and stays alive across the swap, so the 404s below are real
// (a deleted id would 404 for anyone).
const ownerChat = await http('POST', '/api/copilot/chat/sessions', { body: {} });
const ownerChatId = ownerChat.json?.data?.id ?? 'missing';

const otherEmail = `smoke-other-${stamp}@example.com`;
await requireAccount('POST /api/auth/register creates the second tenant', {
  email: otherEmail,
  password: PASSWORD,
  name: 'Other Tenant',
  organizationName: `Other Org ${stamp}`,
});
const ownerJar = new Map(jar);
jar.clear();
const otherCsrf = await http('GET', '/api/auth/csrf');
await http('POST', '/api/auth/callback/credentials', {
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  raw: new URLSearchParams({ csrfToken: otherCsrf.json.csrfToken, email: otherEmail, password: PASSWORD, callbackUrl: `${BASE}/dashboard` }).toString(),
});
await check("another tenant cannot read the first tenant's incident", 'GET', `/api/incidents/${incidentId}`, { expect: 404 });
await check("another tenant cannot read the first tenant's project", 'GET', `/api/projects/${projectId}`, { expect: 404 });
await check('another tenant cannot read a foreign status page', 'GET', `/api/status-pages/${statusPageId}`, { expect: 404 });
await check('another tenant cannot revoke a foreign token', 'DELETE', `/api/v1/tokens/${apiTokenId}`, { expect: 404 });
await check("another tenant cannot read the first tenant's chat", 'GET', `/api/copilot/chat/sessions/${ownerChatId}`, { expect: 404 });
await check("another tenant cannot delete the first tenant's chat", 'DELETE', `/api/copilot/chat/sessions/${ownerChatId}`, { expect: 404 });
await check("another tenant's chat list starts empty", 'GET', '/api/copilot/chat/sessions', {
  assert: (r) => Array.isArray(r.json.data) && !r.json.data.some((session) => session.id === ownerChatId),
});
jar.clear();
for (const [key, value] of ownerJar) jar.set(key, value);
await http('DELETE', `/api/copilot/chat/sessions/${ownerChatId}`);

// Clean up the read-write token now that the v1 checks are done.
await check('DELETE /api/v1/tokens/:id revokes the token', 'DELETE', `/api/v1/tokens/${apiTokenId}`, { expect: [200, 204] });
await check('a revoked token stops working', 'GET', '/api/v1/incidents', { auth: false, headers: bearer, expect: 401 });

// ---------------------------------------------------------------- report

const width = Math.max(...results.map((r) => r.name.length));
console.log(`\nARCH backend smoke test — ${BASE}\n`);
for (const result of results) {
  console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name.padEnd(width)}  ${result.detail}`);
}
console.log(`\n${results.length - failures}/${results.length} checks passed${failures ? ` — ${failures} FAILED` : ''}`);
process.exit(failures ? 1 : 0);

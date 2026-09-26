#!/usr/bin/env node
/**
 * ARCH Knowledge — seed an organization's knowledge base from public documentation.
 *
 *   npm run knowledge:fetch -- --org <organizationId> --user <userId>
 *   npm run knowledge:fetch -- --org <id> --user <id> --list model-data/knowledge-urls.json
 *   npm run knowledge:fetch -- --org <id> --user <id> --dry-run
 *
 * This is the operator-run version of the "Fetch a URL" button on /dashboard/knowledge: you give it
 * a list of public documentation pages, it downloads each one, strips the HTML down to text and
 * stores it as retrievable chunks under your organization. Every fetch goes through the exact same
 * guard as the button — http/https only, no credentials, private and link-local addresses refused,
 * at most 3 redirects each re-checked, 10s timeout, 2MB cap — and every one is written to the audit
 * trail as `knowledge.fetch`.
 *
 * Why a script and not a background crawler: fetching public docs is a *choice*, made by a human,
 * at ingest time. Nothing here runs at inference, nothing is fetched while a responder is waiting,
 * and no incident or code data ever goes out. ARCH_OFFLINE_ONLY=true refuses every URL.
 *
 * The default list is public vendor documentation for failure families ARCH already knows about.
 * Override it with --list; the file is a JSON array of { name, url, kind? }.
 */
import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';

// Run through tsx so the script can reuse the real service (and therefore the real guardrails)
// instead of a second, drifting copy of the fetch rules.
const [{ fetchKnowledgeUrl }, { db }] = await Promise.all([
  import('../../src/server/services/knowledge.service.ts'),
  import('../../src/lib/db.ts'),
]);

const args = process.argv.slice(2);
function arg(name) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
}

const DRY_RUN = args.includes('--dry-run');

/** Public documentation only — every entry is a page an engineer could open in a browser. */
const DEFAULT_LIST = [
  { name: 'Kubernetes — debugging common container failures', url: 'https://kubernetes.io/docs/tasks/debug/debug-application/' },
  { name: 'PostgreSQL — routine vacuuming', url: 'https://www.postgresql.org/docs/current/routine-vacuuming.html' },
  { name: 'Node.js — diagnostic report', url: 'https://nodejs.org/api/diagnostics.html' },
  { name: 'Google SRE — postmortem culture', url: 'https://sre.google/sre-book/postmortem-culture/' },
  { name: 'Nginx — troubleshooting', url: 'https://nginx.org/en/docs/beginners_guide.html' },
  { name: 'Redis — latency troubleshooting', url: 'https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/' },
];

function log(message) {
  console.log(`[knowledge-fetch] ${message}`);
}

function loadList() {
  const file = arg('list');
  if (!file) return DEFAULT_LIST;
  const resolved = path.resolve(file);
  if (!fs.existsSync(resolved)) {
    log(`no list at ${resolved} — using the built-in public docs`);
    return DEFAULT_LIST;
  }
  const parsed = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  if (!Array.isArray(parsed)) throw new Error('The knowledge list must be a JSON array of { name, url }.');
  return parsed.filter((entry) => entry && typeof entry.url === 'string').map((entry) => ({ name: entry.name, url: entry.url, kind: entry.kind }));
}

const organizationId = arg('org');
const userId = arg('user');
const entries = loadList();

if (DRY_RUN) {
  for (const entry of entries) log(`would fetch ${entry.url}${entry.name ? ` (${entry.name})` : ''}`);
  log(`dry run — ${entries.length} document(s) listed, nothing was fetched and nothing was written`);
  process.exit(0);
}

if (!organizationId || !userId) {
  console.error('Usage: npm run knowledge:fetch -- --org <organizationId> --user <userId> [--list file.json] [--dry-run]');
  process.exit(1);
}

log(`${entries.length} public document(s) to fetch into organization ${organizationId}`);

let ok = 0;
const failures = [];
for (const entry of entries) {
  try {
    const result = await fetchKnowledgeUrl({ organizationId, userId, url: entry.url, name: entry.name });
    ok += 1;
    log(`${result.created ? 'added' : 'refreshed'} ${result.source.name} → ${result.chunks} chunk(s)`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push({ url: entry.url, message });
    log(`skipped ${entry.url} — ${message}`);
  }
}

log(`done: ${ok} indexed, ${failures.length} skipped`);
if (ok === 0) {
  log('nothing was fetched. If this machine cannot reach the public internet, add the documents on /dashboard/knowledge instead.');
}
await db.$disconnect();
// A failed URL is reported, not fatal: a partially seeded knowledge base is still useful.
process.exit(0);

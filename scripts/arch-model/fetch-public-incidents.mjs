#!/usr/bin/env node
/**
 * ARCH Model — download public postmortem corpora for local training.
 *
 *   npm run model:fetch-public            # writes model-data/public-incidents.jsonl
 *   npm run model:fetch-public -- --out some/dir
 *
 * Sources (researched on GitHub, see docs/engineering/ARCH-MODEL.md → "Training data"):
 *
 *   danluu/post-mortems          ~450 one-paragraph summaries of public postmortems, grouped by
 *                                cause (Config Errors, Hardware/Power, Conflicts, Time, Database,
 *                                Uncategorized). Repository has NO license file.
 *   icco/postmortems             ~240 annotated entries (company, product, categories, summary),
 *                                GPL-3.0.
 *   hayorov/kubernetes-failure-stories
 *                                Kubernetes failure stories (k8s.af) with "involved" + "impact"
 *                                tags. Repository has NO license file.
 *
 * Why this is a download step and not files in the repo: none of these corpora are licensed for
 * redistribution inside a proprietary product. The script fetches them onto YOUR machine, into a
 * git-ignored folder, and ARCH only keeps short snippets + the source URL inside the trained model
 * so responders can open the original write-up. Review the licenses before using the data
 * commercially; ARCH works without it (the built-in pattern library is original ARCH content).
 *
 * The only network traffic is to github.com / raw.githubusercontent.com / codeload.github.com, and
 * it happens when YOU run this script — never at runtime, never with incident data.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const OUT_DIR = path.resolve(outIndex >= 0 ? args[outIndex + 1] : process.env.ARCH_MODEL_DATA_DIR || 'model-data');
const OUT_FILE = path.join(OUT_DIR, 'public-incidents.jsonl');

// The GitHub REST API (not raw.githubusercontent.com) — it is reachable from more corporate
// networks, and GITHUB_TOKEN, when set, lifts the anonymous rate limit.
const DANLUU = 'https://api.github.com/repos/danluu/post-mortems/readme';
const K8S = 'https://api.github.com/repos/hayorov/kubernetes-failure-stories/readme';
const ICCO_TARBALL = 'https://api.github.com/repos/icco/postmortems/tarball';

const DANLUU_SECTIONS = {
  'Config Errors': 'config',
  'Hardware/Power Failures': 'hardware',
  Conflicts: 'concurrency',
  Time: 'time',
  Database: 'database',
  Uncategorized: null,
};

const ICCO_CATEGORIES = {
  automation: 'deploy',
  'cascading-failure': 'capacity',
  cloud: 'dependency',
  'config-change': 'config',
  hardware: 'hardware',
  security: 'security',
  time: 'time',
};

function log(message) {
  console.log(`[fetch-public] ${message}`);
}

async function get(url) {
  const headers = { 'user-agent': 'arch-model-fetch', accept: 'application/vnd.github.raw' };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(url, { headers, redirect: 'follow' });
  if (!response.ok) throw new Error(`GET ${url} → HTTP ${response.status}`);
  return response;
}

/** "[Company](url). Text…" → { company, url, text } — markdown links in the text are flattened. */
function parseDanluuEntry(line) {
  const match = /^\[([^\]]+)\]\(([^)]+)\)\.?\s*(.*)$/.exec(line.trim());
  if (!match) return null;
  const text = match[3].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').trim();
  if (text.length < 40) return null;
  return { company: match[1].trim(), url: match[2].trim(), text };
}

async function fetchDanluu() {
  const markdown = await (await get(DANLUU)).text();
  const rows = [];
  /** Only the cause sections are incidents; "Other lists", "Analysis" etc. are skipped. */
  let section = null;
  for (const line of markdown.split('\n')) {
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading) {
      section = heading[1] in DANLUU_SECTIONS ? heading[1] : null;
      continue;
    }
    if (!section || !line.startsWith('[')) continue;
    const entry = parseDanluuEntry(line);
    if (!entry) continue;
    rows.push({ source: 'danluu/post-mortems', ...entry, category: DANLUU_SECTIONS[section] ?? null });
  }
  return rows;
}

async function fetchKubernetesStories() {
  const markdown = await (await get(K8S)).text();
  const rows = [];
  const lines = markdown.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    // * [Title - Company - venue year](url)
    const head = /^[*-]\s+\[(.+)\]\(([^)]+)\)\s*$/.exec(lines[index]);
    if (!head) continue;
    let involved = '';
    let impact = '';
    for (let next = index + 1; next < Math.min(index + 5, lines.length); next += 1) {
      const sub = /^\s+[*-]\s+(involved|impact):\s*(.*)$/.exec(lines[next]);
      if (!sub) break;
      if (sub[1] === 'involved') involved = sub[2].replace(/`/g, '');
      else impact = sub[2];
    }
    if (!involved && !impact) continue;
    const parts = head[1].replace(/\\/g, '').split(' - ');
    const title = parts[0].trim();
    const company = (parts[1] ?? 'unknown').trim();
    const text = `${title}. Kubernetes failure involving ${involved || 'unknown components'}. Impact: ${impact || 'unknown'}.`.replace(/\s+/g, ' ');
    rows.push({ source: 'kubernetes-failure-stories', company, url: head[2], text, category: 'kubernetes' });
  }
  return rows;
}

function parseFrontMatter(markdown) {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(markdown);
  if (!match) return null;
  const meta = {};
  let currentList = null;
  for (const raw of match[1].split('\n')) {
    const item = /^\s+-\s+(.*)$/.exec(raw);
    if (item && currentList) {
      meta[currentList].push(item[1].replace(/^["']|["']$/g, ''));
      continue;
    }
    const kv = /^([a-z_]+):\s*(.*)$/.exec(raw);
    if (!kv) continue;
    const value = kv[2].trim();
    if (value === '' || value === '[]') {
      meta[kv[1]] = value === '[]' ? [] : '';
      currentList = value === '' ? kv[1] : null;
      if (value === '') meta[kv[1]] = [];
    } else {
      meta[kv[1]] = value.replace(/^["']|["']$/g, '');
      currentList = null;
    }
  }
  return { meta, body: match[2].trim() };
}

async function fetchIcco() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-icco-'));
  const tarball = path.join(tmp, 'icco.tar.gz');
  fs.writeFileSync(tarball, Buffer.from(await (await get(ICCO_TARBALL)).arrayBuffer()));
  const untar = spawnSync('tar', ['-xzf', tarball, '-C', tmp], { stdio: 'inherit' });
  if (untar.status !== 0) throw new Error('tar failed to extract the icco/postmortems archive');
  // API tarballs unpack to "<owner>-<repo>-<sha>/".
  const root = fs.readdirSync(tmp).find((name) => /postmortems-/.test(name) && fs.statSync(path.join(tmp, name)).isDirectory());
  const dataDir = root ? path.join(tmp, root, 'data') : null;
  if (!dataDir || !fs.existsSync(dataDir)) throw new Error('icco/postmortems archive has no data/ folder');

  const rows = [];
  for (const file of fs.readdirSync(dataDir).filter((name) => name.endsWith('.md'))) {
    const parsed = parseFrontMatter(fs.readFileSync(path.join(dataDir, file), 'utf8'));
    if (!parsed || parsed.body.length < 40) continue;
    const categories = Array.isArray(parsed.meta.categories) ? parsed.meta.categories : [];
    const category = categories.map((name) => ICCO_CATEGORIES[name]).find(Boolean) ?? null;
    rows.push({
      source: 'icco/postmortems',
      company: parsed.meta.company || 'unknown',
      url: parsed.meta.url || '',
      text: parsed.body.replace(/\s+/g, ' ').slice(0, 1200),
      category,
    });
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  return rows;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const all = [];
  for (const [name, fetcher] of [
    ['danluu/post-mortems', fetchDanluu],
    ['icco/postmortems', fetchIcco],
    ['kubernetes-failure-stories', fetchKubernetesStories],
  ]) {
    try {
      const rows = await fetcher();
      log(`${name}: ${rows.length} entries`);
      all.push(...rows);
    } catch (error) {
      log(`${name}: skipped (${error instanceof Error ? error.message : String(error)})`);
    }
  }

  // The same postmortem is often listed by more than one corpus — keep the first (richest) copy.
  const seen = new Set();
  const unique = all.filter((row) => {
    const key = row.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').toLowerCase() || row.text.slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  fs.writeFileSync(OUT_FILE, unique.map((row) => JSON.stringify(row)).join('\n') + '\n');
  log(`wrote ${unique.length} entries → ${path.relative(process.cwd(), OUT_FILE)}`);
  log('Licenses: danluu + k8s stories have no license file, icco is GPL-3.0. Data stays local (git-ignored).');
  log('Next: npm run model:train');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

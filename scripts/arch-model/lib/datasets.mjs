/**
 * ARCH Model — shared helpers for the training-data fetchers (fetch-public / fetch-code /
 * fetch-review).
 *
 * License policy (docs/legal/TRAINING-DATA-LICENSES.md):
 *  - third-party data is downloaded at RUN TIME onto the operator's server, into the
 *    git-ignored `model-data/` folder — nothing third-party is ever committed or redistributed;
 *  - every fetch writes/merges `model-data/datasets-manifest.json` and regenerates
 *    `model-data/THIRD-PARTY-NOTICES.md`, and saves each dataset's license text under
 *    `model-data/licenses/` when it can be fetched;
 *  - ARCH keeps only short snippets + source links inside trained artifacts.
 */
import fs from 'node:fs';
import path from 'node:path';

export const USER_AGENT = 'arch-model-fetch (incident management training data; contact: repo owner)';

/** Parsed --flag value helper. */
export function flagValue(args, name, fallback = undefined) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
}

export function hasFlag(args, name) {
  return args.includes(`--${name}`);
}

export function outDir(args) {
  return path.resolve(flagValue(args, 'out', process.env.ARCH_MODEL_DATA_DIR || 'model-data'));
}

function githubHeaders() {
  const headers = { 'user-agent': USER_AGENT, accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

/** Network error → readable, actionable message (proxy users see the CA hint). */
export function describeFetchError(error, url) {
  const cause = error.cause?.code ?? error.cause?.message ?? error.message;
  const hint =
    String(cause).includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE') || String(cause).includes('self-signed')
      ? ' Behind a TLS-inspecting proxy? Run with NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt.'
      : '';
  return `GET ${url} failed (${cause}).${hint}`;
}

/** GET with a timeout; returns { ok, status, json?, text?, buffer? }. */
export async function httpGet(url, { headers = {}, as = 'text', timeoutMs = 30_000 } = {}) {
  const response = await fetch(url, { headers: { 'user-agent': USER_AGENT, ...headers }, redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) return { ok: false, status: response.status };
  if (as === 'json') return { ok: true, status: response.status, json: await response.json() };
  if (as === 'buffer') return { ok: true, status: response.status, buffer: Buffer.from(await response.arrayBuffer()) };
  return { ok: true, status: response.status, text: await response.text() };
}

/** Hugging Face datasets-server: one page of rows for a dataset/config/split. */
export async function hfRows(dataset, { config = 'default', split = 'train', offset = 0, length = 100 } = {}) {
  const url = `https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(dataset)}&config=${encodeURIComponent(config)}&split=${encodeURIComponent(split)}&offset=${offset}&length=${length}`;
  const headers = {};
  if (process.env.HF_TOKEN) headers.authorization = `Bearer ${process.env.HF_TOKEN}`;
  const result = await httpGet(url, { headers, as: 'json' });
  if (!result.ok) throw new Error(describeFetchError(new Error(`HTTP ${result.status}`), url));
  return result.json.rows.map((row) => row.row);
}

/** Walk a Hugging Face dataset page by page until `limit` rows (or the end of the split). */
export async function collectHfRows(dataset, options, limit, log) {
  const rows = [];
  const pageSize = Math.min(100, limit);
  for (let offset = 0; rows.length < limit; offset += pageSize) {
    const page = await hfRows(dataset, { ...options, offset, length: Math.min(pageSize, limit - rows.length) });
    rows.push(...page);
    log(`  ${dataset}: ${rows.length} rows`);
    if (page.length < pageSize) break;
  }
  return rows.slice(0, limit);
}

/** GitHub repo file via the REST API (api.github.com is reachable from more networks than raw.*). */
export async function githubJson(url) {
  const result = await httpGet(url, { headers: githubHeaders(), as: 'json' });
  if (!result.ok) throw new Error(describeFetchError(new Error(`HTTP ${result.status}`), url));
  return result.json;
}

export async function githubReadme(repo) {
  const result = await httpGet(`https://api.github.com/repos/${repo}/readme`, { headers: { ...githubHeaders(), accept: 'application/vnd.github.raw' } });
  if (!result.ok) throw new Error(describeFetchError(new Error(`HTTP ${result.status}`), repo));
  return result.text;
}

/** Save a dataset's license text under model-data/licenses/ (best effort). */
export async function saveLicense(dir, repo, datasetId, log) {
  try {
    const json = await githubJson(`https://api.github.com/repos/${repo}/license`);
    const content = json.content && json.encoding === 'base64' ? Buffer.from(json.content, 'base64').toString('utf8') : null;
    if (!content) return null;
    const file = path.join(dir, 'licenses', `${datasetId.replace(/[^a-z0-9._-]+/gi, '_')}-LICENSE.txt`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    log(`  license saved: ${path.relative(process.cwd(), file)} (${json.license?.spdx_id ?? 'unknown'})`);
    return { file, spdx: json.license?.spdx_id ?? null, text: content };
  } catch (error) {
    log(`  license for ${repo} not saved (${error.message})`);
    return null;
  }
}

// ---------------------------------------------------------------------------------------------
// Manifest + third-party notices
// ---------------------------------------------------------------------------------------------

function manifestPath(dir) {
  return path.join(dir, 'datasets-manifest.json');
}

/** Merge this run's dataset entries into the shared manifest (keyed by dataset id). */
export function updateManifest(dir, entries) {
  fs.mkdirSync(dir, { recursive: true });
  let manifest = { generatedBy: 'ARCH model data fetchers', datasets: {} };
  try {
    manifest = { ...manifest, ...JSON.parse(fs.readFileSync(manifestPath(dir), 'utf8')) };
  } catch {
    // First run — start fresh.
  }
  for (const entry of entries) manifest.datasets[entry.id] = { ...manifest.datasets[entry.id], ...entry, fetchedAt: new Date().toISOString() };
  fs.writeFileSync(manifestPath(dir), `${JSON.stringify(manifest, null, 2)}\n`);
  writeNotices(dir, manifest);
  return manifest;
}

function writeNotices(dir, manifest) {
  const lines = [
    '# Third-party training data notices',
    '',
    `Generated ${new Date().toISOString()} by the ARCH model data fetchers. This folder (model-data/) is`,
    'git-ignored: third-party data is downloaded at run time onto your server and is never',
    'committed or redistributed. License texts (where fetchable) live in ./licenses/.',
    'Full policy: docs/legal/TRAINING-DATA-LICENSES.md.',
    '',
  ];
  for (const entry of Object.values(manifest.datasets)) {
    lines.push(`## ${entry.name} (${entry.id})`);
    lines.push(`- Source: ${entry.url}`);
    lines.push(`- License: ${entry.license}${entry.licenseNote ? ` — ${entry.licenseNote}` : ''}`);
    lines.push(`- Last fetched: ${entry.fetchedAt} · ${entry.documents ?? 0} documents → ${entry.file ?? '?'}`);
    lines.push(`- What ARCH keeps: ${entry.retention}`);
    lines.push('');
  }
  fs.writeFileSync(path.join(dir, 'THIRD-PARTY-NOTICES.md'), lines.join('\n'));
}

/** One JSONL line per document; the row shape is what archModel.service readCorpusFile expects. */
export function writeJsonl(file, rows) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''));
}

export function clipText(text, max) {
  return (text ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

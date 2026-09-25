#!/usr/bin/env node
/**
 * ARCH Model — download human code-review knowledge for local training.
 *
 *   npm run model:fetch-review                 # github-codereview (400) + CodeReviewer (200)
 *   npm run model:fetch-review -- --limit 800  # more pairs per dataset
 *   npm run model:fetch-review -- --skip-codereviewer
 *
 * Sources (licenses per the dataset cards / repository — see docs/legal/TRAINING-DATA-LICENSES.md):
 *
 *   ronantakizawa/github-codereview   MIT        human review comments ↔ code changes from big
 *                                                GitHub repositories (Hugging Face dataset).
 *   Microsoft CodeReviewer            Apache-2.0 millions of review comment ↔ code-change pairs
 *   huggingface.co/microsoft/CodeReviewer        (paper dataset; we take a small capped sample).
 *
 * Output: model-data/review-corpus.jsonl (git-ignored). ARCH keeps the review comment, a clipped
 * snippet of the reviewed change and the source — not full repositories.
 */
import path from 'node:path';
import { clipText, collectHfRows, flagValue, hasFlag, outDir, saveLicense, updateManifest, writeJsonl } from './lib/datasets.mjs';

const args = process.argv.slice(2);
const OUT_DIR = outDir(args);
const OUT_FILE = path.join(OUT_DIR, 'review-corpus.jsonl');
const LIMIT = Number(flagValue(args, 'limit', '400'));
const CODEREVIEWER_LIMIT = Number(flagValue(args, 'codereviewer-limit', String(Math.min(200, LIMIT))));

function log(message) {
  console.log(`[fetch-review] ${message}`);
}

const COMMENT_KEYS = ['review_comment', 'comment', 'review', 'body', 'message'];
const DIFF_KEYS = ['patch', 'diff', 'change', 'code', 'file_content'];

function pick(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim().length >= 10) return value;
  }
  return null;
}

function toRow({ idPrefix, source, license, url, row, index }) {
  const comment = pick(row, COMMENT_KEYS);
  if (!comment) return null;
  const diff = pick(row, DIFF_KEYS);
  const entry = {
    id: `${idPrefix}:${row.id ?? index}`,
    source,
    license,
    title: clipText(comment, 140),
    text: `A human code reviewer wrote: ${clipText(comment, 700)}${diff ? ` The code change under review: ${clipText(diff, 500)}` : ''}`,
    rootCause: clipText(comment, 400),
  };
  if (url) entry.url = url;
  if (typeof row.language === 'string') entry.language = row.language;
  return entry;
}

async function fetchGithubCodereview() {
  log(`ronantakizawa/github-codereview via Hugging Face (limit ${LIMIT})…`);
  const rows = await collectHfRows('ronantakizawa/github-codereview', { config: 'default', split: 'train' }, LIMIT, log);
  const out = [];
  rows.forEach((row, index) => {
    const mapped = toRow({
      idPrefix: 'ghcr',
      source: 'ronantakizawa/github-codereview',
      license: 'MIT',
      url: typeof row.repo === 'string' ? `https://github.com/${row.repo}` : 'https://huggingface.co/datasets/ronantakizawa/github-codereview',
      row,
      index,
    });
    if (mapped) out.push(mapped);
  });
  return out;
}

async function fetchMicrosoftCodeReviewer() {
  log(`microsoft/CodeReviewer via Hugging Face (limit ${CODEREVIEWER_LIMIT})…`);
  // The dataset ships a "dataset" config (train/test) — fall back to the default one.
  let rows = [];
  for (const config of ['dataset', 'default']) {
    for (const split of ['train', 'test']) {
      try {
        rows = await collectHfRows('microsoft/CodeReviewer', { config, split }, CODEREVIEWER_LIMIT, log);
        break;
      } catch {
        // Try the next config/split combination.
      }
    }
    if (rows.length) break;
  }
  const out = [];
  rows.forEach((row, index) => {
    const mapped = toRow({
      idPrefix: 'mscr',
      source: 'microsoft/CodeReviewer',
      license: 'Apache-2.0',
      url: typeof row.repo === 'string' ? `https://github.com/${row.repo}` : 'https://huggingface.co/microsoft/codereviewer',
      row,
      index,
    });
    if (mapped) out.push(mapped);
  });
  return out;
}

async function main() {
  const rows = [];
  const counts = { ghcr: 0, mscr: 0 };

  try {
    const ghcr = await fetchGithubCodereview();
    counts.ghcr = ghcr.length;
    rows.push(...ghcr);
    log(`github-codereview: ${ghcr.length} review pairs`);
  } catch (error) {
    log(`github-codereview: skipped (${error.message}). Needs access to huggingface.co — run on a machine with it.`);
  }

  if (!hasFlag(args, 'skip-codereviewer')) {
    try {
      const mscr = await fetchMicrosoftCodeReviewer();
      counts.mscr = mscr.length;
      rows.push(...mscr);
      log(`microsoft/CodeReviewer: ${mscr.length} review pairs`);
    } catch (error) {
      log(`microsoft/CodeReviewer: skipped (${error.message}). Needs access to huggingface.co.`);
    }
  }

  writeJsonl(OUT_FILE, rows);
  log(`wrote ${rows.length} review examples → ${path.relative(process.cwd(), OUT_FILE)}`);

  await saveLicense(OUT_DIR, 'microsoft/CodeBERT', 'codereviewer', log);

  updateManifest(OUT_DIR, [
    {
      id: 'github-codereview',
      name: 'ronantakizawa/github-codereview',
      url: 'https://huggingface.co/datasets/ronantakizawa/github-codereview',
      license: 'MIT',
      licenseNote: 'per the Hugging Face dataset card',
      retention: 'review comment (clipped) + short diff snippet + source link',
      file: path.relative(process.cwd(), OUT_FILE),
      documents: counts.ghcr,
    },
    {
      id: 'microsoft-codereviewer',
      name: 'Microsoft CodeReviewer',
      url: 'https://github.com/microsoft/CodeBERT/tree/master/CodeReviewer',
      license: 'Apache-2.0',
      licenseNote: 'model + dataset released with the CodeBERT repository',
      retention: 'review comment (clipped) + short diff snippet + source link',
      file: path.relative(process.cwd(), OUT_FILE),
      documents: counts.mscr,
    },
  ]);

  log('Data stays local (git-ignored). Notices: model-data/THIRD-PARTY-NOTICES.md');
  log('Next: npm run model:train (or retrain from /dashboard/model)');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

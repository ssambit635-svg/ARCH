#!/usr/bin/env node
/**
 * ARCH Model — download code-fix knowledge for local training.
 *
 *   npm run model:fetch-code                        # SWE-bench Verified (300) + ManySStuBs4J sample
 *   npm run model:fetch-code -- --limit 500         # more SWE-bench instances
 *   npm run model:fetch-code -- --dataset princeton-nlp/SWE-bench   # the full 2,294-instance set
 *   npm run model:fetch-code -- --skip-swebench | --skip-sstuBs
 *
 * Sources (licenses verified against the repositories — see docs/legal/TRAINING-DATA-LICENSES.md):
 *
 *   SWE-bench (+ Verified subset)     MIT        ~2,294 real GitHub issue → pull-request pairs
 *   princeton-nlp/SWE-bench                      (Verified = 500 human-vetted). Hosted on
 *                                                Hugging Face; fetched through the datasets API.
 *   ManySStuBs4J                      Apache-2.0 ~1 GB of Java buggy-line → fixed-line pairs
 *   mast-group/mineSStuBs                        (Zenodo record 3653444). We stream only the
 *   https://zenodo.org/records/3653444           first N MB of the smallest data file.
 *
 * Output: model-data/code-corpus.jsonl (git-ignored), one JSON object per bug-fix case. ARCH keeps
 * the problem description, a summary of the fix and the source link — not full repositories.
 * The manifest + THIRD-PARTY-NOTICES.md + license texts are written next to it.
 */
import path from 'node:path';
import {
  clipText,
  collectHfRows,
  describeFetchError,
  flagValue,
  hasFlag,
  httpGet,
  outDir,
  saveLicense,
  updateManifest,
  writeJsonl,
} from './lib/datasets.mjs';

const args = process.argv.slice(2);
const OUT_DIR = outDir(args);
const OUT_FILE = path.join(OUT_DIR, 'code-corpus.jsonl');
const SWEBENCH_LIMIT = Number(flagValue(args, 'limit', '300'));
const SWEBENCH_DATASET = flagValue(args, 'dataset', 'SWE-bench/SWE-bench_Verified');
const SSTUBS_MAX_BYTES = Number(flagValue(args, 'sstubs-bytes', String(24 * 1024 * 1024)));

function log(message) {
  console.log(`[fetch-code] ${message}`);
}

// ---------------------------------------------------------------------------------------------
// SWE-bench — real GitHub issue → gold pull-request instances (MIT)
// ---------------------------------------------------------------------------------------------

/** A diffstat-style summary of the gold patch: which files changed, how much. */
function summarizePatch(patch) {
  if (!patch) return null;
  const files = [];
  let additions = 0;
  let deletions = 0;
  for (const line of patch.split('\n')) {
    const header = /^\+\+\+ b\/(.+)$/.exec(line);
    if (header) files.push(header[1]);
    if (line.startsWith('+') && !line.startsWith('+++')) additions += 1;
    if (line.startsWith('-') && !line.startsWith('---')) deletions += 1;
  }
  if (files.length === 0) return null;
  return `Gold patch modifies ${files.length} file(s) (+${additions}/-${deletions}): ${files.slice(0, 6).join(', ')}${files.length > 6 ? ', …' : ''}`;
}

function inferLanguage(repo, problemStatement) {
  const name = repo.toLowerCase();
  if (/(django|sympy|scikit|pylint|astropy|matplotlib|sphinx|sqlalchemy|pytest|pydicom|flask|pandas|mwparser)/.test(name)) return 'python';
  if (/(vue|react|angular|node|webpack)/.test(name)) return 'javascript';
  if (/java/.test(name)) return 'java';
  if (/\.py\b|python|traceback/i.test(problemStatement ?? '')) return 'python';
  return null;
}

async function fetchSwebench() {
  log(`SWE-bench via Hugging Face (${SWEBENCH_DATASET}, limit ${SWEBENCH_LIMIT})…`);
  const rows = await collectHfRows(SWEBENCH_DATASET, { config: 'default', split: 'test' }, SWEBENCH_LIMIT, log);
  const out = [];
  for (const row of rows) {
    const problem = clipText(row.problem_statement ?? '', 900);
    if (!row.instance_id || problem.length < 30) continue;
    const patchSummary = summarizePatch(row.patch ?? row.model_patch);
    const language = inferLanguage(row.repo ?? '', row.problem_statement);
    const firstLine = problem.split(/\s+/).slice(0, 16).join(' ');
    const entry = {
      id: `swebench:${row.instance_id}`,
      source: SWEBENCH_DATASET,
      license: 'MIT',
      url: `https://github.com/${row.repo}`,
      title: `${row.instance_id}: ${firstLine}`,
      text: `Real GitHub issue fixed by a merged pull request in ${row.repo}. ${problem}`,
      rootCause: clipText(problem, 400),
    };
    if (patchSummary) entry.mitigation = [patchSummary];
    if (language) entry.language = language;
    out.push(entry);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// ManySStuBs4J — Java buggy line → fixed line pairs (Apache-2.0, Zenodo 3653444)
// ---------------------------------------------------------------------------------------------

/** Walk a JSON-ish blob and pull out objects that look like SStuBs bug entries. */
function extractSstubEntries(parsed) {
  const entries = [];
  const visit = (node) => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (node && typeof node === 'object') {
      const keys = Object.keys(node);
      const bugType = node.bugType ?? node.bug_type ?? node.BugType;
      const buggy = node.buggyLine ?? node.buggy_line ?? node.buggyCode ?? node.buggySnippet;
      const fixed = node.fixedLine ?? node.fixed_line ?? node.fixedCode ?? node.fixedSnippet;
      if (bugType && (buggy || fixed)) {
        entries.push({ bugType: String(bugType), buggy: buggy ? String(buggy) : '', fixed: fixed ? String(fixed) : '', file: node.fileName ?? node.file ?? node.path ?? null });
        return;
      }
      if (keys.length <= 40) for (const key of keys) visit(node[key]);
    }
  };
  visit(parsed);
  return entries;
}

async function fetchManySStuBs() {
  log('ManySStuBs4J via Zenodo record 3653444…');
  const record = await httpGet('https://zenodo.org/api/records/3653444', { as: 'json' });
  if (!record.ok) throw new Error(describeFetchError(new Error(`HTTP ${record.status}`), 'zenodo.org/api/records/3653444'));

  const files = (record.json.files ?? [])
    .filter((file) => /\.(jsonl?|txt)$/i.test(file.key ?? ''))
    .sort((a, b) => (a.size ?? 0) - (b.size ?? 0));
  const target = files[0];
  if (!target) throw new Error('Zenodo record lists no JSON data file');
  log(`  streaming first ${Math.round(SSTUBS_MAX_BYTES / 1024 / 1024)} MB of ${target.key} (${Math.round((target.size ?? 0) / 1024 / 1024)} MB total)`);

  const partial = await httpGet(target.links?.self ?? target.url, {
    headers: { range: `bytes=0-${SSTUBS_MAX_BYTES - 1}` },
    as: 'buffer',
    timeoutMs: 300_000,
  });
  if (!partial.ok) throw new Error(describeFetchError(new Error(`HTTP ${partial.status}`), target.links?.self ?? target.url));

  let text = partial.buffer.toString('utf8');
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Truncated mid-array: cut back to the last complete object and close the array.
    const lastClose = text.lastIndexOf('}');
    if (lastClose > 0) {
      try {
        parsed = JSON.parse(`${text.slice(0, lastClose + 1)}]`);
      } catch {
        // Try as JSON Lines.
        parsed = text
          .split('\n')
          .map((line) => {
            try {
              return JSON.parse(line);
            } catch {
              return null;
            }
          })
          .filter(Boolean);
      }
    }
  }
  if (!parsed) throw new Error(`could not parse any of ${target.key} — check the dataset format`);

  const entries = extractSstubEntries(parsed).slice(0, 800);
  log(`  parsed ${entries.length} buggy→fixed pairs from the sample`);
  return entries.map((entry, index) => {
    const buggy = clipText(entry.buggy, 240);
    const fixed = clipText(entry.fixed, 240);
    return {
      id: `manysstuBs4j:${index}:${entry.bugType}`,
      source: 'ManySStuBs4J (Zenodo 3653444)',
      license: 'Apache-2.0 (dataset), tool Apache-2.0',
      url: 'https://github.com/mast-group/mineSStuBs',
      title: `Java ${entry.bugType} bug${entry.file ? ` in ${entry.file}` : ''}`,
      text: `Java ${entry.bugType}: the buggy line "${buggy}" was fixed to "${fixed}". Simple, stupid bug pattern mined from open-source Java repositories.`,
      rootCause: `Bug pattern ${entry.bugType}`,
      mitigation: fixed ? [`Change to: ${fixed}`] : undefined,
      language: 'java',
    };
  });
}

// ---------------------------------------------------------------------------------------------

async function main() {
  const rows = [];
  const counts = { swebench: 0, sstub: 0 };

  if (!hasFlag(args, 'skip-swebench')) {
    try {
      const swebench = await fetchSwebench();
      counts.swebench = swebench.length;
      rows.push(...swebench);
      log(`SWE-bench: ${swebench.length} bug-fix cases`);
    } catch (error) {
      log(`SWE-bench: skipped (${error.message}). Needs access to huggingface.co — run on a machine with it.`);
    }
  }

  if (!hasFlag(args, 'skip-sstuBs') && !hasFlag(args, 'skip-sstubs')) {
    try {
      const sstub = await fetchManySStuBs();
      counts.sstub = sstub.length;
      rows.push(...sstub);
      log(`ManySStuBs4J: ${sstub.length} buggy→fixed pairs`);
    } catch (error) {
      log(`ManySStuBs4J: skipped (${error.message}). Needs access to zenodo.org — run on a machine with it.`);
    }
  }

  writeJsonl(OUT_FILE, rows);
  log(`wrote ${rows.length} code-fix cases → ${path.relative(process.cwd(), OUT_FILE)}`);

  // License texts (best effort) + manifest + notices.
  await saveLicense(OUT_DIR, 'princeton-nlp/SWE-bench', 'swebench', log);
  await saveLicense(OUT_DIR, 'mast-group/mineSStuBs', 'manysstuBs4j', log);

  updateManifest(OUT_DIR, [
    {
      id: 'swebench',
      name: `SWE-bench (${SWEBENCH_DATASET})`,
      url: 'https://github.com/princeton-nlp/SWE-bench',
      license: 'MIT',
      licenseNote: 'verified against the repository LICENSE file',
      retention: 'issue text (clipped) + gold-patch file summary + repo link; no repository code',
      file: path.relative(process.cwd(), OUT_FILE),
      documents: counts.swebench,
    },
    {
      id: 'manysstuBs4j',
      name: 'ManySStuBs4J',
      url: 'https://zenodo.org/records/3653444',
      license: 'Apache-2.0 (tool repo), dataset open per the MSR paper',
      licenseNote: 'streamed sample only; verify Zenodo record terms for commercial use',
      retention: 'bug type + buggy line + fixed line (clipped) + tool repo link',
      file: path.relative(process.cwd(), OUT_FILE),
      documents: counts.sstub,
    },
  ]);

  log('Data stays local (git-ignored). Notices: model-data/THIRD-PARTY-NOTICES.md');
  log('Next: npm run model:train (or retrain from /dashboard/model)');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

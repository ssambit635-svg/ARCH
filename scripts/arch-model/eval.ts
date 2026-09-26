/**
 * ARCH Model — offline evaluation, no database needed.
 *
 *   npm run model:eval
 *
 * Trains the base model (pattern library + public postmortems, if downloaded) and reports held-out
 * accuracy plus a few sample predictions, so you can see what the model knows before any of your
 * own incidents exist.
 */
import fs from 'node:fs';
import path from 'node:path';
import { CATEGORY_IDS, type CategoryId } from '../../src/server/ai/arch-model/knowledge';
import { ArchModelRuntime } from '../../src/server/ai/arch-model/runtime';
import { trainArchModel, type TrainingDoc } from '../../src/server/ai/arch-model/train';
import { GOLDEN, SEVERITY_GOLDEN, evaluate } from './golden-set';

const file = path.resolve(process.env.ARCH_MODEL_DATA_DIR ?? 'model-data', 'public-incidents.jsonl');
const docs: TrainingDoc[] = fs.existsSync(file)
  ? fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line, index) => {
        const row = JSON.parse(line) as { company?: string; text: string; category?: string | null; url?: string };
        const category = row.category && (CATEGORY_IDS as string[]).includes(row.category) ? (row.category as CategoryId) : null;
        return { id: `public:${index}`, source: 'public' as const, title: row.company ?? 'public', text: row.text, category, url: row.url, company: row.company };
      })
  : [];

const artifact = trainArchModel(docs);
const model = new ArchModelRuntime(artifact);
const m = artifact.metrics;
console.log(`documents: pattern=${m.documents.pattern} public=${m.documents.public} · vocabulary=${m.vocabularySize} · trained in ${m.trainingMs} ms · artifact ${Math.round(JSON.stringify(artifact).length / 1024)} KB`);
console.log(`category accuracy (held-out real postmortems): ${m.category.holdoutAccuracy === null ? 'n/a — run npm run model:fetch-public' : `${Math.round(m.category.holdoutAccuracy * 100)}% on ${m.category.holdoutSize}`}`);
if (!docs.length) console.log('tip: npm run model:fetch-public downloads ~340 public postmortems for a stronger base model');

// Golden set: hand-written incidents, one or two per failure family, in an engineer's own words.
const golden = evaluate(model);
console.log(`\ngolden set (${GOLDEN.length} hand-written incidents, ${new Set(GOLDEN.map((g) => g.category)).size} families): ${golden.correct}/${golden.total} = ${Math.round(golden.accuracy * 100)}%`);
for (const miss of golden.misses) console.log(`  miss: ${miss}`);
for (const item of SEVERITY_GOLDEN) {
  console.log(`  severity check: ${model.classifySeverity(item.text).severity} (expected ${item.severity})`);
}

const samples = [
  'Checkout returning 502 errors right after the payments-api deploy; rolled back',
  'Primary database CPU pinned at 100%, too many connections, requests timing out',
  'Certificate has expired on the public API endpoint',
  'Users cannot log in, SSO callback failing',
  'Pods in CrashLoopBackOff after helm upgrade',
  'Typo on the pricing page',
];
for (const sample of samples) {
  const category = model.classifyCategory(sample);
  const severity = model.classifySeverity(sample);
  const similar = model.similar(sample, { k: 2 });
  console.log(`\n"${sample}"\n  → ${category.category} (${Math.round(category.confidence * 100)}%) · severity ${severity.severity}`);
  for (const hit of similar) console.log(`    similar: [${hit.doc.source}] ${hit.doc.title.slice(0, 90)} (${hit.score})`);
}

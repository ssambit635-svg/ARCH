/**
 * ARCH Model — export one organization's incidents as a fine-tuning dataset for the LOCAL LLM.
 *
 *   npm run model:export-finetune -- --org acme [--out model-data/finetune]
 *
 * Writes chat-format JSONL ({"messages":[system,user,assistant]}) that Unsloth, Axolotl,
 * llama.cpp's finetune and most LoRA tooling accept. Each example is the exact prompt ARCH sends
 * at runtime, paired with:
 *
 *   gold    drafts a responder APPROVED (the edited text when they edited it);
 *   silver  the final severity the team settled on, as a triage target.
 *
 * Everything is redacted with the same rules as live Copilot calls. The output folder is
 * git-ignored: it contains your incident history — keep it on your own machines.
 * See docs/engineering/ARCH-MODEL.md → "Fine-tuning the local LLM".
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../../src/lib/db';
import { buildCopilotContext } from '../../src/server/ai/context';
import { buildPrompt } from '../../src/server/ai/prompts';
import type { CopilotTask } from '../../src/server/ai/provider';

const TASK: Record<string, Exclude<CopilotTask, 'code_review'>> = {
  SUMMARY: 'summary',
  TRIAGE: 'triage',
  STATUS_UPDATE: 'status_update',
  POSTMORTEM: 'postmortem',
  CODE_FIX: 'code_fix',
};

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const slug = arg('--org');
  if (!slug) throw new Error('usage: npm run model:export-finetune -- --org <organization-slug>');
  const organization = await db.organization.findUnique({ where: { slug }, select: { id: true, slug: true } });
  if (!organization) throw new Error(`No organization with slug "${slug}".`);

  const outDir = path.resolve(arg('--out') ?? path.join(process.env.ARCH_MODEL_DATA_DIR ?? 'model-data', 'finetune'));
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${organization.slug}.jsonl`);

  const incidents = await db.incident.findMany({
    where: { organizationId: organization.id },
    include: { service: { select: { name: true } }, events: { orderBy: { createdAt: 'asc' } } },
    orderBy: { startedAt: 'asc' },
  });
  const suggestions = await db.aiSuggestion.findMany({ where: { organizationId: organization.id, status: 'APPROVED' }, orderBy: { createdAt: 'asc' } });
  const events = new Map(incidents.flatMap((incident) => incident.events.map((event) => [event.id, event] as const)));

  const lines: string[] = [];
  let gold = 0;
  let silver = 0;

  for (const suggestion of suggestions) {
    const incident = incidents.find((row) => row.id === suggestion.incidentId);
    if (!incident || suggestion.type === 'TRIAGE') continue; // triage refs are opaque per call
    // The timeline as it was when the draft was requested.
    const snapshot = { ...incident, events: incident.events.filter((event) => event.createdAt <= suggestion.createdAt) };
    const { context } = buildCopilotContext(snapshot, { now: suggestion.createdAt });
    const prompt = buildPrompt(TASK[suggestion.type]!, context);

    let target: unknown = suggestion.output;
    const applied = suggestion.appliedEventId ? events.get(suggestion.appliedEventId) : undefined;
    const edited = Boolean(applied && (applied.metadata as Record<string, unknown> | null)?.edited);
    if (edited && applied?.body) {
      if (suggestion.type === 'STATUS_UPDATE') target = { body: applied.body };
      else if (suggestion.type === 'SUMMARY') {
        const bullets = applied.body.split('\n').filter((line) => line.startsWith('•')).map((line) => line.replace(/^•\s*/, ''));
        if (bullets.length) target = { bullets };
      }
    }
    if (suggestion.type === 'POSTMORTEM' && target && typeof target === 'object') {
      const { markdown: _markdown, ...rest } = target as Record<string, unknown>;
      target = rest;
    }
    lines.push(JSON.stringify({ messages: [{ role: 'system', content: prompt.system }, { role: 'user', content: prompt.user }, { role: 'assistant', content: JSON.stringify(target) }], meta: { kind: 'gold', type: suggestion.type, edited } }));
    gold += 1;
  }

  for (const incident of incidents.filter((row) => row.status === 'RESOLVED')) {
    // Triage as it looked in the first 30 minutes, labelled with the severity the team ended on.
    const cutoff = new Date(incident.startedAt.getTime() + 30 * 60_000);
    const snapshot = { ...incident, events: incident.events.filter((event) => event.createdAt <= cutoff) };
    const { context } = buildCopilotContext(snapshot, { now: cutoff });
    const prompt = buildPrompt('triage', context);
    const target = { severity: incident.severity, assigneeRef: null, rationale: `The team rated this incident ${incident.severity} after it was resolved.` };
    lines.push(JSON.stringify({ messages: [{ role: 'system', content: prompt.system }, { role: 'user', content: prompt.user }, { role: 'assistant', content: JSON.stringify(target) }], meta: { kind: 'silver', type: 'TRIAGE' } }));
    silver += 1;
  }

  fs.writeFileSync(outFile, lines.join('\n') + (lines.length ? '\n' : ''));
  console.log(`[export-finetune] ${gold} approved drafts + ${silver} triage labels → ${path.relative(process.cwd(), outFile)}`);
  if (gold + silver < 200) console.log('[export-finetune] note: LoRA fine-tuning usually needs a few hundred examples; until then the ARCH model + retrieval does the heavy lifting.');
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

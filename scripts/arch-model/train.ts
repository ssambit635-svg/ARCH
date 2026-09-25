/**
 * ARCH Model — train every organization's model now (or one with --org <slug>).
 *
 *   npm run model:train
 *   npm run model:train -- --org acme
 *
 * The worker does this automatically when incidents are resolved (ARCH_MODEL_RETRAIN_MINUTES);
 * run it by hand after `npm run model:fetch-*` or after importing historical incidents.
 *
 * V3: training goes through the registry — each run becomes a version, is scored against the
 * active model, and is promoted only if it beats it. The CLI reports whether the new version was
 * promoted or rejected (a rejected run stays in the registry and can be activated manually).
 */
import 'dotenv/config';
import { db } from '../../src/lib/db';
import { trainOrganizationModel, loadPublicDocs, loadCodeDocs, loadReviewDocs } from '../../src/server/services/archModel.service';

function pct(value: number | null): string {
  return value === null ? 'n/a' : `${Math.round(value * 100)}%`;
}

async function main() {
  const index = process.argv.indexOf('--org');
  const slug = index >= 0 ? process.argv[index + 1] : undefined;
  const organizations = await db.organization.findMany({ where: slug ? { slug } : {}, select: { id: true, slug: true, name: true }, orderBy: { createdAt: 'asc' } });
  if (organizations.length === 0) {
    console.log(slug ? `No organization with slug "${slug}".` : 'No organizations yet.');
    return;
  }
  console.log(
    `[model:train] corpora — public postmortems ${loadPublicDocs().length} · code fixes ${loadCodeDocs().length} · review comments ${loadReviewDocs().length}`,
  );
  for (const organization of organizations) {
    const result = await trainOrganizationModel(organization.id, { trigger: 'cli' });
    const m = result.metrics;
    console.log(
      `[model:train] ${organization.slug.padEnd(20)} v${result.version} ${result.promoted ? 'PROMOTED' : `REJECTED (serving v${result.activeVersion})`} · ` +
        `team incidents ${m.documents.team} · docs ${result.totalDocuments} · ` +
        `severity acc ${pct(m.severity.holdoutAccuracy)} (n=${m.severity.holdoutSize}, baseline ${pct(m.severity.baseline)}) · ` +
        `category acc ${pct(m.category.holdoutAccuracy)} (n=${m.category.holdoutSize}) · score ${result.score} · ${m.trainingMs} ms · ${result.reason}`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

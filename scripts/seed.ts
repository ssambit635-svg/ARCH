/**
 * Demo data for local development.
 *
 *   npm run db:seed
 *
 * Idempotent: if the `acme` organization exists, seeding is skipped. The data is chosen to make
 * every screen interesting on first load — an open critical incident, a resolved one, a
 * published status page with a live incident, a webhook endpoint, and a second organization that
 * must stay invisible (cross-tenant isolation).
 *
 * Credentials created here are printed at the end. Never run this against production.
 */
import 'dotenv/config';
import { hash } from 'bcryptjs';
import { db } from '../src/lib/db';
import { createOrganization, inviteMember } from '../src/server/services/organization.service';
import { createProject, createService } from '../src/server/services/project.service';
import { createIncident, updateIncident } from '../src/server/services/incident.service';
import { createStatusPage, setStatusPagePublished, updateStatusPage } from '../src/server/services/statusPage.service';
import { createEndpoint } from '../src/server/services/webhook.service';
import { writeAudit } from '../src/lib/audit';
import type { MembershipRole } from '../src/generated/prisma/client';

const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? 'arch-incident-2024';

const people: { email: string; name: string; role: MembershipRole }[] = [
  { email: 'owner@arch.dev', name: 'Ada Okafor', role: 'OWNER' },
  { email: 'admin@arch.dev', name: 'Ben Lindqvist', role: 'ADMIN' },
  { email: 'responder@arch.dev', name: 'Chen Wu', role: 'RESPONDER' },
  { email: 'viewer@arch.dev', name: 'Dara Silva', role: 'VIEWER' },
];

async function ensureUser(email: string, name: string, passwordHash: string) {
  return db.user.upsert({
    where: { email },
    update: {},
    create: { email, name, passwordHash },
  });
}

async function main() {
  const existing = await db.organization.findUnique({ where: { slug: 'acme' } });
  if (existing) {
    console.log('[seed] acme organization already exists — nothing to do');
    console.log(`[seed] sign in with owner@arch.dev / ${DEMO_PASSWORD}`);
    return;
  }

  const passwordHash = await hash(DEMO_PASSWORD, 10);
  const users = await Promise.all(people.map((person) => ensureUser(person.email, person.name, passwordHash)));
  const [owner, admin, responder, viewer] = users;
  if (!owner || !admin || !responder || !viewer) throw new Error('seed: could not create users');

  // ---------- Organization A (the demo tenant) ----------
  const acme = await createOrganization({ userId: owner.id, name: 'Acme Inc' });

  for (const [index, person] of people.entries()) {
    const user = users[index]!;
    if (person.role === 'OWNER') continue;
    await db.membership.create({ data: { organizationId: acme.id, userId: user.id, role: person.role } });
    await writeAudit({
      organizationId: acme.id,
      actorId: owner.id,
      action: 'member.join',
      entityType: 'membership',
      entityId: user.id,
      metadata: { role: person.role, via: 'seed' },
    });
  }

  const payments = await createProject({
    organizationId: acme.id,
    userId: owner.id,
    name: 'Payments platform',
    description: 'Checkout, billing and the payment API.',
  });
  const portal = await createProject({
    organizationId: acme.id,
    userId: owner.id,
    name: 'Customer portal',
    description: 'The web app customers log into.',
  });

  const apiGateway = await createService({
    organizationId: acme.id,
    userId: owner.id,
    projectId: payments.id,
    name: 'API gateway',
    description: 'Public REST + GraphQL entrypoint.',
  });
  const checkout = await createService({
    organizationId: acme.id,
    userId: owner.id,
    projectId: payments.id,
    name: 'Checkout',
    description: 'Payment intent creation and capture.',
  });
  const webApp = await createService({
    organizationId: acme.id,
    userId: owner.id,
    projectId: portal.id,
    name: 'Web app',
    description: 'React front-end served from the edge.',
  });

  // ---------- Incidents ----------
  const critical = await createIncident({
    organizationId: acme.id,
    userId: responder.id,
    source: 'DASHBOARD',
    input: {
      title: 'Checkout latency spike in eu-west-1',
      description:
        'p99 latency on payment intent creation jumped from 380ms to 4.2s at 09:12 UTC. Approximately 6% of checkouts are timing out.',
      severity: 'CRITICAL',
      projectId: payments.id,
      serviceId: checkout.id,
      assignedToId: responder.id,
    },
  });

  await updateIncident({
    organizationId: acme.id,
    userId: admin.id,
    incidentId: critical!.id,
    input: {
      status: 'IDENTIFIED',
      message: 'Root cause is a saturated connection pool after the 09:10 deploy of the retry logic.',
    },
  });

  await updateIncident({
    organizationId: acme.id,
    userId: responder.id,
    incidentId: critical!.id,
    input: {
      status: 'MONITORING',
      message: 'Pool size raised and retries bounded; latency is back under 500ms. Watching for 30 minutes.',
    },
  });

  await createIncident({
    organizationId: acme.id,
    userId: owner.id,
    source: 'DASHBOARD',
    input: {
      title: 'Elevated 5xx on the API gateway',
      description: 'Investigated a burst of 502s from one upstream node; it has been drained.',
      severity: 'MEDIUM',
      projectId: payments.id,
      serviceId: apiGateway.id,
      assignedToId: admin.id,
    },
  });

  const resolved = await createIncident({
    organizationId: acme.id,
    userId: admin.id,
    source: 'DASHBOARD',
    input: {
      title: 'Login page slow for EU customers',
      description: 'CDN cache miss rate spiked after a configuration change.',
      severity: 'HIGH',
      projectId: portal.id,
      serviceId: webApp.id,
    },
  });

  await updateIncident({
    organizationId: acme.id,
    userId: admin.id,
    incidentId: resolved!.id,
    input: { status: 'RESOLVED', message: 'Cache rules corrected; p95 back to 180ms.' },
  });

  // ---------- Status page ----------
  const statusPage = await createStatusPage({
    organizationId: acme.id,
    userId: owner.id,
    name: 'Acme status',
    slug: 'demo',
    description: 'Current status of Acme customer-facing services.',
    serviceIds: [apiGateway.id, checkout.id, webApp.id],
  });

  await updateStatusPage({
    organizationId: acme.id,
    userId: owner.id,
    statusPageId: statusPage.id,
    serviceIds: [apiGateway.id, checkout.id, webApp.id],
  });

  await setStatusPagePublished({ organizationId: acme.id, userId: owner.id, statusPageId: statusPage.id, isPublished: true });

  // ---------- Webhook endpoint ----------
  const webhook = await createEndpoint({
    organizationId: acme.id,
    userId: owner.id,
    provider: 'grafana',
    projectId: payments.id,
    serviceId: checkout.id,
    description: 'Grafana alerting → payments platform',
  });

  // ---------- A pending invitation, to make the settings page real ----------
  const invitation = await inviteMember({ organizationId: acme.id, actorId: owner.id, email: 'newhire@arch.dev', role: 'RESPONDER' });

  // ---------- Organization B (isolation demo — belongs to nobody in org A) ----------
  const globexOwner = await ensureUser('globex@arch.dev', 'Globex Owner', passwordHash);
  const globex = await createOrganization({ userId: globexOwner.id, name: 'Globex' });
  const globexProject = await createProject({ organizationId: globex.id, userId: globexOwner.id, name: 'Globex internal tools' });
  await createService({
    organizationId: globex.id,
    userId: globexOwner.id,
    projectId: globexProject.id,
    name: 'Internal wiki',
  });

  console.log('\n[seed] done — demo data ready\n');
  console.table([
    { organization: 'Acme Inc (slug: acme)', role: 'OWNER', email: 'owner@arch.dev', password: DEMO_PASSWORD },
    { organization: 'Acme Inc', role: 'ADMIN', email: 'admin@arch.dev', password: DEMO_PASSWORD },
    { organization: 'Acme Inc', role: 'RESPONDER', email: 'responder@arch.dev', password: DEMO_PASSWORD },
    { organization: 'Acme Inc', role: 'VIEWER', email: 'viewer@arch.dev', password: DEMO_PASSWORD },
    { organization: 'Globex (separate tenant)', role: 'OWNER', email: 'globex@arch.dev', password: DEMO_PASSWORD },
  ]);
  console.log(`[seed] public status page: /status/demo`);
  console.log(`[seed] webhook endpoint URL: /api/webhooks/grafana?endpoint=${webhook.endpoint.externalId}`);
  console.log(`[seed] webhook signing secret (shown once): ${webhook.secret}`);
  console.log(`[seed] pending invitation link: ${invitation.inviteUrl}`);
  console.log('');
}

main()
  .catch((error) => {
    console.error('[seed] failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect().catch(() => undefined);
  });

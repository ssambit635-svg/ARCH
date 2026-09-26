import { spawnSync } from 'node:child_process';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, createTenant, resetDatabase } from './helpers/db';
import { createEndpoint } from '@/server/services/webhook.service';
import { decryptSecret, encryptSecret } from '@/lib/crypto';

describe('webhook envelope rekey (legacy upgrade)', () => {
  beforeEach(resetDatabase);

  it('re-encrypts v1 endpoints under the separate webhook key without changing sender secrets', async () => {
    const tenant = await createTenant('Rekey');
    const { endpoint, secret } = await createEndpoint({
      organizationId: tenant.organization.id,
      userId: tenant.owner.id,
      provider: 'generic',
      projectId: tenant.project.id,
    });
    await db.webhookEndpoint.update({
      where: { id: endpoint.id },
      data: { secretEncrypted: encryptSecret(secret, process.env.AUTH_SECRET!, 'v1') },
    });

    const dryRun = spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'scripts/rekey-webhooks.ts'], {
      cwd: process.cwd(), encoding: 'utf8', env: process.env,
    });
    expect(dryRun.status).toBe(0);
    expect(dryRun.stdout).toMatch(/1 legacy endpoint/);
    expect((await db.webhookEndpoint.findUniqueOrThrow({ where: { id: endpoint.id } })).secretEncrypted).toMatch(/^v1\./);

    const apply = spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'scripts/rekey-webhooks.ts', '--apply'], {
      cwd: process.cwd(), encoding: 'utf8', env: process.env,
    });
    expect(apply.status).toBe(0);
    expect(apply.stdout).toMatch(/migrated to v2/);
    expect(apply.stdout).not.toContain(secret);
    const migrated = await db.webhookEndpoint.findUniqueOrThrow({ where: { id: endpoint.id } });
    expect(migrated.secretEncrypted).toMatch(/^v2\./);
    expect(decryptSecret(migrated.secretEncrypted, process.env.AUTH_SECRET_WEBHOOK!)).toBe(secret);
  });
});

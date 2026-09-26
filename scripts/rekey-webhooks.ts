/**
 * Move legacy v1 webhook endpoint secret envelopes (keyed by AUTH_SECRET) to v2
 * (AUTH_SECRET_WEBHOOK) without changing any sender-facing HMAC secrets.
 *
 * Back up the database first. Keep the OLD AUTH_SECRET until this succeeds, then rotate
 * AUTH_SECRET for JWTs. --apply is required for writes; without it this is a count-only preview.
 * Never log plaintext secrets or the encryption keys.
 */
import 'dotenv/config';
import { db } from '../src/lib/db';
import { env } from '../src/lib/env';
import { decryptSecret, encryptSecret } from '../src/lib/crypto';

async function main() {
  const legacy = await db.webhookEndpoint.findMany({
    where: { secretEncrypted: { startsWith: 'v1.' } },
    select: { id: true, secretEncrypted: true },
  });
  console.log(`[rekey] ${legacy.length} legacy endpoint(s) need re-encryption`);
  if (!process.argv.includes('--apply') || legacy.length === 0) {
    if (legacy.length) console.log('[rekey] dry run — back up the DB and run with --apply before rotating AUTH_SECRET');
    return;
  }
  if (env.NODE_ENV === 'production' && process.env.CONFIRM_WEBHOOK_REKEY !== 'YES') {
    throw new Error('Production requires CONFIRM_WEBHOOK_REKEY=YES and a recent DB backup.');
  }

  // Validate ALL envelopes before writing ANYTHING. A wrong/rotated legacy key must not cause a
  // partial migration. Database rows are updated in a transaction with optimistic checks.
  const updates = legacy.map((row) => {
    let secret: string;
    try {
      secret = decryptSecret(row.secretEncrypted, env.AUTH_SECRET);
    } catch {
      throw new Error('Cannot decrypt a legacy endpoint; keep the old AUTH_SECRET and reissue any endpoint whose key is lost. No changes made.');
    }
    return { ...row, reencrypted: encryptSecret(secret, env.AUTH_SECRET_WEBHOOK, 'v2') };
  });
  await db.$transaction(async (tx) => {
    for (const row of updates) {
      const result = await tx.webhookEndpoint.updateMany({
        where: { id: row.id, secretEncrypted: row.secretEncrypted },
        data: { secretEncrypted: row.reencrypted },
      });
      if (result.count !== 1) throw new Error('A webhook endpoint changed while rekeying. No changes committed.');
    }
  }, { timeout: 120_000 });
  console.log(`[rekey] ${updates.length} endpoint(s) migrated to v2 — test a signed webhook before rotating AUTH_SECRET`);
}

main().catch(() => {
  console.error('[rekey] failed; check old/new keys and database access. No keys or plaintext secrets are logged.');
  process.exitCode = 1;
}).finally(async () => {
  await db.$disconnect().catch(() => undefined);
});

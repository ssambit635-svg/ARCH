import { beforeEach, describe, expect, it } from 'vitest';
import { authenticateToken } from '@/server/services/api-token.service';
import { newToken, tokenHash } from '@/lib/token-crypto';
import { resetRateLimits } from '@/lib/rate-limit';
import { createTenant, addMember, createTestUser, db, resetDatabase } from './helpers/db';

 describe('bearer token authorization', () => {
  beforeEach(async () => { await resetDatabase(); resetRateLimits(); });

  it('keeps plaintext out of the DB and limits scope and tenant', async () => {
    const acme = await createTenant('Token Acme');
    const other = await createTenant('Token Other');
    const raw = newToken();
    const saved = await db.apiToken.create({ data: { name: 'deploy', organizationId: acme.organization.id, createdById: acme.owner.id, prefix: raw.slice(0, 13), hash: tokenHash(raw), scopes: ['READ'] } });
    expect(JSON.stringify(saved)).not.toContain(raw);
    const context = await authenticateToken(raw, null, 'incident.read');
    expect(context.organization.id).toBe(acme.organization.id);
    expect((await db.apiToken.findUniqueOrThrow({ where: { id: saved.id } })).lastUsedAt).not.toBeNull();
    await expect(authenticateToken(raw, null, 'incident.write')).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(authenticateToken(raw, other.organization.id, 'incident.read')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(authenticateToken('arch_invalid', null, 'incident.read')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await db.apiToken.update({ where: { id: saved.id }, data: { revokedAt: new Date() } });
    await expect(authenticateToken(raw, null, 'incident.read')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('checks the creator’s live role and membership on every call', async () => {
    const acme = await createTenant('Token Roles');
    const viewer = await createTestUser('viewer@token.test');
    const membership = await addMember(acme.organization.id, viewer.id, 'VIEWER');
    const raw = newToken();
    await db.apiToken.create({ data: { name: 'writer', organizationId: acme.organization.id, createdById: viewer.id, prefix: raw.slice(0, 13), hash: tokenHash(raw), scopes: ['READ_WRITE'] } });
    await expect(authenticateToken(raw, null, 'incident.write')).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await db.membership.update({ where: { id: membership.id }, data: { role: 'RESPONDER' } });
    expect((await authenticateToken(raw, null, 'incident.write')).user.id).toBe(viewer.id);
    await db.membership.delete({ where: { id: membership.id } });
    await expect(authenticateToken(raw, null, 'incident.read')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

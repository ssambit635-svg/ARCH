import type { DbClient } from './db';
import { db } from './db';

/**
 * Audit log writer.
 *
 * Every mutating service calls this inside the same transaction as the change it records, so a
 * rollback rolls the audit row back too and the log can never disagree with the data.
 * `actorId` is null for machine actions (webhook ingestion, outbox worker) — those carry an
 * `actorLabel` such as "webhook:grafana" instead.
 */

export type AuditInput = {
  organizationId: string;
  action: string;
  entityType: string;
  entityId: string;
  actorId?: string | null;
  actorLabel?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function writeAudit(input: AuditInput, client: DbClient = db): Promise<void> {
  await client.auditLog.create({
    data: {
      organizationId: input.organizationId,
      actorId: input.actorId ?? null,
      actorLabel: input.actorLabel ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: (input.metadata ?? undefined) as never,
    },
  });
}

import 'dotenv/config';
import { dispatchPendingNotifications } from '@/server/services/notification.service';
import { processTrainingJobs, retrainStaleModels } from '@/server/services/archModel.service';
import { getEmailAdapter } from '@/server/adapters/email';
import { db } from '@/lib/db';
import { env } from '@/lib/env';

/**
 * Notification worker.
 *
 * ARCH writes notifications into a Postgres-backed outbox inside the same transaction as the
 * incident change (no Redis yet). This process drains that outbox:
 *
 *   npm run worker              # poll every 5s
 *   npm run worker -- --once    # single pass (cron / one-shot deploy step)
 *   POLL_INTERVAL_MS=1000 npm run worker
 *
 * Concurrent dispatchers skip locked rows. Resend receives a stable per-notification
 * idempotency key to reduce duplicates after a send succeeds but the DB commit fails.
 * Delivery is at-least-once, not an exactly-once guarantee.
 *
 * V3: it also runs the ARCH model training pipeline. Retraining is a background job, never part
 * of a web request: the dashboard/API enqueue rows in `arch_model_jobs`, this worker claims them,
 * trains a candidate, evaluates it against the active model and promotes it only if it wins
 * (rollback stays available through the registry). Every ARCH_MODEL_RETRAIN_MINUTES (default 60,
 * 0 = off) it additionally enqueues jobs for organizations that resolved incidents since their
 * last training. Training is CPU-only and takes well under a second per organization.
 */

function positiveInteger(name: string, fallback: number, max: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < 1 || value > max) {
    throw new Error(`${name} must be an integer between 1 and ${max}`);
  }
  return value;
}
const POLL_INTERVAL_MS = positiveInteger('POLL_INTERVAL_MS', 5000, 300_000);
const BATCH_SIZE = positiveInteger('WORKER_BATCH_SIZE', 20, 100);
const once = process.argv.includes('--once');

const RETRAIN_INTERVAL_MS = env.ARCH_MODEL_RETRAIN_MINUTES * 60_000;
let stopping = false;
let nextRetrainAt = Date.now() + 30_000; // let the process settle first

function log(message: string) {
  console.log(`[worker ${new Date().toISOString()}] ${message}`);
}

async function tick(): Promise<number> {
  const result = await dispatchPendingNotifications({ limit: BATCH_SIZE, shouldStop: () => stopping });
  if (result.processed > 0) {
    log(`processed=${result.processed} sent=${result.sent} retried=${result.retried} failed=${result.failed}`);
  }
  return result.processed;
}

async function maybeRetrainModels(): Promise<void> {
  if (!RETRAIN_INTERVAL_MS || Date.now() < nextRetrainAt) return;
  nextRetrainAt = Date.now() + RETRAIN_INTERVAL_MS;
  const result = await retrainStaleModels();
  if (result.enqueued.length || result.skipped.length) {
    log(`arch-model retrain enqueued=${result.enqueued.length} skipped=${result.skipped.length}`);
  }
}

/** Drain the training queue every tick — cheap no-op when nothing is pending. */
async function processModelJobs(): Promise<void> {
  const result = await processTrainingJobs();
  if (result.processed > 0) {
    log(`arch-model jobs processed=${result.processed} promoted=${result.promoted} rejected=${result.rejected} failed=${result.failed}`);
  }
}

async function main() {
  const adapter = getEmailAdapter();
  log(
    `starting · adapter=${adapter.name} · batch=${BATCH_SIZE} · interval=${once ? 'once' : `${POLL_INTERVAL_MS}ms`} · ` +
      `arch-model retrain=${RETRAIN_INTERVAL_MS ? `${env.ARCH_MODEL_RETRAIN_MINUTES}min` : 'off'} · env=${env.NODE_ENV}`,
  );

  let wake: (() => void) | undefined;
  const shutdown = (signal: string) => {
    if (stopping) return;
    stopping = true;
    log(`${signal} received — finishing the current pass before disconnecting`);
    wake?.();
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));

  if (once) {
    const processed = await tick();
    await processModelJobs();
    log(`single pass complete (${processed} notification${processed === 1 ? '' : 's'})`);
    await db.$disconnect().catch(() => undefined);
    return;
  }

  while (!stopping) {
    try {
      await tick();
    } catch (error) {
      // The worker must survive a database blip: log and try again on the next tick.
      console.error(`[worker] tick failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (stopping) break;
    try {
      await maybeRetrainModels();
      await processModelJobs();
    } catch (error) {
      console.error(`[worker] arch-model training failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (!stopping) await new Promise<void>((resolve) => {
      const timer = setTimeout(() => { wake = undefined; resolve(); }, POLL_INTERVAL_MS);
      wake = () => { clearTimeout(timer); wake = undefined; resolve(); };
    });
  }
  await db.$disconnect();
  log('stopped');
}

main().catch(async (error) => {
  console.error('[worker] fatal', error);
  await db.$disconnect().catch(() => undefined);
  process.exit(1);
});

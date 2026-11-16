import type { DbClient } from '@/lib/db';
import { env } from '@/lib/env';
import { getEmailAdapter, isRetryableEmailError, type EmailAdapter } from '../adapters/email';
import { welcomeEmailRepository } from '../repositories/welcome-email.repository';
import { renderWelcomeEmail } from '../email/welcome';
import type { DispatchResult } from './notification.service';

/** Called only on account creation, within its database transaction. No network at signup. */
export async function enqueueWelcomeEmail(user: { id: string; email: string; name?: string | null }, client: DbClient) {
  if (!env.FEATURE_WELCOME_EMAIL) return;
  const message = renderWelcomeEmail({ name: user.name, appUrl: env.APP_URL });
  await welcomeEmailRepository.enqueueOnce({ userId: user.id, toEmail: user.email, ...message }, client);
}

export async function dispatchWelcomeEmails(options: {
  adapter?: EmailAdapter; limit?: number; shouldStop?: () => boolean;
} = {}): Promise<DispatchResult> {
  const result: DispatchResult = { processed: 0, sent: 0, retried: 0, failed: 0 };
  // Also acts as a delivery pause switch. Pending rows are retained, not discarded.
  if (!env.FEATURE_WELCOME_EMAIL) return result;
  const adapter = options.adapter ?? getEmailAdapter();
  const pending = await welcomeEmailRepository.listDue(options.limit ?? 20);
  for (const candidate of pending) {
    if (options.shouldStop?.()) break;
    const outcome = await welcomeEmailRepository.withDueLock(candidate.userId, async (client) => {
      const message = await welcomeEmailRepository.find(candidate.userId, client);
      try {
        await adapter.send({
          to: message.toEmail, subject: message.subject, body: message.body, html: message.html,
          idempotencyKey: `arch-welcome/${message.userId}`,
        });
      } catch (error) {
        const attempts = message.attempts + 1;
        const retryable = isRetryableEmailError(error) && attempts < 3;
        await welcomeEmailRepository.markFailed(message.userId, { retryable, attempts }, client);
        console.warn(`[welcome-email] delivery failed (${adapter.name}) attempt=${attempts} retry=${retryable}`);
        return retryable ? 'retried' as const : 'failed' as const;
      }
      // A failed DB commit must roll back and reuse the same provider key later.
      await welcomeEmailRepository.markSent(message.userId, client);
      return 'sent' as const;
    });
    if (outcome) { result.processed += 1; result[outcome] += 1; }
  }
  return result;
}

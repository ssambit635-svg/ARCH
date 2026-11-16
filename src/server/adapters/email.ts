import { env } from '@/lib/env';
import { validateEmailConfig } from '@/lib/email-config';

/**
 * Email adapter.
 *
 * In development (EMAIL_PROVIDER empty) messages are written to the process log — the notification
 * lifecycle, retries and audit trail are exercised exactly as in production, nothing leaves the
 * machine. Set EMAIL_PROVIDER=resend and EMAIL_API_KEY to send for real.
 */
export type EmailMessage = { to: string; subject: string; body: string; html?: string; idempotencyKey?: string };

export interface EmailAdapter {
  readonly name: string;
  send(message: EmailMessage): Promise<void>;
}

export class ConsoleEmailAdapter implements EmailAdapter {
  readonly name = 'console';

  async send(message: EmailMessage): Promise<void> {
    const lines = [
      '',
      '┌── email (console adapter) ─────────────────────────────────',
      `│ to:      ${message.to}`,
      `│ subject: ${message.subject}`,
      '├────────────────────────────────────────────────────────────',
      ...message.body.split('\n').map((line) => `│ ${line}`),
      '└────────────────────────────────────────────────────────────',
    ];
    console.log(lines.join('\n'));
  }
}

export class ResendEmailAdapter implements EmailAdapter {
  readonly name = 'resend';

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: EmailMessage): Promise<void> {
    let response: Response;
    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...(message.idempotencyKey ? { 'Idempotency-Key': message.idempotencyKey } : {}),
        },
        body: JSON.stringify({ from: this.from, to: [message.to], subject: message.subject, text: message.body, ...(message.html ? { html: message.html } : {}) }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      const aborted = error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
      const wrapped = new Error(aborted ? 'Resend request timed out after 15s' : 'Resend request failed before a response');
      (wrapped as Error & { retryable?: boolean }).retryable = true;
      throw wrapped;
    }

    // We only need the HTTP status; discard bodies without retaining provider/customer data.
    await response.body?.cancel().catch(() => undefined);
    if (!response.ok) {
      // 429/5xx are worth retrying; 4xx other than 429 are permanent.
      const retryable = response.status === 429 || response.status >= 500;
      const error = new Error(`Resend delivery failed (HTTP ${response.status})`);
      (error as Error & { retryable?: boolean }).retryable = retryable;
      throw error;
    }
  }
}

export function getEmailAdapter(): EmailAdapter {
  validateEmailConfig(env);
  const provider = env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (!provider || provider === 'console') {
    if (env.NODE_ENV === 'production') {
      throw new Error('Production email delivery is disabled. Configure EMAIL_PROVIDER=resend, EMAIL_API_KEY and EMAIL_FROM before starting the notification worker.');
    }
    return new ConsoleEmailAdapter();
  }
  return new ResendEmailAdapter(env.EMAIL_API_KEY!, env.EMAIL_FROM);
}

export function isRetryableEmailError(error: unknown): boolean {
  return (error as { retryable?: boolean } | null)?.retryable ?? true;
}

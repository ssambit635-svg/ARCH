import { env } from '@/lib/env';

/**
 * Email adapter.
 *
 * In development (EMAIL_PROVIDER empty) messages are written to the process log — the notification
 * lifecycle, retries and audit trail are exercised exactly as in production, nothing leaves the
 * machine. Set EMAIL_PROVIDER=resend and EMAIL_API_KEY to send for real.
 */
export type EmailMessage = { to: string; subject: string; body: string };

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
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: this.from, to: [message.to], subject: message.subject, text: message.body }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      // 429/5xx are worth retrying; 4xx other than 429 are permanent.
      const retryable = response.status === 429 || response.status >= 500;
      const error = new Error(`Resend responded ${response.status}: ${detail.slice(0, 300)}`);
      (error as Error & { retryable?: boolean }).retryable = retryable;
      throw error;
    }
  }
}

export function getEmailAdapter(): EmailAdapter {
  if (env.EMAIL_PROVIDER === 'resend' && env.EMAIL_API_KEY) {
    return new ResendEmailAdapter(env.EMAIL_API_KEY, env.EMAIL_FROM);
  }
  return new ConsoleEmailAdapter();
}

export function isRetryableEmailError(error: unknown): boolean {
  return (error as { retryable?: boolean } | null)?.retryable ?? true;
}

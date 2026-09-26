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
    let response: Response;
    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: this.from, to: [message.to], subject: message.subject, text: message.body }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      const aborted = error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
      const wrapped = new Error(aborted ? 'Resend request timed out after 15s' : 'Resend request failed before a response');
      (wrapped as Error & { retryable?: boolean }).retryable = true;
      throw wrapped;
    }

    if (!response.ok) {
      const detail = redactProviderError(await response.text().catch(() => ''));
      // 429/5xx are worth retrying; 4xx other than 429 are permanent.
      const retryable = response.status === 429 || response.status >= 500;
      const error = new Error(`Resend responded ${response.status}: ${detail.slice(0, 300)}`);
      (error as Error & { retryable?: boolean }).retryable = retryable;
      throw error;
    }
  }
}

function redactProviderError(text: string): string {
  return text.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]').replace(/re_[A-Za-z0-9]{8,}/g, '[redacted-key]');
}

export function getEmailAdapter(): EmailAdapter {
  const provider = env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (!provider || provider === 'console') return new ConsoleEmailAdapter();
  if (provider === 'resend') {
    if (!env.EMAIL_API_KEY?.trim()) {
      console.warn('[email] EMAIL_PROVIDER=resend but EMAIL_API_KEY is empty — falling back to the console adapter.');
      return new ConsoleEmailAdapter();
    }
    return new ResendEmailAdapter(env.EMAIL_API_KEY, env.EMAIL_FROM);
  }
  console.warn(`[email] Unknown EMAIL_PROVIDER="${env.EMAIL_PROVIDER}" — falling back to the console adapter.`);
  return new ConsoleEmailAdapter();
}

export function isRetryableEmailError(error: unknown): boolean {
  return (error as { retryable?: boolean } | null)?.retryable ?? true;
}

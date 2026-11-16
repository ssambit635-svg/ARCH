import 'dotenv/config';
import { getEmailAdapter } from '../src/server/adapters/email';

/** No database access and no send unless --to is explicitly provided. */
async function main() {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--to' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args[1] ?? ''))) {
    throw new Error('Usage: npm run email:check [-- --to you@example.com]');
  }
  const adapter = getEmailAdapter();
  if (adapter.name !== 'resend') throw new Error('Real email is not configured. Set EMAIL_PROVIDER=resend, EMAIL_API_KEY and EMAIL_FROM.');
  console.log('[email] Resend configuration valid. Domain verification and API permissions still need a live test.');
  const to = args[1];
  if (!to) {
    console.log('[email] No message sent. Use -- --to you@example.com to test delivery.');
    return;
  }
  await adapter.send({ to, subject: 'ARCH email delivery test', body: 'ARCH can reach your email provider. If you received this, test delivery is working. This is not an incident notification.' });
  console.log('[email] Provider accepted the test message. Check the inbox/spam folder and provider delivery logs.');
}
main().catch((error: unknown) => {
  console.error(`[email] ${error instanceof Error ? error.message : 'Check failed'}`);
  process.exit(1);
});

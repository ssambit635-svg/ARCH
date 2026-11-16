/** Pure configuration validation, shared by boot and the delivery adapter. Never echo secrets. */
export function validateEmailConfig(config: {
  EMAIL_PROVIDER?: string;
  EMAIL_API_KEY?: string;
  EMAIL_FROM: string;
}): void {
  const provider = config.EMAIL_PROVIDER?.trim().toLowerCase();
  if (!provider || provider === 'console') return;
  if (provider !== 'resend') throw new Error('Unsupported EMAIL_PROVIDER. Use resend or leave it blank to disable delivery.');
  if (!config.EMAIL_API_KEY?.trim()) throw new Error('EMAIL_PROVIDER=resend requires EMAIL_API_KEY.');
  const from = config.EMAIL_FROM.trim();
  const address = /<([^<>]+)>$/.exec(from)?.[1] ?? from;
  if (/[\r\n]/.test(from) || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(address)) {
    throw new Error('EMAIL_FROM must contain a valid sender address on a verified domain.');
  }
}

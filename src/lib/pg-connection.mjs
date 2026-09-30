/**
 * pg-connection-string 2.x treats prefer/require/verify-ca as verify-full, but emits a
 * SECURITY WARNING for each process using those URL values. Spell out the *same secure
 * behavior* before either pg or PrismaPg parses the URL. Do not turn off certificate or
 * hostname verification to silence a warning.
 *
 * Keep this as plain ESM: Next/Prisma config (TypeScript) and the Node migration script
 * must use exactly the same normalization without needing a TS loader at deploy time.
 */
export function verifiedPgUrl(connectionString) {
  if (!connectionString.includes('sslmode=')) return connectionString;
  const url = new URL(connectionString);
  // pg-connection-string uses the last value when a query parameter is repeated.
  const mode = url.searchParams.getAll('sslmode').at(-1);
  if (['prefer', 'require', 'verify-ca'].includes(mode)) {
    url.searchParams.set('sslmode', 'verify-full');
    return url.toString();
  }
  return connectionString;
}

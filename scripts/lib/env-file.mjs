import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * The environment file a developer needs before anything else can run.
 *
 * `.env` is git-ignored on purpose — it holds secrets — which also means a fresh clone, a wiped
 * sandbox or a deleted file leaves the developer with an app that cannot start and a sign-in
 * screen without the provider buttons they configured an hour ago.
 *
 * So: when the file is missing, it is created from `.env.example` with freshly generated
 * secrets. When it exists, it is never touched — a developer's configured provider
 * credentials are worth more than a tidy file.
 */

/** A secret nobody can guess and nobody has to write down. */
function freshSecret() {
  return crypto.randomBytes(32).toString('base64');
}

/** The lines a developer has to fill in, with the line number to fill them on. */
function providerLines(contents) {
  const lines = contents.split('\n');
  const wanted = ['AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET', 'AUTH_GITHUB_ID', 'AUTH_GITHUB_SECRET'];
  return lines
    .map((line, index) => ({ line, number: index + 1 }))
    .filter(({ line }) => wanted.some((name) => line.startsWith(`${name}=`)))
    .map(({ line, number }) => `${number}: ${line.trim()}`);
}

/**
 * Make sure an environment file exists.
 *
 * Returns what happened so the caller can tell the developer what to do next.
 */
export function ensureEnvFile(root, options = {}) {
  const envName = options.envName ?? '.env';
  const envPath = path.join(root, envName);
  const templatePath = path.join(root, options.template ?? '.env.example');

  if (fs.existsSync(envPath)) {
    return {
      created: false,
      path: envPath,
      providerLines: providerLines(fs.readFileSync(envPath, 'utf8')),
    };
  }

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Cannot create ${envName}: ${templatePath} is missing.`);
  }

  const template = fs.readFileSync(templatePath, 'utf8');
  const contents = template
    .replace(/^AUTH_SECRET=.*$/m, `AUTH_SECRET="${freshSecret()}"`)
    .replace(/^AUTH_SECRET_WEBHOOK=.*$/m, `AUTH_SECRET_WEBHOOK="${freshSecret()}"`)
    // A placeholder PAT is worse than none: it looks configured and fails later.
    .replace(/^GITHUB_TOKEN=.*$/m, 'GITHUB_TOKEN=""');

  fs.writeFileSync(envPath, contents, { mode: 0o600 });

  return { created: true, path: envPath, providerLines: providerLines(contents) };
}

/**
 * Set one variable in an environment file, leaving everything else exactly as it was.
 *
 * The value is quoted, so a secret with a `#` or a space cannot break the file.
 */
export function setEnvValue(envPath, key, value) {
  const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const line = `${key}="${String(value ?? '')}"`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  const contents = pattern.test(existing)
    ? existing.replace(pattern, line)
    : `${existing.replace(/\n*$/, '\n')}${line}\n`;
  fs.writeFileSync(envPath, contents, { mode: 0o600 });
  return line;
}

/**
 * Which provider sign-ins this instance can actually use.
 *
 * Printed at startup, because "the button is there but the flow does not start" is a much easier
 * problem to solve when the server says which credentials it is missing.
 */
/**
 * @param {Record<string, string | undefined>} [env]
 */
export function providerStatus(env = process.env) {
  const values = env;
  const providers = [
    { name: 'Google', id: 'AUTH_GOOGLE_ID', secret: 'AUTH_GOOGLE_SECRET' },
    { name: 'GitHub', id: 'AUTH_GITHUB_ID', secret: 'AUTH_GITHUB_SECRET' },
  ];
  return providers.map(({ name, id: idVariable, secret: secretVariable }) => {
    if (!env[idVariable]) return `${name}: not configured — set ${idVariable}`;
    if (!env[secretVariable]) {
      return `${name}: configured (public client — no ${secretVariable} needed)`;
    }
    return `${name}: configured`;
  });
}

/** What to print after the file was created: where to paste the provider credentials. */
export function explainEnvFile(result) {
  if (!result.created) return '';
  const lines = result.providerLines.length
    ? result.providerLines.map((line) => `    ${line}`).join('\n')
    : '    (none)';
  return [
    '',
    `[setup] created ${result.path} with fresh secrets (never committed — it is git-ignored).`,
    '[setup] to offer "Continue with Google" / "Continue with GitHub", paste your provider',
    '[setup] credentials into these lines and restart:',
    lines,
    '[setup] see docs/OAUTH-SETUP.md for how to create a client.',
    '',
  ].join('\n');
}

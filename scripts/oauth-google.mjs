#!/usr/bin/env node
/**
 * Set up Google sign-in for this instance, in one command.
 *
 *   npm run oauth:google -- --client-id="…apps.googleusercontent.com" --client-secret="…"
 *   npm run oauth:google -- --client-id="…apps.googleusercontent.com"        # public client
 *   npm run oauth:google -- --show                                          # what is missing
 *
 * It writes the credentials into the git-ignored `.env` (creating the file with fresh secrets
 * when it is missing) and prints the exact redirect URIs to register in the Google console —
 * including the public host this preview is reachable at, which is the part people forget.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureEnvFile, setEnvValue } from './lib/env-file.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function argument(name) {
  const prefix = `--${name}=`;
  const found = process.argv.find((value) => value.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

const clientId = argument('client-id');
const clientSecret = argument('client-secret');
const publicUrl = argument('url');
const showOnly = process.argv.includes('--show');

const envFile = ensureEnvFile(root);

/** The hosts the provider has to send the person back to. */
function callbackUrls() {
  const urls = new Set(['http://localhost:3000/api/auth/callback/google']);
  if (publicUrl) urls.add(`${publicUrl.replace(/\/$/, '')}/api/auth/callback/google`);
  // Sandboxes expose the dev server through a public host; it changes when the sandbox is
  // recreated, so it is printed rather than assumed.
  const sandboxId = process.env.E2B_SANDBOX_ID;
  if (sandboxId) urls.add(`https://3000-${sandboxId}.e2b.app/api/auth/callback/google`);
  return [...urls];
}

if (!showOnly) {
  if (clientId) setEnvValue(envFile.path, 'AUTH_GOOGLE_ID', clientId);
  if (clientSecret) setEnvValue(envFile.path, 'AUTH_GOOGLE_SECRET', clientSecret);
  if (!clientId && !clientSecret) {
    console.error('[oauth:google] pass --client-id and (for a Web application client) --client-secret.');
    console.error('[oauth:google] run with --show to see what this instance is missing.');
    process.exit(1);
  }
  console.log(`[oauth:google] wrote the credentials to ${envFile.path} (git-ignored, never committed).`);
  console.log('[oauth:google] restart the app (npm run dev) for the change to take effect.');
}

console.log('\n[oauth:google] register these redirect URIs in the Google console:');
for (const url of callbackUrls()) console.log(`  ${url}`);

const contents = (await import('node:fs')).readFileSync(envFile.path, 'utf8');
const hasId = /^AUTH_GOOGLE_ID="(.+)"$/m.test(contents);
const hasSecret = /^AUTH_GOOGLE_SECRET="(.+)"$/m.test(contents);
console.log(
  `\n[oauth:google] this instance: ${hasId ? 'client id set' : 'NO client id'}${
    hasSecret ? ', client secret set' : ', no client secret (a Single page application client needs none)'
  }.`,
);
console.log('[oauth:google] see docs/OAUTH-SETUP.md for the consent screen and the test-user step.\n');

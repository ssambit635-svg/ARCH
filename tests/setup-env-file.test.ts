import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ensureEnvFile, explainEnvFile, providerStatus, setEnvValue } from '../scripts/lib/env-file.mjs';

/**
 * The environment file is git-ignored, so a fresh clone — or a wiped sandbox — has none. The
 * setup scripts create it with fresh secrets so the app can start, and they must never touch a
 * file that already exists: a configured provider credential is worth more than a tidy file.
 */

const created: string[] = [];

function workspace(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-env-'));
  created.push(dir);
  fs.writeFileSync(
    path.join(dir, '.env.example'),
    [
      'DATABASE_URL="postgresql://arch:arch@localhost:5432/arch"',
      'AUTH_SECRET="replace-with-openssl-rand-base64-32"',
      'AUTH_SECRET_WEBHOOK="replace-with-a-different-openssl-rand-base64-32"',
      'AUTH_GOOGLE_ID=""',
      'AUTH_GOOGLE_SECRET=""',
      'AUTH_GITHUB_ID=""',
      'AUTH_GITHUB_SECRET=""',
      'GITHUB_TOKEN="replace-with-a-github-pat"',
      '',
    ].join('\n'),
  );
  return dir;
}

afterEach(() => {
  for (const dir of created.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('the environment file', () => {
  it('is created with real secrets when it does not exist', () => {
    const dir = workspace();
    const result = ensureEnvFile(dir);

    expect(result.created).toBe(true);
    const contents = fs.readFileSync(path.join(dir, '.env'), 'utf8');
    expect(contents).toContain('DATABASE_URL="postgresql://arch:arch@localhost:5432/arch"');
    expect(contents).not.toContain('replace-with-openssl-rand-base64-32');
    expect(contents).not.toContain('replace-with-a-github-pat');
    expect(contents).toContain('GITHUB_TOKEN=""');
  });

  it('gives the two secrets different values', () => {
    const dir = workspace();
    ensureEnvFile(dir);
    const contents = fs.readFileSync(path.join(dir, '.env'), 'utf8');
    const secret = /AUTH_SECRET="([^"]+)"/.exec(contents)?.[1];
    const webhook = /AUTH_SECRET_WEBHOOK="([^"]+)"/.exec(contents)?.[1];
    expect(secret).toBeTruthy();
    expect(webhook).toBeTruthy();
    expect(secret).not.toBe(webhook);
    expect(secret!.length).toBeGreaterThanOrEqual(32);
  });

  it('leaves provider credentials empty so the sign-in screen never shows a dead button', () => {
    const dir = workspace();
    ensureEnvFile(dir);
    const contents = fs.readFileSync(path.join(dir, '.env'), 'utf8');
    expect(contents).toContain('AUTH_GOOGLE_ID=""');
    expect(contents).toContain('AUTH_GOOGLE_SECRET=""');
    expect(contents).toContain('AUTH_GITHUB_ID=""');
    expect(contents).toContain('AUTH_GITHUB_SECRET=""');
  });

  it('never touches an existing file — a configured provider credential survives', () => {
    const dir = workspace();
    fs.writeFileSync(path.join(dir, '.env'), 'AUTH_GOOGLE_ID="configured"\nAUTH_SECRET="mine"\n');

    const result = ensureEnvFile(dir);

    expect(result.created).toBe(false);
    expect(fs.readFileSync(path.join(dir, '.env'), 'utf8')).toBe('AUTH_GOOGLE_ID="configured"\nAUTH_SECRET="mine"\n');
  });

  it('says where to paste the provider credentials, with the line numbers', () => {
    const dir = workspace();
    const result = ensureEnvFile(dir);
    const message = explainEnvFile(result);

    expect(message).toContain('.env');
    expect(message).toContain('AUTH_GOOGLE_ID');
    expect(message).toContain('AUTH_GITHUB_SECRET');
    // The line number has to be the real one, or the instruction is worse than none.
    const contents = fs.readFileSync(path.join(dir, '.env'), 'utf8').split('\n');
    const googleIdLine = contents.findIndex((line) => line.startsWith('AUTH_GOOGLE_ID=')) + 1;
    expect(message).toContain(`${googleIdLine}: AUTH_GOOGLE_ID=""`);
  });

  it('says nothing when the file already existed', () => {
    const dir = workspace();
    fs.writeFileSync(path.join(dir, '.env'), 'AUTH_SECRET="mine"\n');
    expect(explainEnvFile(ensureEnvFile(dir))).toBe('');
  });
});

describe('what the instance can do', () => {
  it('says which provider sign-ins are configured', () => {
    const status = providerStatus({ AUTH_GOOGLE_ID: 'client-id' });
    expect(status.join(' ')).toContain('Google: configured (public client');
    expect(status.join(' ')).toContain('GitHub: not configured — set AUTH_GITHUB_ID');
  });

  it('calls a provider with both halves configured', () => {
    const status = providerStatus({ AUTH_GOOGLE_ID: 'id', AUTH_GOOGLE_SECRET: 'secret' });
    expect(status.join(' ')).toContain('Google: configured');
    expect(status.join(' ')).not.toContain('public client');
  });
});

describe('setting one value in the environment file', () => {
  it('adds a variable that is not there yet', () => {
    const dir = workspace();
    ensureEnvFile(dir);
    const envPath = path.join(dir, '.env');
    setEnvValue(envPath, 'AUTH_GOOGLE_ID', 'client-id');
    expect(fs.readFileSync(envPath, 'utf8')).toContain('AUTH_GOOGLE_ID="client-id"');
  });

  it('replaces a value that is already there, and leaves everything else alone', () => {
    const dir = workspace();
    const envPath = path.join(dir, '.env');
    fs.writeFileSync(envPath, 'AUTH_GOOGLE_ID="old"\nDATABASE_URL="postgresql://arch:arch@localhost:5432/arch"\n');
    setEnvValue(envPath, 'AUTH_GOOGLE_ID', 'new');
    const contents = fs.readFileSync(envPath, 'utf8');
    expect(contents).toContain('AUTH_GOOGLE_ID="new"');
    expect(contents).not.toContain('AUTH_GOOGLE_ID="old"');
    expect(contents).toContain('DATABASE_URL="postgresql://arch:arch@localhost:5432/arch"');
  });

  it('keeps a secret with spaces and hashes intact', () => {
    const dir = workspace();
    const envPath = path.join(dir, '.env');
    fs.writeFileSync(envPath, '');
    setEnvValue(envPath, 'AUTH_GOOGLE_SECRET', 'a b#c');
    expect(fs.readFileSync(envPath, 'utf8')).toContain('AUTH_GOOGLE_SECRET="a b#c"');
  });
});

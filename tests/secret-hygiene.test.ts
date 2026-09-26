import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Secret hygiene — a second line of defence next to GitHub's push protection.
 *
 * This repo once had a live `ghp_…` PAT committed inside `.env.example`, i.e. in the one file people
 * are told to copy. `.gitignore` cannot help there (`.env.*` is ignored but `!.env.example`), so the
 * rule is enforced here instead: no token-shaped string in tracked files, and no credential-looking
 * value in the example env file that is not an obvious placeholder.
 *
 * Test fixtures live in `tests/**` and are exempt: they need token-shaped strings to prove redaction
 * works, and they are never deployed.
 */

// Key must END in the secret word, so AI_MAX_TOKENS (a number) is not mistaken for a credential.
const SECRET_ASSIGNMENT = /^[A-Z0-9_]*_(?:TOKEN|SECRET|API_KEY|KEY|PASSWORD|DSN)=["']?([^"'#]*)/gm;
const PLACEHOLDER = /^\s*$|replace-with|your-|change-?me|placeholder|example|xxxx|<|\$\{|\{\{/i;
const TOKEN_SHAPED = /gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16}/;

const EXEMPT_PATHS = /(^|\/)(tests?|node_modules|\.git|model-data|coverage)\//;
const EXEMPT_FILES = /(SECURITY\.md|\.test\.ts$|secret-hygiene)/;
const MAX_SCAN_BYTES = 1024 * 1024;

function trackedFiles(): string[] {
  try {
    return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
      .split('\0')
      .filter(Boolean);
  } catch {
    return []; // not a git checkout (e.g. a tarball build) — nothing to scan
  }
}

describe('secret hygiene', () => {
  const files = trackedFiles();
  const scannable = files.filter((file) => !EXEMPT_PATHS.test(file) && !EXEMPT_FILES.test(file));

  it('finds the tracked files to scan (guards against a silently empty scan)', () => {
    expect(files.length).toBeGreaterThan(10);
    expect(scannable).toContain('.env.example');
  });

  it('has no token-shaped string in tracked source', () => {
    const offenders: string[] = [];
    for (const file of scannable) {
      let stat;
      try {
        stat = fs.statSync(path.join(process.cwd(), file));
      } catch {
        continue; // deleted between listing and reading
      }
      if (!stat.isFile() || stat.size > MAX_SCAN_BYTES) continue;
      const text = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      if (TOKEN_SHAPED.test(text)) offenders.push(file);
    }
    expect(offenders, `Token-shaped secrets committed in: ${offenders.join(', ')}`).toEqual([]);
  });

  it('keeps .env.example placeholders only — never a real credential', () => {
    const text = fs.readFileSync(path.join(process.cwd(), '.env.example'), 'utf8');
    const offenders: Array<{ key: string; value: string }> = [];
    for (const match of text.matchAll(SECRET_ASSIGNMENT)) {
      const value = match[2] ?? '';
      if (!PLACEHOLDER.test(value)) offenders.push({ key: match[0].slice(0, 24), value: value.slice(0, 6) + '…' });
    }
    expect(offenders, `.env.example must not carry a real-looking secret: ${JSON.stringify(offenders)}`).toEqual([]);
  });

  it('does not commit any live .env file, including nested and staging variants', () => {
    expect(files.filter((file) => {
      const name = path.basename(file);
      return (name === '.env' || name.startsWith('.env.')) && name !== '.env.example';
    })).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { isSourceFile, keywords, scorePath } from '../scripts/lib/devtools.mjs';

/**
 * `npm run github:debug -- --repo owner/name --symptom "…"` ranks a repository with these three
 * pure functions — there is no model in that loop, so their behavior is pinned here:
 * symptom text → keywords, keywords → path score, tree entry → source or noise.
 */

describe('repo-debug · keywords()', () => {
  it('keeps symptom signal, including status codes', () => {
    const words = keywords('checkout returns 502 after deploy');
    expect(words).toContain('checkout');
    expect(words).toContain('502');
    expect(words).toContain('deploy');
  });

  it('drops stop-words and single characters', () => {
    const words = keywords('the checkout fails after a 502 when we deploy it');
    expect(words).not.toContain('the');
    expect(words).not.toContain('after');
    expect(words).not.toContain('when');
    expect(words).not.toContain('we');
  });

  it('splits compounds and de-duplicates', () => {
    expect(keywords('connection_pool exhausted')).toContain('pool');
    expect(keywords('502 502 429')).toEqual(['502', '429']);
    expect(keywords('')).toEqual([]);
    expect(keywords(undefined as unknown as string)).toEqual([]);
  });
});

describe('repo-debug · scorePath()', () => {
  const symptom = keywords('checkout returns 502 after deploy');

  it('puts an exact filename match first', () => {
    const exact = scorePath('payments/checkout.ts', symptom);
    const compound = scorePath('docs/checkout-explained.md', symptom);
    const unrelated = scorePath('src/index.ts', symptom);
    expect(exact).toBeGreaterThan(compound);
    expect(exact).toBeGreaterThan(unrelated);
  });

  it('weighs the filename above the directory', () => {
    expect(scorePath('payments.ts', ['payments'])).toBeGreaterThan(scorePath('payments/checkout.ts', ['payments']));
    expect(scorePath('payments/handler.ts', ['payments'])).toBeGreaterThan(0);
  });

  it('matches camelCase filenames and returns 0 without keywords', () => {
    expect(scorePath('api/checkoutHandler.ts', ['checkout'])).toBeGreaterThanOrEqual(2);
    expect(scorePath('any/path.ts', [])).toBe(0);
  });
});

describe('repo-debug · isSourceFile()', () => {
  it('keeps source and config a human maintains', () => {
    for (const file of [
      'src/server/checkout.ts',
      'src/app.tsx',
      'server/main.py',
      'src/main.go',
      'queries/report.sql',
      'deploy/values.yaml',
      '.github/workflows/ci.yml',
      'scripts/lib/devtools.mjs',
      'Dockerfile',
      'Makefile',
    ]) {
      expect(isSourceFile(file), file).toBe(true);
    }
  });

  it('drops vendored, generated, lock and asset paths', () => {
    for (const file of [
      'package-lock.json',
      'yarn.lock',
      'go.sum',
      'node_modules/left-pad/index.js',
      'vendor/lib.js',
      'dist/bundle.js',
      'coverage/lcov.info',
      'src/app.min.js',
      'src/thing.js.map',
      'gen/models.pb.go',
      'api/foo_pb2.py',
      'src/logo.png',
      'docs/README.md',
      'prisma/schema.prisma',
      '.git/config',
    ]) {
      expect(isSourceFile(file), file).toBe(false);
    }
  });
});

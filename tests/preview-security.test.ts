import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';
import { describe, expect, it } from 'vitest';

type Config = {
  headers: () => Promise<Array<{ source: string; headers: Array<{ key: string; value: string }> }>>;
  allowedDevOrigins: string[];
};

// Evaluate our config in a separate context: changing NODE_ENV or resetting the shared Vitest
// module cache would otherwise leak into the database/Auth.js integration tests (isolate: false).
function configFor(mode: 'production' | 'development'): Config {
  const { outputText } = transpileModule(readFileSync('next.config.ts', 'utf8'), {
    compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
  });
  const exports: { default?: Config } = {};
  runInNewContext(outputText, { exports, process: { env: { NODE_ENV: mode } } });
  return exports.default!;
}

async function headersFor(mode: 'production' | 'development') {
  const routes = await configFor(mode).headers();
  expect(routes[0]?.source).toBe('/:path*');
  return Object.fromEntries(routes[0]!.headers.map(({ key, value }) => [key, value]));
}

describe('embedded development previews without weakening production headers', () => {
  it('keeps production clickjacking protection, HSTS and the no-eval CSP', async () => {
    const headers = await headersFor('production');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(headers['Content-Security-Policy']).not.toContain("'unsafe-eval'");
    expect(headers['Strict-Transport-Security']).toContain('max-age=63072000');
  });

  it('allows iframe previews only in development, retaining the other response protections', async () => {
    const headers = await headersFor('development');
    expect(headers['X-Frame-Options']).toBeUndefined();
    expect(headers['Content-Security-Policy']).not.toContain('frame-ancestors');
    expect(headers['Strict-Transport-Security']).toBeUndefined();
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
    expect(configFor('development').allowedDevOrigins).toContain('*.e2b.app');
  });
});

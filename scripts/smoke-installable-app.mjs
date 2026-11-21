#!/usr/bin/env node
/** Anonymous browser smoke only. No signup, email send, private data, or OS installation. */
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const start = args.includes('--start-server');
const index = args.indexOf('--url');
const target = new URL(index === -1 ? 'http://localhost:3000' : args[index + 1]);
if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password) {
  throw new Error('Use an HTTP(S) origin without credentials.');
}
if (target.pathname !== '/' || target.search || target.hash) throw new Error('--url must be an origin, not a page path.');
if (args.some((value, position) => !['--url', '--start-server'].includes(value) && !(index >= 0 && position === index + 1))) {
  throw new Error('Usage: npm run smoke:app -- [--url http://localhost:3000] [--start-server]');
}
if (start && !['localhost', '127.0.0.1'].includes(target.hostname)) throw new Error('--start-server requires a localhost target.');
const origin = target.origin;
// Bound the complete smoke, including browser-side promises that could otherwise never settle.
const deadline = setTimeout(() => { console.error('[app-smoke] FAIL total deadline exceeded'); process.exit(1); }, 180000);
deadline.unref();
let server;
let browser;
const pass = (message) => console.log(`[app-smoke] PASS ${message}`);
const check = (condition, message) => { if (!condition) throw new Error(message); };

try {
  if (start) {
    server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '0.0.0.0', '--port', target.port || '3000'], {
      stdio: 'ignore', env: { ...process.env, NODE_ENV: 'production' },
    });
    let ready = false;
    const deadline = Date.now() + 45000;
    while (Date.now() < deadline) {
      if (server.exitCode !== null) throw new Error('Test server exited before becoming ready.');
      try {
        const response = await fetch(`${origin}/download`, { signal: AbortSignal.timeout(2000) });
        await response.body?.cancel();
        if (response.ok) { ready = true; break; }
      } catch { /* Bounded wait for the test server only. */ }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (!ready) throw new Error('Test server was not ready within 45 seconds.');
  }
  browser = await chromium.launch({
    ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {}),
    headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(`${origin}/download`);
  await page.getByRole('button', { name: 'Install for Windows' }).click();
  await page.getByRole('status').filter({ hasText: 'Edge or Chrome' }).waitFor();
  await page.getByRole('button', { name: 'Install for Linux' }).click();
  await page.getByRole('status').filter({ hasText: 'supported Chromium' }).waitFor();
  pass('Windows/Linux fallback instructions');

  for (const outcome of ['accepted', 'dismissed', 'failed']) {
    await page.evaluate((outcome) => {
      const event = new Event('beforeinstallprompt', { cancelable: true });
      event.prompt = outcome === 'failed' ? async () => { throw new Error('blocked test prompt'); } : async () => {};
      event.userChoice = Promise.resolve({ outcome: outcome === 'accepted' ? 'accepted' : 'dismissed' });
      window.dispatchEvent(event);
    }, outcome);
    // Wait for React to offer the browser event; the action is intentionally a simulated prompt.
    await page.waitForTimeout(100);
    await page.getByRole('button', { name: 'Install for Windows' }).click();
    const text = outcome === 'accepted' ? 'Installation accepted' : outcome === 'dismissed' ? 'Installation cancelled' : 'Edge or Chrome';
    await page.getByRole('status').filter({ hasText: text }).waitFor();
  }
  pass('accepted/dismissed/failed prompt outcomes (simulated browser event)');

  await page.evaluate(() => {
    window.__archSmoke = { calls: 0 };
    const event = new Event('beforeinstallprompt', { cancelable: true });
    event.prompt = async () => { window.__archSmoke.calls++; };
    event.userChoice = new Promise((resolve) => { window.__archSmoke.resolve = resolve; });
    window.dispatchEvent(event);
  });
  await page.waitForTimeout(100);
  await page.getByRole('button', { name: 'Install for Windows' }).click();
  await page.waitForFunction(() => [...document.querySelectorAll('.download-card button')].every((button) => button.disabled));
  check(await page.evaluate(() => window.__archSmoke.calls === 1), 'Install prompt was invoked more than once.');
  await page.evaluate(() => window.__archSmoke.resolve({ outcome: 'dismissed' }));
  await page.getByRole('status').filter({ hasText: 'Installation cancelled' }).waitFor();
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  await page.getByRole('button', { name: 'Already in app window' }).first().click();
  await page.getByRole('status').filter({ hasText: 'already using ARCH' }).waitFor();
  pass('pending prompt disables both platform buttons; installed-state feedback');

  await page.addScriptTag({ content: readFileSync(new URL('../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8') });
  const violations = await page.evaluate(async () => (await window.axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
  })).violations.map(({ id, nodes }) => `${id}: ${nodes.length} node(s)`));
  check(!violations.length, `Download-page accessibility violations: ${violations.join(', ')}`);
  pass('download-page automated WCAG A/AA checks (not an accessibility certification)');

  // Verify the production provider registered it: do not mask a registration bug by doing it here.
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.goto(`${origin}/app/launch.html`);
  await page.getByRole('status').filter({ hasText: 'offline' }).waitFor();
  await page.goto(`${origin}/dashboard/incidents/smoke-not-a-real-id`);
  await page.getByRole('heading', { name: 'Your workspace needs a connection.' }).waitFor();
  const cachedPaths = await page.evaluate(async () => {
    const paths = [];
    for (const name of await caches.keys()) {
      if (!name.startsWith('arch-public-app-')) continue;
      for (const request of await (await caches.open(name)).keys()) paths.push(new URL(request.url).pathname);
    }
    return paths;
  });
  check(cachedPaths.length === 9 && cachedPaths.every((path) => path.startsWith('/app/') || path === '/manifest.webmanifest'), 'Unexpected private/missing cache entries.');
  pass('offline launch, public navigation fallback and public-only Cache Storage');

  await context.setOffline(false);
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${origin}/download`);
    check(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), `Download page overflows at ${width}px.`);
  }
  pass('download page width checks at 390/768/1024/1440px');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.locator('#marketing-mobile-nav').getByRole('link', { name: 'Download ARCH', exact: true }).click();
  await page.waitForURL(`${origin}/download`);
  pass('homepage mobile navigation reaches Download ARCH');
  check(!pageErrors.length, 'Unexpected JavaScript page errors during smoke test.');
  await context.close();
} catch (error) {
  console.error(`[app-smoke] FAIL ${error instanceof Error ? error.message : 'Unknown browser failure'}`);
  process.exitCode = 1;
} finally {
  clearTimeout(deadline);
  await browser?.close();
  if (server) {
    server.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => server.once('exit', resolve)),
      new Promise((resolve) => { const timer = setTimeout(() => { if (server.exitCode === null) server.kill('SIGKILL'); resolve(); }, 5000); timer.unref(); }),
    ]);
  }
}

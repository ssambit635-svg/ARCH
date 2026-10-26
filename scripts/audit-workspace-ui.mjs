#!/usr/bin/env node
/**
 * Read-only workspace UI regression harness. Authenticate normally; never submit feature writes.
 * Requires a running app and an explicit fixture account. No saved sessions, traces, request
 * bodies, page text, customer identifiers, or credentials go into the report.
 * See docs/design/WORKSPACE-UI.md for setup, optional synthetic-only captures, and limitations.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import axe from 'axe-core';

const base = new URL(process.env.UI_AUDIT_BASE_URL || 'http://localhost:3000');
const email = process.env.UI_AUDIT_EMAIL;
const password = process.env.UI_AUDIT_PASSWORD;
const capture = process.env.UI_AUDIT_CAPTURE === '1';
const quick = process.env.UI_AUDIT_QUICK === '1';
const out = path.resolve(
  '.tmp/ui-audit',
  process.env.UI_AUDIT_RUN || new Date().toISOString().replace(/[:.]/g, '-'),
);
const safeOutputPath = out.startsWith(path.resolve('.tmp/ui-audit') + path.sep);
const report = {
  success: false,
  quick,
  routes: [],
  workflows: [],
  skipped: [],
  runtimeErrors: 0,
  consoleErrors: 0,
  screenshotFailures: 0,
  failures: [],
  // What actually went wrong, so a failure can be acted on instead of guessed at.
  runtimeErrorDetails: [],
  consoleErrorDetails: [],
};
let browser;
let page;
let failure = false;
class AuditFailure extends Error {}
const assert = (condition, code) => {
  if (!condition) throw new AuditFailure(code);
};
const visibleIncident =
  'main .workspace-incident-table-title a:visible, main a.workspace-incident-title:visible';
const dialog = (name) => page.getByRole('dialog', { name, exact: true });
const present = async (locator) =>
  (await locator.count()) > 0 && (await locator.first().isVisible());

async function ready() {
  await page.locator('main h1').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}
async function goto(href) {
  const response = await page.goto(new URL(href, base).href, { waitUntil: 'load' });
  assert(response?.status() === 200, 'navigation_status');
  await ready();
  assert(new URL(page.url()).pathname.startsWith('/dashboard'), 'workspace_auth_or_redirect');
}
async function accessibility() {
  if (!(await page.evaluate(() => Boolean(window.axe))))
    await page.addScriptTag({ content: axe.source });
  return page.evaluate(async () => {
    const result = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    });
    // Do not serialize DOM fragments or selectors that might contain customer data.
    return result.violations.map(({ id, impact, nodes }) => ({
      id,
      impact,
      affected: nodes.length,
    }));
  });
}
async function metrics() {
  return page.evaluate(() => {
    const visible = (element) =>
      Boolean(element.getClientRects().length) && getComputedStyle(element).visibility !== 'hidden';
    const links = [
      ...document.querySelectorAll(
        'main .workspace-incident-table-title a, main a.workspace-incident-title',
      ),
    ].filter(visible);
    const first = links[0]?.getBoundingClientRect();
    return {
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      firstIncidentY: first ? Math.round(first.top + scrollY) : null,
      incidentsInFirstScreen: links.filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.top >= 0 && rect.bottom <= innerHeight;
      }).length,
      declarationActions: [
        ...document.querySelectorAll('a[href="/dashboard/incidents/new"]'),
      ].filter(visible).length,
      searchWidth: document.querySelector('#incident-query')?.getBoundingClientRect().width ?? null,
    };
  });
}
async function shot(name) {
  if (!capture) return;
  try {
    await page.screenshot({
      path: path.join(out, `${name}.png`),
      fullPage: false,
      animations: 'disabled',
      timeout: 12000,
      mask: [page.locator('[data-ui-sensitive], input[type="password"]')],
    });
  } catch {
    report.screenshotFailures += 1;
  }
}
async function focusInside(modal, cycles = 12) {
  for (let i = 0; i < cycles; i++) {
    await page.keyboard.press(i % 3 === 0 ? 'Shift+Tab' : 'Tab');
    assert(
      await modal.evaluate((element) => element.contains(document.activeElement)),
      'dialog_focus_escaped',
    );
  }
}
async function checkWorkflow(name, run) {
  try {
    await run();
    report.workflows.push({ name, passed: true });
  } catch (error) {
    report.workflows.push({
      name,
      passed: false,
      reason: error instanceof AuditFailure ? error.message : 'interaction_did_not_complete',
    });
    report.failures.push(name);
    failure = true;
  }
}

try {
  assert(email && password, 'set_UI_AUDIT_EMAIL_and_UI_AUDIT_PASSWORD_locally');
  assert(
    ['http:', 'https:'].includes(base.protocol) &&
      !base.username &&
      !base.password &&
      base.pathname === '/' &&
      !base.search &&
      !base.hash,
    'invalid_audit_origin',
  );
  assert(
    base.protocol === 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname),
    'credentials_require_https_or_loopback',
  );
  assert(
    !capture || process.env.UI_AUDIT_SYNTHETIC_DATA === '1',
    'screenshots_require_explicit_synthetic_fixture_confirmation',
  );
  assert(safeOutputPath, 'report_path_must_stay_in_ignored_audit_directory');
  await fs.mkdir(out, { recursive: true, mode: 0o700 });
  const args = process.env.UI_AUDIT_BROWSER_ARGS
    ? JSON.parse(process.env.UI_AUDIT_BROWSER_ARGS)
    : [];
  assert(
    Array.isArray(args) &&
      args.every(
        (value) =>
          typeof value === 'string' &&
          !/^--(?:disable-web-security|allow-running-insecure-content|remote-debugging-address|remote-debugging-port)/.test(
            value,
          ),
      ),
    'unsafe_browser_arguments',
  );
  try {
    browser = await chromium.launch({
      executablePath: process.env.UI_AUDIT_BROWSER || undefined,
      headless: true,
      args,
    });
  } catch {
    throw new AuditFailure('browser_launch_failed_see_documented_UI_AUDIT_BROWSER_setup');
  }
  // One context also supports constrained single-process CI Chromium builds.
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  });
  page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', (error) => {
    report.runtimeErrors += 1;
    // Keep the message: "a page error happened" is not something anybody can act on.
    report.runtimeErrorDetails.push(String(error?.message ?? error).slice(0, 300));
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      report.consoleErrors += 1;
      report.consoleErrorDetails.push(message.text().slice(0, 300));
    }
  });
  await page.goto(new URL('/login', base).href, { waitUntil: 'load' });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Sign in to ARCH', exact: true }).click();
  await page.waitForURL((url) => url.pathname.startsWith('/dashboard'), { timeout: 45000 });
  await goto('/dashboard/incidents');
  const incidentHref = await page
    .locator(visibleIncident)
    .first()
    .getAttribute('href')
    .catch(() => null);
  const canDeclare = await present(
    page.getByRole('link', { name: 'Declare incident', exact: true }),
  );
  if (!incidentHref) {
    report.skipped.push('incident_detail_no_fixture_incident');
    assert(process.env.UI_AUDIT_REQUIRE_INCIDENT !== '1', 'fixture_incident_required');
  }
  const routes = [
    ['overview', '/dashboard'],
    ['incidents', '/dashboard/incidents'],
    ['projects', '/dashboard/projects'],
    ['settings', '/dashboard/settings'],
    ['people', '/dashboard/settings?tab=people'],
    ['webhooks', '/dashboard/settings?tab=integrations'],
    ['tokens', '/dashboard/settings?tab=tokens'],
    ['chat', '/dashboard/chat'],
    ...(incidentHref ? [['detail', incidentHref]] : []),
    ...(canDeclare ? [['declare', '/dashboard/incidents/new']] : []),
  ];
  const modes = quick
    ? [
        ['light', 1440, 1000],
        ['dark', 320, 720],
      ]
    : [
        ['light', 1440, 1000],
        ['dark', 1440, 1000],
        ['light', 1280, 800],
        ['light', 1024, 768],
        ['light', 768, 800],
        ['light', 390, 844],
        ['dark', 390, 844],
        ['light', 320, 720],
        ['dark', 320, 720],
      ];
  for (const [theme, width, height] of modes) {
    await context.addCookies([{ name: 'arch-theme', value: theme, url: base.origin }]);
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    for (const [name, href] of routes) {
      const result = { name, theme, width, height, passed: false };
      try {
        await goto(href);
        Object.assign(result, await metrics(), { violations: await accessibility() });
        if (
          capture &&
          ['overview', 'incidents', 'people', 'webhooks', 'tokens', 'detail'].includes(name) &&
          [1440, 320].includes(width)
        )
          await shot(`${theme}-${width}-${name}`);
        assert(result.horizontalOverflow <= 1, 'horizontal_overflow');
        assert(result.violations.length === 0, 'accessibility_violations');
        if (name === 'incidents') {
          assert(result.declarationActions <= 1, 'duplicate_primary_incident_action');
          if (incidentHref && width <= 390)
            assert(result.incidentsInFirstScreen >= 1, 'incident_not_visible_in_first_screen');
          if (width <= 390)
            assert(result.searchWidth >= width - 48, 'narrow_incident_search_field');
        }
        result.passed = true;
      } catch {
        failure = true;
        report.failures.push(`${theme}_${width}_${name}`);
      }
      report.routes.push(result);
    }
  }
  assert(report.routes.length === routes.length * modes.length, 'incomplete_route_matrix');

  await page.setViewportSize({ width: 1440, height: 1000 });
  await context.addCookies([{ name: 'arch-theme', value: 'light', url: base.origin }]);
  await checkWorkflow('contextual_search_and_help_do_not_steal_text', async () => {
    await goto('/dashboard/incidents');
    // Confirm the streamed client is interactive before testing document-level shortcuts.
    await page.getByRole('button', { name: 'Keyboard shortcuts', exact: true }).click();
    await dialog('Keyboard shortcuts').waitFor();
    await page.keyboard.press('Escape');
    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press('/');
    assert(
      await page
        .locator('#incident-query')
        .evaluate((element) => element === document.activeElement),
      'slash_did_not_focus_page_search',
    );
    await page.keyboard.type(' / ? ');
    assert((await dialog('Keyboard shortcuts').count()) === 0, 'help_stole_text_input');
    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press('?');
    await dialog('Keyboard shortcuts').waitFor();
    await focusInside(dialog('Keyboard shortcuts'));
    assert((await accessibility()).length === 0, 'shortcut_guide_accessibility');
    await page.keyboard.press('Escape');
  });
  await checkWorkflow('printable_shortcuts_can_be_disabled_for_voice_input', async () => {
    await goto('/dashboard/incidents');
    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press('?');
    const guide = dialog('Keyboard shortcuts');
    await guide
      .getByRole('checkbox', { name: 'Enable / and ? character shortcuts', exact: true })
      .uncheck();
    await page.keyboard.press('Escape');
    await goto('/dashboard/incidents');
    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press('?');
    assert((await guide.count()) === 0, 'disabled_question_shortcut_still_active');
    await page.keyboard.press('/');
    assert(
      !(await page
        .locator('#incident-query')
        .evaluate((element) => element === document.activeElement)),
      'disabled_slash_shortcut_still_active',
    );
    await page.keyboard.press('Control+k');
    await dialog('Search workspace').waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /^Account menu/ }).click();
    await page.getByRole('menuitem', { name: 'Keyboard shortcuts', exact: true }).click();
    await guide
      .getByRole('checkbox', { name: 'Enable / and ? character shortcuts', exact: true })
      .check();
    await page.keyboard.press('Escape');
  });
  await checkWorkflow('global_search_from_chat_and_full_history_fallback', async () => {
    await goto('/dashboard/chat');
    await page.keyboard.press('Control+k');
    const modal = dialog('Search workspace');
    await modal.waitFor();
    const search = page.getByRole('combobox', { name: 'Search workspace' });
    assert(
      await search.evaluate((element) => element === document.activeElement),
      'palette_input_focus',
    );
    await focusInside(modal);
    await search.fill('ui-audit-no-matching-entry');
    assert((await accessibility()).length === 0, 'empty_palette_accessibility');
    await page.getByRole('button', { name: 'Search full incident history' }).click();
    await page.waitForURL(
      (url) =>
        url.pathname === '/dashboard/incidents' &&
        url.searchParams.get('q') === 'ui-audit-no-matching-entry',
    );
    await ready();
    assert(
      (await page.getByRole('group', { name: 'Active incident filters' }).count()) === 1,
      'missing_active_filter',
    );
  });
  await checkWorkflow('filters_preserve_independent_context_and_recover', async () => {
    await goto('/dashboard/incidents?severity=HIGH&open=true&q=ui-audit-empty');
    await page.getByRole('link', { name: /^Clear search filter/ }).click();
    await page.waitForURL(
      (url) =>
        url.searchParams.get('severity') === 'HIGH' &&
        url.searchParams.get('open') === 'true' &&
        !url.searchParams.has('q'),
    );
    await goto('/dashboard/incidents?projectId=ui-audit-unavailable-project');
    assert(
      (await page.locator('select[name="projectId"]').inputValue()) ===
        'ui-audit-unavailable-project',
      'unavailable_project_disguised_as_all',
    );
    assert(
      (await page.locator('#incident-project-unavailable').count()) === 1,
      'missing_unavailable_project_guidance',
    );
  });
  await checkWorkflow('people_local_search_and_account_help_focus', async () => {
    await goto('/dashboard/settings?tab=people');
    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press('/');
    assert(
      await page
        .getByRole('searchbox', { name: 'Search team members by name or email' })
        .evaluate((element) => element === document.activeElement),
      'member_search_focus',
    );
    const account = page.getByRole('button', { name: /^Account menu/ });
    await account.click();
    await page.getByRole('menuitem', { name: 'Keyboard shortcuts' }).click();
    await dialog('Keyboard shortcuts').waitFor();
    await page.keyboard.press('Escape');
    assert(
      await account.evaluate((element) => element === document.activeElement),
      'account_help_focus_not_restored',
    );
  });
  await checkWorkflow('mobile_lifecycle_and_settings_sections_remain_reachable', async () => {
    await page.setViewportSize({ width: 320, height: 720 });
    await goto('/dashboard/incidents');
    const all = page
      .getByRole('navigation', { name: 'Incident views' })
      .getByRole('link', { name: 'All', exact: true });
    await all.focus();
    assert(
      await all.evaluate((element) => {
        const a = element.getBoundingClientRect();
        return a.left >= 0 && a.right <= innerWidth;
      }),
      'lifecycle_did_not_scroll_into_view',
    );
    assert((await metrics()).horizontalOverflow <= 1, 'lifecycle_page_overflow');
    await goto('/dashboard/settings');
    const tokens = page
      .getByRole('navigation', { name: 'Settings sections' })
      .getByRole('link', { name: 'API tokens' });
    await page
      .getByRole('navigation', { name: 'Settings sections' })
      .getByRole('link', { name: 'General', exact: true })
      .focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    assert(
      await tokens.evaluate((element) => {
        const a = element.getBoundingClientRect();
        return a.left >= 0 && a.right <= innerWidth;
      }),
      'settings_navigation_unreachable',
    );
  });
  if (incidentHref)
    await checkWorkflow('canonical_incident_copy_preserves_focus', async () => {
      await goto(incidentHref);
      const copy = page.getByRole('button', { name: 'Copy incident link' });
      await copy.focus();
      await page.keyboard.press('Enter');
      await page.waitForFunction(
        () =>
          document.querySelector('.workspace-copy-incident-link')?.getAttribute('aria-busy') !==
          'true',
      );
      assert(
        await copy.evaluate((element) => element === document.activeElement),
        'copy_lost_keyboard_focus',
      );
    });
  assert(report.runtimeErrors === 0 && report.consoleErrors === 0, 'unexpected_browser_errors');
  report.success = !failure;
} catch (error) {
  failure = true;
  // Only our fixed diagnostic codes are emitted; never stringify Playwright/page exceptions.
  const code = error instanceof AuditFailure ? error.message : 'audit_did_not_complete';
  report.failures.push(code);
} finally {
  if (browser) await browser.close().catch(() => {});
  report.success = !failure && report.success;
  try {
    if (!safeOutputPath) throw new Error('Invalid report path');
    await fs.mkdir(out, { recursive: true, mode: 0o700 });
    await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2), {
      mode: 0o600,
    });
  } catch {
    report.success = false;
    report.failures.push('could_not_save_report');
  }
  console.log(
    JSON.stringify(
      {
        success: report.success,
        routes: report.routes.length,
        passedRoutes: report.routes.filter((result) => result.passed).length,
        workflows: report.workflows,
        skipped: report.skipped,
        runtimeErrors: report.runtimeErrors,
        consoleErrors: report.consoleErrors,
        screenshotFailures: report.screenshotFailures,
        failures: report.failures,
        runtimeErrorDetails: report.runtimeErrorDetails,
        consoleErrorDetails: report.consoleErrorDetails,
      },
      null,
      2,
    ),
  );
  if (!report.success) process.exitCode = 1;
}

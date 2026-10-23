import type { ActionResult } from '@/app/dashboard/actions';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  isPageSearchShortcut,
  isShortcutHelpShortcut,
  isTimelinePostShortcut,
  isWorkspaceSearchShortcut,
  isWorkspaceTextEntry,
  showGlobalIncidentAction,
} from '@/lib/workspace-shortcuts';
import {
  fullIncidentSearchHref,
  workspaceSearchResults,
  type PaletteEntry,
} from '@/lib/workspace-search';
import { tokenDisplayMetadata, tokenScopeLabel } from '@/lib/token-view';
import { OneTimeSecret } from '@/components/ui/one-time-secret';
import { ApiTokenManager } from '@/components/dashboard/api-token-manager';
import { ShortcutKeys } from '@/components/ui/workspace-shortcut';
import { readCharacterShortcutPreference } from '@/components/ui/workspace-keyboard-preferences';
import { WebhookCreateForm, WebhookEndpointUrl } from '@/components/dashboard/webhook-forms';
import { Tabs } from '@/components/ui/tabs';

const unusedAction = async (): Promise<ActionResult> => ({ ok: true });
const busy = [
  { repeat: true },
  { isComposing: true },
  { keyCode: 229 },
  { defaultPrevented: true },
];
describe('predictable workspace shortcuts', () => {
  it.each(['ctrlKey', 'metaKey'] as const)(
    'opens global search with %s even from a text field',
    (modifier) => {
      expect(
        isWorkspaceSearchShortcut({ key: 'k', [modifier]: true, target: { tagName: 'INPUT' } }),
      ).toBe(true);
      expect(isWorkspaceSearchShortcut({ key: 'K', [modifier]: true })).toBe(true);
    },
  );
  it.each(busy)('never handles repeated, composed, or already handled keys: %j', (state) => {
    expect(isWorkspaceSearchShortcut({ key: 'k', ctrlKey: true, ...state })).toBe(false);
    expect(isPageSearchShortcut({ key: '/', ...state })).toBe(false);
    expect(isShortcutHelpShortcut({ key: '?', ...state })).toBe(false);
    expect(isTimelinePostShortcut({ key: 'Enter', ctrlKey: true, ...state }, false, 'Draft')).toBe(
      false,
    );
  });
  it.each([{ altKey: true }, { shiftKey: true }, {}])(
    'does not repurpose another K chord: %j',
    (modifiers) => {
      expect(isWorkspaceSearchShortcut({ key: 'k', ...modifiers })).toBe(false);
    },
  );
  it('uses / and ? outside editors, without swallowing those characters in text fields', () => {
    expect(isPageSearchShortcut({ key: '/' })).toBe(true);
    expect(isShortcutHelpShortcut({ key: '?', shiftKey: true })).toBe(true);
    expect(isPageSearchShortcut({ key: '/', ctrlKey: true })).toBe(false);
    expect(isShortcutHelpShortcut({ key: '?', metaKey: true })).toBe(false);
  });
  it.each(['INPUT', 'TEXTAREA', 'SELECT', 'input'])('preserves typing in %s', (tagName) => {
    const target = { tagName };
    expect(isWorkspaceTextEntry(target)).toBe(true);
    expect(isPageSearchShortcut({ key: '/', target })).toBe(false);
    expect(isShortcutHelpShortcut({ key: '?', target })).toBe(false);
  });
  it('recognizes editable ancestors, custom textboxes, and explicitly excluded editor regions', () => {
    expect(isWorkspaceTextEntry({ isContentEditable: true })).toBe(true);
    expect(isWorkspaceTextEntry({ tagName: 'SPAN', closest: () => ({}) })).toBe(true);
    expect(isWorkspaceTextEntry({ tagName: 'BUTTON', closest: () => null })).toBe(false);
    expect(isWorkspaceTextEntry(null)).toBe(false);
  });
  it('posts a nonempty draft only on an intentional, nonpending submit chord', () => {
    expect(isTimelinePostShortcut({ key: 'Enter', ctrlKey: true }, false, 'Update')).toBe(true);
    expect(isTimelinePostShortcut({ key: 'Enter', metaKey: true }, false, 'Update')).toBe(true);
    expect(isTimelinePostShortcut({ key: 'Enter', ctrlKey: true }, true, 'Update')).toBe(false);
    expect(isTimelinePostShortcut({ key: 'Enter', ctrlKey: true }, false, ' \n ')).toBe(false);
    expect(isTimelinePostShortcut({ key: 'Enter' }, false, 'Update')).toBe(false);
    expect(
      isTimelinePostShortcut({ key: 'Enter', ctrlKey: true, altKey: true }, false, 'Update'),
    ).toBe(false);
  });
});

describe('one obvious declaration destination', () => {
  it.each([
    '/dashboard/incidents',
    '/dashboard/incidents/',
    '/dashboard/incidents/new',
    '/dashboard/services/service-1',
  ])('does not compete with the context-specific action on %s', (pathname) => {
    expect(showGlobalIncidentAction(pathname, true)).toBe(false);
  });
  it.each([
    '/dashboard',
    '/dashboard/settings',
    '/dashboard/chat',
    '/dashboard/incidents/incident-1',
  ])('keeps quick declaration available on %s', (pathname) => {
    expect(showGlobalIncidentAction(pathname, true)).toBe(true);
    expect(showGlobalIncidentAction(pathname, false)).toBe(false);
  });
});

const entry = (kind: PaletteEntry['kind'], n: number): PaletteEntry => {
  const shared = { label: `${kind} ${n}`, hint: 'Payments', href: `/${kind}/${n}` };
  if (kind === 'incident')
    return { ...shared, kind, severity: 'CRITICAL', status: 'INVESTIGATING' };
  if (kind === 'service') return { ...shared, kind, status: 'DEGRADED' };
  return { ...shared, kind };
};
describe('useful, bounded quick switcher results', () => {
  const entries = [
    entry('action', 0),
    ...Array.from({ length: 20 }, (_, i) => entry('incident', i)),
    ...Array.from({ length: 20 }, (_, i) => entry('service', i)),
    ...Array.from({ length: 10 }, (_, i) => entry('page', i)),
  ];
  it('reserves room for pages and services even in a busy organization', () => {
    const results = workspaceSearchResults(entries, '');
    expect(results).toHaveLength(12);
    expect(results.filter((x) => x.kind === 'page')).toHaveLength(5);
    expect(results.filter((x) => x.kind === 'incident')).toHaveLength(3);
    expect(results.filter((x) => x.kind === 'service')).toHaveLength(3);
    expect(results[0]?.kind).toBe('action');
  });
  it('uses exactly the rendered group order for arrow-key traversal', () => {
    const results = workspaceSearchResults(
      [entry('page', 0), entry('service', 0), entry('action', 0), entry('incident', 0)],
      'Payments',
    );
    expect(results.map((x) => x.kind)).toEqual(['action', 'incident', 'service', 'page']);
  });
  it('matches words independently across names, project context, severity and status', () => {
    expect(
      workspaceSearchResults(entries, 'PAYMENTS  critical investigating').every(
        (x) => x.kind === 'incident',
      ),
    ).toBe(true);
    expect(workspaceSearchResults(entries, 'PAYMENTS  critical investigating')).toHaveLength(12);
    expect(
      workspaceSearchResults(entries, 'Payments degraded').every((x) => x.kind === 'service'),
    ).toBe(true);
    expect(workspaceSearchResults(entries, 'no-such-entry')).toEqual([]);
  });
  it('deduplicates destinations and fills unused quotas without duplicates', () => {
    const list = [entry('page', 1), entry('page', 1), entry('service', 1)];
    expect(workspaceSearchResults(list, '')).toHaveLength(2);
    expect(workspaceSearchResults(list, 'Payments')).toHaveLength(2);
    expect(
      workspaceSearchResults(
        entries.filter((x) => x.kind === 'page'),
        '',
      ),
    ).toHaveLength(10);
  });
  it.each([0, -1, Infinity, NaN])('rejects an unusable result limit %s', (limit) => {
    expect(workspaceSearchResults(entries, '', limit)).toEqual([]);
  });
  it('keeps an explicit smaller limit bounded', () => {
    expect(workspaceSearchResults(entries, '', 4)).toHaveLength(4);
    expect(workspaceSearchResults(entries, 'Payments', 4)).toHaveLength(4);
  });
  it('builds a relative full-history search and safely encodes punctuation', () => {
    const href = fullIncidentSearchHref('  api & <script> / latency?  ');
    expect(href.startsWith('/dashboard/incidents?')).toBe(true);
    expect(new URL(href, 'https://arch.invalid').searchParams.get('q')).toBe(
      'api & <script> / latency?',
    );
    expect(fullIncidentSearchHref('   ')).toBe('/dashboard/incidents');
    expect(
      new URL(fullIncidentSearchHref('a'.repeat(1000)), 'https://arch.invalid').searchParams.get(
        'q',
      ),
    ).toHaveLength(200);
  });
});

const token = {
  id: 'token-test',
  name: 'Deploy reader',
  prefix: 'arch_test',
  scopes: ['READ'],
  createdAt: '2026-10-23T00:00:00.000Z',
  lastUsedAt: null,
};
describe('one-time token handling', () => {
  it('retains only safe list metadata, not the newly issued raw value or hash', () => {
    const result = tokenDisplayMetadata({
      ...token,
      token: 'unit-test-only-secret',
      secret: 'another-test-value',
      hash: 'test-hash',
    });
    expect(result).toEqual(token);
    expect(Object.keys(result!)).toEqual([
      'id',
      'name',
      'prefix',
      'scopes',
      'createdAt',
      'lastUsedAt',
    ]);
    expect(result?.scopes).not.toBe(token.scopes);
  });
  it.each([
    null,
    false,
    {},
    { ...token, createdAt: 'not-a-date' },
    { ...token, scopes: [1] },
    { ...token, lastUsedAt: 'not-a-date' },
  ])('rejects malformed display metadata %j', (value) => {
    expect(tokenDisplayMetadata(value)).toBeNull();
  });
  it('normalizes a creation response without a last-use value and names scopes without widening them', () => {
    expect(tokenDisplayMetadata({ ...token, lastUsedAt: undefined })?.lastUsedAt).toBeNull();
    expect(tokenScopeLabel(['READ'])).toBe('Read only');
    expect(tokenScopeLabel(['READ_WRITE'])).toBe('Read and write');
    expect(tokenScopeLabel(['OTHER'])).toBe('OTHER');
  });
  it('masks the authorized one-time value initially and offers explicit reveal, copy, and dismissal', () => {
    const html = renderToStaticMarkup(
      h(OneTimeSecret, { secret: 'unit-test-only-secret', label: 'New test key', onDismiss() {} }),
    );
    expect(html).toContain('type="password"');
    expect(html).toContain('readOnly=""');
    expect(html).toContain('data-ui-sensitive="true"');
    expect(html).toContain('Show value');
    expect(html).toContain('Copy value');
    expect(html).not.toContain('<code>unit-test-only-secret</code>');
  });
  it('starts token creation at the existing read-only scope and renders metadata without raw values', () => {
    const html = renderToStaticMarkup(
      h(ApiTokenManager, { organizationId: 'org-test', initialTokens: [token] }),
    );
    expect(html).toContain('value="READ"');
    expect(html).toContain('Refresh list');
    expect(html).toContain('Revoke token Deploy reader');
    expect(html).toContain('type="submit"');
    expect(html).not.toContain('New API token');
  });
});

describe('settings setup surfaces', () => {
  it('offers only the selected project’s services before any request is sent', () => {
    const html = renderToStaticMarkup(
      h(WebhookCreateForm, {
        action: unusedAction,
        projects: [
          { id: 'a', name: 'First project' },
          { id: 'b', name: 'Second project' },
        ],
        services: [
          { id: 'a1', name: 'First service', projectId: 'a' },
          { id: 'b1', name: 'Hidden other service', projectId: 'b' },
        ],
      }),
    );
    expect(html).toContain('First service');
    expect(html).not.toContain('Hidden other service');
    expect(html).toContain('No default service');
    expect(html).toContain('maxLength="60"');
  });
  it('replaces an impossible webhook form with the project setup destination', () => {
    const html = renderToStaticMarkup(
      h(WebhookCreateForm, { action: unusedAction, projects: [], services: [] }),
    );
    expect(html).toContain('href="/dashboard/projects"');
    expect(html).toContain('Create a project');
    expect(html).not.toContain('Create endpoint');
  });
  it('renders settings navigation as links with one current section, not an incomplete tabs widget', () => {
    const html = renderToStaticMarkup(
      h(Tabs, {
        label: 'Settings sections',
        variant: 'sidebar',
        tabs: [
          { id: 'general', label: 'General', href: '/dashboard/settings', active: true },
          { id: 'people', label: 'People', href: '/dashboard/settings?tab=people', active: false },
        ],
      }),
    );
    expect(html).toContain('aria-label="Settings sections"');
    expect(html).toContain('workspace-settings-section-links');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).not.toContain('role="tab"');
  });
});

describe('discoverable, optional printable shortcuts', () => {
  it.each([
    ['off', false],
    ['on', true],
    [null, true],
    ['invalid', true],
  ] as const)('reads the non-sensitive character-shortcut preference %s', (value, expected) => {
    expect(readCharacterShortcutPreference(value)).toBe(expected);
  });
  it('keeps the in-memory preference when browser storage is unavailable or cleared', () => {
    expect(readCharacterShortcutPreference(null, false)).toBe(false);
  });
  it('gives shortcut guide readers a spoken modifier instead of only a hidden glyph', () => {
    const html = renderToStaticMarkup(h(ShortcutKeys, { letter: 'K', decorative: false }));
    expect(html).toContain('Control');
    expect(html).toContain('plus');
    expect(html).toContain('sr-only');
  });
  it('renders a relative webhook path for SSR and an explicit full-URL copy control', () => {
    const html = renderToStaticMarkup(
      h(WebhookEndpointUrl, { provider: 'grafana', externalId: 'test-public-id' }),
    );
    expect(html).toContain('/api/webhooks/grafana?endpoint=test-public-id');
    expect(html).toContain('Copy URL (grafana webhook)');
    expect(html).not.toContain('localhost');
  });
});

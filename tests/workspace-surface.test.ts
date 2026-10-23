import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  Field,
  FormError,
  FormValidation,
  Input,
  Select,
  SubmitButton,
  Textarea,
} from '@/components/ui/form';
import { Table } from '@/components/ui';
import { PageSkeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { ThemeToggle, WorkspaceTheme } from '@/components/shell/workspace-theme';
import {
  WorkspaceChecklist,
  WorkspaceHealthBanner,
} from '@/components/dashboard/workspace-overview';
import { IncidentCollection } from '@/components/incidents/incident-collection';
import type { IncidentRowData } from '@/components/incident/incident-row';
import { workspaceHealth } from '@/lib/workspace-view';
import { OnboardingForm } from '@/components/dashboard/onboarding-form';

const css = readFileSync('src/components/shell/workspace.css', 'utf8');
const tokens = Object.fromEntries(
  [...css.matchAll(/(--ws-[\w-]+): (#[\da-f]{6})/gi)].map((match) => [match[1]!, match[2]!]),
);
function contrast(a: string, b: string) {
  const luminance = (hex: string) =>
    [1, 3, 5]
      .map((index) => {
        const channel = parseInt(hex.slice(index, index + 2), 16) / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      })
      .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index]!, 0);
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe('scoped workspace appearance', () => {
  it.each(['light', 'dark', 'system'] as const)(
    'server-renders the %s preference on a local scope, not the public document',
    (preference) => {
      const html = renderToStaticMarkup(
        h(WorkspaceTheme, { initialPreference: preference, children: h(ThemeToggle) }),
      );
      expect(html).toContain(`class="workspace-theme " data-theme="${preference}"`);
      expect(html).toContain('type="button"');
      expect(html).toContain(preference === 'dark' ? 'Use light theme' : 'Use dark theme');
      expect(html).not.toContain('<html');
      expect(css).toContain('color-scheme: light dark');
      expect(css).toContain('prefers-reduced-motion: reduce');
    },
  );
  it.each(['light', 'dark'])(
    'keeps %s text, semantic indicators, controls, and actions readable',
    (mode) => {
      for (const background of ['bg', 'surface', 'soft', 'hover']) {
        for (const foreground of [
          'text',
          'muted',
          'subtle',
          'accent',
          'positive',
          'negative',
          'warning',
          'info',
        ]) {
          expect(
            contrast(tokens[`--ws-${foreground}-${mode}`]!, tokens[`--ws-${background}-${mode}`]!),
            `${mode} ${foreground} on ${background}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
        expect(
          contrast(tokens[`--ws-control-${mode}`]!, tokens[`--ws-${background}-${mode}`]!),
        ).toBeGreaterThanOrEqual(3);
      }
      expect(
        contrast(tokens[`--ws-on-action-${mode}`]!, tokens[`--ws-action-${mode}`]!),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );
});

describe('narrow workspace chrome', () => {
  it('keeps loading placeholders bounded and announces pending route content', () => {
    const html = renderToStaticMarkup(h(PageSkeleton));
    expect(html).toContain('role="status" aria-label="Loading workspace"');
    expect(html).toContain('Loading workspace…');
    const placeholders = [...html.matchAll(/<div aria-hidden="true" class="([^"]+)"/g)];
    expect(placeholders).toHaveLength(7);
    expect(placeholders.every((match) => match[1]!.includes('max-w-full'))).toBe(true);
    expect(css).toMatch(
      /\.workspace-theme \.skeleton-shimmer\s*\{[^}]*background:\s*var\(--ws-hover\)/,
    );
  });

  it('reserves room for action targets instead of letting long workspace names shrink the button group', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 760px)'));
    expect(mobile).toMatch(/\.workspace-theme \.arch-topbar-actions\s*\{[^}]*flex:\s*0 0 auto/);
  });
});

describe('accessible form primitives', () => {
  it.each([
    ['input', h(Input, { name: 'name' })],
    ['textarea', h(Textarea, { name: 'name' })],
    ['select', h(Select, { name: 'name' })],
  ] as const)(
    'connects the %s control’s stable DOM ID to its label and field-name validation',
    (_name, control) => {
      const html = renderToStaticMarkup(
        h(FormValidation, {
          errors: { name: 'Use at least two characters.' },
          children: h(Field, {
            label: 'Workspace name',
            htmlFor: 'organization-name',
            hint: 'Choose your team name.',
            children: control,
          }),
        }),
      );
      expect(html).toContain('for="organization-name"');
      expect(html).toContain('id="organization-name"');
      expect(html).toContain('aria-describedby="organization-name-error"');
      expect(html).toContain('aria-invalid="true"');
      expect(html).toContain('id="organization-name-error" role="alert"');
      expect(html).not.toContain('Choose your team name.');
    },
  );
  it('keeps supplemental descriptions and field hints connected when there is no error', () => {
    const html = renderToStaticMarkup(
      h(Field, {
        label: 'Title',
        htmlFor: 'title',
        hint: 'Describe the impact.',
        children: h(Input, { name: 'title', 'aria-describedby': 'extra-guidance' }),
      }),
    );
    expect(html).toContain('aria-describedby="extra-guidance title-hint"');
    expect(html).toContain('id="title-hint"');
    expect(html).not.toContain('aria-invalid');
  });
  it('never renders inherited object members as validation messages', () => {
    const html = renderToStaticMarkup(
      h(FormValidation, {
        errors: {},
        children: h(Field, {
          label: 'Name',
          htmlFor: 'constructor',
          children: h(Input, { name: 'toString' }),
        }),
      }),
    );
    expect(html).not.toContain('aria-invalid');
    expect(html).not.toContain('role="alert"');
  });
  it('exposes pending state without allowing another submission', () => {
    const html = renderToStaticMarkup(
      h(SubmitButton, { pending: true, pendingLabel: 'Saving response…', children: 'Save' }),
    );
    expect(html).toContain('disabled=""');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('Saving response…');
  });
  it('makes the error summary programmatically focusable and announced', () => {
    const html = renderToStaticMarkup(
      h(FormError, { message: 'Your note is still here. Try again.' }),
    );
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('role="alert"');
    expect(html).toContain('data-form-error');
    expect(renderToStaticMarkup(h(FormError))).toBe('');
  });
});

describe('workspace setup form', () => {
  it('asks only for a real workspace name, with native bounds and a connected label', () => {
    const html = renderToStaticMarkup(
      h(OnboardingForm, { action: async () => ({ ok: false, error: 'Try again.' }) }),
    );
    expect(html).toContain('aria-label="Create a workspace"');
    expect(html).toContain('for="organization-name"');
    expect(html).toContain('id="organization-name"');
    expect(html).toContain('name="name"');
    expect(html).toContain('autoComplete="organization"');
    expect(html).toContain('minLength="2"');
    expect(html).toContain('maxLength="80"');
    expect(html).toContain('Create workspace');
    expect(html).not.toMatch(/name="(?:slug|token|role)"/);
  });
});

describe('response-first content and navigation', () => {
  it('uses actual link navigation, not incomplete ARIA tabs', () => {
    const html = renderToStaticMarkup(
      h(Tabs, {
        tabs: [
          { id: 'open', label: 'Open incidents', href: '?tab=open', active: true },
          { id: 'history', label: 'History', href: '?tab=history', active: false, count: 3 },
        ],
      }),
    );
    expect(html).toContain('aria-label="Page sections"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('href="?tab=history"');
    expect(html).not.toContain('role="tab');
  });
  it('provides a named keyboard-scrollable table and scoped column headers', () => {
    const html = renderToStaticMarkup(
      h(Table, {
        label: 'Incident history',
        head: ['Title', 'Status'],
        children: h('tr', null, h('td', null, 'Example')),
      }),
    );
    expect(html).toContain('role="region" aria-label="Incident history" tabindex="0"');
    expect(html).toContain('<caption class="sr-only">Incident history</caption>');
    expect(html.match(/scope="col"/g)).toHaveLength(2);
  });
  it('keeps the full incident title and assignment readable in the compact response queue', () => {
    const incident: IncidentRowData = {
      id: 'i-1',
      title: 'Checkout requests time out when the downstream payment provider is unavailable',
      severity: 'HIGH',
      status: 'INVESTIGATING',
      startedAt: new Date(),
      updatedAt: new Date(),
      project: { name: 'Commerce' },
      service: { name: 'Checkout' },
      assignedTo: { name: 'Ada', email: 'ada@example.test' },
    };
    const html = renderToStaticMarkup(
      h(IncidentCollection, { incidents: [incident], compact: true }),
    );
    expect(html).toContain(incident.title);
    expect(html).toContain('Assigned to Ada');
    expect(html).toContain('Commerce / Checkout');
    expect(html).toContain('href="/dashboard/incidents/i-1"');
    expect(html).not.toContain('truncate');
    expect(html).not.toContain('<table');
  });
  it('does not invent monitoring health for an empty workspace', () => {
    const html = renderToStaticMarkup(h(WorkspaceHealthBanner, { health: workspaceHealth(0, []) }));
    expect(html).toContain('No services configured yet');
    expect(html).not.toContain('All systems operational');
    expect(html).not.toContain('priority incident');
  });
  it('offers incomplete setup actions without repeating completed tasks', () => {
    const html = renderToStaticMarkup(
      h(WorkspaceChecklist, {
        steps: [
          {
            title: 'Create a project',
            description: 'Group services.',
            complete: true,
            href: '/dashboard/projects',
          },
          {
            title: 'Add services',
            description: 'Map what is affected.',
            complete: false,
            href: '/dashboard/projects',
            action: 'Add a service',
          },
        ],
      }),
    );
    expect(html.match(/href="\/dashboard\/projects"/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Complete"');
    expect(html).toContain('Add a service');
  });
});

describe('dashboard-only surface refinement', () => {
  const refinement = css.slice(css.indexOf('/* Dashboard surface refinement:'));
  it('keeps rounder panels local to the overview instead of changing every signed-in screen', () => {
    expect(readFileSync('src/app/dashboard/page.tsx', 'utf8')).toContain(
      'className="animate-rise workspace-overview"',
    );
    expect(refinement).toMatch(/\.workspace-overview\s*\{[^}]*--ws-overview-panel-radius:\s*12px/);
    expect(refinement).toContain('--ws-overview-control-radius: 8px');
    expect(refinement).toContain('.workspace-theme .workspace-overview .arch-ui-card,');
    expect(refinement).toContain('.workspace-overview :is(.workspace-health, .workspace-stats)');
    expect(refinement).not.toMatch(/(?:font-size|grid-template-columns|position|box-shadow):/);
  });
  it('uses a matching inset curve and existing semantic color for softly separated headers', () => {
    expect(refinement).toContain(
      '--ws-overview-inset-radius: calc(var(--ws-overview-panel-radius) - 1px)',
    );
    expect(refinement).toMatch(
      /\.workspace-theme \.workspace-overview \.arch-ui-card-header\s*\{[^}]*border-radius:\s*var\(--ws-overview-inset-radius\) var\(--ws-overview-inset-radius\) 0 0;[^}]*background:\s*var\(--ws-soft\)/,
    );
    expect(refinement).not.toMatch(/#[0-9a-f]{3,8}/i);
    expect(refinement).not.toMatch(/outline(?:-width)?:\s*(?:none|0)/);
  });
  it('removes nested shortcut boxes without removing comfortable touch targets', () => {
    expect(refinement).toMatch(
      /\.workspace-overview \.workspace-quick-links a\s*\{\s*border-color:\s*transparent/,
    );
    expect(refinement).toMatch(
      /@media \(max-width:\s*760px\), \(pointer:\s*coarse\)\s*\{\s*\.workspace-overview \.workspace-quick-links a\s*\{\s*min-height:\s*44px/,
    );
  });
});

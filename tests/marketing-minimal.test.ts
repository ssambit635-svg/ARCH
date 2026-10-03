import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MarketingNav } from '@/components/marketing/nav';
import { ParallaxStory } from '@/components/marketing/parallax-story';
import { Hero } from '@/components/marketing/hero';
import { Workspace } from '@/components/marketing/workspace';
import { Lifecycle } from '@/components/marketing/lifecycle';
import { Platform } from '@/components/marketing/platform';
import { Deploy } from '@/components/marketing/deploy';
import { Closing } from '@/components/marketing/closing';
import { allowedTransitions } from '@/server/services/incident-state';

const render = (component: () => ReturnType<typeof createElement>) => renderToStaticMarkup(createElement(component));
const source = (path: string) => readFileSync(path, 'utf8');

describe('minimal marketing surface', () => {
  it('keeps useful navigation and one accessible theme control', () => {
    const nav = render(MarketingNav);
    expect(nav).toContain('aria-label="Primary"');
    expect(nav).toContain('href="#workspace"');
    expect(nav).toContain('href="#lifecycle"');
    expect(nav).toContain('href="/login"');
    expect(nav).toContain('href="/register"');
    expect(nav.match(/aria-label="Switch to light theme"/g)).toHaveLength(1);
    expect(nav).not.toContain('Search ARCH');
    expect(nav).not.toContain('status/arch');
    // The mobile disclosure starts closed, so its links are not keyboard-reachable.
    expect(nav).toMatch(/id="marketing-mobile-nav"[^>]*hidden=""/);
    expect(nav).toContain('aria-expanded="false"');
    expect(nav).toContain('aria-controls="marketing-mobile-nav"');
  });

  it('lets the anime mountain reveal film own a clean, accessible hero without copy or shade overlays', () => {
    const hero = render(Hero);
    const heroSource = source('src/components/marketing/hero.tsx');
    expect(hero).toContain('id="hero-title"');
    expect(hero).toContain('ARCH incident operations');
    expect(hero).toContain('/arch-alpine-poster.jpg');
    expect(hero).not.toContain('href="/register"');
    expect(hero).not.toContain('href="#workspace"');
    expect(hero).not.toContain('When things break');
    expect(hero).not.toContain('StatusChip');
    expect(hero).not.toContain('status/arch');
    expect(heroSource).not.toContain('mk-hero-shade');
    expect(heroSource).not.toContain('mk-hero-copy');
    expect(heroSource).not.toContain('ScrollTrigger');
  });

  it('fills the viewport and adds a static-first, reduced-motion-safe parallax interlude', () => {
    const css = source('src/components/marketing/landing.css');
    const motion = source('src/components/marketing/gsap-reveal.tsx');
    expect(css).toMatch(/\.mk-hero \{[^}]*height: 100svh/);
    expect(css).toMatch(/\.mk-hero-video \{[^}]*object-fit: cover/);
    expect(css).toContain('.mk-main { padding-top: 0; }');
    const story = render(ParallaxStory);
    expect(story).toContain('id="story-title"');
    expect(story).toContain('href="#intelligence"');
    expect(story.match(/data-mk-depth=/g)).toHaveLength(3);
    expect(motion).toContain('pin: compact ? false : stage');
    expect(motion.indexOf('if (!match.conditions?.animate)')).toBeLessThan(motion.indexOf("select('[data-mk-story]')"));
    expect(motion).toContain('context.revert()');
  });

  it('labels the preview honestly and gives its selections an accessible state', () => {
    const workspace = render(Workspace);
    expect(workspace).toContain('illustrative data');
    expect(workspace.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(workspace.match(/aria-pressed="false"/g)).toHaveLength(2);
    expect(workspace).toContain('aria-controls="preview-incident-detail"');
    expect(workspace).toContain('aria-live="polite"');
    expect(workspace).toContain('Draft · responder review required');
  });

  it('shows the four real incident states, not a fictional fifth state', () => {
    const lifecycle = render(Lifecycle);
    expect(lifecycle.match(/aria-pressed=/g)).toHaveLength(4);
    for (const state of ['Investigating', 'Identified', 'Monitoring', 'Resolved']) {
      expect(lifecycle).toContain(state);
    }
    expect(allowedTransitions('INVESTIGATING')).toEqual(['IDENTIFIED', 'MONITORING', 'RESOLVED']);
    expect(render(Platform)).not.toMatch(/5-State|five states/i);
  });

  it('uses the actual local setup and Python CLI, not the old fictional SDK', () => {
    const deploy = render(Deploy);
    expect(deploy).toContain('npm run dev');
    expect(deploy).toContain('AUTH_SECRET_WEBHOOK');
    expect(deploy).toContain('arch login --url');
    expect(deploy).not.toContain('from arch_client');
    expect(deploy).not.toContain('npm run db:seed');
    expect(deploy).toContain('role="status"');
  });

  it('keeps the closing film and does not advertise an incorrect license or a demo status URL', () => {
    const closing = render(Closing);
    expect(source('src/components/marketing/closing.tsx')).toContain('/arch-dragon-reveal.mp4');
    expect(closing).toContain('All rights reserved');
    expect(closing).not.toContain('MIT');
    expect(closing).not.toContain('status/arch');
  });

  it.each(['dark', 'light'])('%s text tokens keep AA contrast on every neutral surface', (theme) => {
    const css = source('src/components/marketing/landing.css');
    const block = (theme === 'dark' ? /^\.mk \{([^}]+)\}/m : /\.mk-light \.mk \{([^}]+)\}/).exec(css)?.[1] ?? '';
    const tokens = Object.fromEntries([...block.matchAll(/(--mk-[\w-]+): (#[\da-f]{6})/gi)].map((match) => [match[1]!, match[2]!]));
    const luminance = (hex: string) => [0, 2, 4].map((offset) => {
      const channel = parseInt(hex.slice(offset + 1, offset + 3), 16) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    }).reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index]!, 0);
    const contrast = (foreground: string, background: string) => {
      const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
      return (values[0]! + 0.05) / (values[1]! + 0.05);
    };
    for (const foreground of ['--mk-fg', '--mk-muted', '--mk-subtle']) {
      for (const background of ['--mk-bg', '--mk-bg-soft', '--mk-surface', '--mk-surface-alt', '--mk-hover']) {
        expect(contrast(tokens[foreground]!, tokens[background]!), `${theme}: ${foreground} on ${background}`).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(contrast(tokens['--mk-on-primary']!, tokens['--mk-primary']!)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the blue flat — open surfaces, no glow — and preserves keyboard and reduced-motion affordances', () => {
    const css = source('src/components/marketing/landing.css');
    // Blue stays a flat accent, never a bloom or a glow.
    expect(css).toContain('--mk-accent: #3b8ef4');
    expect(css).not.toMatch(/box-shadow|radial-gradient|text-shadow|drop-shadow/);
    expect(css).toContain('--mk-line: #182438');
    expect(css).toContain('.mk-light .mk');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(source('src/components/marketing/site-chrome.tsx')).not.toContain('useLenis');
  });

  it('keeps the landing page clear of rigid section and tile borders', () => {
    const css = source('src/components/marketing/landing.css');
    expect(css).toMatch(/\.mk-section \{[^}]*padding-block: 96px/);
    expect(css).not.toMatch(/\.mk-section \{[^}]*border-bottom/);
    expect(css).not.toContain('.mk-section::before');
    expect(css).toMatch(/\.mk-tech-grid \{[^}]*gap: 10px/);
    expect(css).toMatch(/\.mk-tech-grid li \{[^}]*border: 0/);
  });

  it('steps the navigation away after ten seconds and brings it back on hover, again and again', () => {
    const nav = source('src/components/marketing/nav.tsx');
    expect(nav).toContain('AUTO_HIDE_MS = 10_000');
    expect(nav).toContain('mk-nav--hidden');
    expect(nav).toContain('event.clientY <= 24');
    // It starts visible on first paint.
    expect(render(MarketingNav)).not.toContain('mk-nav--hidden');
  });

  it('keeps the classic isometric tech tiles and the full-width fractured footer wordmark', () => {
    const css = source('src/components/marketing/landing.css');
    const tiles = source('src/components/marketing/tech-stack.tsx');
    expect(tiles).toContain('IsometricStack');
    expect(tiles).toContain('mk-tech-grid');
    expect(css).toContain('.mk-iso-front');
    expect(css).toMatch(/\.mk-watermark \{[^}]*width: 100%/);
    expect(render(Closing)).toContain('clip-path="url(#mk-wordmark-cuts)"');
    expect(render(Closing)).toContain('textLength="1400"');
    expect(source('src/components/marketing/closing.tsx')).toContain('ARCH.');
  });
});

describe('product README', () => {
  it('matches the package version and makes release and licensing boundaries explicit', () => {
    const readme = source('README.md');
    const pkg = JSON.parse(source('package.json')) as { version: string };
    expect(readme).toContain(`v${pkg.version}`);
    expect(readme).toContain('Early access');
    expect(readme).toContain('proprietary software');
    expect(readme).toContain('not a general-purpose LLM');
    expect(readme).not.toContain('v0.1.0');
    expect(readme).toContain('## Quick start');
  });

  it('links to real local documents and a labeled preview', () => {
    const readme = source('README.md');
    for (const match of readme.matchAll(/\]\(([^)]+)\)|href="([^"]+)"/g)) {
      const target = match[1] ?? match[2]!;
      if (/^(?:https?:|#)/.test(target)) continue;
      expect(existsSync(target.split('#')[0]!), `Missing README link: ${target}`).toBe(true);
    }
    expect(readme).toContain('Illustrative data');
    expect(existsSync('docs/assets/workspace-preview.png')).toBe(true);
  });
});

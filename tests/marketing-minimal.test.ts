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
import { SiteFooter } from '@/components/marketing/footer';
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

  it('says what ARCH is in the hero and shows a real screen rather than an illustration', () => {
    const hero = render(Hero);
    const heroSource = source('src/components/marketing/hero.tsx');
    expect(hero).toContain('id="hero-title"');
    // A visitor has five seconds: the literal description is the headline. Read the heading as a
    // visitor hears it, and keep "Incident response" unbroken so the phrase survives line wrapping.
    const headline = (/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(hero)?.[1] ?? '').replace(/<[^>]+>/g, '');
    expect(headline).toContain('Incident response for engineering teams.');
    expect(headline).toContain('Self-hosted.');
    expect(headline).toContain('Human-reviewed AI.');
    expect(hero).toContain('mk-hero-nowrap');
    // The hero names the release, and that release is the package version — never a stale one.
    const pkg = JSON.parse(source('package.json')) as { version: string };
    expect(hero).toContain(`Early access · v${pkg.version}`);
    // The poetry survives as the subline, not as the product description.
    expect(hero).toContain('Through the noise.');
    expect(hero).toContain('/product/incident-workspace.webp');
    expect(hero).toContain('href="/register"');
    expect(hero).toContain('href="#workspace"');
    expect(hero).not.toContain('StatusChip');
    expect(hero).not.toContain('status/arch');
    expect(heroSource).not.toContain('mk-hero-shade');
    expect(heroSource).not.toContain('mk-hero-video');
    expect(heroSource).not.toContain('ScrollTrigger');
  });

  it('never repeats its own headline line, and describes or hides every image', () => {
    const marketing = ['hero', 'nav', 'parallax-story', 'intelligence', 'workspace', 'lifecycle', 'topology', 'platform', 'deploy', 'closing', 'footer']
      .map((name) => source(`src/components/marketing/${name}.tsx`))
      .join('\n');
    // "clarity" used to appear four times on one page; one deliberate use is the budget.
    expect(marketing.match(/clarity/gi) ?? []).toHaveLength(1);

    const rendered = [render(Hero), render(MarketingNav), render(Closing), render(SiteFooter)].join('\n');
    const images = [...rendered.matchAll(/<img\b[^>]*>/g)].map((match) => match[0]);
    // The page carries informative images, and each one is described.
    expect(images.filter((tag) => /alt="[^"]{40,}"/.test(tag)).length).toBeGreaterThanOrEqual(2);
    for (const tag of images) {
      const alt = /alt="([^"]*)"/.exec(tag)?.[1] ?? null;
      expect(alt, `every <img> needs an alt attribute: ${tag}`).not.toBeNull();
      // An empty alt is only legitimate when the image is explicitly hidden from assistive tech.
      if (alt === '') expect(tag, `empty alt has to be a deliberate decorative choice: ${tag}`).toContain('aria-hidden="true"');
    }
  });

  it('fills the viewport and adds a static-first, reduced-motion-safe parallax interlude', () => {
    const css = source('src/components/marketing/landing.css');
    const motion = source('src/components/marketing/gsap-reveal.tsx');
    expect(css).toMatch(/\.mk-hero \{[^}]*min-height: 100svh/);
    expect(css).toMatch(/\.mk-hero-shot \{[^}]*border-radius: 14px/);
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

  it('shows the real local setup and advertises no client that is not published', () => {
    const deploy = render(Deploy);
    expect(deploy).toContain('git clone');
    expect(deploy).toContain('npm run dev');
    expect(deploy).toContain('AUTH_SECRET_WEBHOOK');
    // The Python CLI in clients/python is not published, so the page must not
    // tell a visitor to install or log in with it.
    expect(deploy).not.toContain('pip install');
    expect(deploy).not.toContain('arch login');
    expect(deploy).not.toContain('arch incidents');
    expect(deploy).not.toContain('from arch_client');
    expect(deploy).not.toContain('npm run db:seed');
    expect(deploy).toContain('role="status"');
  });

  it('closes on the customer-facing screen and does not advertise an incorrect license or a demo status URL', () => {
    const closing = render(Closing);
    const footer = render(SiteFooter);
    expect(source('src/components/marketing/closing.tsx')).toContain('/product/status-page.webp');
    expect(footer).toContain('All rights reserved');
    expect(footer).not.toContain('MIT');
    expect(closing).not.toContain('status/arch');
    expect(footer).not.toContain('status/arch');
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

  it('keeps the classic isometric tech tiles and the full-bleed, dissolving footer wordmark', () => {
    const css = source('src/components/marketing/landing.css');
    const tiles = source('src/components/marketing/tech-stack.tsx');
    const footerSource = source('src/components/marketing/footer.tsx');
    expect(tiles).toContain('IsometricStack');
    expect(tiles).toContain('mk-tech-grid');
    expect(css).toContain('.mk-iso-front');
    expect(css).toMatch(/\.mk-watermark \{[^}]*width: 100%/);

    const wordmark = render(SiteFooter);
    // Full-bleed: the word is stretched across the entire viewBox width.
    expect(wordmark).toContain('textLength="1440"');
    expect(footerSource).toContain('ARCH.');
    // The diagonal shards are gone — the word is no longer cut into bands.
    expect(footerSource).not.toContain('mk-wordmark-cuts');
    expect(wordmark).not.toContain('clip-path');
    // Four stacked copies: three soft copies underneath, one crisp copy on top.
    expect(wordmark.match(/<text /g)).toHaveLength(4);
    expect(wordmark.match(/<feGaussianBlur /g)).toHaveLength(3);
    // The word is decorative, so it stays out of the accessibility tree.
    expect(wordmark).toContain('aria-hidden="true"');
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

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MarketingNav } from '@/components/marketing/nav';
import { Hero } from '@/components/marketing/hero';
import { ProofStrip } from '@/components/marketing/proof';
import { Pillars } from '@/components/marketing/pillars';
import { Workspace } from '@/components/marketing/workspace';
import { Workflow } from '@/components/marketing/workflow';
import { Engine } from '@/components/marketing/engine';
import { Control } from '@/components/marketing/control';
import { StatusProof } from '@/components/marketing/status-proof';
import { Deploy } from '@/components/marketing/deploy';
import { SiteFooter } from '@/components/marketing/footer';
import { allowedTransitions } from '@/server/services/incident-state';

const render = (component: () => ReturnType<typeof createElement>) => renderToStaticMarkup(createElement(component));
const source = (path: string) => readFileSync(path, 'utf8');

describe('marketing surface', () => {
  it('keeps one sticky navigation bar with a real mobile disclosure', () => {
    const nav = render(MarketingNav);
    expect(nav).toContain('aria-label="Primary"');
    for (const href of ['#product', '#workflow', '#engine', '#deploy', '/login', '/register']) {
      expect(nav).toContain(`href="${href}"`);
    }
    // The bar stays put: no auto-hide state, no pointer sensor, no hidden theme switch.
    expect(nav).not.toContain('mk-nav--hidden');
    expect(nav).not.toContain('mk-nav-sensor');
    expect(nav).not.toContain('Switch to light theme');
    expect(nav).not.toContain('aria-label="Search ARCH"');
    expect(nav).toMatch(/id="marketing-mobile-nav"[^>]*hidden=""/);
    expect(nav).toContain('aria-expanded="false"');
    expect(nav).toContain('aria-controls="marketing-mobile-nav"');
    // Scrolling adds a hairline rather than moving the bar out of the way.
    const navSource = source('src/components/marketing/nav.tsx');
    expect(navSource).toContain('mk-nav--scrolled');
    expect(navSource).not.toContain('AUTO_HIDE_MS');
    // One ink action per viewport: the hero owns the black dot-grid block, so the bar's own
    // action is the glass pill with the arrow chip — never a second copy of the hero button.
    expect(nav).toContain('mk-button--glass');
    expect(nav).toContain('mk-arrow-chip');
    expect(nav).not.toContain('mk-button--ink');
    expect(navSource).not.toContain('clientY <= 24');
  });

  it('says what ARCH is in the hero and shows a real screen rather than an illustration', () => {
    const hero = render(Hero);
    const heroSource = source('src/components/marketing/hero.tsx');
    expect(hero).toContain('id="hero-title"');
    // The headline is the brand line, read as a visitor hears it: downtime's ARCH-nemesis,
    // with the deal terms (self-hosted, human-reviewed) carried in the claim beneath it.
    const headline = (/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(hero)?.[1] ?? '').replace(/<[^>]+>/g, '');
    expect(headline).toContain('Meet downtime’s');
    expect(headline).toContain('ARCH-nemesis.');
    expect(headline).toContain('Self-hosted.');
    expect(headline).toContain('Human-reviewed AI.');
    expect(hero).toContain('mk-hero-arch');
    // Catchy is not an excuse to be cryptic: the literal description rides in the lede,
    // inside the same first screen, so a visitor still learns what ARCH is in five seconds.
    expect(hero).toContain('Incident response for engineering teams');
    // The hero names the release, and that release is the package version — never a stale one.
    const pkg = JSON.parse(source('package.json')) as { version: string };
    expect(hero).toContain(`Early access · v${pkg.version}`);
    // The poetry survives as the subline, not as the product description.
    expect(hero).toContain('Through the noise.');
    expect(hero).toContain('/product/incident-workspace.webp');
    expect(hero).toContain('href="/register"');
    expect(hero).toContain('href="#product"');
    // Three checkable constraints, set as a list rather than a paragraph.
    expect(hero.match(/class="mk-hero-point"/g)).toHaveLength(3);
    expect(hero).not.toContain('StatusChip');
    expect(hero).not.toContain('status/arch');
    expect(heroSource).not.toContain('mk-hero-video');
    expect(heroSource).not.toContain('ScrollTrigger');
    // The stage follows the Aceternity "Hero With Background And Navbar" block (DESIGN (6).md):
    // a painted dawn behind the copy, blueprint scale lines, and the ink action with its
    // sunbeam dot-grid box — while the product capture waits full-width under the stage.
    expect(hero).toContain('mk-hero-stage');
    expect(hero).toContain('/marketing/hero-dawn.jpg');
    expect(hero).toContain('mk-hero-scales');
    expect(hero).toContain('mk-button--ink');
    expect(hero).toContain('mk-dots');
    const css = source('src/components/marketing/landing.css');
    // The headline is set in Inter at the extracted display size, 96px on a 1.0 line.
    expect(css).toMatch(/\.mk-hero-title \{[^}]*font-family: var\(--mk-sans\)/);
    expect(css).toMatch(/\.mk-hero-title \{[^}]*font-size: clamp\(42px, 6\.6vw, 96px\)/);
    expect(css).toContain('--mk-sunbeam: #ffb224');
    // The navbar floats over the sky at the top and only earns its paper fill on scroll.
    expect(css).toMatch(/\.mk-nav \{[^}]*background: transparent/);
    expect(css).toMatch(/\.mk-nav--scrolled \{[^}]*background: var\(--mk-nav-bg\)/);
  });

  it('never repeats its own headline line, and describes or hides every image', () => {
    const marketing = [
      'hero', 'nav', 'proof', 'pillars', 'workspace', 'workflow', 'engine', 'control', 'status-proof', 'deploy', 'footer',
    ]
      .map((name) => source(`src/components/marketing/${name}.tsx`))
      .join('\n');
    // "clarity" used to appear four times on one page; one deliberate use is the budget.
    expect(marketing.match(/clarity/gi) ?? []).toHaveLength(1);

    const rendered = [render(Hero), render(MarketingNav), render(StatusProof), render(SiteFooter)].join('\n');
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

  it('opens on a full viewport hero and reveals sections without pinning the page', () => {
    const css = source('src/components/marketing/landing.css');
    const motion = source('src/components/marketing/gsap-reveal.tsx');
    expect(css).toMatch(/\.mk-hero \{[^}]*min-height: 100svh/);
    expect(css).toContain('.mk-main { padding-top: 0; }');
    expect(css).toContain('.mk-hero-frame');
    // No scroll-jacking: the page is never pinned, and every reveal is one-shot.
    expect(motion).not.toContain('pin:');
    expect(motion).not.toContain('[data-mk-story]');
    expect(motion).toContain('start: \'top 92%\'');
    expect(motion).toContain('context.revert()');
    expect(motion.indexOf('if (!match.conditions?.animate)')).toBeLessThan(motion.indexOf("select('[data-mk-heading]')"));
    // Motion is opt-in and reduced-motion visitors get the final frame immediately.
    expect(css).toContain('prefers-reduced-motion: reduce');
  });

  it('states four checkable facts under the hero', () => {
    const proof = render(ProofStrip);
    expect(proof.match(/mk-proof-item/g)).toHaveLength(4);
    expect(proof).toContain('External AI API calls');
    expect(proof).toContain('PostgreSQL');
    expect(source('src/components/marketing/proof.tsx')).not.toMatch(/best-in-class|world-class|revolutionary/i);
  });

  it('groups the product claims into three scannable pillars', () => {
    const pillars = render(Pillars);
    expect(pillars.match(/class="mk-pillar"/g)).toHaveLength(3);
    expect(pillars.match(/mk-pillar-index/g)).toHaveLength(3);
    expect(pillars).toContain('id="pillars-title"');
  });

  it('labels the workspace preview honestly and gives its selections an accessible state', () => {
    const workspace = render(Workspace);
    expect(workspace).toContain('illustrative data');
    expect(workspace.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(workspace.match(/aria-pressed="false"/g)).toHaveLength(2);
    expect(workspace).toContain('aria-controls="preview-incident-detail"');
    expect(workspace).toContain('aria-live="polite"');
    expect(workspace).toContain('Draft · responder review required');
    // The app window is the product, so it keeps the shipped console's dark surface.
    expect(workspace).toContain('mk-on-dark');
  });

  it('shows the four real incident states as tabs, not a fictional fifth state', () => {
    const workflow = render(Workflow);
    const tabs = [...workflow.matchAll(/role="tab"/g)];
    expect(tabs).toHaveLength(4);
    expect(workflow.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(workflow.match(/aria-selected="false"/g)).toHaveLength(3);
    expect(workflow).toContain('role="tabpanel"');
    for (const state of ['Investigating', 'Identified', 'Monitoring', 'Resolved']) {
      expect(workflow).toContain(state);
    }
    expect(allowedTransitions('INVESTIGATING')).toEqual(['IDENTIFIED', 'MONITORING', 'RESOLVED']);
    expect(render(Control)).not.toMatch(/5-State|five states/i);
  });

  it('describes the native engine with its limits intact', () => {
    const engine = render(Engine);
    expect(engine).toContain('CPU');
    expect(engine).toContain('Human-reviewed');
    expect(engine).toContain('not a general-purpose language model');
    // A card of four signals, each with a visible note.
    expect(engine.match(/mk-engine-row"/g)).toHaveLength(4);
    expect(engine).toContain('mk-engine-flag');
    expect(engine).toContain('Inference stays on your host.');
  });

  it('shows the real local setup and advertises no client that is not published', () => {
    const deploy = render(Deploy);
    expect(deploy).toContain('git clone');
    expect(deploy).toContain('npm run dev');
    expect(deploy).toContain('AUTH_SECRET_WEBHOOK');
    // The Python CLI in clients/python is not published, so the page must not tell a visitor
    // to install or log in with it.
    expect(deploy).not.toContain('pip install');
    expect(deploy).not.toContain('arch login');
    expect(deploy).not.toContain('arch incidents');
    expect(deploy).not.toContain('from arch_client');
    expect(deploy).not.toContain('npm run db:seed');
    expect(deploy).toContain('role="status"');
    expect(deploy).toContain('mk-terminal');
  });

  it('closes on the customer-facing screen and does not advertise an incorrect license or a demo status URL', () => {
    const status = render(StatusProof);
    const footer = render(SiteFooter);
    expect(source('src/components/marketing/status-proof.tsx')).toContain('/product/status-page.webp');
    expect(status).toContain('<figcaption');
    expect(status).toContain('Sample data');
    expect(footer).toContain('All rights reserved');
    expect(footer).not.toContain('MIT');
    expect(status).not.toContain('status/arch');
    expect(footer).not.toContain('status/arch');
  });

  it.each(['base', 'light'])('%s text tokens keep AA contrast on every neutral surface', (theme) => {
    // The page sheet owns the surface palette, the action sheet owns the primary set; merge both
    // so neither can drift without this assertion noticing.
    const sheets = ['landing', 'actions'].map((name) => source(`src/components/marketing/${name}.css`));
    const blockFor = (css: string) => (theme === 'base' ? /^\.mk \{([^}]+)\}/m : /\.mk-light \.mk \{([^}]+)\}/).exec(css)?.[1] ?? '';
    const tokens = Object.fromEntries(sheets.flatMap((css) => [...blockFor(css).matchAll(/(--mk-[\w-]+): (#[\da-f]{6})/gi)].map((match) => [match[1]!, match[2]!])));
    const luminance = (hex: string) => [0, 2, 4].map((offset) => {
      const channel = parseInt(hex.slice(offset + 1, offset + 3), 16) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    }).reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index]!, 0);
    const contrast = (foreground: string, background: string) => {
      const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
      return (values[0]! + 0.05) / (values[1]! + 0.05);
    };
    for (const foreground of ['--mk-fg', '--mk-muted', '--mk-subtle']) {
      for (const background of ['--mk-bg', '--mk-bg-soft', '--mk-surface', '--mk-surface-2', '--mk-hover']) {
        expect(contrast(tokens[foreground]!, tokens[background]!), `${theme}: ${foreground} on ${background}`).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(contrast(tokens['--mk-on-primary']!, tokens['--mk-primary']!)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(tokens['--mk-on-primary-hover']!, tokens['--mk-primary-hover']!)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(tokens['--mk-accent-strong']!, tokens['--mk-bg']!)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(tokens['--mk-info-strong']!, tokens['--mk-bg']!)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the accent flat — open surfaces, no glow — and preserves focus and reduced-motion affordances', () => {
    const css = source('src/components/marketing/landing.css');
    // One warm accent, flat, never a bloom or a glow. Blue was swept across the whole
    // page once before; it may only return as --mk-info, the Monitoring state colour.
    expect(css).toContain('--mk-accent: #e2401a');
    expect(css).toContain('--mk-accent-strong: #bf2c0b');
    expect(css).not.toContain('#3b8ef4');
    expect(css).not.toContain('#1c5cc0');
    expect(css).not.toMatch(/box-shadow|radial-gradient|text-shadow|drop-shadow/);
    expect(css).toContain('--mk-line: #26262b');
    expect(css).toContain('.mk-light .mk');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(source('src/components/marketing/site-chrome.tsx')).not.toContain('useLenis');
  });

  it('keeps blue semantic, buttons token-driven and pane labels unclipped', () => {
    const css = source('src/components/marketing/landing.css') + source('src/components/marketing/actions.css');
    const lattice = source('src/components/marketing/control-lattice.tsx');
    // Monitoring reads blue because it is a state, not because blue is the brand.
    expect(css).toMatch(/\.mk-state--monitoring \{[^}]*var\(--mk-info-soft\)/);
    expect(css).toMatch(/\.mk-dot--monitoring \{ background: var\(--mk-info\); \}/);
    expect(lattice).toContain('EMBER');
    expect(lattice).not.toContain('59, 142, 244');
    // Button hover flips through the theme's own tokens, so it cannot go dark-on-dark
    // on a dark band or stay hardcoded to one theme.
    expect(css).toMatch(/\.mk-button:hover \{ background: var\(--mk-primary-hover\); color: var\(--mk-on-primary-hover\);/);
    // The fake "Approve fix" action follows the real button rule: white pill, ink label, a
    // hairline so it stays visible on the white phone pane — never an ink block, no accent fill.
    expect(css).toMatch(/\.mk \.mk-approve \{[^}]*border: 1px solid var\(--mk-primary-line\)/);
    // Pane tags straddle the top edge; the pane must not clip them in half.
    expect(css).toMatch(/\.mk-pane \{[^}]*overflow: visible;/);
    // Hiding the header CTA on small phones must not hide the mobile menu's CTA too.
    // The type tokens must actually be defined — every heading and label reads
    // through them, so losing them silently falls the whole page back to a system face.
    expect(css).toContain('--mk-display: var(--font-space-grotesk)');
    expect(css).toContain('--mk-sans: var(--font-inter)');
    expect(css).toContain('--mk-mono: var(--font-geist-mono)');
    expect(css).toContain('.mk-nav-actions .mk-button--small { display: none; }');
    expect(css).not.toContain('.mk-nav .mk-button--small { display: none; }');
  });

  it('derives shared strings instead of hard-coding them a second time', () => {
    const deploy = source('src/components/marketing/deploy.tsx');
    const engine = source('src/components/marketing/engine.tsx');
    expect(deploy).toContain('`git clone ${GITHUB_REPO_URL}.git`');
    expect(deploy).not.toContain('git clone https://github.com/');
    expect(engine).toContain('{AI_NAME} · engine');
  });

  it('separates sections by rhythm and white bands, not rigid ruled frames', () => {
    const css = source('src/components/marketing/landing.css');
    expect(css).toMatch(/\.mk-section \{[^}]*padding-block: 104px/);
    expect(css).not.toMatch(/\.mk-section \{[^}]*border-bottom/);
    expect(css).not.toContain('.mk-section::before');
    expect(css).toMatch(/\.mk-band--white \{[^}]*border-block: 1px solid/);
    expect(css).toMatch(/\.mk-tech-grid \{[^}]*gap: 8px/);
    expect(css).toMatch(/\.mk-tech-grid li \{[^}]*border-radius: 9px/);
  });

  it('uses one action system: pill buttons, a ghost variant and a single primary per view', () => {
    const css = source('src/components/marketing/landing.css');
    expect(css).toMatch(/\.mk-button \{[^}]*border-radius: 999px/);
    expect(css).toMatch(/\.mk-button \{[^}]*height: 46px/);
    expect(css).toContain('.mk-button--ghost');
    expect(css).toContain('.mk-button--small');
    expect(css).toMatch(/\.mk-button:hover \{[^}]*transform: translateY\(-1px\)/);
  });

  it('closes on a warm band that ends at the link bar, with white actions that read at rest', () => {
    const css = source('src/components/marketing/landing.css');
    const footerSource = source('src/components/marketing/footer.tsx');
    const footer = render(SiteFooter);

    // The closing band keeps its paper-to-ember gradient.
    expect(css).toMatch(/\.mk-footer-cta \{[^}]*linear-gradient/);

    // The oversized wordmark and the scrolling proof rail were removed: the band ends on the
    // legal bar, and nothing decorative sits underneath it.
    expect(footerSource).not.toContain('mk-watermark');
    expect(footerSource).not.toContain('mk-footer-rail');
    expect(css).not.toContain('.mk-watermark');
    expect(css).not.toContain('mk-footer-rail');
    expect(footer).not.toContain('data-mk-wordmark');
    expect(footer).not.toContain('<text ');
    // The only decorative SVGs left are the small link arrows.
    expect(footer.match(/<svg /g)?.every((tag) => tag === '<svg ')).toBe(true);

    // Both actions are white pills with ink labels — legible on paper, peach and ember alike.
    expect(css).toMatch(/\.mk-footer-cta \.mk-button\.mk-button--on-ember \{[^}]*background: var\(--mk-footer-mist\)/);
    expect(css).toMatch(/\.mk-footer-cta \.mk-button\.mk-button--on-ember \{[^}]*color: var\(--mk-footer-ink\)/);
    expect(footer.match(/mk-button--on-ember/g)).toHaveLength(2);
    expect(footer).toContain('Get started for free');
    expect(footer).toContain('Talk to an expert');
  });

  it('keeps action labels from being recoloured by the prose anchor rule', () => {
    const css = source('src/components/marketing/actions.css');
    // `.mk a` / `.mk button` set `color: inherit` at (0,1,1). A bare `.mk-button` (0,1,0) loses that
    // fight, so the pill was painted ink and its label inherited the same ink — a button that
    // looked empty. The action colour is restated where it outranks the prose rule.
    const specificity = (selector: string): [number, number, number] => {
      const ids = (selector.match(/#[\w-]+/g) ?? []).length;
      const classes = (selector.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g) ?? []).length;
      const elements = (selector.match(/(?:^|[\s>+~])([a-z][\w-]*)/gi) ?? []).length;
      return [ids, classes, elements];
    };
    const beats = (a: string, b: string) => {
      const x = specificity(a);
      const y = specificity(b);
      for (let i = 0; i < 3; i += 1) {
        const [mine, theirs] = [x[i] ?? 0, y[i] ?? 0];
        if (mine !== theirs) return mine > theirs;
      }
      return false;
    };

    const page = source('src/components/marketing/landing.css');
    expect(page).toContain('.mk a { color: inherit;');
    expect(css).toMatch(/\.mk a\.mk-button,\s*\n\.mk button\.mk-button \{[^}]*color: var\(--mk-on-primary\);/);
    expect(beats('.mk a.mk-button', '.mk a')).toBe(true);
    // The ghost variant restates its own label colour at the same weight, or it would fall back
    // to the ink above and vanish on the dark windows the panes live in.
    expect(css).toMatch(/\.mk a\.mk-button--ghost,\s*\n\.mk button\.mk-button--ghost,[\s\S]*?color: var\(--mk-fg\);/);
    expect(beats('.mk a.mk-button--ghost', '.mk a')).toBe(true);
    // The closing band keeps its own ink by matching the new specificity. Its rules live in the
    // page sheet, which is why they are stated as `.mk-button.mk-button--on-ember`.
    expect(page).toContain('.mk-footer-cta .mk-button.mk-button--on-ember {');
    expect(beats('.mk-footer-cta .mk-button.mk-button--on-ember', '.mk a.mk-button')).toBe(true);
    // The action sheet has to load after the page sheet, or a cached copy of the page sheet could
    // win the tie on the shared selectors.
    const layout = source('src/app/(marketing)/layout.tsx');
    expect(layout.indexOf('marketing/landing.css')).toBeLessThan(layout.indexOf('marketing/actions.css'));
  });

  it('gives every primary action a white pill rather than an ink block', () => {
    const css = source('src/components/marketing/actions.css');
    // The light palette's action colour is white, so nav, hero, status and demo buttons all read
    // as white pills with ink labels instead of black blocks on the paper.
    expect(css).toMatch(/\.mk-light \.mk \{[\s\S]*?--mk-primary: #ffffff;/);
    expect(css).toMatch(/\.mk-light \.mk \{[\s\S]*?--mk-on-primary: #10131a;/);
    expect(css).not.toMatch(/\.mk-light \.mk \{[\s\S]*?--mk-primary: #10131a;/);
    // A white pill on paper or a white band needs an outline to stay visible; this surface stays
    // flat, so the outline is a hairline rather than a shadow.
    expect(css).toMatch(/\.mk-light \.mk \{[\s\S]*?--mk-primary-line: #6f6c66;/);
    expect(css).toMatch(/\.mk a\.mk-button,[\s\S]*?border-color: var\(--mk-primary-line\)/);
    expect(css).not.toMatch(/box-shadow/);
    // The other controls that used the ink fill follow the same rule.
    expect(css).toMatch(/\.mk \.mk-tab\[aria-selected='true'\] \{[^}]*border-color: var\(--mk-primary-line\)/);
    expect(css).toMatch(/\.mk \.mk-approve \{[^}]*border: 1px solid var\(--mk-primary-line\)/);
    // Geometry stays with the component.
    const page = source('src/components/marketing/landing.css');
    expect(page).toMatch(/\.mk-button \{[\s\S]*?border: 1px solid var\(--mk-primary-line\)/);
    expect(page).toMatch(/\.mk-pane-tag \{[\s\S]*?border: 1px solid var\(--mk-line-strong\)/);
  });

  it('keeps the marketing page on a plain surface rather than a drawn lattice', () => {
    const css = source('src/components/marketing/landing.css');
    // The page paints one flat fill. There is no squared grid and no masked survey rule on the
    // closing band: colour and spacing separate sections, not checks. The hero stage's four
    // scale lines are a frame, not a lattice — they are plain spans, never a tiled pattern,
    // and the painted dawn is an <img>, so no pseudo-element field returns either.
    expect(css).toMatch(/\.mk \{[^}]*background-color: var\(--mk-bg\)/);
    expect(css).not.toContain('--mk-grid-size');
    expect(css).not.toContain('--mk-grid-line');
    expect(css).not.toMatch(/linear-gradient\(to (right|bottom), [^)]*1px, transparent 1px\)/);
    expect(css).not.toContain('.mk-hero::before');
    expect(css).not.toContain('.mk-stage::before');
    expect(css).not.toContain('.mk-footer-cta::after');
    // The surfaces that used to carry the pattern are flat fills.
    expect(css).toMatch(/\.mk-hero \{[^}]*background: var\(--mk-bg\)/);
    expect(css).toMatch(/\.mk-stage \{[^}]*background: var\(--mk-surface-2\)/);
    // No other decorative pattern is allowed onto the page either.
    expect(css).not.toMatch(/radial-gradient/);
  });

  it('retires the sticky navbar after 5s of idle pointer time and wakes it on top-edge hover', () => {
    const navSource = source('src/components/marketing/nav.tsx');
    const css = source('src/components/marketing/landing.css');
    expect(navSource).toContain('const IDLE_MS = 5000');
    expect(navSource).toContain('const WAKE_ZONE_PX = 104');
    expect(navSource).toContain('mk-nav--idle');
    expect(css).toMatch(/\.mk-nav--idle \{[^}]*transform: translateY\(-115%\)/);
  });

  it('swaps the hero Get started action on hover and carries distinct atmospheric backgrounds and smooth scroll', () => {
    const actionSource = source('src/components/marketing/get-started-action.tsx');
    const smoothSource = source('src/components/marketing/smooth-scroll.tsx');
    const hero = render(Hero);
    const css = source('src/components/marketing/landing.css');

    // Hero action wraps the sunbeam dot-grid and label in a measured swap choreography.
    expect(hero).toContain('mk-action-label');
    expect(hero).toContain('mk-dots');
    expect(actionSource).toContain('textWidth + gap');
    expect(actionSource).toContain('-(chipWidth + gap)');

    // Five distinct atmospheric paintings rhyme with the hero dawn without repeating hero-dawn.jpg.
    for (const file of ['atmos-mist.jpg', 'atmos-clouds.jpg', 'atmos-dunes.jpg', 'atmos-night.jpg', 'atmos-dusk.jpg']) {
      expect(existsSync(`public/marketing/${file}`), `Missing atmosphere asset: ${file}`).toBe(true);
      expect(css).toContain(`/marketing/${file}`);
    }
    expect(css).not.toMatch(/\.mk-atmos[^{]*\{[^}]*hero-dawn\.jpg/);

    // Slow weighted wheel glide and masked heading reveals across the hero and every section.
    expect(smoothSource).toContain('const EASE = 0.068');
    expect(hero).toContain('data-mk-heading');
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

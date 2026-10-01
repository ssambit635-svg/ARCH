import { describe, expect, it } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), 'utf8');

describe('marketing video delivery', () => {
  it('ships short browser-compatible, silent clips and real fallback posters', () => {
    for (const name of ['alpine', 'dragon']) {
      const media = readFileSync(join(root, `public/arch-${name}-reveal.mp4`));
      expect(media.toString('ascii', 4, 8)).toBe('ftyp');
      expect(media.includes(Buffer.from('avc1'))).toBe(true);
      expect(media.includes(Buffer.from('soun'))).toBe(false);
      // The hero film now renders full-frame (100svh cover), so the clips ship at 1080p
      // instead of 848×478 — the cap follows the new delivery budget, still "light".
      expect(media.length).toBeLessThan(3_500_000);
      expect(statSync(join(root, `public/arch-${name}-poster.jpg`)).size).toBeGreaterThan(4_000);
    }
  });

  it('keeps the original navigation while the supplied alpine film owns the hero wordmark', () => {
    const page = source('src/app/(marketing)/page.tsx');
    const hero = source('src/components/marketing/hero.tsx');
    expect(page).toContain('<MarketingNav />');
    expect(page).toContain('<Hero />');
    // The layout already mounts SiteChrome; mounting it twice also starts Lenis twice.
    expect(page).not.toContain('<SiteChrome>');
    expect(hero).toContain('/arch-alpine-reveal.mp4');
    expect(hero).toContain('playOnce');
    expect(hero).not.toContain('hero-wordmark-char');
    expect(source('src/components/marketing/closing.tsx')).toContain('/arch-dragon-reveal.mp4');
  });
});

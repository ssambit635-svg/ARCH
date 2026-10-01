import { describe, expect, it } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), 'utf8');

describe('marketing video delivery', () => {
  it('ships short browser-compatible, silent clips and real fallback posters', () => {
    for (const { video, poster } of [
      { video: 'wwm.mp4', poster: 'wwm-poster.jpg' },
      { video: 'arch-dragon-reveal.mp4', poster: 'arch-dragon-poster.jpg' },
    ]) {
      const media = readFileSync(join(root, 'public', video));
      expect(media.toString('ascii', 4, 8)).toBe('ftyp');
      expect(media.includes(Buffer.from('avc1'))).toBe(true);
      expect(media.includes(Buffer.from('soun'))).toBe(false);
      // Fast-start metadata must arrive before the video frames for prompt playback.
      expect(media.indexOf(Buffer.from('moov'))).toBeLessThan(media.indexOf(Buffer.from('mdat')));
      expect(media.length).toBeLessThan(3_500_000);
      expect(statSync(join(root, 'public', poster)).size).toBeGreaterThan(4_000);
    }
  });

  it('keeps the original navigation while the supplied wwm film owns the hero wordmark', () => {
    const page = source('src/app/(marketing)/page.tsx');
    const hero = source('src/components/marketing/hero.tsx');
    expect(page).toContain('<MarketingNav />');
    expect(page).toContain('<Hero />');
    // The layout already mounts SiteChrome; mounting it twice also starts Lenis twice.
    expect(page).not.toContain('<SiteChrome>');
    expect(hero).toContain('/wwm.mp4');
    expect(hero).toContain('/wwm-poster.jpg');
    expect(hero).not.toContain('/arch-alpine-reveal.mp4');
    expect(hero).toContain('playOnce');
    expect(hero).not.toContain('hero-wordmark-char');
    expect(source('src/components/marketing/closing.tsx')).toContain('/arch-dragon-reveal.mp4');
  });
});

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), 'utf8');

/** Intrinsic pixel size of a WebP file (VP8X canvas, or the VP8 / VP8L frame header). */
function webpSize(bytes: Buffer): { width: number; height: number } {
  expect(bytes.subarray(0, 4).toString('ascii')).toBe('RIFF');
  expect(bytes.subarray(8, 12).toString('ascii')).toBe('WEBP');
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const fourcc = bytes.subarray(offset, offset + 4).toString('ascii');
    const size = bytes.readUInt32LE(offset + 4);
    const payload = offset + 8;
    if (fourcc === 'VP8X') {
      return { width: bytes.readUIntLE(payload + 4, 3) + 1, height: bytes.readUIntLE(payload + 7, 3) + 1 };
    }
    if (fourcc === 'VP8 ') {
      return { width: bytes.readUInt16LE(payload + 6) & 0x3fff, height: bytes.readUInt16LE(payload + 8) & 0x3fff };
    }
    if (fourcc === 'VP8L') {
      const bits = bytes.readUInt32LE(payload + 1);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    offset = payload + size + (size % 2);
  }
  throw new Error('no WebP frame header found');
}

/**
 * Marketing imagery is the product itself. These are captures of shipped ARCH screens, not
 * illustrations: if a capture is replaced, its alt text and caption have to be rewritten with it.
 */
describe('marketing imagery', () => {
  const SCREENS = [
    { file: 'public/product/incident-workspace.webp', width: 1440, height: 900, used: 'src/components/marketing/hero.tsx' },
    { file: 'public/product/status-page.webp', width: 764, height: 620, used: 'src/components/marketing/status-proof.tsx' },
  ];

  it('ships captioned product screens at twice the size the page reserves for them', () => {
    for (const screen of SCREENS) {
      const bytes = readFileSync(join(root, screen.file));
      // Declared width/height are the CSS box; the file carries a 2x frame so UI text stays crisp.
      expect(webpSize(bytes), `${screen.file} intrinsic size`).toEqual({ width: screen.width * 2, height: screen.height * 2 });
      expect(bytes.length).toBeGreaterThan(20_000);

      const component = source(screen.used);
      expect(component).toContain(screen.file.replace(/^public\//, '/'));
      expect(component).toContain(`width={${screen.width}}`);
      expect(component).toContain(`height={${screen.height}}`);
      expect(component, `${screen.used} needs a visible caption beside the screenshot`).toContain('<figcaption');
      expect(component).toContain('Sample data');
    }
  });

  it('describes every screen for screen readers', () => {
    for (const screen of SCREENS) {
      const alt = /alt="([^"]+)"/.exec(source(screen.used))?.[1] ?? '';
      // A decorative alt="" is not allowed here: these images carry the product detail.
      expect(alt.length, `${screen.used} alt text is missing or too thin to be useful`).toBeGreaterThan(60);
    }
  });

  it('ships no retired brand films, mascot assets, sample avatars or design dumps', () => {
    // This is the cleanup the brief asked for: the repository carries the product, not a scratch
    // folder. Each path below was either a one-off upload or a retired marketing experiment.
    const retired = [
      "Word_'ARCH'_emerges_from_mountains_20261004010409.mp4",
      'public/wwm.mp4',
      'public/wwm-poster.jpg',
      'public/avatars',
      'public/robot',
      'DESIGN.md',
      'DESIGN (1).md',
      'DESIGN (2).md',
      'SKILL.md',
      'SKILL (1).md',
      'wappalyzer_incident-io.csv',
    ];
    for (const path of retired) {
      expect(existsSync(join(root, path)), `${path} is a retired upload and must not ship`).toBe(false);
    }

    for (const component of [
      ...SCREENS.map((screen) => screen.used),
      'src/components/marketing/nav.tsx',
      'src/components/marketing/footer.tsx',
    ]) {
      expect(source(component)).not.toContain('.mp4');
    }
    expect(statSync(join(root, 'public/product/incident-workspace.webp')).size).toBeGreaterThan(100_000);
  });
});

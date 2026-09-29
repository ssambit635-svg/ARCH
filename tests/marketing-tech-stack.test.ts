import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { TECH_STACK } from '@/components/marketing/tech-stack-data';

/**
 * The landing hero's "Tech Stack" row is a public claim about what ARCH is built on. It used to be
 * four hand-typed tiles, one of them ("GSAP + Motion") sharing an icon and none of it checked. Every
 * tile now names its evidence, and this suite is what makes that evidence binding: a technology that
 * is not in package.json (or the repository), or a version that has moved on, fails here.
 */

const root = process.cwd();
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  engines?: { node?: string };
};
const installed = { ...pkg.dependencies, ...pkg.devDependencies };

/** "^3.15.0" → "3", "5.0.0-beta.32" → "5", ">=20.19" → "20" */
const major = (range: string | undefined) => /(\d+)/.exec(range ?? '')?.[1];

/** A trailing number in a label is a claimed version: "Next.js 16" → 16, "Node.js 20+" → 20 (open-ended). */
const claimedVersion = (label: string) => {
  const match = /\s(\d+)(\+)?$/.exec(label);
  return match ? { major: match[1], openEnded: match[2] === '+' } : null;
};

describe('landing hero — tech stack tiles', () => {
  it('has a tile per technology, each listed once', () => {
    expect(TECH_STACK.length).toBeGreaterThan(4);
    expect(new Set(TECH_STACK.map((t) => t.id)).size).toBe(TECH_STACK.length);
    expect(new Set(TECH_STACK.map((t) => t.label)).size).toBe(TECH_STACK.length);
  });

  it.each(TECH_STACK.map((tech) => [tech.label, tech] as const))('%s — is really used by this repository', (_label, tech) => {
    if ('dependency' in tech.proof) {
      expect(installed, `${tech.proof.dependency} is not in package.json`).toHaveProperty([tech.proof.dependency]);
    } else if ('engine' in tech.proof) {
      expect(pkg.engines?.[tech.proof.engine], `package.json has no engines.${tech.proof.engine}`).toBeTruthy();
    } else {
      expect(existsSync(path.join(root, tech.proof.path)), `${tech.proof.path} does not exist`).toBe(true);
    }
  });

  it.each(TECH_STACK.filter((tech) => claimedVersion(tech.label)).map((tech) => [tech.label, tech] as const))(
    '%s — the version on the tile is the version in package.json',
    (_label, tech) => {
      const claim = claimedVersion(tech.label);
      if ('dependency' in tech.proof) {
        expect(claim?.major).toBe(major(installed[tech.proof.dependency]));
        expect(claim?.openEnded).toBe(false);
      } else if ('engine' in tech.proof) {
        expect(claim?.major).toBe(major(pkg.engines?.[tech.proof.engine]));
        expect(claim?.openEnded, 'engines.node is a minimum, so the tile must say "N+"').toBe(true);
      } else {
        throw new Error(`"${tech.label}" shows a version but its proof is a file, which cannot back one`);
      }
    },
  );

  it('does not advertise Three.js — it only ever powered the hero ball, which is gone', () => {
    expect(TECH_STACK.some((tech) => /three|r3f|fiber|drei/i.test(`${tech.id} ${tech.label}`))).toBe(false);
  });
});

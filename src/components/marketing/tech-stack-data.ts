/**
 * The technology tiles in the landing hero's "Tech Stack" row.
 *
 * This list is a claim about what ARCH runs on, so every entry carries its evidence — an npm
 * dependency, the Node engine, or a file in this repository — and `tests/marketing-tech-stack.test.ts`
 * checks that evidence (and that a version shown in a label still matches package.json). A tile for
 * something ARCH does not actually use, or a stale major version, fails the suite instead of shipping.
 *
 * Deliberately absent: Three.js / react-three-fiber (they only powered the hero ball, now removed),
 * and anything that is merely optional or planned. Order is the order the tiles render in.
 */

export type TechId =
  | 'next'
  | 'react'
  | 'typescript'
  | 'tailwind'
  | 'node'
  | 'postgres'
  | 'prisma'
  | 'authjs'
  | 'zod'
  | 'octokit'
  | 'gsap'
  | 'motion'
  | 'vitest'
  | 'docker'
  | 'python';

export type TechProof =
  /** A package in package.json (dependencies or devDependencies). A trailing major in the label follows it. */
  | { dependency: string }
  /** `engines.node` in package.json. A trailing "N+" in the label follows it. */
  | { engine: 'node' }
  /** A file that exists in the repository (path relative to the repo root). */
  | { path: string };

export type TechStackEntry = {
  id: TechId;
  /** What the tile says. A trailing number is a version and is verified against `proof`. */
  label: string;
  proof: TechProof;
};

export const TECH_STACK: readonly TechStackEntry[] = [
  { id: 'next', label: 'Next.js 16', proof: { dependency: 'next' } },
  { id: 'react', label: 'React 19', proof: { dependency: 'react' } },
  { id: 'typescript', label: 'TypeScript 5', proof: { dependency: 'typescript' } },
  { id: 'tailwind', label: 'Tailwind CSS 4', proof: { dependency: 'tailwindcss' } },
  { id: 'node', label: 'Node.js 20+', proof: { engine: 'node' } },

  // PostgreSQL is unversioned on purpose: Docker runs 16, the embedded dev/test server ships 18.
  { id: 'postgres', label: 'PostgreSQL', proof: { dependency: 'pg' } },
  { id: 'prisma', label: 'Prisma 7', proof: { dependency: 'prisma' } },
  { id: 'authjs', label: 'Auth.js 5', proof: { dependency: 'next-auth' } },
  { id: 'zod', label: 'Zod 4', proof: { dependency: 'zod' } },
  { id: 'octokit', label: 'Octokit', proof: { dependency: '@octokit/rest' } },

  { id: 'gsap', label: 'GSAP', proof: { dependency: 'gsap' } },
  { id: 'motion', label: 'Motion', proof: { dependency: 'motion' } },
  { id: 'vitest', label: 'Vitest', proof: { dependency: 'vitest' } },
  { id: 'docker', label: 'Docker', proof: { path: 'docker-compose.yml' } },
  { id: 'python', label: 'Python', proof: { path: 'clients/python/pyproject.toml' } },
];

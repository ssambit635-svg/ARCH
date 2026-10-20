'use client';

import type { PointerEvent, ReactNode } from 'react';
import { GsapMark, NextMark, TailwindMark, TypeScriptMark } from './tech-marks';
import {
  AuthJsIcon,
  DockerIcon,
  GitHubIcon,
  NodeIcon,
  PostgresIcon,
  PrismaIcon,
  PythonIcon,
  ReactAtomIcon,
  VitestIcon,
  ZodIcon,
} from './tech-icons';
import { TECH_STACK, type TechId, type TechStackEntry } from './tech-stack-data';

const ICONS: Record<TechId, ReactNode> = {
  next: <NextMark />,
  react: <ReactAtomIcon />,
  typescript: <TypeScriptMark />,
  tailwind: <TailwindMark />,
  node: <NodeIcon />,
  postgres: <PostgresIcon />,
  prisma: <PrismaIcon />,
  authjs: <AuthJsIcon />,
  zod: <ZodIcon />,
  octokit: <GitHubIcon />,
  gsap: <GsapMark />,
  vitest: <VitestIcon />,
  docker: <DockerIcon />,
  python: <PythonIcon />,
};

/** The evidence a tile stands on, in one short mono line. */
function proofLabel(tech: TechStackEntry) {
  if ('dependency' in tech.proof) return tech.proof.dependency;
  if ('engine' in tech.proof) return `engines.${tech.proof.engine}`;
  return tech.proof.path;
}

function proofTitle(tech: TechStackEntry) {
  if ('dependency' in tech.proof) return `proven via ${tech.proof.dependency} in package.json`;
  if ('engine' in tech.proof) return `proven via engines.${tech.proof.engine} in package.json`;
  return `proven via ${tech.proof.path}`;
}

/**
 * One tile per technology, drawn from `TECH_STACK` (the single source of the list and its proof).
 *
 * The row is a frame, not a list: each tile carries a pointer-tracked spotlight (a conic wedge,
 * painted inside the tile so the panel stays flat) and a shallow 3D tilt. The interaction is
 * pointer-only — the tile is complete and legible at rest, and every animation is a transform,
 * so reduced-motion visitors and keyboard users still get the whole frame.
 */
export function TechStackTiles() {
  const track = (event: PointerEvent<HTMLLIElement>) => {
    const tile = event.currentTarget;
    const rect = tile.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    tile.style.setProperty('--mk-tile-x', `${(x * 100).toFixed(1)}%`);
    tile.style.setProperty('--mk-tile-y', `${(y * 100).toFixed(1)}%`);
    tile.style.setProperty('--mk-tile-rx', `${((0.5 - y) * 9).toFixed(2)}deg`);
    tile.style.setProperty('--mk-tile-ry', `${((x - 0.5) * 9).toFixed(2)}deg`);
  };

  const reset = (event: PointerEvent<HTMLLIElement>) => {
    const tile = event.currentTarget;
    tile.style.removeProperty('--mk-tile-x');
    tile.style.removeProperty('--mk-tile-y');
    tile.style.removeProperty('--mk-tile-rx');
    tile.style.removeProperty('--mk-tile-ry');
  };

  return (
    <ul className="mk-tech-grid" data-mk-stagger aria-label="ARCH technology stack">
      {TECH_STACK.map((tech, index) => (
        <li
          key={tech.id}
          title={`${tech.label} — ${proofTitle(tech)}`}
          onPointerMove={track}
          onPointerLeave={reset}
        >
          <span className="mk-tech-icon" aria-hidden="true">{ICONS[tech.id]}</span>
          <span className="mk-tech-copy">
            <span className="mk-tech-name">{tech.label}</span>
            <span className="mk-tech-proof">{proofLabel(tech)}</span>
          </span>
          <span className="mk-tech-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
        </li>
      ))}
    </ul>
  );
}

import type { ReactNode } from 'react';
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
import { TECH_STACK, type TechId } from './tech-stack-data';

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

/**
 * One tile per technology, drawn from `TECH_STACK` (the single source of the list and its proof).
 * The row sits on a dark panel, so the light brand marks stay legible without a second icon set.
 */
export function TechStackTiles() {
  return (
    <ul className="mk-tech-grid" data-mk-stagger aria-label="ARCH technology stack">
      {TECH_STACK.map((tech) => (
        <li
          key={tech.id}
          title={`${tech.label} — proven via ${'dependency' in tech.proof ? tech.proof.dependency : 'engine' in tech.proof ? `engines.${tech.proof.engine}` : tech.proof.path}`}
        >
          <span className="mk-tech-icon" aria-hidden="true">{ICONS[tech.id]}</span>
          <span>{tech.label}</span>
        </li>
      ))}
    </ul>
  );
}

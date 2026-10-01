import type { ReactNode } from 'react';
import { GSAPIcon, MotionIcon, NextIcon, TailwindIcon, TypeScriptIcon } from './vui-primitives';
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
  next: <NextIcon />,
  react: <ReactAtomIcon />,
  typescript: <TypeScriptIcon />,
  tailwind: <TailwindIcon />,
  node: <NodeIcon />,
  postgres: <PostgresIcon />,
  prisma: <PrismaIcon />,
  authjs: <AuthJsIcon />,
  zod: <ZodIcon />,
  octokit: <GitHubIcon />,
  gsap: <GSAPIcon />,
  motion: <MotionIcon />,
  vitest: <VitestIcon />,
  docker: <DockerIcon />,
  python: <PythonIcon />,
};

/** Flat, borderless technology list; each label retains its repository-backed evidence. */
export function TechStackTiles() {
  return (
    <ul className="mk-tech-grid" aria-label="ARCH technology stack">
      {TECH_STACK.map((tech) => (
        <li
          key={tech.id}
          title={`${tech.label} — ${'dependency' in tech.proof ? tech.proof.dependency : 'engine' in tech.proof ? `engines.${tech.proof.engine}` : tech.proof.path}`}
        >
          <span className="mk-tech-icon" aria-hidden="true">{ICONS[tech.id]}</span>
          <span>{tech.label}</span>
        </li>
      ))}
    </ul>
  );
}

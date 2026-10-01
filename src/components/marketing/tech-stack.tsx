import type { ReactNode } from 'react';
import { GSAPIcon, IsometricStack, MotionIcon, NextIcon, TailwindIcon, TypeScriptIcon } from './vui-primitives';
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
  next: <NextIcon className="size-8" />,
  react: <ReactAtomIcon className="size-7" />,
  typescript: <TypeScriptIcon className="size-8" />,
  tailwind: <TailwindIcon className="size-8 text-[#3b8ef4]" />,
  node: <NodeIcon className="size-7" />,
  postgres: <PostgresIcon className="size-7" />,
  prisma: <PrismaIcon className="size-7" />,
  authjs: <AuthJsIcon className="size-7" />,
  zod: <ZodIcon className="size-7" />,
  octokit: <GitHubIcon className="size-7" />,
  gsap: <GSAPIcon className="size-8 text-[#3b8ef4]" />,
  motion: <MotionIcon className="size-8" />,
  vitest: <VitestIcon className="size-7" />,
  docker: <DockerIcon className="size-7" />,
  python: <PythonIcon className="size-7" />,
};

/**
 * The original tile grid: one ruled cell per technology, each holding the classic Vengeance UI
 * isometric stack that presses down on click. Labels keep their repository-backed evidence in the
 * `title`, and TECH_STACK (tech-stack-data.ts) remains the single source of the list.
 */
export function TechStackTiles() {
  return (
    <ul className="mk-tech-grid" data-mk-stagger tabIndex={0} aria-label="ARCH technology stack">
      {TECH_STACK.map((tech) => (
        <li
          key={tech.id}
          title={`${tech.label} — proven via ${'dependency' in tech.proof ? tech.proof.dependency : 'engine' in tech.proof ? `engines.${tech.proof.engine}` : tech.proof.path}`}
        >
          <span className="mk-tech-icon" aria-hidden="true">
            <IsometricStack
              className="mk-iso"
              backFillClass="mk-iso-back"
              backStrokeClass="mk-iso-line"
              frontRectClass="mk-iso-front"
              linesClass="mk-iso-line"
            >
              {ICONS[tech.id]}
            </IsometricStack>
          </span>
          <span>{tech.label}</span>
        </li>
      ))}
    </ul>
  );
}

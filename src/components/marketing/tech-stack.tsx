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

/**
 * The tile grid of the hero's "Tech Stack" row: one Vengeance UI `IsometricStack` per technology
 * in TECH_STACK (tech-stack-data.ts), which is where the list — and the proof for every entry —
 * lives. This file only decides how each one looks.
 */

const ICONS: Record<TechId, ReactNode> = {
  next: <NextIcon className="size-8" />,
  react: <ReactAtomIcon className="size-7" />,
  typescript: <TypeScriptIcon className="size-8" />,
  tailwind: <TailwindIcon className="size-8 text-[#00BCFF]" />,
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

export function TechStackTiles() {
  return (
    // gap-px on a #222 ground draws the hairlines between cells, so the grid stays correct however
    // the tiles wrap (a divide-x/divide-y stack breaks as soon as there is more than one row).
    <div className="grid w-full grid-cols-3 gap-px border-t border-[#222] bg-[#222] lg:w-2/3 lg:grid-cols-5 lg:border-l lg:border-t-0">
      {TECH_STACK.map((tech) => (
        <div key={tech.id} className="flex flex-col items-center justify-center gap-2 bg-[#050608] px-2 py-6 xl:px-4">
          <IsometricStack>{ICONS[tech.id]}</IsometricStack>
          <span className="text-center font-mono text-[11px] leading-tight text-zinc-400 sm:text-xs">{tech.label}</span>
        </div>
      ))}
    </div>
  );
}

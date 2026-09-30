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
    // Production stack grid — 15 proven dependencies (see tech-stack-data.ts). gap-px on #222
    // draws exact 1px hairlines however tiles wrap; outer ring is the same token so gutters
    // never double at the edge. Hover lifts the tile and tints the label — the proven
    // “somany stuff we actually use” deserves to feel deliberate, not like a footnote.
    <div className="grid w-full grid-cols-3 gap-px overflow-hidden rounded-2xl border border-[#222] bg-[#222] sm:grid-cols-4 lg:grid-cols-5">
      {TECH_STACK.map((tech) => (
        <div
          key={tech.id}
          title={`${tech.label} — proven via ${'dependency' in tech.proof ? tech.proof.dependency : 'engine' in tech.proof ? `engines.${tech.proof.engine}` : tech.proof.path}`}
          className="group flex flex-col items-center justify-center gap-2.5 bg-[#050608] px-2 py-6 transition-colors duration-200 hover:bg-[#0b0c10] xl:px-3"
        >
          <span className="transition-transform duration-200 group-hover:scale-[1.04] group-hover:drop-shadow-[0_4px_16px_rgba(59,142,244,0.18)]">
            <IsometricStack>{ICONS[tech.id]}</IsometricStack>
          </span>
          <span className="text-center font-mono text-[11px] font-medium leading-tight tracking-tight text-zinc-400 transition-colors group-hover:text-zinc-100 sm:text-xs">
            {tech.label}
          </span>
        </div>
      ))}
    </div>
  );
}

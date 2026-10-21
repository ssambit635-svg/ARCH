'use client';

import { useState, type ReactNode } from 'react';
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

export type ConstellationGroup = 'orbit' | 'ascent' | 'ridge';

interface StarPlacement {
  group: ConstellationGroup;
  starCode: string;
  /** Percentage of sky stage (0..100), mapped to SVG 1000x520 as (x*10, y*5.2). */
  x: number;
  y: number;
  ra: string;
  dec: string;
  altitude: string;
  role: string;
}

const CONSTELLATION_META: Record<
  ConstellationGroup,
  {
    roman: string;
    name: string;
    subtitle: string;
    path: TechId[];
  }
> = {
  ridge: {
    roman: 'I',
    name: 'Mountain Ridge',
    subtitle: 'Data, runtime & host foundation',
    path: ['postgres', 'prisma', 'node', 'docker', 'python'],
  },
  ascent: {
    roman: 'II',
    name: 'Ascent Shield',
    subtitle: 'Type safety, auth & verification',
    path: ['typescript', 'zod', 'authjs', 'octokit', 'vitest'],
  },
  orbit: {
    roman: 'III',
    name: 'High Orbit',
    subtitle: 'Interface, rendering & motion',
    path: ['next', 'react', 'gsap', 'tailwind'],
  },
};

const STAR_MAP: Record<TechId, StarPlacement> = {
  // Constellation III · High Orbit (upper starry sky, framing the galaxy & ascending rocket)
  next: {
    group: 'orbit',
    starCode: 'α·01',
    x: 31,
    y: 16,
    ra: '14h 08m',
    dec: '+54° 12′',
    altitude: '410 km · Orbit',
    role: 'App Router & server rendering',
  },
  react: {
    group: 'orbit',
    starCode: 'α·02',
    x: 50,
    y: 13,
    ra: '15h 22m',
    dec: '+61° 04′',
    altitude: '430 km · Zenith',
    role: 'Concurrent UI primitives',
  },
  tailwind: {
    group: 'orbit',
    starCode: 'α·03',
    x: 68,
    y: 18,
    ra: '16h 45m',
    dec: '+49° 30′',
    altitude: '395 km · Orbit',
    role: 'Token-scoped utility styling',
  },
  gsap: {
    group: 'orbit',
    starCode: 'α·04',
    x: 58,
    y: 31,
    ra: '16h 04m',
    dec: '+38° 18′',
    altitude: '340 km · Contrail',
    role: 'Scroll-scrubbed choreography',
  },

  // Constellation II · Ascent Shield (mid-sky rose & peach clouds)
  typescript: {
    group: 'ascent',
    starCode: 'β·05',
    x: 14,
    y: 47,
    ra: '09h 14m',
    dec: '+24° 40′',
    altitude: '180 km · Stratosphere',
    role: 'End-to-end static contracts',
  },
  zod: {
    group: 'ascent',
    starCode: 'β·06',
    x: 32,
    y: 44,
    ra: '10h 52m',
    dec: '+28° 15′',
    altitude: '205 km · Ascent',
    role: 'Runtime payload & schema guard',
  },
  authjs: {
    group: 'ascent',
    starCode: 'β·07',
    x: 49,
    y: 52,
    ra: '12h 19m',
    dec: '+19° 08′',
    altitude: '165 km · Core',
    role: 'Session & OAuth boundary',
  },
  octokit: {
    group: 'ascent',
    starCode: 'β·08',
    x: 67,
    y: 48,
    ra: '13h 41m',
    dec: '+22° 50′',
    altitude: '190 km · Ascent',
    role: 'Verified PR & commit automation',
  },
  vitest: {
    group: 'ascent',
    starCode: 'β·09',
    x: 84,
    y: 55,
    ra: '15h 03m',
    dec: '+16° 25′',
    altitude: '150 km · Plume',
    role: '670+ integration & surface checks',
  },

  // Constellation I · Mountain Ridge (golden foothills & launch ridge)
  postgres: {
    group: 'ridge',
    starCode: 'γ·10',
    x: 13,
    y: 78,
    ra: '05h 30m',
    dec: '+04° 10′',
    altitude: '2.4 km · West Peak',
    role: 'Single source of relational truth',
  },
  prisma: {
    group: 'ridge',
    starCode: 'γ·11',
    x: 31,
    y: 74,
    ra: '06h 48m',
    dec: '+07° 55′',
    altitude: '3.1 km · High Pass',
    role: 'Typed query & migration engine',
  },
  node: {
    group: 'ridge',
    starCode: 'γ·12',
    x: 49,
    y: 80,
    ra: '08h 05m',
    dec: '+02° 30′',
    altitude: '1.9 km · Valley Base',
    role: 'CPU-native server & worker host',
  },
  docker: {
    group: 'ridge',
    starCode: 'γ·13',
    x: 67,
    y: 75,
    ra: '09h 27m',
    dec: '+06° 14′',
    altitude: '2.8 km · Launch Pad',
    role: 'Self-hosted container stack',
  },
  python: {
    group: 'ridge',
    starCode: 'γ·14',
    x: 85,
    y: 81,
    ra: '10h 59m',
    dec: '+01° 45′',
    altitude: '1.6 km · East Ridge',
    role: 'Sandboxed verification & CLI',
  },
};

/** Bridge links connecting the mountain launch pad through the mid-sky shield to the rocket in orbit. */
const ASCENT_BRIDGES: Array<[TechId, TechId]> = [
  ['postgres', 'typescript'],
  ['prisma', 'zod'],
  ['node', 'authjs'],
  ['docker', 'octokit'],
  ['zod', 'next'],
  ['authjs', 'react'],
  ['octokit', 'tailwind'],
];

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

const toSvgX = (pct: number) => Math.round(pct * 10);
const toSvgY = (pct: number) => Math.round(pct * 5.2);

/**
 * The Celestial Stack Chart: instead of a flat dark box of 14 generic cards, every verified
 * technology in `TECH_STACK` is plotted as a star node across a painted twilight sky with
 * layered watercolour mountains, a spiral nebula, and an ascending rocket.
 *
 * Three constellations group the stack from the ground up:
 *   I · Mountain Ridge (PostgreSQL, Prisma 7, Node.js 20+, Docker, Python)
 *   II · Ascent Shield (TypeScript 5, Zod 4, Auth.js 5, Octokit, Vitest)
 *   III · High Orbit (Next.js 16, React 19, GSAP, Tailwind CSS 4)
 */
export function TechStackTiles() {
  const [activeId, setActiveId] = useState<TechId>('next');
  const [filterGroup, setFilterGroup] = useState<ConstellationGroup | 'all'>('all');

  const activeEntry = TECH_STACK.find((item) => item.id === activeId) ?? TECH_STACK[0]!;
  const activeStar = STAR_MAP[activeEntry.id];
  const activeConstellation = CONSTELLATION_META[activeStar.group];
  const highlightedGroup = filterGroup === 'all' ? activeStar.group : filterGroup;

  return (
    <div className="mk-sky-observatory">
      {/* Constellation sector selector bar */}
      <div className="mk-sky-controls" role="toolbar" aria-label="Constellation sectors">
        <button
          type="button"
          className={`mk-sky-pill${filterGroup === 'all' ? ' is-active' : ''}`}
          aria-pressed={filterGroup === 'all'}
          onClick={() => setFilterGroup('all')}
        >
          <span className="mk-sky-pill-dot" aria-hidden="true" />
          All 14 stars
        </button>
        {(['ridge', 'ascent', 'orbit'] as const).map((groupKey) => {
          const meta = CONSTELLATION_META[groupKey];
          const isSelected = filterGroup === groupKey;
          return (
            <button
              key={groupKey}
              type="button"
              className={`mk-sky-pill${isSelected ? ' is-active' : ''}`}
              aria-pressed={isSelected}
              onClick={() => {
                setFilterGroup(isSelected ? 'all' : groupKey);
                setActiveId(meta.path[0]!);
              }}
            >
              <span className="mk-sky-pill-roman">{meta.roman}</span>
              <span>{meta.name}</span>
            </button>
          );
        })}
      </div>

      {/* Painted sky + SVG constellation chart + interactive star nodes */}
      <div className="mk-sky-stage" data-mk-filter={filterGroup}>
        <svg
          className="mk-sky-svg"
          viewBox="0 0 1000 520"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {/* Astrolabe & observatory declination arcs */}
          <g className="mk-sky-astrolabe">
            <circle cx="115" cy="105" r="92" />
            <circle cx="115" cy="105" r="148" strokeDasharray="3 6" />
            <circle cx="500" cy="620" r="540" strokeDasharray="4 7" />
            <circle cx="500" cy="620" r="380" />
            <circle cx="500" cy="620" r="220" strokeDasharray="2 5" />
            <line x1="40" y1="260" x2="960" y2="260" strokeDasharray="2 8" />
            <line x1="500" y1="24" x2="500" y2="496" strokeDasharray="2 8" />
          </g>

          {/* Rocket launch trajectory arc from Docker/Launch Pad (670,390) up to the painted rocket (792,106) */}
          <path
            className="mk-sky-trajectory"
            d="M 670 390 Q 945 310 792 106"
            fill="none"
          />
          <circle className="mk-sky-rocket-target" cx="792" cy="106" r="6" />
          <circle className="mk-sky-rocket-ring" cx="792" cy="106" r="16" />

          {/* Dotted ascent bridges between layers */}
          <g className="mk-sky-bridges">
            {ASCENT_BRIDGES.map(([fromId, toId]) => {
              const from = STAR_MAP[fromId];
              const to = STAR_MAP[toId];
              const connectedToActive = activeEntry.id === fromId || activeEntry.id === toId;
              return (
                <line
                  key={`${fromId}-${toId}`}
                  x1={toSvgX(from.x)}
                  y1={toSvgY(from.y)}
                  x2={toSvgX(to.x)}
                  y2={toSvgY(to.y)}
                  className={connectedToActive ? 'is-lit' : undefined}
                />
              );
            })}
            {/* Orbit-to-rocket link */}
            <line
              x1={toSvgX(STAR_MAP.tailwind.x)}
              y1={toSvgY(STAR_MAP.tailwind.y)}
              x2={792}
              y2={106}
              className={highlightedGroup === 'orbit' ? 'is-lit' : undefined}
            />
          </g>

          {/* Primary constellation polylines for I · Ridge, II · Ascent, III · Orbit */}
          {(['ridge', 'ascent', 'orbit'] as const).map((groupKey) => {
            const meta = CONSTELLATION_META[groupKey];
            const points = meta.path
              .map((id) => `${toSvgX(STAR_MAP[id].x)},${toSvgY(STAR_MAP[id].y)}`)
              .join(' ');
            const isLit = highlightedGroup === groupKey;
            const isDimmed = filterGroup !== 'all' && filterGroup !== groupKey;
            return (
              <g
                key={groupKey}
                className={`mk-sky-constellation${isLit ? ' is-lit' : ''}${isDimmed ? ' is-dim' : ''}`}
              >
                <polyline points={points} fill="none" />
                {meta.path.map((id) => {
                  const pt = STAR_MAP[id];
                  const isActiveStar = activeEntry.id === id;
                  return (
                    <g key={id} transform={`translate(${toSvgX(pt.x)}, ${toSvgY(pt.y)})`}>
                      <circle r={isActiveStar ? 9 : 4.5} className="mk-sky-vertex-halo" />
                      <circle r={isActiveStar ? 3.2 : 2} className="mk-sky-vertex-core" />
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Subtle astronomical horizon & sector watermarks */}
        <div className="mk-sky-OverlayLabels" aria-hidden="true">
          <span className="mk-sky-coord mk-sky-coord--nw">NEBULA · M31 · HIGH ORBIT</span>
          <span className="mk-sky-coord mk-sky-coord--ne">ASCENT VECTOR · APOGEE 430 KM ↗</span>
          <span className="mk-sky-coord mk-sky-coord--sw">I · MOUNTAIN RIDGE FOUNDATION · ELEV 2,800 M</span>
        </div>

        {/* The 14 verified technology star-nodes */}
        <ul className="mk-tech-grid" data-mk-stagger aria-label="ARCH technology stack">
          {TECH_STACK.map((tech, index) => {
            const star = STAR_MAP[tech.id];
            const isActive = activeEntry.id === tech.id;
            const isSameGroup = highlightedGroup === star.group;
            const isDimmed = filterGroup !== 'all' && filterGroup !== star.group;

            return (
              <li
                key={tech.id}
                className={`mk-star-node${isActive ? ' is-active' : ''}${isSameGroup ? ' is-constellation' : ''}${isDimmed ? ' is-dim' : ''}`}
                style={{
                  '--mk-star-x': `${star.x}%`,
                  '--mk-star-y': `${star.y}%`,
                  '--mk-star-delay': `${(index * 0.35).toFixed(2)}s`,
                } as React.CSSProperties}
                title={`${tech.label} — ${proofTitle(tech)}`}
                tabIndex={0}
                onPointerEnter={() => setActiveId(tech.id)}
                onFocus={() => setActiveId(tech.id)}
                onClick={() => setActiveId(tech.id)}
              >
                <span className="mk-star-spark" aria-hidden="true" />
                <span className="mk-tech-icon" aria-hidden="true">{ICONS[tech.id]}</span>
                <span className="mk-tech-copy">
                  <span className="mk-tech-name">{tech.label}</span>
                  <span className="mk-tech-proof">{proofLabel(tech)}</span>
                </span>
                <span className="mk-tech-index" aria-hidden="true">{star.starCode}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Live Observatory Telemetry Bar along the mountain base */}
      <div className="mk-sky-telemetry" aria-live="polite">
        <div className="mk-sky-telemetry-main">
          <span className="mk-sky-telemetry-star" aria-hidden="true">✦</span>
          <span className="mk-sky-telemetry-code">{activeStar.starCode}</span>
          <strong className="mk-sky-telemetry-name">{activeEntry.label}</strong>
          <span className="mk-sky-telemetry-role">{activeStar.role}</span>
        </div>
        <div className="mk-sky-telemetry-meta">
          <span>
            <em>Sector</em> {activeConstellation.roman} · {activeConstellation.name}
          </span>
          <span>
            <em>Sky</em> {activeStar.ra} · {activeStar.dec}
          </span>
          <span>
            <em>Proof</em> {proofTitle(activeEntry)}
          </span>
        </div>
      </div>
    </div>
  );
}

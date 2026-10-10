import React from 'react';

type Accent = 'default' | 'critical' | 'warning' | 'ok' | 'indigo' | 'violet';

const accentBar: Record<Accent, string> = {
  default: 'from-white/30 to-transparent',
  critical: 'from-crit-500 to-crit-500/0',
  warning: 'from-warn-500 to-warn-500/0',
  ok: 'from-ok-500 to-ok-500/0',
  indigo: 'from-zinc-300 to-transparent',
  violet: 'from-zinc-200 to-transparent',
};

const valueAccent: Record<Accent, string> = {
  default: 'text-white',
  critical: 'text-crit-400',
  warning: 'text-warn-400',
  ok: 'text-ok-400',
  indigo: 'text-white',
  violet: 'text-zinc-100',
};

export interface StatProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  sublabel?: string;
  tone?: string;
  spark?: React.ReactNode;
  delta?: { value: string; positive?: boolean };
  trend?: { direction: 'up' | 'down' | 'flat'; value: string; positive?: boolean };
  accent?: Accent;
  icon?: React.ReactNode;
}

function resolveAccent(accent?: Accent, tone?: string): Accent {
  if (accent) return accent;
  if (tone === 'danger' || tone === 'critical' || tone === 'rose') return 'critical';
  if (tone === 'warn' || tone === 'warning' || tone === 'amber') return 'warning';
  if (tone === 'ok' || tone === 'emerald' || tone === 'success') return 'ok';
  if (tone === 'ai' || tone === 'violet' || tone === 'indigo') return 'violet';
  return 'default';
}

export function Stat({
  label,
  value,
  hint,
  sublabel,
  tone,
  spark,
  delta,
  trend,
  accent,
  icon,
}: StatProps) {
  const resolved = resolveAccent(accent, tone);
  const footnote = hint ?? sublabel;
  return (
    <div className="relative overflow-hidden rounded-xl surface-card p-5 group">
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r ${accentBar[resolved]}`}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[12px] font-medium uppercase tracking-[0.1em] text-zinc-400">
          {label}
        </span>
        {(icon || spark) && (
          <span className="text-zinc-500 group-hover:text-zinc-300 transition-colors">
            {icon ?? spark}
          </span>
        )}
      </div>
      <div className="mt-2.5 flex items-baseline gap-2.5">
        <div
          className={`arch-stat-value tnum ${valueAccent[resolved]}`}
        >
          {value}
        </div>
        {delta && (
          <span
            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-[11px] font-medium ${
              delta.positive
                ? 'bg-ok-500/10 text-ok-400 border border-ok-500/20'
                : 'bg-white/[0.04] text-zinc-400 border border-white/[0.06]'
            }`}
          >
            {delta.value}
          </span>
        )}
        {trend && (
          <span
            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-[11px] font-medium ${
              trend.positive
                ? 'bg-ok-500/10 text-ok-400 border border-ok-500/20'
                : 'bg-white/[0.04] text-zinc-400 border border-white/[0.06]'
            }`}
          >
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '·'}{' '}
            {trend.value}
          </span>
        )}
      </div>
      {footnote && <div className="mt-1.5 font-mono text-[13px] text-zinc-500">{footnote}</div>}
    </div>
  );
}

export const StatCard = Stat;

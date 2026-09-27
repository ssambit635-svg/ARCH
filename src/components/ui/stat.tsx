import type { ReactNode } from 'react';
import { Card, CardBody } from './index';

type Tone = 'neutral' | 'danger' | 'success' | 'warning' | 'info' | 'ai';

const valueTones: Record<Tone, string> = {
  neutral: 'text-white',
  danger: 'text-rose-300',
  success: 'text-emerald-300',
  warning: 'text-amber-200',
  info: 'text-sky-300',
  ai: 'text-violet-200',
};

export function Stat({
  label,
  value,
  hint,
  tone = 'neutral',
  icon,
  spark,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  spark?: ReactNode;
}) {
  return (
    <Card className="card-lift relative overflow-hidden">
      <CardBody>
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
          {icon ? <span className="text-slate-500">{icon}</span> : null}
        </div>
        <p className={`mt-2 text-[32px] font-semibold leading-none tracking-tight tabular-nums ${valueTones[tone]}`}>{value}</p>
        <div className="mt-2 flex items-end justify-between gap-3">
          {hint ? <p className="text-xs leading-relaxed text-slate-500">{hint}</p> : <span />}
          {spark}
        </div>
      </CardBody>
    </Card>
  );
}

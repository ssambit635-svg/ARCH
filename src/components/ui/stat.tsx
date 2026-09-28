import type { ReactNode } from 'react';
import { Card, CardBody } from './index';

type Tone = 'neutral' | 'danger' | 'success' | 'warning' | 'info' | 'ai';

const valueTones: Record<Tone, string> = {
  neutral: 'text-bone',
  danger: 'text-sev-critical',
  success: 'text-state-ok',
  warning: 'text-sev-medium',
  info: 'text-state-info',
  ai: 'text-signal-300',
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
          <p className="arch-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ash-500">{label}</p>
          {icon ? <span className="text-slate-500">{icon}</span> : null}
        </div>
        <p className={`arch-display mt-2.5 text-[34px] font-semibold leading-none tracking-[-0.03em] arch-tabular ${valueTones[tone]}`}>{value}</p>
        <div className="mt-2 flex items-end justify-between gap-3">
          {hint ? <p className="text-xs leading-relaxed text-slate-500">{hint}</p> : <span />}
          {spark}
        </div>
      </CardBody>
    </Card>
  );
}

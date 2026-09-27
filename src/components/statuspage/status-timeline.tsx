/** 90-day style uptime bar strip — server-safe, pure CSS. */

const dayTone: Record<string, string> = {
  up: 'bg-emerald-500/80',
  degraded: 'bg-amber-500/80',
  outage: 'bg-rose-500/80',
  maintenance: 'bg-sky-500/80',
  none: 'bg-white/[0.07]',
};

export function UptimeBars({ days, uptimePercent }: { days: { date: string; state: 'up' | 'degraded' | 'outage' | 'maintenance' | 'none' }[]; uptimePercent: string }) {
  return (
    <div>
      <div className="flex items-end gap-[3px]" role="img" aria-label={`${uptimePercent} uptime over the last ${days.length} days`}>
        {days.map((day) => (
          <span
            key={day.date}
            title={`${day.date} — ${day.state}`}
            className={`h-8 w-full min-w-[3px] flex-1 rounded-[3px] transition hover:brightness-150 ${dayTone[day.state]}`}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>{days.length} days ago</span>
        <span className="font-medium text-slate-300">{uptimePercent} uptime</span>
        <span>Today</span>
      </div>
    </div>
  );
}

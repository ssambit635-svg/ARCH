'use client';

import { useEffect, useState } from 'react';
import { cn } from './vui-primitives';

type Overall = 'OPERATIONAL' | 'MAINTENANCE' | 'DEGRADED' | 'OUTAGE';

const STATUS_META: Record<Overall, { label: string; dot: string; text: string }> = {
  OPERATIONAL: { label: 'All systems operational', dot: 'bg-ok-400', text: 'text-emerald-200' },
  MAINTENANCE: { label: 'Scheduled maintenance', dot: 'bg-[#3b8ef4]', text: 'text-blue-200' },
  DEGRADED: { label: 'Partial degradation', dot: 'bg-warn-400', text: 'text-amber-200' },
  OUTAGE: { label: 'Active incident', dot: 'bg-crit-400', text: 'text-rose-200' },
};

/**
 * Live status display for the hero: reads the anonymous public status API for the
 * demo page and links to it. Falls back to a neutral pill when the API is
 * unreachable (offline preview, self-hosted instance without the demo tenant).
 */
export function StatusChip({ slug = 'arch' }: { slug?: string }) {
  const [overall, setOverall] = useState<Overall | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const res = await fetch(`/api/status-pages/public/${slug}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as { data?: { overallStatus?: Overall } };
        const status = json.data?.overallStatus;
        if (status && status in STATUS_META) setOverall(status);
        else setFailed(true);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    };

    load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [slug]);

  const meta = overall ? STATUS_META[overall] : null;

  return (
    <a
      href={`/status/${slug}`}
      className="hero-rise group inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-[#050a13]/60 px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.16em] backdrop-blur-sm transition-colors hover:border-white/35"
      title="Public status page"
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          meta ? meta.dot : failed ? 'bg-zinc-400' : 'bg-[#3b8ef4] animate-pulse-dot',
          overall === 'OPERATIONAL' && 'animate-pulse-dot'
        )}
      />
      <span className={cn('transition-colors group-hover:text-white', meta ? meta.text : 'text-zinc-300')}>
        {meta ? meta.label : failed ? 'Status page' : 'Checking status'}
      </span>
      <span className="text-zinc-500 transition-colors group-hover:text-zinc-300">/status/{slug} ↗</span>
    </a>
  );
}

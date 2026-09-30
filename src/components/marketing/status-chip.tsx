'use client';

import { useEffect, useState } from 'react';
import { cn } from './vui-primitives';

type Overall = 'OPERATIONAL' | 'MAINTENANCE' | 'DEGRADED' | 'OUTAGE';

const STATUS_META: Record<Overall, { label: string; text: string }> = {
  OPERATIONAL: { label: 'All systems operational', text: 'text-[#8ec2ff]' },
  MAINTENANCE: { label: 'Scheduled maintenance', text: 'text-[#8ec2ff]' },
  DEGRADED: { label: 'Partial degradation', text: 'text-zinc-200' },
  OUTAGE: { label: 'Active incident', text: 'text-zinc-200' },
};

/**
 * Status display for the hero: reads the anonymous public status API for the
 * demo page and links to it. Clean architectural badge without pulsing live dots.
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
      className="hero-rise mk-hero-pill group inline-flex w-fit items-center gap-2 rounded-full border border-[#1e3454]/70 bg-[#050b16]/75 px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.16em] backdrop-blur-sm transition-colors hover:border-[#3b8ef4]/60"
      title="Public status page"
    >
      <span className={cn('transition-colors group-hover:text-white', meta ? meta.text : 'text-zinc-300')}>
        {meta ? meta.label : failed ? 'Status page' : 'Checking status'}
      </span>
      <span className="text-zinc-500 transition-colors group-hover:text-zinc-300">/status/{slug} ↗</span>
    </a>
  );
}

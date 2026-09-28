'use client';

import { useState } from 'react';
import { toast } from '@/components/ui/toast';
import { Card, CardBody, CardHeader } from '@/components/ui';

export function DependencyManager({
  services,
  dependencies,
}: {
  services: { id: string; name: string; project: string }[];
  dependencies: { id: string; from: string; to: string }[];
}) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [items, setItems] = useState(dependencies);
  const [busy, setBusy] = useState(false);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!from || !to || from === to) {
      toast('Pick two different services.', 'error');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/dependencies', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fromServiceId: from, toServiceId: to }),
      });
      if (!response.ok) throw new Error('Could not save the relationship.');
      const payload = await response.json();
      setItems([...items, { id: payload.data.id, from: services.find((s) => s.id === from)?.name ?? '', to: services.find((s) => s.id === to)?.name ?? '' }]);
      setFrom('');
      setTo('');
      toast('Dependency saved.', 'success');
    } catch {
      toast('Could not save the relationship.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/dependencies/${id}`, { method: 'DELETE' });
    setItems(items.filter((x) => x.id !== id));
    toast('Dependency removed.', 'success');
  }

  const selectClass =
    'w-full rounded-xl border border-white/10 bg-abyss-950/70 px-3 py-2 text-sm text-slate-200 transition focus:border-indigo-500/60 focus:outline-none';

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="Add dependency" description="“A depends on B” — when B breaks, A is in the blast radius." />
        <CardBody>
          <form onSubmit={add} className="space-y-3">
            <label className="block text-[13px] font-medium text-slate-200">
              Service
              <select value={from} onChange={(e) => setFrom(e.target.value)} className={`${selectClass} mt-1.5 font-normal`}>
                <option value="">Depends on…</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.project}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[13px] font-medium text-slate-200">
              Depends on
              <select value={to} onChange={(e) => setTo(e.target.value)} className={`${selectClass} mt-1.5 font-normal`}>
                <option value="">Dependency target…</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.project}
                  </option>
                ))}
              </select>
            </label>
            <button
              disabled={busy || !from || !to}
              className="rounded-xl bg-bone px-3.5 py-2 text-sm font-medium text-ink-1000 transition hover:bg-white disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save relationship'}
            </button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Dependency graph" description={`${items.length} relationship${items.length === 1 ? '' : 's'}`} />
        <CardBody>
          <div className="space-y-2">
            {items.length ? (
              items.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] px-3.5 py-2.5 text-sm">
                  <span className="min-w-0 truncate text-slate-200">
                    {d.from} <span className="mx-1 text-indigo-400">→</span> {d.to}
                  </span>
                  <button onClick={() => remove(d.id)} className="shrink-0 text-xs font-medium text-rose-400 transition hover:text-rose-300">
                    Remove
                  </button>
                </div>
              ))
            ) : (
              <p className="py-2 text-sm text-slate-400">No relationships yet — map one above.</p>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export function SloManager({
  services,
  slos,
}: {
  services: { id: string; name: string }[];
  slos: { serviceId: string; service: { name: string } | string; targetPercent: number; windowDays: number; burnAlertPercent: number }[];
}) {
  const [serviceId, setServiceId] = useState(slos[0]?.serviceId ?? services[0]?.id ?? '');
  const [target, setTarget] = useState(String(slos[0]?.targetPercent ?? 99.9));
  const [days, setDays] = useState(String(slos[0]?.windowDays ?? 30));
  const [busy, setBusy] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!serviceId) return;
    setBusy(true);
    try {
      const response = await fetch('/api/slos', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ serviceId, targetPercent: Number(target), windowDays: Number(days), burnAlertPercent: 50, enabled: true }),
      });
      if (!response.ok) throw new Error();
      toast('SLO saved.', 'success');
      location.reload();
    } catch {
      toast('Could not save the SLO.', 'error');
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    'mt-1.5 block rounded-xl border border-white/10 bg-abyss-950/70 px-3 py-2 text-sm text-slate-200 transition focus:border-indigo-500/60 focus:outline-none';

  return (
    <Card>
      <CardHeader title="Configure an SLO" description="One target per service — saving again updates it." />
      <CardBody>
        <form onSubmit={save} className="flex flex-wrap items-end gap-3">
          <label className="text-[13px] font-medium text-slate-200">
            Service
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={`${inputClass} w-52 font-normal`}>
              {services.length ? (
                services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))
              ) : (
                <option value="">Create a service first</option>
              )}
            </select>
          </label>
          <label className="text-[13px] font-medium text-slate-200">
            Target %
            <input type="number" step="0.001" min="0" max="100" value={target} onChange={(e) => setTarget(e.target.value)} className={`${inputClass} w-28 font-normal`} />
          </label>
          <label className="text-[13px] font-medium text-slate-200">
            Window days
            <input type="number" min="1" max="365" value={days} onChange={(e) => setDays(e.target.value)} className={`${inputClass} w-28 font-normal`} />
          </label>
          <button
            disabled={!serviceId || busy}
            className="rounded-xl bg-bone px-3.5 py-2 text-sm font-medium text-ink-1000 transition hover:bg-white disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save SLO'}
          </button>
        </form>
      </CardBody>
    </Card>
  );
}

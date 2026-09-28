'use client';

import { useEffect, useState } from 'react';

/**
 * Boot sequence.
 *
 * The site opens the way the product opens: subsystems coming up, each one checked off, then the
 * console hands over to the operator. It is a preloader in the mechanical sense — it holds the
 * curtain while the hero video buffers and the WebGL context compiles its first frame — but it is
 * staged as a boot log because that is literally what ARCH does at 3am.
 *
 * Guarded three ways:
 *   - `prefers-reduced-motion` → never shown, no counter, no curtain.
 *   - already seen this session → never shown again. Nobody wants a 2.2s gate on a re-visit.
 *   - a hard 3.2s ceiling → if anything stalls, the curtain lifts anyway. A preloader that can
 *     strand a visitor is worse than no preloader.
 */

const BOOT_LINES: { module: string; action: string }[] = [
  { module: 'arch.kernel', action: 'mount' },
  { module: 'incident.state', action: 'load' },
  { module: 'audit.ledger', action: 'attach' },
  { module: 'webhook.hmac', action: 'verify' },
  { module: 'status.renderer', action: 'cache' },
  { module: 'arch-v1.1.model', action: 'warm' },
];

const SESSION_KEY = 'arch.boot.seen';

export function Preloader({ onComplete }: { onComplete?: () => void }) {
  const [enabled, setEnabled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resolved, setResolved] = useState<number[]>([]);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setGone(true);
      onComplete?.();
      return;
    }
    try {
      if (sessionStorage.getItem(SESSION_KEY)) {
        setGone(true);
        onComplete?.();
        return;
      }
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      // Private browsing can throw on sessionStorage. Skipping the preloader is the right fallback.
      setGone(true);
      onComplete?.();
      return;
    }

    setEnabled(true);
    document.body.style.overflow = 'hidden';

    let cancelled = false;
    const started = performance.now();
    const DURATION = 2050;

    const tick = (now: number) => {
      if (cancelled) return;
      const elapsed = now - started;
      // Ease-out curve: fast off the mark, settling into 100 so the handover feels deliberate.
      const raw = Math.min(1, elapsed / DURATION);
      const eased = 1 - Math.pow(1 - raw, 2.3);
      const value = Math.round(eased * 100);
      setProgress(value);

      const resolvedCount = Math.floor((value / 100) * BOOT_LINES.length + 0.0001);
      setResolved((previous) => (previous.length === resolvedCount ? previous : Array.from({ length: resolvedCount }, (_, i) => i)));

      if (raw < 1) {
        requestAnimationFrame(tick);
        return;
      }
      setLeaving(true);
      document.body.style.overflow = '';
      onComplete?.();
      window.setTimeout(() => !cancelled && setGone(true), 1000);
    };

    const raf = requestAnimationFrame(tick);

    // Hard ceiling: never let a stalled frame keep the page behind a curtain.
    const ceiling = window.setTimeout(() => {
      if (cancelled) return;
      setProgress(100);
      setResolved(BOOT_LINES.map((_, i) => i));
      setLeaving(true);
      document.body.style.overflow = '';
      onComplete?.();
      window.setTimeout(() => !cancelled && setGone(true), 1000);
    }, 3200);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(ceiling);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!enabled || gone) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col justify-between bg-ink-1000 px-6 py-6 sm:px-10 sm:py-9 ${
        leaving ? 'arch-boot-curtain' : ''
      }`}
      role="status"
      aria-label="Loading ARCH"
    >
      {/* Fine grid + grain behind the log, so the curtain is a surface and not a flat fill. */}
      <div className="arch-grid-fine pointer-events-none absolute inset-0 opacity-[0.5]" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(120% 80% at 50% 100%, rgb(59 130 246 / 0.06), transparent 62%)' }}
        aria-hidden
      />

      <header className="relative flex items-start justify-between">
        <div className="arch-mono text-[10px] uppercase tracking-[0.24em] text-ash-500">
          <span className="text-bone">ARCH</span> · incident response
        </div>
        <div className="arch-mono text-[10px] uppercase tracking-[0.18em] text-ash-600">v0.3.0 · self-hosted</div>
      </header>

      {/* The counter is the hero of the curtain: display face, tabular, huge, no glow. */}
      <div className="relative flex items-end gap-5">
        <span className="arch-display arch-tabular text-[clamp(4.5rem,17vw,13rem)] font-semibold leading-[0.78] tracking-[-0.055em] text-bone">
          {String(progress).padStart(3, '0')}
        </span>
        <span className="arch-mono mb-2 text-[11px] uppercase tracking-[0.2em] text-ash-500 sm:mb-4">
          percent
          <span className="ml-2 inline-block size-1.5 translate-y-[-1px] animate-blink rounded-[1px] bg-signal-500" />
        </span>
      </div>

      <footer className="relative">
        <div className="mb-4 h-px w-full overflow-hidden bg-white/[0.07]">
          <div
            className="h-full origin-left bg-bone transition-[width] duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <ul className="arch-mono grid grid-cols-1 gap-x-8 gap-y-1 text-[10.5px] leading-relaxed sm:grid-cols-2 lg:grid-cols-3">
          {BOOT_LINES.map((line, index) => {
            const done = resolved.includes(index);
            return (
              <li key={line.module} className="flex items-baseline justify-between gap-3">
                <span className="truncate text-ash-400">
                  <span className={done ? 'text-bone' : 'text-ash-500'}>{line.module}</span>
                  <span className="mx-2 text-ash-700">{line.action}</span>
                </span>
                <span className={`shrink-0 transition-colors duration-200 ${done ? 'text-state-ok' : 'text-ash-700'}`}>
                  {done ? 'ok' : '···'}
                </span>
              </li>
            );
          })}
        </ul>
      </footer>
    </div>
  );
}

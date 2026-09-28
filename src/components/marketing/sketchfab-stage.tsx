'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Sketchfab stage.
 *
 * ARCH's hero geometry is procedural (see topology-scene.tsx) because it has to be *shaped by data*
 * — a dependency graph is only worth rendering if it can show a real blast radius. But there are
 * things a real scanned model does better: a physical asset you can orbit and inspect for material
 * truth. This is the slot for those, wired to Sketchfab's own viewer.
 *
 * Sourcing and licensing: the models below are real Sketchfab uploads under Creative Commons
 * Attribution. CC-BY requires credit, so the author is named and linked in the frame — not hidden
 * in a comment. Swap `uid` for any other model and the attribution line is the only thing you must
 * remember to change.
 *
 * The iframe is mounted lazily, only once the stage is near the viewport. A Sketchfab embed pulls
 * its own WebGL runtime; loading it while the visitor is still three sections away would cost them
 * bandwidth and us frame budget during the pinned scroll story.
 */

export type SketchfabModel = {
  uid: string;
  title: string;
  author: string;
  authorUrl: string;
  licence: string;
  /** Shown in the HUD instead of raw numbers the visitor cannot verify. */
  detail: string;
};

export const RACK_MODELS: SketchfabModel[] = [
  {
    uid: '01b49d9d1f694ba5b41e4b2b0e10d16e',
    title: 'Data Center Server Rack',
    author: 'EntropyNine',
    authorUrl: 'https://sketchfab.com/entropy9ine',
    licence: 'CC BY',
    detail: '27.9k tris · 15.7k verts',
  },
  {
    uid: '373409fcff8d4b48b34ea45b0891b691',
    title: 'Servers',
    author: 'themighty808',
    authorUrl: 'https://sketchfab.com/themighty808',
    licence: 'CC BY',
    detail: '80k tris · 42.8k verts',
  },
  {
    uid: 'f24594ece9634cec9c1210c041838371',
    title: 'Server V2 + console',
    author: 'FlevasGR',
    authorUrl: 'https://sketchfab.com/FlevasGR',
    licence: 'CC BY',
    detail: 'UPS · NAS · 8 units',
  },
];

export function SketchfabStage({
  model,
  className = '',
  active = true,
}: {
  model: SketchfabModel;
  className?: string;
  /** Only mount the viewer while this stage is the selected one. */
  active?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [near, setNear] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!active || near) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setNear(true);
            observer.disconnect();
          }
        }
      },
      // Start the fetch before it is actually on screen so the viewer is warm on arrival.
      { rootMargin: '400px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [active, near]);

  // A new model is a new iframe; drop the loaded flag so the HUD does not claim a ready viewer.
  useEffect(() => setFailed(false), [model.uid]);

  const params = new URLSearchParams({
    autostart: '1',
    ui_theme: 'dark',
    preload: '1',
    camera: '0',
    annotation: '0',
    // Everything except orbit controls is switched off. A marketing surface does not need
    // Sketchfab's chrome competing with ARCH's.
    ui_infos: '0',
    ui_controls: '1',
    ui_stop: '0',
    ui_settings: '0',
    ui_inspector: '0',
    ui_annotations: '0',
    ui_ar: '0',
    ui_help: '0',
    ui_hint: '0',
    ui_watermark: '0',
    ui_watermark_link: '0',
    ui_comment: '0',
    ui_sound: '0',
    ui_vr: '0',
  });

  return (
    <div ref={ref} className={`relative overflow-hidden bg-ink-950 ${className}`}>
      {active && near && !failed ? (
        <iframe
          key={model.uid}
          title={`${model.title} — ${model.author} on Sketchfab`}
          src={`https://sketchfab.com/models/${model.uid}/embed?${params.toString()}`}
          className="size-full border-0"
          frameBorder="0"
          allow="autoplay; fullscreen; xr-spatial-tracking"
          allowFullScreen
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <FallbackPane model={model} />
      )}

      {/* HUD frame — hairline corners and a mono readout, so the embed sits inside ARCH's language
          rather than looking like a widget dropped onto the page. */}
      <div className="pointer-events-none absolute inset-0 z-10" aria-hidden>
        <span className="absolute left-3 top-3 block size-4 border-l border-t border-white/25" />
        <span className="absolute right-3 top-3 block size-4 border-r border-t border-white/25" />
        <span className="absolute bottom-3 left-3 block size-4 border-b border-l border-white/25" />
        <span className="absolute bottom-3 right-3 block size-4 border-b border-r border-white/25" />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-gradient-to-t from-ink-1000 via-ink-1000/72 to-transparent px-4 pb-3.5 pt-9">
        <span className="arch-mono text-[10px] uppercase tracking-[0.14em] text-ash-400">
          {model.title} · <span className="arch-tabular text-ash-600">{model.detail}</span>
        </span>
        <a
          href={model.authorUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="arch-mono pointer-events-auto text-[10px] tracking-[0.08em] text-ash-500 underline decoration-white/20 underline-offset-4 transition hover:text-signal-300 hover:decoration-signal-500/50"
          data-cursor
        >
          {model.licence} · {model.author} / Sketchfab
        </a>
      </div>
    </div>
  );
}

/**
 * Shown before the viewer mounts, and if the embed is blocked (CSP, offline, ad-blocker). The
 * section must still read as intentional rather than as a hole in the page.
 */
function FallbackPane({ model }: { model: SketchfabModel }) {
  return (
    <div className="arch-grid-fine absolute inset-0 grid place-items-center bg-ink-950">
      <div className="flex flex-col items-center gap-3 px-6 text-center">
        <span className="relative grid size-14 place-items-center">
          <span className="absolute inset-0 animate-spin-slow rounded-full border border-dashed border-white/[0.14]" aria-hidden />
          <span className="size-1.5 rounded-full bg-signal-500" aria-hidden />
        </span>
        <p className="arch-mono text-[10.5px] uppercase tracking-[0.16em] text-ash-500">loading viewer</p>
        <p className="max-w-[22rem] text-[12px] leading-relaxed text-ash-600">
          {model.title} by {model.author}, served by Sketchfab. If this stays put, the embed is
          blocked — the dependency graph beside it renders locally and needs no network.
        </p>
      </div>
    </div>
  );
}

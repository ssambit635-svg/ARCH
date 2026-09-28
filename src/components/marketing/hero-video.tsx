'use client';

import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '@/lib/motion';

/**
 * Full-bleed hero footage.
 *
 * Sourcing: real stock video, Pexels licence (free for commercial use, no attribution required),
 * served from the Pexels CDN. Footage is *not* vendored into the repository — a 1440p clip is tens
 * of megabytes and the project keeps large binaries out of git (see .gitignore's `model-data/`
 * precedent). The build stays network-free because this is a runtime fetch by the browser, not a
 * build-time download.
 *
 * Every layer degrades:
 *   video plays  → footage
 *   video fails  → poster still (an offline / air-gapped install lands here, silently)
 *   poster fails → the graded graphite wash, so the hero never shows a broken-image box
 *
 * Grading is what makes stock footage look art-directed. The clip is desaturated, darkened and
 * pushed warm, then vignetted — the same treatment a colourist would give it, and specifically the
 * opposite of the blue cast that makes hero video read as generic.
 */

/**
 * The grade, applied identically to footage and still. Desaturate to pull the source's blue cast
 * out, lift contrast for depth, pull brightness down so bone-white type sits on top of it.
 */
const GRADE = 'saturate(0.42) contrast(1.18) brightness(0.72)';

const SOURCES = [
  {
    // Dark storm clouds rolling, twilight — 22s. The incident metaphor: weather you did not
    // schedule, arriving whether or not the team is ready.
    src: 'https://videos.pexels.com/video-files/27583824/12174976_2560_1440_30fps.mp4',
    poster: 'https://images.pexels.com/videos/27583824/air-atmosphere-background-beautiful-27583824.jpeg?auto=compress&w=1920&h=1080&dpr=1',
    credit: 'James Cheney / Pexels',
  },
  {
    // Server units with status LEDs in a dark data centre — 9s. Fallback stays on-theme.
    src: 'https://videos.pexels.com/video-files/7140928/7140928-uhd_2560_1440_24fps.mp4',
    poster: 'https://images.pexels.com/videos/7140928/pexels-photo-7140928.jpeg?auto=compress&w=1920&h=1080&dpr=1',
    credit: 'MrColo / Pexels',
  },
];

export function HeroVideo({ className = '' }: { className?: string }) {
  const reduced = usePrefersReducedMotion();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [index, setIndex] = useState(0);
  const [state, setState] = useState<'loading' | 'playing' | 'poster'>('loading');
  const [posterFailed, setPosterFailed] = useState(false);

  const active = SOURCES[index];
  const fallback = SOURCES[(index + 1) % SOURCES.length];
  if (!active || !fallback) return null;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Autoplay is only permitted muted; if the browser still refuses (data saver, tab rules) fall
    // back to the still rather than showing a frozen first frame that looks like a broken page.
    if (reduced) {
      setState('poster');
      video.pause();
      return;
    }

    let cancelled = false;
    const attempt = video.play();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch(() => {
        if (!cancelled) setState('poster');
      });
    }
    return () => {
      cancelled = true;
    };
  }, [reduced, index]);

  const handleError = () => {
    // Rotate to the second clip once, then give up gracefully onto the poster.
    if (index === 0) {
      setIndex(1);
      return;
    }
    setState('poster');
  };

  return (
    <div className={`absolute inset-0 overflow-hidden bg-ink-1000 ${className}`} aria-hidden="true">
      {/* Footage layer */}
      {!reduced && (
        <video
          ref={videoRef}
          className={`absolute inset-0 size-full object-cover transition-opacity duration-[1400ms] ease-out ${
            state === 'playing' ? 'opacity-100' : 'opacity-0'
          } ${reduced ? '' : 'arch-hero-kenburns'}`}
          style={{ filter: GRADE }}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={active.poster}
          onError={handleError}
          onCanPlay={() => setState('playing')}
          onPlaying={() => setState('playing')}
          disablePictureInPicture
          tabIndex={-1}
        >
          <source src={active.src} type="video/mp4" />
        </video>
      )}

      {/* Poster layer — shown when motion is reduced, while buffering, or if the clip fails. */}
      {(reduced || state !== 'playing') && !posterFailed && (
        <img
          src={active.poster}
          alt=""
          fetchPriority="high"
          decoding="async"
          onError={() => setPosterFailed(true)}
          className={`absolute inset-0 size-full object-cover transition-opacity duration-700 ${
            reduced ? 'opacity-100' : 'opacity-70'
          }`}
          style={{ filter: GRADE }}
        />
      )}

      {/* ---- Grade -------------------------------------------------------
       * 1. desaturate + darken + lift contrast, pushed warm away from the source's blue cast
       * 2. a warm overlay in soft-light, at a level you feel rather than see
       * 3. vignette, so the eye lands centre-frame where the headline sits
       * 4. bottom fade into the page's own graphite, so the hero has no visible seam
       */}
      <div
        className="absolute inset-0 mix-blend-soft-light opacity-[0.55]"
        style={{ background: 'radial-gradient(120% 90% at 50% 10%, #1e3a8a 0%, #0f172a 45%, #030712 100%)' }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(115% 85% at 50% 45%, transparent 22%, rgb(5 6 7 / 0.55) 68%, rgb(5 6 7 / 0.92) 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgb(5 6 7 / 0.86) 0%, rgb(5 6 7 / 0.42) 26%, rgb(5 6 7 / 0.5) 58%, rgb(5 6 7 / 0.95) 88%, #050607 100%)',
        }}
      />

      {/* Credit — Pexels needs no attribution, but naming the author costs one line and is right. */}
      <span className="arch-mono absolute bottom-3 right-4 z-20 text-[9.5px] tracking-[0.08em] text-ash-600/70">
        footage · {active.credit}
      </span>
    </div>
  );
}

/**
 * A second, tighter clip used inside a panel rather than full-bleed — the data-centre footage for
 * the infrastructure section. Same grading, smaller frame.
 */
export function PanelVideo({ className = '' }: { className?: string }) {
  const reduced = usePrefersReducedMotion();
  const [failed, setFailed] = useState(false);
  const source = SOURCES[1];
  if (!source) return null;

  return (
    <div className={`relative overflow-hidden bg-ink-950 ${className}`} aria-hidden="true">
      {reduced || failed ? (
        <img
          src={source.poster}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover opacity-70"
          style={{ filter: GRADE }}
        />
      ) : (
        <video
          className="size-full object-cover opacity-80"
          style={{ filter: GRADE }}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={source.poster}
          onError={() => setFailed(true)}
          disablePictureInPicture
          tabIndex={-1}
        >
          <source src={source.src} type="video/mp4" />
        </video>
      )}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgb(5 6 7 / 0.55), rgb(5 6 7 / 0.25) 40%, rgb(5 6 7 / 0.9))' }}
      />
    </div>
  );
}

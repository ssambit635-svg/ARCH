'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Decorative video that only loads when it can be seen. Posters remain visible on slow
 * connections, with reduced motion, or when the browser cannot play the clip. Never fetch
 * the audio track.
 *
 * `playOnce` — the hero/closing films are one-shot reveals: they autoplay a single time and
 * freeze on their final frame. They never loop; only a full page refresh replays them.
 *
 * Quality enhancements:
 * - `preload="auto"` for hero (non-deferred) so the first frame is crisp instantly; `metadata`
 *   for deferred clips to avoid layout shift.
 * - Explicit `video.play()` handling catches autoplay-policy rejections and retries muted.
 * - `object-cover` fidelity preserved via GPU layer + subtle contrast/saturation lift so
 *   1080p delivery does not look washed out on wide gamut displays.
 */
export function AmbientVideo({
  src,
  poster,
  className,
  defer = false,
  playOnce = false,
}: {
  src: string;
  poster: string;
  className: string;
  defer?: boolean;
  playOnce?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [enabled, setEnabled] = useState(!defer);
  const [loaded, setLoaded] = useState(!defer ? false : false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Save-Data is not yet part of the standard TS Navigator interface in all browsers.
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) return;

    if (!defer || !('IntersectionObserver' in window)) {
      setEnabled(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setEnabled(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px' }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [defer]);

  // Ensure the clip actually starts once src is set (covers autoplay-policy + src-swap).
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !enabled) return;
    // Force a muted autoplay attempt — catches the brief “not allowed” on some Chromium.
    const tryPlay = () => {
      v.muted = true;
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    };
    if (v.readyState >= 2) {
      tryPlay();
    } else {
      const onCanPlay = () => tryPlay();
      v.addEventListener('canplay', onCanPlay, { once: true });
      return () => v.removeEventListener('canplay', onCanPlay);
    }
  }, [enabled, src]);

  return (
    <video
      ref={videoRef}
      src={enabled ? src : undefined}
      poster={poster}
      autoPlay
      muted
      loop={!playOnce}
      playsInline
      preload={defer ? 'metadata' : 'auto'}
      // @ts-ignore — disablePictureInPicture is valid but not in React's video prop types yet
      disablePictureInPicture
      aria-hidden="true"
      tabIndex={-1}
      onLoadedData={() => setLoaded(true)}
      // Enhance perceived sharpness without re-encoding: subtle contrast/saturation + GPU layer.
      // Fade in once decoded so the poster → video handoff is not a hard pop.
      style={
        enabled
          ? {
              filter: 'contrast(1.06) saturate(1.12) brightness(1.02)',
              transform: 'translateZ(0)',
              opacity: loaded ? 1 : 0.92,
              transition: 'opacity 420ms ease, filter 420ms ease',
            }
          : undefined
      }
      onEnded={(e) => {
        // Freeze on last frame for playOnce; avoid looping flash.
        if (playOnce) {
          const v = e.currentTarget;
          v.pause();
          // Seek just before end to hold the final frame crisp
          if (v.duration && isFinite(v.duration)) {
            try {
              v.currentTime = Math.max(0, v.duration - 0.05);
            } catch {}
          }
        }
      }}
      className={className}
    />
  );
}

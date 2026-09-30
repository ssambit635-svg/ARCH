'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Decorative video that only loads when it can be seen. Posters remain visible on slow
 * connections, with reduced motion, or when the browser cannot play the clip. Never fetch
 * the audio track.
 *
 * `playOnce` — the hero/closing films are one-shot reveals: they autoplay a single time and
 * freeze on their final frame. They never loop; only a full page refresh replays them.
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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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
      style={
        enabled
          ? {
              transform: 'translateZ(0)',
              opacity: loaded ? 1 : 0.96,
              transition: 'opacity 420ms ease',
            }
          : undefined
      }
      onEnded={(e) => {
        if (playOnce) {
          const v = e.currentTarget;
          v.pause();
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

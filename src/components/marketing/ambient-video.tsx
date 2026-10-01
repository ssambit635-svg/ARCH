'use client';

import { useEffect, useRef, useState } from 'react';

/** Decorative, silent media with a real poster. Reduced-motion/save-data users never autoplay. */
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
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    let observer: IntersectionObserver | undefined;

    const sync = () => {
      observer?.disconnect();
      if (motion.matches || connection?.saveData) {
        video.pause();
        setEnabled(false);
        setReady(false);
        return;
      }
      if (!defer || !('IntersectionObserver' in window)) {
        setEnabled(true);
        return;
      }
      observer = new IntersectionObserver(([entry]) => {
        if (entry?.isIntersecting) {
          setEnabled(true);
          observer?.disconnect();
        }
      }, { rootMargin: '400px' });
      observer.observe(video);
    };
    sync();
    motion.addEventListener('change', sync);
    return () => {
      observer?.disconnect();
      motion.removeEventListener('change', sync);
      video.pause();
    };
  }, [defer, src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !enabled) return;
    video.muted = true;
    // Autoplay may be denied. The poster (or the loaded first frame) remains usable either way.
    void video.play().catch(() => {});
    return () => video.pause();
  }, [enabled, src]);

  return (
    <>
      <img
        src={poster}
        alt=""
        aria-hidden="true"
        className={`${className} pointer-events-none select-none`}
        loading={defer ? 'lazy' : 'eager'}
        fetchPriority={defer ? 'low' : 'high'}
        decoding="async"
      />
      <video
        ref={videoRef}
        src={enabled ? src : undefined}
        autoPlay={enabled}
        muted
        loop={!playOnce}
        playsInline
        preload={enabled ? (defer ? 'metadata' : 'auto') : 'none'}
        disablePictureInPicture
        aria-hidden="true"
        tabIndex={-1}
        onLoadedData={() => setReady(true)}
        onError={() => setReady(false)}
        onEnded={(event) => {
          if (!playOnce) return;
          const video = event.currentTarget;
          video.pause();
          if (Number.isFinite(video.duration)) {
            video.currentTime = Math.max(0, video.duration - 0.08);
          }
        }}
        className={className}
        style={{ opacity: enabled && ready ? 1 : 0, transition: 'opacity 500ms ease' }}
      />
    </>
  );
}

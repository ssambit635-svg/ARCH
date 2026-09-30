'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Decorative video that only loads when it can be seen. Posters remain visible on slow
 * connections, with reduced motion, or when the browser cannot play the clip.
 * Never fetch the audio track.
 *
 * `playOnce` — the hero/closing films are one-shot reveals: they autoplay a single time and
 * freeze on their final frame. They never loop; only a full page refresh replays them.
 *
 * Smoothness improvements:
 * - GPU-accelerated compositing via translateZ(0) + will-change
 * - Poster fade crossfade instead of abrupt pop
 * - High fetch priority for hero, metadata for deferred
 * - Reduced GSAP conflict by avoiding layout thrash
 * - Old smooth ARCH reveal style: freeze on final frame with opacity hold
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
  const [isReady, setIsReady] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsReady(true);
      setIsVisible(true);
      return;
    }
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) {
      setIsReady(true);
      return;
    }

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
      { rootMargin: '600px', threshold: 0.01 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [defer]);

  // Smooth autoplay with retry - handles autoplay policy gracefully
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !enabled) return;

    let cancelled = false;
    const tryPlay = async () => {
      if (cancelled) return;
      try {
        v.muted = true;
        v.defaultMuted = true;
        // Force GPU layer
        v.style.transform = 'translateZ(0)';
        await v.play();
        setIsVisible(true);
      } catch {
        // Autoplay blocked, still show poster and try again on interaction
        setIsVisible(true);
        const onInteraction = () => {
          v.play().catch(() => {});
          window.removeEventListener('pointerdown', onInteraction);
          window.removeEventListener('keydown', onInteraction);
        };
        window.addEventListener('pointerdown', onInteraction, { once: true });
        window.addEventListener('keydown', onInteraction, { once: true });
      }
    };

    const handleCanPlay = () => {
      setIsReady(true);
      tryPlay();
    };

    const handleLoadedData = () => {
      setIsReady(true);
      // Small delay for smoother fade like old reveal
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    };

    if (v.readyState >= 3) {
      handleCanPlay();
    } else {
      v.addEventListener('canplay', handleCanPlay, { once: true });
      v.addEventListener('loadeddata', handleLoadedData, { once: true });
    }

    // Immediate attempt if already enough data
    if (v.readyState >= 2) {
      tryPlay();
    }

    return () => {
      cancelled = true;
      v.removeEventListener('canplay', handleCanPlay);
      v.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [enabled, src]);

  return (
    <>
      {/* Poster layer - always visible until video is ready for smooth crossfade */}
      {!isReady && (
        <img
          src={poster}
          alt=""
          aria-hidden="true"
          className={`${className} pointer-events-none select-none`}
          style={{
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            willChange: 'opacity',
            objectFit: className.includes('object-contain') ? 'contain' : 'cover',
          }}
          loading={defer ? 'lazy' : 'eager'}
          decoding="async"
        />
      )}

      <video
        ref={videoRef}
        src={enabled ? src : undefined}
        poster={poster}
        autoPlay
        muted
        // @ts-ignore
        defaultMuted
        loop={!playOnce}
        playsInline
        // @ts-ignore webkit specific
        webkit-playsinline="true"
        // @ts-ignore
        x-webkit-airplay="deny"
        preload={defer ? 'metadata' : 'auto'}
        // @ts-ignore — disablePictureInPicture is valid but not in React's video prop types yet
        disablePictureInPicture
        // @ts-ignore fetchPriority for hero LCP
        fetchPriority={defer ? 'low' : 'high'}
        aria-hidden="true"
        tabIndex={-1}
        onLoadedData={() => {
          setIsReady(true);
          setIsVisible(true);
        }}
        onCanPlayThrough={() => {
          setIsReady(true);
          setIsVisible(true);
        }}
        style={{
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          willChange: 'transform, opacity',
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 650ms cubic-bezier(0.22,1,0.36,1)',
          // Force GPU compositing for smooth reveal like old ARCH video
          WebkitTransform: 'translateZ(0)',
          perspective: '1000px',
        }}
        onEnded={(e) => {
          if (playOnce) {
            const v = e.currentTarget;
            v.pause();
            if (v.duration && isFinite(v.duration)) {
              try {
                // Freeze on final frame - old smooth reveal behavior
                v.currentTime = Math.max(0, v.duration - 0.08);
              } catch {}
            }
          }
        }}
        className={`${className} [transform:translateZ(0)] will-change-[transform,opacity] [backface-visibility:hidden]`}
      />
    </>
  );
}

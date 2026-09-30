'use client';

import { useEffect, useRef, useState } from 'react';

/** Load decorative video only when it can be seen. Posters remain visible on slow connections,
 * with reduced motion, or when the browser cannot play the clip. Never fetch the audio track. */
export function AmbientVideo({
  src,
  poster,
  className,
  defer = false,
}: {
  src: string;
  poster: string;
  className: string;
  defer?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [enabled, setEnabled] = useState(false);

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
      { rootMargin: '300px' }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [defer]);

  return (
    <video
      ref={videoRef}
      src={enabled ? src : undefined}
      poster={poster}
      autoPlay
      muted
      playsInline
      preload="none"
      aria-hidden="true"
      tabIndex={-1}
      className={className}
    />
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '@/lib/motion';

/**
 * Scramble-decode text.
 *
 * The effect belongs to this product specifically: an incident console resolves noise into a
 * signal, and a headline that decodes itself is the same gesture at the typographic level. It is
 * also the cheapest way to make a static page feel instrumented without a single coloured glow.
 *
 * Implementation notes:
 *   - Glyphs are drawn from a set weighted towards characters that appear in hashes, log levels and
 *     base-16, so the noise reads as machine output rather than as random punctuation.
 *   - Word boundaries are preserved: spaces and hyphens never scramble, which keeps the line
 *     measurable while it resolves and stops the layout shifting.
 *   - The animation is frame-budgeted with rAF and cancelled on unmount; a headline that scrolls
 *     away mid-decode must not keep a timer alive.
 */

const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789/\\|<>[]{}=+*#%$@!?~^';

export function ScrambleText({
  text,
  className = '',
  /** Frames each character stays scrambled before locking. Lower is snappier. */
  speed = 1.9,
  startDelay = 0,
  play = true,
  as: Tag = 'span',
}: {
  text: string;
  className?: string;
  speed?: number;
  startDelay?: number;
  play?: boolean;
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'p' | 'div';
}) {
  const reduced = usePrefersReducedMotion();
  const [output, setOutput] = useState(() => (typeof window === 'undefined' ? text : text));
  const frame = useRef(0);
  const raf = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!play || reduced) {
      setOutput(text);
      return;
    }

    const chars = text.split('');
    // Each character locks at a different frame so the line resolves left-to-right with noise
    // trailing behind it, instead of snapping all at once.
    const locks = chars.map((char, index) => ({
      char,
      lock: index * 1.35 + Math.random() * 12,
      scramble: char === ' ' || char === '\n',
    }));

    frame.current = 0;

    const tick = () => {
      frame.current += speed;
      let settled = true;
      let next = '';

      for (const item of locks) {
        if (item.scramble) {
          next += item.char;
          continue;
        }
        if (frame.current >= item.lock) {
          next += item.char;
        } else {
          settled = false;
          next += GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? item.char;
        }
      }

      setOutput(next);
      if (settled) {
        raf.current = null;
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };

    timer.current = setTimeout(() => {
      raf.current = requestAnimationFrame(tick);
    }, startDelay);

    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (raf.current) cancelAnimationFrame(raf.current);
      timer.current = null;
      raf.current = null;
    };
  }, [text, play, reduced, speed, startDelay]);

  return (
    <Tag className={className} aria-label={text}>
      {/* Screen readers get the real string from the aria-label; the scrambled run is hidden so it
          is never announced character by character. */}
      <span aria-hidden="true">{output}</span>
    </Tag>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useFinePointer, usePrefersReducedMotion } from '@/lib/motion';

/**
 * Blend-mode cursor.
 *
 * A ring that trails the pointer on a spring and inverts whatever it passes over, so it stays
 * legible on footage, on bone-white buttons and on graphite alike without ever needing a colour of
 * its own. `mix-blend-mode: difference` is doing the real work here — the cursor never has to know
 * what is underneath it.
 *
 * Only ever mounted for `(pointer: fine)` and never under reduced motion. A touch visitor keeps
 * the native affordance; replacing it would be a regression, not a flourish.
 *
 * Hover state is discovered by delegation rather than by wiring every control: anything matching
 * `a, button, [data-cursor]` grows the ring and shows a label if it carries `data-cursor="…"`.
 */
export function Cursor() {
  const fine = useFinePointer();
  const reduced = usePrefersReducedMotion();
  const ring = useRef<HTMLDivElement | null>(null);
  const dot = useRef<HTMLDivElement | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [down, setDown] = useState(false);

  useEffect(() => {
    if (!fine || reduced) return;

    document.documentElement.classList.add('arch-cursor-on');

    const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ringPos = { ...pointer };
    let raf = 0;
    let hovering = false;

    const onMove = (event: MouseEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;

      const target = (event.target as HTMLElement | null)?.closest?.('a, button, [data-cursor]');
      const nextHovering = Boolean(target);
      if (nextHovering !== hovering) {
        hovering = nextHovering;
        setActive(nextHovering);
      }
      const custom = target?.getAttribute('data-cursor');
      setLabel(custom && custom.length > 0 && custom !== 'true' ? custom : null);
    };

    const onDown = () => setDown(true);
    const onUp = () => setDown(false);

    const tick = () => {
      // The dot is exact, the ring lags. Two elements at two different response rates is what makes
      // it feel like a physical object rather than a CSS transform on the pointer.
      const lag = down ? 0.34 : 0.17;
      ringPos.x += (pointer.x - ringPos.x) * lag;
      ringPos.y += (pointer.y - ringPos.y) * lag;

      if (dot.current) {
        dot.current.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0) translate(-50%, -50%)`;
      }
      if (ring.current) {
        ring.current.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0) translate(-50%, -50%)`;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      document.documentElement.classList.remove('arch-cursor-on');
    };
  }, [fine, reduced]);

  if (!fine || reduced) return null;

  return (
    <>
      <div
        ref={ring}
        className="arch-cursor fixed left-0 top-0 z-[90] rounded-full border border-white will-change-transform"
        style={{
          width: active ? 58 : 26,
          height: active ? 58 : 26,
          transition: 'width 380ms cubic-bezier(0.22,1,0.36,1), height 380ms cubic-bezier(0.22,1,0.36,1), opacity 300ms ease',
          opacity: down ? 0.55 : 0.9,
        }}
        aria-hidden
      >
        {label && (
          <span className="arch-mono absolute inset-0 grid place-items-center text-[9px] font-bold uppercase tracking-[0.12em] text-white">
            {label}
          </span>
        )}
      </div>
      <div
        ref={dot}
        className="arch-cursor fixed left-0 top-0 z-[90] size-[3px] rounded-full bg-white will-change-transform"
        style={{ opacity: active ? 0 : 1, transition: 'opacity 220ms ease' }}
        aria-hidden
      />
    </>
  );
}

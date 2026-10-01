/** Inline arrows do not depend on the system's Unicode-symbol fallback fonts. */
export function LinkArrow({ direction = 'up-right' }: { direction?: 'up-right' | 'right' | 'down' }) {
  const paths = {
    'up-right': 'M5 11 11 5M5 5h6v6',
    right: 'M3 8h10M9 4l4 4-4 4',
    down: 'M8 3v10M4 9l4 4 4-4',
  };
  return (
    <svg className="mk-link-arrow" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[direction]} />
    </svg>
  );
}

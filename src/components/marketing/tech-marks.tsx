/**
 * Framework marks for the "built with" strip that `tech-icons.tsx` does not carry.
 *
 * Every mark is a single-colour inline SVG sized by the caller. They are decorative: the tile
 * underneath always carries the technology name, so a screen reader never needs the logo.
 * Names and marks belong to their owners; they appear here only to state what ARCH runs on.
 */
type MarkProps = { className?: string };

export function NextMark({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10.4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8.7 16.6V7.4l7.2 9.9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.6 7.4v5.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function TailwindMark({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 16 10" className={className} fill="currentColor" aria-hidden>
      <path d="M8 0C5.867 0 4.534 1.066 4 3.2 4.8 2.133 5.733 1.733 6.8 2c.609.152 1.044.593 1.526 1.082C9.11 3.878 10.018 4.8 12 4.8c2.133 0 3.466-1.067 4-3.2-.8 1.066-1.733 1.466-2.8 1.2-.609-.152-1.043-.594-1.526-1.083C10.89.921 9.983 0 8 0ZM4 4.8C1.867 4.8.534 5.866 0 8c.8-1.067 1.733-1.467 2.8-1.2.609.152 1.044.593 1.526 1.082C5.11 8.678 6.018 9.6 8 9.6c2.133 0 3.466-1.067 4-3.2-.8 1.066-1.733 1.466-2.8 1.2-.609-.152-1.043-.594-1.526-1.083C6.89 5.721 5.983 4.8 4 4.8Z" />
    </svg>
  );
}

export function TypeScriptMark({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="1" y="1" width="22" height="22" rx="4" fill="#3178C6" />
      <text x="12" y="16.4" textAnchor="middle" fontSize="10.5" fontWeight="700" fontFamily="ui-sans-serif, system-ui, sans-serif" fill="#ffffff">
        TS
      </text>
    </svg>
  );
}

export function GsapMark({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 44 20" className={className} aria-hidden>
      <text x="22" y="15.2" textAnchor="middle" fontSize="13" fontWeight="800" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fill="currentColor" letterSpacing="0.4">
        GSAP
      </text>
    </svg>
  );
}

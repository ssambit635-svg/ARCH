/**
 * The 5×5 dot grid from the Aceternity "Hero With Background And Navbar" block: it sits in the
 * sunbeam accent box of the ink action and rotates a quarter turn on hover. It is drawn as SVG
 * circles rather than a CSS dot pattern so the sheet keeps its no-radial-gradient rule, and it
 * inherits `currentColor` so the box, not the icon, owns the palette.
 */
export function DotGrid() {
  const dots = Array.from({ length: 25 }, (_, index) => ({
    cx: 2 + (index % 5) * 4,
    cy: 2 + Math.floor(index / 5) * 4,
  }));
  return (
    <span className="mk-dots" aria-hidden="true">
      <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true">
        {dots.map((dot) => (
          <circle key={`${dot.cx}-${dot.cy}`} cx={dot.cx} cy={dot.cy} r="1.15" />
        ))}
      </svg>
    </span>
  );
}

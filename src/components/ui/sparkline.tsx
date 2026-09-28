/** Tiny SVG sparkline for stat cards — server-safe, no JS. */

export function Sparkline({
  points,
  width = 96,
  height = 28,
  stroke = '#3b82f6',
  strokeWidth = 1.6,
}: {
  points: number[];
  width?: number;
  height?: number;
  stroke?: string;
  strokeWidth?: number;
}) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);
  const coords = points.map((value, index) => {
    const x = index * step;
    const y = height - 3 - ((value - min) / span) * (height - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = `M${coords.join(' L')}`;
  const id = `spark-${points.join('-').replace(/[^0-9-]/g, '')}-${width}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" aria-hidden="true" className="shrink-0 opacity-90">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2={height} gradientUnits="userSpaceOnUse">
          <stop stopColor={stroke} stopOpacity="0.35" />
          <stop offset="1" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${width},${height} L0,${height} Z`} fill={`url(#${id})`} />
      <path d={line} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

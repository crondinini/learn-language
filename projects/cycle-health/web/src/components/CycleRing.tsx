interface Props {
  cycleDay: number;
  cycleLength: number;
  periodDuration: number;
  phaseName: string;
}

export function CycleRing({
  cycleDay,
  cycleLength,
  periodDuration,
  phaseName,
}: Props) {
  const size = 160;
  const strokeWidth = 10;
  const radius = size / 2 - strokeWidth;
  const center = size / 2;
  const periodFraction = periodDuration / cycleLength;
  const elapsedFraction = cycleDay / cycleLength;

  // Build arc paths
  const periodArc = describeArc(center, center, radius, 0, periodFraction * 360);
  const elapsedArc =
    cycleDay > periodDuration
      ? describeArc(center, center, radius, periodFraction * 360, elapsedFraction * 360)
      : null;

  // Marker position
  const markerAngle = -90 + elapsedFraction * 360;
  const markerRad = (markerAngle * Math.PI) / 180;
  const mx = center + radius * Math.cos(markerRad);
  const my = center + radius * Math.sin(markerRad);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background track */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="var(--warm-white)"
        strokeWidth={strokeWidth}
      />
      {/* Period arc */}
      <path
        d={periodArc}
        fill="none"
        stroke="var(--terracotta)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Elapsed arc (sand) */}
      {elapsedArc && (
        <path
          d={elapsedArc}
          fill="none"
          stroke="var(--sand)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      )}
      {/* Marker */}
      <circle
        cx={mx}
        cy={my}
        r={6}
        fill={phaseName === "Period" ? "var(--terracotta)" : "var(--bark)"}
      />
      <circle cx={mx} cy={my} r={3} fill="white" />
    </svg>
  );
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

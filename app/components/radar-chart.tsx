"use client";

interface RadarDimension {
  label: string;
  value: number; // 0–1
}

interface RadarChartProps {
  dimensions: RadarDimension[];
  size?: number;
  color?: string;
  showLabels?: boolean;
}

export default function RadarChart({
  dimensions,
  size = 140,
  color = "#5c7cfa",
  showLabels = true,
}: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - (showLabels ? 28 : 8);
  const levels = 4;
  const n = dimensions.length;

  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2; // Start from top

  const getPoint = (index: number, value: number) => {
    const angle = startAngle + index * angleStep;
    return {
      x: cx + radius * value * Math.cos(angle),
      y: cy + radius * value * Math.sin(angle),
    };
  };

  // Grid rings
  const gridRings = Array.from({ length: levels }, (_, i) => {
    const r = (i + 1) / levels;
    const points = Array.from({ length: n }, (_, j) => getPoint(j, r));
    return points.map((p) => `${p.x},${p.y}`).join(" ");
  });

  // Axis lines
  const axes = Array.from({ length: n }, (_, i) => getPoint(i, 1));

  // Data polygon
  const dataPoints = dimensions.map((d, i) =>
    getPoint(i, Math.max(d.value, 0.05))
  );
  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  // Label positions (slightly outside the chart)
  const labelPoints = dimensions.map((d, i) => {
    const angle = startAngle + i * angleStep;
    const labelRadius = radius + 16;
    return {
      x: cx + labelRadius * Math.cos(angle),
      y: cy + labelRadius * Math.sin(angle),
      label: d.label,
      value: d.value,
    };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid rings */}
      {gridRings.map((points, i) => (
        <polygon
          key={i}
          points={points}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={0.5}
          opacity={0.5}
        />
      ))}

      {/* Axis lines */}
      {axes.map((point, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={point.x}
          y2={point.y}
          stroke="#e2e8f0"
          strokeWidth={0.5}
          opacity={0.4}
        />
      ))}

      {/* Data fill */}
      <polygon
        points={dataPolygon}
        fill={color}
        fillOpacity={0.15}
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      >
        <animate
          attributeName="fill-opacity"
          from="0"
          to="0.15"
          dur="0.6s"
          fill="freeze"
        />
      </polygon>

      {/* Data points */}
      {dataPoints.map((point, i) => (
        <circle
          key={i}
          cx={point.x}
          cy={point.y}
          r={2.5}
          fill={color}
          stroke="white"
          strokeWidth={1}
        />
      ))}

      {/* Labels */}
      {showLabels &&
        labelPoints.map((lp, i) => (
          <text
            key={i}
            x={lp.x}
            y={lp.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={8}
            fill="#64748b"
            fontWeight={500}
          >
            {lp.label}
          </text>
        ))}
    </svg>
  );
}

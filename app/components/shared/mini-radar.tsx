"use client";

export interface MiniRadarDimension {
  label: string;
  value: number;
  school_val?: string;
  product_val?: string;
}

// Inline radar chart -- no external deps
export function MiniRadar({ dimensions, size = 200 }: { dimensions: MiniRadarDimension[]; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 32;
  const n = dimensions.length;
  const step = (2 * Math.PI) / n;
  const start = -Math.PI / 2;

  const pt = (i: number, v: number) => ({
    x: cx + r * v * Math.cos(start + i * step),
    y: cy + r * v * Math.sin(start + i * step),
  });

  const grid = [0.25, 0.5, 0.75, 1].map(lv =>
    Array.from({ length: n }, (_, i) => pt(i, lv)).map(p => `${p.x},${p.y}`).join(" ")
  );

  const dataPoly = dimensions.map((d, i) => pt(i, Math.max(d.value, 0.04))).map(p => `${p.x},${p.y}`).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {/* Grid */}
      {grid.map((pts, i) => (
        <polygon key={i} points={pts} fill="none" stroke="#e2e8f0" strokeWidth={0.8} opacity={0.5 + i * 0.1} />
      ))}
      {/* Axes */}
      {Array.from({ length: n }, (_, i) => pt(i, 1)).map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e2e8f0" strokeWidth={0.5} opacity={0.4} />
      ))}
      {/* Filled area */}
      <polygon points={dataPoly} fill="#5c7cfa" fillOpacity={0.12} stroke="#5c7cfa" strokeWidth={2} strokeLinejoin="round">
        <animate attributeName="fill-opacity" from="0" to="0.12" dur="0.8s" fill="freeze" />
      </polygon>
      {/* Data dots + score labels */}
      {dimensions.map((d, i) => {
        const p = pt(i, Math.max(d.value, 0.04));
        const pct = Math.round(d.value * 100);
        const color = pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444";
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill={color} stroke="white" strokeWidth={2} />
            {/* Score near the dot */}
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize={9} fontWeight={700} fill={color}>{pct}%</text>
          </g>
        );
      })}
      {/* Axis labels */}
      {dimensions.map((d, i) => {
        const angle = start + i * step;
        const lx = cx + (r + 22) * Math.cos(angle);
        const ly = cy + (r + 22) * Math.sin(angle);
        return (
          <text key={`l${i}`} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize={9} fontWeight={600} fill="#64748b">
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}

import type { EquityPoint } from "../lib/types";
interface EquityChartProps {
  formatValue: (value: number | null | undefined) => string;
  points: EquityPoint[];
  subtitle: string;
  title: string;
}

export function EquityChart({ formatValue, points, subtitle, title }: EquityChartProps) {
  if (points.length === 0) {
    return <div className="empty-state">Aucun trade cloture pour afficher la courbe.</div>;
  }

  const width = 680;
  const height = 260;
  const padding = 40;
  const values = points.map((point) => point.equity);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;

  const coordinates = points.map((point, index) => {
    const x =
      points.length === 1
        ? width / 2
        : padding + (index / (points.length - 1)) * (width - padding * 2);
    const y = height - padding - ((point.equity - min) / range) * (height - padding * 2);
    return { x, y, point };
  });

  const path = coordinates
    .map((coordinate, index) => `${index === 0 ? "M" : "L"} ${coordinate.x} ${coordinate.y}`)
    .join(" ");
  const zeroY = height - padding - ((0 - min) / range) * (height - padding * 2);
  const ticks = [max, min + range / 2, min];

  return (
    <div className="chart-panel">
      <div className="chart-head">
        <div>
          <h2>{title}</h2>
          <span>{subtitle}</span>
        </div>
        <strong>{formatValue(values[values.length - 1])}</strong>
      </div>
      <svg className="equity-chart" viewBox={`0 0 ${width} ${height}`} role="img">
        {ticks.map((tick) => {
          const y = height - padding - ((tick - min) / range) * (height - padding * 2);
          return (
            <g key={tick}>
              <line x1={padding} x2={width - padding} y1={y} y2={y} className="grid-line" />
              <text x={8} y={y + 4} className="axis-label">
                {formatValue(tick)}
              </text>
            </g>
          );
        })}
        <line x1={padding} x2={width - padding} y1={zeroY} y2={zeroY} className="zero-line" />
        <path d={path} className="equity-line" />
        {coordinates.map(({ x, y, point }) => (
          <circle
            key={point.label}
            cx={x}
            cy={y}
            r="4"
            className={point.pnl_mode === "manual_broker_pnl" ? "dot-manual" : "dot-auto"}
          />
        ))}
        <text x={padding} y={height - 6} className="axis-label">
          {points[0]?.label}
        </text>
        <text x={width - padding - 70} y={height - 6} className="axis-label">
          {points[points.length - 1]?.label}
        </text>
      </svg>
    </div>
  );
}

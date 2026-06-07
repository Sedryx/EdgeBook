interface MetricProps {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}

export function Metric({ label, value, tone = "neutral" }: MetricProps) {
  return (
    <div className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

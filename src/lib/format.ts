export function currency(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "-";
  }

  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function numberValue(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined) {
    return "-";
  }

  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);
}

export function resultLabel(value: string): string {
  const labels: Record<string, string> = {
    win: "Win",
    loss: "Loss",
    breakeven: "Breakeven",
    open: "Ouvert"
  };

  return labels[value] ?? value;
}

export function pnlModeLabel(value: string): string {
  return value === "manual_broker_pnl" ? "Broker manuel" : "Automatique";
}

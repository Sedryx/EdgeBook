from __future__ import annotations

from collections import Counter
from typing import Mapping, Sequence


def build_dashboard_stats(trades: Sequence[Mapping]) -> dict:
    closed = [trade for trade in trades if trade["net_pnl"] is not None]
    total_net_pnl = sum(float(trade["net_pnl"]) for trade in closed)
    total_r = sum(float(trade["r_result"]) for trade in closed if trade["r_result"] is not None)
    wins = [trade for trade in closed if trade["trade_result"] == "win"]
    losses = [trade for trade in closed if trade["trade_result"] == "loss"]
    mode_counts = Counter(trade["pnl_calculation_mode"] for trade in trades)
    result_counts = Counter(trade["trade_result"] for trade in trades)

    return {
        "total_trades": len(trades),
        "closed_trades": len(closed),
        "total_net_pnl": total_net_pnl,
        "total_r": total_r,
        "win_rate": (len(wins) / len(closed) * 100) if closed else 0,
        "average_win": _average(trade["net_pnl"] for trade in wins),
        "average_loss": _average(trade["net_pnl"] for trade in losses),
        "mode_counts": dict(mode_counts),
        "result_counts": dict(result_counts),
    }


def equity_curve(trades: Sequence[Mapping]) -> list[dict]:
    running_total = 0.0
    points = []
    for trade in reversed(trades):
        if trade["net_pnl"] is None:
            continue
        running_total += float(trade["net_pnl"])
        points.append(
            {
                "trade": f"#{trade['id']} {trade['symbol']}",
                "trade_date": trade["trade_date"],
                "equity": running_total,
                "pnl_mode": trade["pnl_calculation_mode"],
            }
        )
    return points


def _average(values) -> float:
    values = [float(value) for value in values if value is not None]
    return sum(values) / len(values) if values else 0.0

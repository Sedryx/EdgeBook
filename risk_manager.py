from __future__ import annotations


def calculate_risk_amount(entry_price: float, stop_loss: float | None, position_size: float) -> float | None:
    if stop_loss is None:
        return None
    return abs(entry_price - stop_loss) * position_size


def calculate_position_size(risk_amount: float, entry_price: float, stop_loss: float) -> float | None:
    price_risk = abs(entry_price - stop_loss)
    if price_risk <= 0:
        return None
    return risk_amount / price_risk

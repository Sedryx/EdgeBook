from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


Direction = Literal["long", "short"]
PnlCalculationMode = Literal["automatic", "manual_broker_pnl"]
TradeResult = Literal["win", "loss", "breakeven", "open"]

AUTOMATIC = "automatic"
MANUAL_BROKER_PNL = "manual_broker_pnl"


@dataclass(frozen=True)
class TradeCalculation:
    gross_pnl: float | None
    net_pnl: float | None
    r_result: float | None
    trade_result: TradeResult


def calculate_gross_pnl(
    direction: Direction,
    entry_price: float,
    actual_exit_price: float,
    position_size: float,
) -> float:
    if direction == "long":
        return (actual_exit_price - entry_price) * position_size
    if direction == "short":
        return (entry_price - actual_exit_price) * position_size
    raise ValueError("direction must be 'long' or 'short'")


def calculate_net_pnl(gross_pnl: float, fees: float = 0.0) -> float:
    return gross_pnl - fees


def calculate_r_result(net_pnl: float | None, risk_amount: float | None) -> float | None:
    if net_pnl is None or risk_amount is None or risk_amount <= 0:
        return None
    return net_pnl / risk_amount


def classify_trade_result(net_pnl: float | None, tolerance: float = 0.0000001) -> TradeResult:
    if net_pnl is None:
        return "open"
    if net_pnl > tolerance:
        return "win"
    if net_pnl < -tolerance:
        return "loss"
    return "breakeven"


def calculate_trade(
    *,
    pnl_calculation_mode: PnlCalculationMode = AUTOMATIC,
    direction: Direction,
    entry_price: float,
    actual_exit_price: float | None,
    position_size: float,
    fees: float = 0.0,
    risk_amount: float | None = None,
    manual_broker_net_pnl: float | None = None,
) -> TradeCalculation:
    if pnl_calculation_mode == MANUAL_BROKER_PNL:
        net_pnl = manual_broker_net_pnl
        gross_pnl = None if net_pnl is None else net_pnl + fees
    elif pnl_calculation_mode == AUTOMATIC:
        if actual_exit_price is None:
            gross_pnl = None
            net_pnl = None
        else:
            gross_pnl = calculate_gross_pnl(
                direction=direction,
                entry_price=entry_price,
                actual_exit_price=actual_exit_price,
                position_size=position_size,
            )
            net_pnl = calculate_net_pnl(gross_pnl, fees)
    else:
        raise ValueError("pnl_calculation_mode must be 'automatic' or 'manual_broker_pnl'")

    return TradeCalculation(
        gross_pnl=gross_pnl,
        net_pnl=net_pnl,
        r_result=calculate_r_result(net_pnl, risk_amount),
        trade_result=classify_trade_result(net_pnl),
    )

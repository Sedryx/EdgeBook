from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any

from calculations import AUTOMATIC, calculate_trade


DB_PATH = Path("data/trading_journal.db")


def get_connection(db_path: Path | str = DB_PATH) -> sqlite3.Connection:
    path = Path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    return connection


def init_db(db_path: Path | str = DB_PATH) -> None:
    with get_connection(db_path) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS trades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT NOT NULL,
                trade_date TEXT NOT NULL,
                direction TEXT NOT NULL CHECK (direction IN ('long', 'short')),
                entry_price REAL NOT NULL,
                stop_loss REAL,
                take_profit REAL,
                position_size REAL NOT NULL,
                actual_exit_price REAL,
                fees REAL NOT NULL DEFAULT 0,
                risk_amount REAL,
                pnl_calculation_mode TEXT NOT NULL DEFAULT 'automatic'
                    CHECK (pnl_calculation_mode IN ('automatic', 'manual_broker_pnl')),
                manual_broker_net_pnl REAL,
                pnl_manual_override_reason TEXT,
                gross_pnl REAL,
                net_pnl REAL,
                r_result REAL,
                trade_result TEXT NOT NULL DEFAULT 'open'
                    CHECK (trade_result IN ('win', 'loss', 'breakeven', 'open')),
                notes TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        _ensure_column(connection, "trades", "pnl_calculation_mode", "TEXT NOT NULL DEFAULT 'automatic'")
        _ensure_column(connection, "trades", "manual_broker_net_pnl", "REAL")
        _ensure_column(connection, "trades", "pnl_manual_override_reason", "TEXT")
        _ensure_column(connection, "trades", "gross_pnl", "REAL")
        _ensure_column(connection, "trades", "net_pnl", "REAL")
        _ensure_column(connection, "trades", "r_result", "REAL")
        _ensure_column(connection, "trades", "trade_result", "TEXT NOT NULL DEFAULT 'open'")
        connection.commit()


def _ensure_column(connection: sqlite3.Connection, table: str, column: str, definition: str) -> None:
    columns = {row["name"] for row in connection.execute(f"PRAGMA table_info({table})")}
    if column not in columns:
        connection.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def upsert_trade(trade: dict[str, Any], db_path: Path | str = DB_PATH) -> int:
    init_db(db_path)
    calculation = calculate_trade(
        pnl_calculation_mode=trade.get("pnl_calculation_mode") or AUTOMATIC,
        direction=trade["direction"],
        entry_price=float(trade["entry_price"]),
        actual_exit_price=_optional_float(trade.get("actual_exit_price")),
        position_size=float(trade["position_size"]),
        fees=float(trade.get("fees") or 0),
        risk_amount=_optional_float(trade.get("risk_amount")),
        manual_broker_net_pnl=_optional_float(trade.get("manual_broker_net_pnl")),
    )

    payload = {
        **trade,
        "pnl_calculation_mode": trade.get("pnl_calculation_mode") or AUTOMATIC,
        "fees": float(trade.get("fees") or 0),
        "gross_pnl": calculation.gross_pnl,
        "net_pnl": calculation.net_pnl,
        "r_result": calculation.r_result,
        "trade_result": calculation.trade_result,
    }
    fields = [
        "symbol",
        "trade_date",
        "direction",
        "entry_price",
        "stop_loss",
        "take_profit",
        "position_size",
        "actual_exit_price",
        "fees",
        "risk_amount",
        "pnl_calculation_mode",
        "manual_broker_net_pnl",
        "pnl_manual_override_reason",
        "gross_pnl",
        "net_pnl",
        "r_result",
        "trade_result",
        "notes",
    ]

    with get_connection(db_path) as connection:
        if payload.get("id"):
            assignments = ", ".join(f"{field} = ?" for field in fields)
            values = [payload.get(field) for field in fields]
            values.append(payload["id"])
            connection.execute(
                f"UPDATE trades SET {assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                values,
            )
            trade_id = int(payload["id"])
        else:
            placeholders = ", ".join("?" for _ in fields)
            cursor = connection.execute(
                f"INSERT INTO trades ({', '.join(fields)}) VALUES ({placeholders})",
                [payload.get(field) for field in fields],
            )
            trade_id = int(cursor.lastrowid)
        connection.commit()
        return trade_id


def list_trades(db_path: Path | str = DB_PATH) -> list[sqlite3.Row]:
    init_db(db_path)
    with get_connection(db_path) as connection:
        return list(
            connection.execute(
                "SELECT * FROM trades ORDER BY trade_date DESC, id DESC"
            )
        )


def _optional_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    return float(value)

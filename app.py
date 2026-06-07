from __future__ import annotations

from datetime import date

import pandas as pd
import streamlit as st

from analytics import build_dashboard_stats, equity_curve
from calculations import AUTOMATIC, MANUAL_BROKER_PNL
from database import list_trades, upsert_trade
from risk_manager import calculate_risk_amount


MANUAL_OVERRIDE_REASONS = [
    "frais complexes",
    "funding fees",
    "sortie partielle",
    "plusieurs entrees",
    "donnee broker plus precise",
    "autre",
]


st.set_page_config(page_title="EdgeBook", page_icon="EB", layout="wide")


def main() -> None:
    st.title("EdgeBook")

    trade_tab, dashboard_tab = st.tabs(["Journal", "Dashboard"])

    with trade_tab:
        render_trade_form()
        render_trades_table()

    with dashboard_tab:
        render_dashboard()


def render_trade_form() -> None:
    st.subheader("Nouveau trade")

    with st.form("trade_form", clear_on_submit=True):
        left, middle, right = st.columns(3)

        with left:
            symbol = st.text_input("Symbole", value="BTCUSDT")
            trade_date = st.date_input("Date", value=date.today())
            direction = st.selectbox("Direction", ["long", "short"])
            pnl_calculation_mode = st.radio(
                "Mode de calcul PnL",
                [AUTOMATIC, MANUAL_BROKER_PNL],
                index=0,
                format_func=lambda mode: "Automatique" if mode == AUTOMATIC else "PnL manuel broker",
                horizontal=True,
            )

        with middle:
            entry_price = st.number_input("Prix d'entree", min_value=0.0, step=0.01, format="%.8f")
            stop_loss = st.number_input("Stop loss", min_value=0.0, step=0.01, format="%.8f")
            take_profit = st.number_input("Take profit", min_value=0.0, step=0.01, format="%.8f")
            position_size = st.number_input("Taille de position", min_value=0.0, step=0.01, format="%.8f")

        with right:
            actual_exit_price = st.number_input("Prix de sortie reel", min_value=0.0, step=0.01, format="%.8f")
            fees = st.number_input("Frais", min_value=0.0, step=0.01, format="%.8f")
            manual_broker_net_pnl = None
            pnl_manual_override_reason = None

            if pnl_calculation_mode == MANUAL_BROKER_PNL:
                manual_broker_net_pnl = st.number_input(
                    "PnL net broker",
                    step=0.01,
                    format="%.8f",
                )
                pnl_manual_override_reason = st.selectbox(
                    "Raison override manuel",
                    MANUAL_OVERRIDE_REASONS,
                )

        calculated_risk = calculate_risk_amount(
            entry_price=entry_price,
            stop_loss=stop_loss if stop_loss > 0 else None,
            position_size=position_size,
        )
        risk_amount = st.number_input(
            "Montant risque",
            min_value=0.0,
            value=float(calculated_risk or 0),
            step=0.01,
            format="%.8f",
        )
        notes = st.text_area("Notes")

        submitted = st.form_submit_button("Enregistrer")
        if submitted:
            if not symbol.strip():
                st.error("Le symbole est obligatoire.")
                return
            if entry_price <= 0 or position_size <= 0:
                st.error("Le prix d'entree et la taille de position doivent etre superieurs a zero.")
                return
            if pnl_calculation_mode == AUTOMATIC and actual_exit_price <= 0:
                st.error("En mode automatique, le prix de sortie reel est obligatoire.")
                return
            if pnl_calculation_mode == MANUAL_BROKER_PNL and manual_broker_net_pnl is None:
                st.error("En mode PnL manuel broker, le PnL net broker est obligatoire.")
                return

            trade_id = upsert_trade(
                {
                    "symbol": symbol.strip().upper(),
                    "trade_date": trade_date.isoformat(),
                    "direction": direction,
                    "entry_price": entry_price,
                    "stop_loss": stop_loss if stop_loss > 0 else None,
                    "take_profit": take_profit if take_profit > 0 else None,
                    "position_size": position_size,
                    "actual_exit_price": actual_exit_price if actual_exit_price > 0 else None,
                    "fees": fees,
                    "risk_amount": risk_amount if risk_amount > 0 else None,
                    "pnl_calculation_mode": pnl_calculation_mode,
                    "manual_broker_net_pnl": manual_broker_net_pnl,
                    "pnl_manual_override_reason": pnl_manual_override_reason,
                    "notes": notes,
                }
            )
            st.success(f"Trade #{trade_id} enregistre.")


def render_trades_table() -> None:
    trades = [dict(trade) for trade in list_trades()]
    if not trades:
        st.info("Aucun trade enregistre.")
        return

    st.subheader("Trades")
    dataframe = pd.DataFrame(trades)
    dataframe["pnl_source"] = dataframe["pnl_calculation_mode"].map(
        {
            AUTOMATIC: "Automatique",
            MANUAL_BROKER_PNL: "Broker manuel",
        }
    )
    visible_columns = [
        "id",
        "trade_date",
        "symbol",
        "direction",
        "pnl_source",
        "entry_price",
        "actual_exit_price",
        "position_size",
        "fees",
        "gross_pnl",
        "net_pnl",
        "r_result",
        "trade_result",
        "pnl_manual_override_reason",
    ]
    st.dataframe(dataframe[visible_columns], use_container_width=True, hide_index=True)


def render_dashboard() -> None:
    trades = [dict(trade) for trade in list_trades()]
    stats = build_dashboard_stats(trades)

    first, second, third, fourth = st.columns(4)
    first.metric("Trades clotures", stats["closed_trades"])
    second.metric("PnL net total", f"{stats['total_net_pnl']:.2f}")
    third.metric("Resultat total en R", f"{stats['total_r']:.2f}R")
    fourth.metric("Win rate", f"{stats['win_rate']:.1f}%")

    mode_counts = stats["mode_counts"]
    auto_count = mode_counts.get(AUTOMATIC, 0)
    manual_count = mode_counts.get(MANUAL_BROKER_PNL, 0)
    st.caption(f"Sources PnL: {auto_count} automatique(s), {manual_count} manuel broker.")

    if not trades:
        st.info("Ajoute un trade pour afficher les statistiques et graphiques.")
        return

    charts_left, charts_right = st.columns(2)

    with charts_left:
        curve = pd.DataFrame(equity_curve(trades))
        if not curve.empty:
            st.line_chart(curve, x="trade", y="equity")

    with charts_right:
        result_counts = pd.DataFrame(
            [{"resultat": key, "nombre": value} for key, value in stats["result_counts"].items()]
        )
        if not result_counts.empty:
            st.bar_chart(result_counts, x="resultat", y="nombre")

    mode_dataframe = pd.DataFrame(
        [{"mode": _mode_label(key), "trades": value} for key, value in mode_counts.items()]
    )
    if not mode_dataframe.empty:
        st.subheader("Repartition des sources PnL")
        st.bar_chart(mode_dataframe, x="mode", y="trades")


def _mode_label(mode: str) -> str:
    return "Automatique" if mode == AUTOMATIC else "Broker manuel"


if __name__ == "__main__":
    main()

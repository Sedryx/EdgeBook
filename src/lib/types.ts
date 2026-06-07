export type Direction = "long" | "short";
export type PnlCalculationMode = "automatic" | "manual_broker_pnl";
export type TradeResult = "win" | "loss" | "breakeven" | "open";

export interface TradeInput {
  symbol: string;
  trade_date: string;
  direction: Direction;
  entry_price: number;
  stop_loss: number | null;
  take_profit: number | null;
  position_size: number;
  actual_exit_price: number | null;
  fees: number;
  risk_amount: number | null;
  pnl_calculation_mode: PnlCalculationMode;
  manual_broker_net_pnl: number | null;
  pnl_manual_override_reason: string | null;
  screenshot_data_url: string | null;
  strategy: string | null;
  tags: string | null;
  confidence: number | null;
  plan_followed: number | null;
  emotion: string | null;
  mistake: string | null;
  review_notes: string | null;
  notes: string | null;
}

export interface AppSettings {
  starting_balance: number;
  display_currency: string;
  language: string;
  max_risk_per_trade: number | null;
  daily_loss_limit: number | null;
  max_trades_per_day: number | null;
  monthly_goal: number | null;
}

export interface Trade extends TradeInput {
  id: number;
  gross_pnl: number | null;
  net_pnl: number | null;
  r_result: number | null;
  trade_result: TradeResult;
}

export interface DashboardStats {
  total_trades: number;
  closed_trades: number;
  starting_balance: number;
  account_balance: number;
  total_net_pnl: number;
  total_r: number;
  win_rate: number;
  automatic_count: number;
  manual_broker_count: number;
  wins: number;
  losses: number;
  breakevens: number;
}

export interface EquityPoint {
  label: string;
  equity: number;
  pnl_mode: PnlCalculationMode;
}

export interface DashboardPayload {
  trades: Trade[];
  stats: DashboardStats;
  equity_curve: EquityPoint[];
  settings: AppSettings;
}

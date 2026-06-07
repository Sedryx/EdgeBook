use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use thiserror::Error;

#[derive(Debug, Error)]
enum EdgeBookError {
    #[error("database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("filesystem error: {0}")]
    Filesystem(#[from] std::io::Error),
    #[error("application data directory is unavailable")]
    MissingAppDataDir,
}

impl Serialize for EdgeBookError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

type CommandResult<T> = Result<T, EdgeBookError>;

#[derive(Debug, Deserialize)]
struct TradeInput {
    symbol: String,
    trade_date: String,
    direction: String,
    entry_price: f64,
    stop_loss: Option<f64>,
    take_profit: Option<f64>,
    position_size: f64,
    actual_exit_price: Option<f64>,
    fees: f64,
    risk_amount: Option<f64>,
    pnl_calculation_mode: String,
    manual_broker_net_pnl: Option<f64>,
    pnl_manual_override_reason: Option<String>,
    screenshot_data_url: Option<String>,
    strategy: Option<String>,
    tags: Option<String>,
    confidence: Option<f64>,
    plan_followed: Option<f64>,
    emotion: Option<String>,
    mistake: Option<String>,
    review_notes: Option<String>,
    notes: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
struct AppSettings {
    starting_balance: f64,
    display_currency: String,
    language: String,
    max_risk_per_trade: Option<f64>,
    daily_loss_limit: Option<f64>,
    max_trades_per_day: Option<i64>,
    monthly_goal: Option<f64>,
}

#[derive(Debug, Serialize)]
struct Trade {
    id: i64,
    symbol: String,
    trade_date: String,
    direction: String,
    entry_price: f64,
    stop_loss: Option<f64>,
    take_profit: Option<f64>,
    position_size: f64,
    actual_exit_price: Option<f64>,
    fees: f64,
    risk_amount: Option<f64>,
    pnl_calculation_mode: String,
    manual_broker_net_pnl: Option<f64>,
    pnl_manual_override_reason: Option<String>,
    screenshot_data_url: Option<String>,
    strategy: Option<String>,
    tags: Option<String>,
    confidence: Option<f64>,
    plan_followed: Option<f64>,
    emotion: Option<String>,
    mistake: Option<String>,
    review_notes: Option<String>,
    gross_pnl: Option<f64>,
    net_pnl: Option<f64>,
    r_result: Option<f64>,
    trade_result: String,
    notes: Option<String>,
}

#[derive(Debug, Serialize)]
struct DashboardStats {
    total_trades: usize,
    closed_trades: usize,
    starting_balance: f64,
    account_balance: f64,
    total_net_pnl: f64,
    total_r: f64,
    win_rate: f64,
    automatic_count: usize,
    manual_broker_count: usize,
    wins: usize,
    losses: usize,
    breakevens: usize,
}

#[derive(Debug, Serialize)]
struct EquityPoint {
    label: String,
    equity: f64,
    pnl_mode: String,
}

#[derive(Debug, Serialize)]
struct DashboardPayload {
    trades: Vec<Trade>,
    stats: DashboardStats,
    equity_curve: Vec<EquityPoint>,
    settings: AppSettings,
}

struct TradeCalculation {
    gross_pnl: Option<f64>,
    net_pnl: Option<f64>,
    r_result: Option<f64>,
    trade_result: String,
}

#[tauri::command]
fn save_trade(app: AppHandle, trade: TradeInput) -> CommandResult<i64> {
    let connection = open_database(&app)?;
    init_database(&connection)?;
    let calculation = calculate_trade(&trade);

    connection.execute(
        "INSERT INTO trades (
            symbol, trade_date, direction, entry_price, stop_loss, take_profit,
            position_size, actual_exit_price, fees, risk_amount, pnl_calculation_mode,
            manual_broker_net_pnl, pnl_manual_override_reason, screenshot_data_url, strategy,
            tags, confidence, plan_followed, emotion, mistake, review_notes, gross_pnl,
            net_pnl, r_result, trade_result, notes
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26)",
        params![
            trade.symbol.trim().to_uppercase(),
            trade.trade_date,
            trade.direction,
            trade.entry_price,
            trade.stop_loss,
            trade.take_profit,
            trade.position_size,
            trade.actual_exit_price,
            trade.fees,
            trade.risk_amount,
            trade.pnl_calculation_mode,
            trade.manual_broker_net_pnl,
            trade.pnl_manual_override_reason,
            trade.screenshot_data_url,
            trade.strategy,
            trade.tags,
            trade.confidence,
            trade.plan_followed,
            trade.emotion,
            trade.mistake,
            trade.review_notes,
            calculation.gross_pnl,
            calculation.net_pnl,
            calculation.r_result,
            calculation.trade_result,
            trade.notes,
        ],
    )?;

    Ok(connection.last_insert_rowid())
}

#[tauri::command]
fn get_dashboard(app: AppHandle) -> CommandResult<DashboardPayload> {
    let connection = open_database(&app)?;
    init_database(&connection)?;
    let settings = fetch_settings(&connection)?;
    let trades = fetch_trades(&connection)?;
    let stats = build_stats(&trades, &settings);
    let equity_curve = build_equity_curve(&trades, settings.starting_balance);

    Ok(DashboardPayload {
        trades,
        stats,
        equity_curve,
        settings,
    })
}

#[tauri::command]
fn save_app_settings(app: AppHandle, settings: AppSettings) -> CommandResult<AppSettings> {
    let connection = open_database(&app)?;
    init_database(&connection)?;
    connection.execute(
        "INSERT INTO app_settings (
            id, starting_balance, display_currency, language, max_risk_per_trade,
            daily_loss_limit, max_trades_per_day, monthly_goal
        )
        VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7)
        ON CONFLICT(id) DO UPDATE SET
            starting_balance = excluded.starting_balance,
            display_currency = excluded.display_currency,
            language = excluded.language,
            max_risk_per_trade = excluded.max_risk_per_trade,
            daily_loss_limit = excluded.daily_loss_limit,
            max_trades_per_day = excluded.max_trades_per_day,
            monthly_goal = excluded.monthly_goal,
            updated_at = CURRENT_TIMESTAMP",
        params![
            settings.starting_balance,
            settings.display_currency.trim().to_uppercase(),
            settings.language,
            settings.max_risk_per_trade,
            settings.daily_loss_limit,
            settings.max_trades_per_day,
            settings.monthly_goal,
        ],
    )?;

    fetch_settings(&connection)
}

#[tauri::command]
fn seed_demo_trades(app: AppHandle) -> CommandResult<usize> {
    let connection = open_database(&app)?;
    init_database(&connection)?;

    let existing: i64 = connection.query_row(
        "SELECT COUNT(*) FROM trades WHERE notes = 'demo'",
        [],
        |row| row.get(0),
    )?;

    if existing > 0 {
        return Ok(0);
    }

    let demo_trades = demo_trades();
    let mut inserted = 0;

    for trade in demo_trades {
        let calculation = calculate_trade(&trade);
        connection.execute(
            "INSERT INTO trades (
                symbol, trade_date, direction, entry_price, stop_loss, take_profit,
                position_size, actual_exit_price, fees, risk_amount, pnl_calculation_mode,
                manual_broker_net_pnl, pnl_manual_override_reason, screenshot_data_url,
                strategy, tags, confidence, plan_followed, emotion, mistake, review_notes,
                gross_pnl, net_pnl, r_result, trade_result, notes
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26)",
            params![
                trade.symbol,
                trade.trade_date,
                trade.direction,
                trade.entry_price,
                trade.stop_loss,
                trade.take_profit,
                trade.position_size,
                trade.actual_exit_price,
                trade.fees,
                trade.risk_amount,
                trade.pnl_calculation_mode,
                trade.manual_broker_net_pnl,
                trade.pnl_manual_override_reason,
                trade.screenshot_data_url,
                trade.strategy,
                trade.tags,
                trade.confidence,
                trade.plan_followed,
                trade.emotion,
                trade.mistake,
                trade.review_notes,
                calculation.gross_pnl,
                calculation.net_pnl,
                calculation.r_result,
                calculation.trade_result,
                trade.notes,
            ],
        )?;
        inserted += 1;
    }

    Ok(inserted)
}

fn open_database(app: &AppHandle) -> CommandResult<Connection> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| EdgeBookError::MissingAppDataDir)?;
    fs::create_dir_all(&app_data_dir)?;
    let db_path: PathBuf = app_data_dir.join("trading_journal.db");
    Ok(Connection::open(db_path)?)
}

fn init_database(connection: &Connection) -> CommandResult<()> {
    connection.execute(
        "CREATE TABLE IF NOT EXISTS trades (
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
            screenshot_data_url TEXT,
            strategy TEXT,
            tags TEXT,
            confidence REAL,
            plan_followed REAL,
            emotion TEXT,
            mistake TEXT,
            review_notes TEXT,
            gross_pnl REAL,
            net_pnl REAL,
            r_result REAL,
            trade_result TEXT NOT NULL DEFAULT 'open'
                CHECK (trade_result IN ('win', 'loss', 'breakeven', 'open')),
            notes TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    ensure_column(connection, "trades", "screenshot_data_url", "TEXT")?;
    ensure_column(connection, "trades", "strategy", "TEXT")?;
    ensure_column(connection, "trades", "tags", "TEXT")?;
    ensure_column(connection, "trades", "confidence", "REAL")?;
    ensure_column(connection, "trades", "plan_followed", "REAL")?;
    ensure_column(connection, "trades", "emotion", "TEXT")?;
    ensure_column(connection, "trades", "mistake", "TEXT")?;
    ensure_column(connection, "trades", "review_notes", "TEXT")?;
    connection.execute(
        "CREATE TABLE IF NOT EXISTS app_settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            starting_balance REAL NOT NULL DEFAULT 10000,
            display_currency TEXT NOT NULL DEFAULT 'USD',
            language TEXT NOT NULL DEFAULT 'fr',
            max_risk_per_trade REAL,
            daily_loss_limit REAL,
            max_trades_per_day INTEGER,
            monthly_goal REAL,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    ensure_column(connection, "app_settings", "max_risk_per_trade", "REAL")?;
    ensure_column(connection, "app_settings", "daily_loss_limit", "REAL")?;
    ensure_column(connection, "app_settings", "max_trades_per_day", "INTEGER")?;
    ensure_column(connection, "app_settings", "monthly_goal", "REAL")?;
    connection.execute(
        "INSERT OR IGNORE INTO app_settings (id, starting_balance, display_currency, language, max_risk_per_trade, daily_loss_limit, max_trades_per_day, monthly_goal)
        VALUES (1, 10000, 'USD', 'fr', 1, 300, 4, 1000)",
        [],
    )?;
    Ok(())
}

fn ensure_column(
    connection: &Connection,
    table: &str,
    column: &str,
    definition: &str,
) -> CommandResult<()> {
    let mut statement = connection.prepare(&format!("PRAGMA table_info({table})"))?;
    let columns = statement.query_map([], |row| row.get::<_, String>(1))?;
    for existing in columns {
        if existing? == column {
            return Ok(());
        }
    }
    connection.execute(
        &format!("ALTER TABLE {table} ADD COLUMN {column} {definition}"),
        [],
    )?;
    Ok(())
}

fn fetch_settings(connection: &Connection) -> CommandResult<AppSettings> {
    Ok(connection.query_row(
        "SELECT starting_balance, display_currency, language, max_risk_per_trade, daily_loss_limit, max_trades_per_day, monthly_goal FROM app_settings WHERE id = 1",
        [],
        |row| {
            Ok(AppSettings {
                starting_balance: row.get(0)?,
                display_currency: row.get(1)?,
                language: row.get(2)?,
                max_risk_per_trade: row.get(3)?,
                daily_loss_limit: row.get(4)?,
                max_trades_per_day: row.get(5)?,
                monthly_goal: row.get(6)?,
            })
        },
    )?)
}

fn fetch_trades(connection: &Connection) -> CommandResult<Vec<Trade>> {
    let mut statement = connection.prepare(
        "SELECT id, symbol, trade_date, direction, entry_price, stop_loss, take_profit,
            position_size, actual_exit_price, fees, risk_amount, pnl_calculation_mode,
            manual_broker_net_pnl, pnl_manual_override_reason, screenshot_data_url,
            strategy, tags, confidence, plan_followed, emotion, mistake, review_notes,
            gross_pnl, net_pnl, r_result, trade_result, notes
        FROM trades
        ORDER BY trade_date DESC, id DESC",
    )?;
    let rows = statement.query_map([], row_to_trade)?;
    let mut trades = Vec::new();

    for trade in rows {
        trades.push(trade?);
    }

    Ok(trades)
}

fn row_to_trade(row: &Row) -> rusqlite::Result<Trade> {
    Ok(Trade {
        id: row.get(0)?,
        symbol: row.get(1)?,
        trade_date: row.get(2)?,
        direction: row.get(3)?,
        entry_price: row.get(4)?,
        stop_loss: row.get(5)?,
        take_profit: row.get(6)?,
        position_size: row.get(7)?,
        actual_exit_price: row.get(8)?,
        fees: row.get(9)?,
        risk_amount: row.get(10)?,
        pnl_calculation_mode: row.get(11)?,
        manual_broker_net_pnl: row.get(12)?,
        pnl_manual_override_reason: row.get(13)?,
        screenshot_data_url: row.get(14)?,
        strategy: row.get(15)?,
        tags: row.get(16)?,
        confidence: row.get(17)?,
        plan_followed: row.get(18)?,
        emotion: row.get(19)?,
        mistake: row.get(20)?,
        review_notes: row.get(21)?,
        gross_pnl: row.get(22)?,
        net_pnl: row.get(23)?,
        r_result: row.get(24)?,
        trade_result: row.get(25)?,
        notes: row.get(26)?,
    })
}

fn calculate_trade(trade: &TradeInput) -> TradeCalculation {
    let (gross_pnl, net_pnl) = if trade.pnl_calculation_mode == "manual_broker_pnl" {
        let net = trade.manual_broker_net_pnl;
        (net.map(|value| value + trade.fees), net)
    } else if let Some(exit_price) = trade.actual_exit_price {
        let gross = if trade.direction == "short" {
            (trade.entry_price - exit_price) * trade.position_size
        } else {
            (exit_price - trade.entry_price) * trade.position_size
        };
        (Some(gross), Some(gross - trade.fees))
    } else {
        (None, None)
    };

    let r_result = match (net_pnl, trade.risk_amount) {
        (Some(net), Some(risk)) if risk > 0.0 => Some(net / risk),
        _ => None,
    };

    TradeCalculation {
        gross_pnl,
        net_pnl,
        r_result,
        trade_result: classify_result(net_pnl),
    }
}

fn classify_result(net_pnl: Option<f64>) -> String {
    match net_pnl {
        Some(value) if value > 0.0000001 => "win".to_string(),
        Some(value) if value < -0.0000001 => "loss".to_string(),
        Some(_) => "breakeven".to_string(),
        None => "open".to_string(),
    }
}

fn build_stats(trades: &[Trade], settings: &AppSettings) -> DashboardStats {
    let closed_trades: Vec<&Trade> = trades
        .iter()
        .filter(|trade| trade.net_pnl.is_some())
        .collect();
    let total_net_pnl = closed_trades
        .iter()
        .filter_map(|trade| trade.net_pnl)
        .sum::<f64>();
    let total_r = closed_trades
        .iter()
        .filter_map(|trade| trade.r_result)
        .sum::<f64>();
    let wins = closed_trades
        .iter()
        .filter(|trade| trade.trade_result == "win")
        .count();
    let losses = closed_trades
        .iter()
        .filter(|trade| trade.trade_result == "loss")
        .count();
    let breakevens = closed_trades
        .iter()
        .filter(|trade| trade.trade_result == "breakeven")
        .count();
    let automatic_count = trades
        .iter()
        .filter(|trade| trade.pnl_calculation_mode == "automatic")
        .count();
    let manual_broker_count = trades
        .iter()
        .filter(|trade| trade.pnl_calculation_mode == "manual_broker_pnl")
        .count();

    DashboardStats {
        total_trades: trades.len(),
        closed_trades: closed_trades.len(),
        starting_balance: settings.starting_balance,
        account_balance: settings.starting_balance + total_net_pnl,
        total_net_pnl,
        total_r,
        win_rate: if closed_trades.is_empty() {
            0.0
        } else {
            wins as f64 / closed_trades.len() as f64 * 100.0
        },
        automatic_count,
        manual_broker_count,
        wins,
        losses,
        breakevens,
    }
}

fn build_equity_curve(trades: &[Trade], starting_balance: f64) -> Vec<EquityPoint> {
    let mut running_total = starting_balance;
    let mut points = Vec::new();

    points.push(EquityPoint {
        label: "Start".to_string(),
        equity: starting_balance,
        pnl_mode: "automatic".to_string(),
    });

    for trade in trades.iter().rev() {
        if let Some(net_pnl) = trade.net_pnl {
            running_total += net_pnl;
            points.push(EquityPoint {
                label: format!("#{} {}", trade.id, trade.symbol),
                equity: running_total,
                pnl_mode: trade.pnl_calculation_mode.clone(),
            });
        }
    }

    points
}

fn demo_trades() -> Vec<TradeInput> {
    vec![
        demo_trade(
            "BTCUSDT",
            "2026-05-13",
            "long",
            101_250.0,
            99_900.0,
            104_800.0,
            0.08,
            103_650.0,
            9.5,
            "automatic",
            None,
            None,
        ),
        demo_trade(
            "ETHUSDC",
            "2026-05-14",
            "short",
            3_840.0,
            3_910.0,
            3_680.0,
            1.7,
            3_735.0,
            7.2,
            "automatic",
            None,
            None,
        ),
        demo_trade(
            "SOLUSDT",
            "2026-05-15",
            "long",
            172.4,
            166.8,
            186.0,
            35.0,
            168.1,
            4.4,
            "automatic",
            None,
            None,
        ),
        demo_trade(
            "EURUSD",
            "2026-05-16",
            "long",
            1.0865,
            1.0810,
            1.0960,
            30_000.0,
            1.0940,
            3.0,
            "automatic",
            None,
            None,
        ),
        demo_trade(
            "USDJPY",
            "2026-05-17",
            "short",
            156.20,
            157.05,
            154.60,
            1_200.0,
            155.10,
            5.0,
            "manual_broker_pnl",
            Some(1315.0),
            Some("donnee broker plus precise"),
        ),
        demo_trade(
            "XAUUSD",
            "2026-05-20",
            "long",
            3_345.0,
            3_318.0,
            3_410.0,
            3.0,
            3_386.0,
            12.0,
            "automatic",
            None,
            None,
        ),
        demo_trade(
            "GBPUSD",
            "2026-05-21",
            "short",
            1.2760,
            1.2820,
            1.2630,
            22_000.0,
            1.2805,
            4.5,
            "automatic",
            None,
            None,
        ),
        demo_trade(
            "BNBUSDT",
            "2026-05-22",
            "long",
            682.0,
            661.0,
            724.0,
            4.5,
            717.0,
            6.0,
            "manual_broker_pnl",
            Some(148.4),
            Some("funding fees"),
        ),
        demo_trade(
            "ADAUSDT",
            "2026-05-23",
            "long",
            0.684,
            0.653,
            0.752,
            1_900.0,
            0.735,
            3.8,
            "automatic",
            None,
            None,
        ),
        demo_trade(
            "USDCAD",
            "2026-05-24",
            "short",
            1.3710,
            1.3775,
            1.3580,
            18_000.0,
            1.3678,
            3.2,
            "manual_broker_pnl",
            Some(54.7),
            Some("sortie partielle"),
        ),
        demo_trade(
            "AVAXUSDT",
            "2026-05-27",
            "long",
            34.2,
            32.8,
            37.4,
            80.0,
            33.1,
            3.1,
            "automatic",
            None,
            None,
        ),
        demo_trade(
            "AUDUSD",
            "2026-05-28",
            "long",
            0.6620,
            0.6575,
            0.6710,
            25_000.0,
            0.6698,
            4.0,
            "automatic",
            None,
            None,
        ),
        demo_trade(
            "LINKUSDT",
            "2026-05-29",
            "short",
            18.9,
            19.6,
            17.4,
            120.0,
            18.05,
            4.9,
            "manual_broker_pnl",
            Some(92.6),
            Some("plusieurs entrees"),
        ),
        demo_trade(
            "DOGEUSDT",
            "2026-06-01",
            "long",
            0.182,
            0.174,
            0.204,
            5_000.0,
            0.1828,
            2.4,
            "automatic",
            None,
            None,
        ),
        demo_trade(
            "NAS100",
            "2026-06-02",
            "short",
            19_740.0,
            19_850.0,
            19_420.0,
            0.7,
            19_486.0,
            8.0,
            "automatic",
            None,
            None,
        ),
    ]
}

#[allow(clippy::too_many_arguments)]
fn demo_trade(
    symbol: &str,
    trade_date: &str,
    direction: &str,
    entry_price: f64,
    stop_loss: f64,
    take_profit: f64,
    position_size: f64,
    actual_exit_price: f64,
    fees: f64,
    pnl_calculation_mode: &str,
    manual_broker_net_pnl: Option<f64>,
    pnl_manual_override_reason: Option<&str>,
) -> TradeInput {
    TradeInput {
        symbol: symbol.to_string(),
        trade_date: trade_date.to_string(),
        direction: direction.to_string(),
        entry_price,
        stop_loss: Some(stop_loss),
        take_profit: Some(take_profit),
        position_size,
        actual_exit_price: Some(actual_exit_price),
        fees,
        risk_amount: Some((entry_price - stop_loss).abs() * position_size),
        pnl_calculation_mode: pnl_calculation_mode.to_string(),
        manual_broker_net_pnl,
        pnl_manual_override_reason: pnl_manual_override_reason.map(str::to_string),
        screenshot_data_url: None,
        strategy: Some("breakout".to_string()),
        tags: Some("demo,execution".to_string()),
        confidence: Some(7.0),
        plan_followed: Some(8.0),
        emotion: Some("focused".to_string()),
        mistake: None,
        review_notes: Some("Demo trade".to_string()),
        notes: Some("demo".to_string()),
    }
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            save_trade,
            get_dashboard,
            save_app_settings,
            seed_demo_trades
        ])
        .run(tauri::generate_context!())
        .expect("failed to run EdgeBook");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn trade(direction: &str, entry: f64, exit: f64, size: f64, fees: f64) -> TradeInput {
        TradeInput {
            symbol: "TEST".to_string(),
            trade_date: "2026-06-08".to_string(),
            direction: direction.to_string(),
            entry_price: entry,
            stop_loss: Some(if direction == "long" {
                entry - 5.0
            } else {
                entry + 5.0
            }),
            take_profit: None,
            position_size: size,
            actual_exit_price: Some(exit),
            fees,
            risk_amount: Some(10.0),
            pnl_calculation_mode: "automatic".to_string(),
            manual_broker_net_pnl: None,
            pnl_manual_override_reason: None,
            screenshot_data_url: None,
            strategy: None,
            tags: None,
            confidence: None,
            plan_followed: None,
            emotion: None,
            mistake: None,
            review_notes: None,
            notes: None,
        }
    }

    #[test]
    fn calculates_long_trade_pnl() {
        let calculation = calculate_trade(&trade("long", 100.0, 110.0, 2.0, 1.0));
        assert_eq!(calculation.gross_pnl, Some(20.0));
        assert_eq!(calculation.net_pnl, Some(19.0));
        assert_eq!(calculation.r_result, Some(1.9));
        assert_eq!(calculation.trade_result, "win");
    }

    #[test]
    fn calculates_short_trade_pnl() {
        let calculation = calculate_trade(&trade("short", 100.0, 90.0, 2.0, 1.0));
        assert_eq!(calculation.gross_pnl, Some(20.0));
        assert_eq!(calculation.net_pnl, Some(19.0));
        assert_eq!(calculation.r_result, Some(1.9));
        assert_eq!(calculation.trade_result, "win");
    }

    #[test]
    fn manual_broker_pnl_is_official() {
        let mut input = trade("long", 100.0, 120.0, 1.0, 3.0);
        input.pnl_calculation_mode = "manual_broker_pnl".to_string();
        input.manual_broker_net_pnl = Some(12.5);
        let calculation = calculate_trade(&input);
        assert_eq!(calculation.gross_pnl, Some(15.5));
        assert_eq!(calculation.net_pnl, Some(12.5));
        assert_eq!(calculation.r_result, Some(1.25));
    }

    #[test]
    fn stats_include_account_balance() {
        let settings = AppSettings {
            starting_balance: 1000.0,
            display_currency: "USD".to_string(),
            language: "en".to_string(),
            max_risk_per_trade: Some(1.0),
            daily_loss_limit: Some(100.0),
            max_trades_per_day: Some(3),
            monthly_goal: Some(500.0),
        };
        let first = Trade {
            id: 1,
            symbol: "A".to_string(),
            trade_date: "2026-06-08".to_string(),
            direction: "long".to_string(),
            entry_price: 100.0,
            stop_loss: None,
            take_profit: None,
            position_size: 1.0,
            actual_exit_price: Some(110.0),
            fees: 0.0,
            risk_amount: Some(10.0),
            pnl_calculation_mode: "automatic".to_string(),
            manual_broker_net_pnl: None,
            pnl_manual_override_reason: None,
            screenshot_data_url: None,
            strategy: None,
            tags: None,
            confidence: None,
            plan_followed: None,
            emotion: None,
            mistake: None,
            review_notes: None,
            gross_pnl: Some(10.0),
            net_pnl: Some(10.0),
            r_result: Some(1.0),
            trade_result: "win".to_string(),
            notes: None,
        };
        let stats = build_stats(&[first], &settings);
        assert_eq!(stats.account_balance, 1010.0);
        assert_eq!(stats.win_rate, 100.0);
    }
}

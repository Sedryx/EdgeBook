import { invoke } from "@tauri-apps/api/core";
import {
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  Database,
  Download,
  Globe2,
  Image,
  LineChart,
  Moon,
  Palette,
  Plus,
  RefreshCw,
  Settings,
  Sparkles,
  Sun
} from "lucide-react";
import { ClipboardEvent as ReactClipboardEvent, FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { EquityChart } from "./components/EquityChart";
import { Metric } from "./components/Metric";
import { numberValue, pnlModeLabel, resultLabel } from "./lib/format";
import type { AppSettings, DashboardPayload, Direction, PnlCalculationMode, TradeInput } from "./lib/types";

type Tab = "dashboard" | "journal" | "trades" | "calendar" | "review" | "settings";

const manualReasons = [
  "frais complexes",
  "funding fees",
  "sortie partielle",
  "plusieurs entrees",
  "donnee broker plus precise",
  "autre"
];

const popularSymbols = [
  "BTCUSDT",
  "ETHUSDC",
  "SOLUSDT",
  "BNBUSDT",
  "XRPUSDT",
  "ADAUSDT",
  "DOGEUSDT",
  "AVAXUSDT",
  "LINKUSDT",
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "USDCAD",
  "AUDUSD",
  "XAUUSD",
  "NAS100",
  "SPX500"
];

const currencyOptions = ["USD", "EUR", "CHF", "GBP", "JPY", "USDT", "USDC", "BTC", "ETH"];

const labels = {
  fr: {
    welcome: "Bienvenue",
    subtitle: "Vue claire du compte, du PnL et de la discipline.",
    dashboard: "Tableau de bord",
    journal: "Journal",
    trades: "Trades",
    calendar: "Calendrier",
    review: "Review",
    settings: "Parametres",
    balance: "Balance",
    startBalance: "Balance depart",
    netPnl: "PnL net",
    winRate: "Win rate",
    totalR: "Total R",
    closedTrades: "Trades clotures",
    newTrade: "Nouveau trade",
    market: "Marche",
    save: "Enregistrer",
    source: "Source PnL",
    demo: "Charger demo",
    theme: "Theme",
    density: "Densite",
    language: "Langue",
    displayCurrency: "Devise",
    account: "Compte",
    compactMessage: "Les informations importantes, sans bruit.",
    equity: "Evolution du compte",
    equitySubtitle: "Balance apres chaque trade cloture",
    directionSplit: "Long / Short",
    directionSubtitle: "Repartition des directions",
    resultSplit: "Resultats",
    resultSubtitle: "Win, loss et breakeven",
    pnlByMarket: "PnL par marche",
    pnlByMarketSubtitle: "Top marches par PnL net",
    screenshot: "Screenshot",
    pasteScreenshot: "Clique ici puis Ctrl+V pour coller une image",
    remove: "Retirer",
    side: "Sens",
    result: "Resultat",
    reason: "Raison"
  },
  en: {
    welcome: "Welcome",
    subtitle: "Clean view of balance, PnL and execution.",
    dashboard: "Dashboard",
    journal: "Journal",
    trades: "Trades",
    calendar: "Calendar",
    review: "Review",
    settings: "Settings",
    balance: "Balance",
    startBalance: "Start balance",
    netPnl: "Net PnL",
    winRate: "Win rate",
    totalR: "Total R",
    closedTrades: "Closed trades",
    newTrade: "New trade",
    market: "Market",
    save: "Save",
    source: "PnL source",
    demo: "Load demo",
    theme: "Theme",
    density: "Density",
    language: "Language",
    displayCurrency: "Currency",
    account: "Account",
    compactMessage: "Important information, no clutter.",
    equity: "Account equity",
    equitySubtitle: "Balance after each closed trade",
    directionSplit: "Long / Short",
    directionSubtitle: "Direction split",
    resultSplit: "Results",
    resultSubtitle: "Wins, losses and breakevens",
    pnlByMarket: "PnL by market",
    pnlByMarketSubtitle: "Top markets by net PnL",
    screenshot: "Screenshot",
    pasteScreenshot: "Click here, then press Ctrl+V to paste an image",
    remove: "Remove",
    side: "Side",
    result: "Result",
    reason: "Reason"
  },
  es: {
    welcome: "Bienvenido",
    subtitle: "Balance, PnL y ejecucion en una vista limpia.",
    dashboard: "Dashboard",
    journal: "Diario",
    trades: "Trades",
    calendar: "Calendario",
    review: "Revision",
    settings: "Ajustes",
    balance: "Balance",
    startBalance: "Balance inicial",
    netPnl: "PnL neto",
    winRate: "Win rate",
    totalR: "Total R",
    closedTrades: "Trades cerrados",
    newTrade: "Nuevo trade",
    market: "Mercado",
    save: "Guardar",
    source: "Fuente PnL",
    demo: "Cargar demo",
    theme: "Tema",
    density: "Densidad",
    language: "Idioma",
    displayCurrency: "Divisa",
    account: "Cuenta",
    compactMessage: "Informacion clave, sin ruido.",
    equity: "Evolucion de cuenta",
    equitySubtitle: "Balance despues de cada trade cerrado",
    directionSplit: "Long / Short",
    directionSubtitle: "Distribucion de direccion",
    resultSplit: "Resultados",
    resultSubtitle: "Wins, losses y breakeven",
    pnlByMarket: "PnL por mercado",
    pnlByMarketSubtitle: "Top mercados por PnL neto",
    screenshot: "Captura",
    pasteScreenshot: "Haz clic aqui y pulsa Ctrl+V para pegar una imagen",
    remove: "Quitar",
    side: "Lado",
    result: "Resultado",
    reason: "Razon"
  },
  de: {
    welcome: "Willkommen",
    subtitle: "Kontostand, PnL und Ausfuehrung auf einen Blick.",
    dashboard: "Dashboard",
    journal: "Journal",
    trades: "Trades",
    calendar: "Kalender",
    review: "Review",
    settings: "Settings",
    balance: "Kontostand",
    startBalance: "Startkapital",
    netPnl: "Netto PnL",
    winRate: "Win rate",
    totalR: "Total R",
    closedTrades: "Geschlossene Trades",
    newTrade: "Neuer Trade",
    market: "Markt",
    save: "Speichern",
    source: "PnL Quelle",
    demo: "Demo laden",
    theme: "Theme",
    density: "Dichte",
    language: "Sprache",
    displayCurrency: "Waehrung",
    account: "Konto",
    compactMessage: "Wichtige Informationen, klar geordnet.",
    equity: "Kontoentwicklung",
    equitySubtitle: "Kontostand nach jedem geschlossenen Trade",
    directionSplit: "Long / Short",
    directionSubtitle: "Verteilung der Richtung",
    resultSplit: "Ergebnisse",
    resultSubtitle: "Wins, Losses und Breakeven",
    pnlByMarket: "PnL nach Markt",
    pnlByMarketSubtitle: "Top Maerkte nach Netto-PnL",
    screenshot: "Screenshot",
    pasteScreenshot: "Hier klicken und mit Ctrl+V ein Bild einfuegen",
    remove: "Entfernen",
    side: "Richtung",
    result: "Ergebnis",
    reason: "Grund"
  }
};

const initialForm: TradeInput = {
  symbol: "BTCUSDT",
  trade_date: new Date().toISOString().slice(0, 10),
  direction: "long",
  entry_price: 0,
  stop_loss: null,
  take_profit: null,
  position_size: 0,
  actual_exit_price: null,
  fees: 0,
  risk_amount: null,
  pnl_calculation_mode: "automatic",
  manual_broker_net_pnl: null,
  pnl_manual_override_reason: null,
  screenshot_data_url: null,
  strategy: "breakout",
  tags: "",
  confidence: null,
  plan_followed: null,
  emotion: "",
  mistake: "",
  review_notes: "",
  notes: null
};

const defaultSettings: AppSettings = {
  starting_balance: 10000,
  display_currency: "USD",
  language: "fr",
  max_risk_per_trade: 1,
  daily_loss_limit: 300,
  max_trades_per_day: 4,
  monthly_goal: 1000
};

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [form, setForm] = useState<TradeInput>(initialForm);
  const [settingsForm, setSettingsForm] = useState<AppSettings>(defaultSettings);
  const [theme, setTheme] = useState("aurora");
  const [density, setDensity] = useState("comfortable");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const text = labels[(settingsForm.language as keyof typeof labels) || "fr"] ?? labels.fr;
  const stats = dashboard?.stats;
  const trades = dashboard?.trades ?? [];
  const money = (value: number | null | undefined) => formatMoney(value, settingsForm.display_currency);

  async function refreshDashboard() {
    const payload = await invoke<DashboardPayload>("get_dashboard");
    setDashboard(payload);
    setSettingsForm(payload.settings);
  }

  useEffect(() => {
    refreshDashboard().catch((caughtError) => setError(String(caughtError)));
  }, []);

  useEffect(() => {
    if (activeTab !== "journal") {
      return;
    }

    function pasteScreenshot(event: ClipboardEvent) {
      const imageItem = Array.from(event.clipboardData?.items ?? []).find((item) =>
        item.type.startsWith("image/")
      );
      if (!imageItem) {
        return;
      }

      event.preventDefault();
      const file = imageItem.getAsFile();
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = () => updateTrade("screenshot_data_url", String(reader.result));
      reader.readAsDataURL(file);
      setMessage("Screenshot ajoute au trade.");
      setError(null);
    }

    window.addEventListener("paste", pasteScreenshot);
    return () => window.removeEventListener("paste", pasteScreenshot);
  }, [activeTab]);

  const estimatedRisk = useMemo(() => {
    if (!form.stop_loss || form.entry_price <= 0 || form.position_size <= 0) {
      return null;
    }
    return Math.abs(form.entry_price - form.stop_loss) * form.position_size;
  }, [form.entry_price, form.position_size, form.stop_loss]);

  async function saveTrade(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!form.symbol.trim()) {
      setError("Market is required.");
      return;
    }

    if (form.entry_price <= 0 || form.position_size <= 0) {
      setError("Entry price and position size must be above zero.");
      return;
    }

    if (form.pnl_calculation_mode === "automatic" && !form.actual_exit_price) {
      setError("Automatic mode needs an exit price.");
      return;
    }

    if (form.pnl_calculation_mode === "manual_broker_pnl" && form.manual_broker_net_pnl === null) {
      setError("Manual broker mode needs a broker net PnL.");
      return;
    }

    const tradeId = await invoke<number>("save_trade", {
      trade: {
        ...form,
        symbol: form.symbol.trim(),
        risk_amount: form.risk_amount ?? estimatedRisk
      }
    });

    setMessage(`Trade #${tradeId} saved.`);
    setForm({ ...initialForm, trade_date: new Date().toISOString().slice(0, 10) });
    setActiveTab("dashboard");
    await refreshDashboard();
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const saved = await invoke<AppSettings>("save_app_settings", {
      settings: {
        ...settingsForm,
        display_currency: settingsForm.display_currency.trim().toUpperCase()
      }
    });
    setSettingsForm(saved);
    await refreshDashboard();
    setMessage("Settings saved.");
  }

  async function seedDemoData() {
    setError(null);
    setMessage(null);
    const inserted = await invoke<number>("seed_demo_trades");
    await refreshDashboard();
    setMessage(inserted > 0 ? `${inserted} demo trades added.` : "Demo trades already loaded.");
    setActiveTab("dashboard");
  }

  return (
    <main className={`app-shell density-${density}`} data-theme={theme}>
      <aside className="sidebar">
        <div className="brand-mark">
          <CircleDollarSign size={30} />
          <div>
            <strong>EdgeBook</strong>
            <span>Desktop journal</span>
          </div>
        </div>

        <nav>
          <NavButton active={activeTab === "dashboard"} icon={<BarChart3 size={18} />} onClick={() => switchTab("dashboard")}>
            {text.dashboard}
          </NavButton>
          <NavButton active={activeTab === "journal"} icon={<Plus size={18} />} onClick={() => switchTab("journal")}>
            {text.journal}
          </NavButton>
          <NavButton active={activeTab === "trades"} icon={<Database size={18} />} onClick={() => switchTab("trades")}>
            {text.trades}
          </NavButton>
          <NavButton active={activeTab === "calendar"} icon={<CalendarDays size={18} />} onClick={() => switchTab("calendar")}>
            Calendar
          </NavButton>
          <NavButton active={activeTab === "review"} icon={<ClipboardList size={18} />} onClick={() => switchTab("review")}>
            Review
          </NavButton>
          <NavButton active={activeTab === "settings"} icon={<Settings size={18} />} onClick={() => switchTab("settings")}>
            {text.settings}
          </NavButton>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">EdgeBook</span>
            <h1>{text[activeTab]}</h1>
            <p>{activeTab === "dashboard" ? text.subtitle : text.compactMessage}</p>
          </div>
          <button className="icon-button" onClick={() => refreshDashboard()} title="Refresh">
            <RefreshCw size={18} />
          </button>
        </header>

        {(error || message) && (
          <div className={`alert ${error ? "alert-error" : "alert-success"}`}>{error ?? message}</div>
        )}

        {activeTab === "dashboard" && (
          <DashboardView dashboard={dashboard} text={text} money={money} setActiveTab={setActiveTab} />
        )}

        {activeTab === "journal" && (
          <JournalView
            form={form}
            estimatedRisk={estimatedRisk}
            text={text}
            update={updateTrade}
            saveTrade={saveTrade}
          />
        )}

        {activeTab === "trades" && <TradesView trades={trades} text={text} money={money} />}

        {activeTab === "calendar" && <CalendarView trades={trades} money={money} />}

        {activeTab === "review" && <ReviewView trades={trades} settings={settingsForm} money={money} />}

        {activeTab === "settings" && (
          <SettingsView
            density={density}
            seedDemoData={seedDemoData}
            setDensity={setDensity}
            setSettingsForm={setSettingsForm}
            setTheme={setTheme}
            settingsForm={settingsForm}
            saveSettings={saveSettings}
            text={text}
            theme={theme}
          />
        )}
      </section>
    </main>
  );

  function updateTrade<Key extends keyof TradeInput>(key: Key, value: TradeInput[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function switchTab(tab: Tab) {
    setError(null);
    setMessage(null);
    setActiveTab(tab);
  }
}

function DashboardView({
  dashboard,
  money,
  setActiveTab,
  text
}: {
  dashboard: DashboardPayload | null;
  money: (value: number | null | undefined) => string;
  setActiveTab: (tab: Tab) => void;
  text: (typeof labels)["fr"];
}) {
  const stats = dashboard?.stats;
  const trades = dashboard?.trades ?? [];
  const longCount = trades.filter((trade) => trade.direction === "long").length;
  const shortCount = trades.filter((trade) => trade.direction === "short").length;
  const resultRows = [
    { label: "Win", value: stats?.wins ?? 0, tone: "long" },
    { label: "Loss", value: stats?.losses ?? 0, tone: "short" },
    { label: "BE", value: stats?.breakevens ?? 0, tone: "neutral" }
  ];
  const pnlRows = marketPnlRows(trades).slice(0, 5);

  return (
    <div className="tab-panel">
      <section className="welcome-panel">
        <div>
          <span className="eyebrow">{text.welcome}</span>
          <h2>{text.balance}: {money(stats?.account_balance ?? 0)}</h2>
          <p>{text.subtitle}</p>
        </div>
        <button className="primary-button compact-button" type="button" onClick={() => setActiveTab("journal")}>
          <Plus size={18} />
          {text.newTrade}
        </button>
      </section>

      <section className="metrics-grid">
        <Metric label={text.balance} value={money(stats?.account_balance ?? 0)} tone={(stats?.account_balance ?? 0) >= (stats?.starting_balance ?? 0) ? "positive" : "negative"} />
        <Metric label={text.netPnl} value={money(stats?.total_net_pnl ?? 0)} tone={(stats?.total_net_pnl ?? 0) >= 0 ? "positive" : "negative"} />
        <Metric label={text.totalR} value={`${numberValue(stats?.total_r ?? 0)}R`} />
        <Metric label={text.winRate} value={`${numberValue(stats?.win_rate ?? 0, 1)}%`} />
      </section>

      <section className="dashboard-grid">
        <EquityChart
          formatValue={money}
          points={dashboard?.equity_curve ?? []}
          subtitle={text.equitySubtitle}
          title={text.equity}
        />
        <div className="chart-panel">
          <div className="chart-head">
            <div>
              <h2>{text.directionSplit}</h2>
              <span>{text.directionSubtitle}</span>
            </div>
            <LineChart size={18} />
          </div>
          <div className="bar-stack">
            <BarRow label="Long" value={longCount} total={Math.max(longCount + shortCount, 1)} tone="long" />
            <BarRow label="Short" value={shortCount} total={Math.max(longCount + shortCount, 1)} tone="short" />
          </div>
        </div>
        <div className="chart-panel">
          <div className="chart-head">
            <div>
              <h2>{text.resultSplit}</h2>
              <span>{text.resultSubtitle}</span>
            </div>
            <BarChart3 size={18} />
          </div>
          <div className="bar-stack">
            {resultRows.map((row) => (
              <BarRow
                key={row.label}
                label={row.label}
                value={row.value}
                total={Math.max(stats?.closed_trades ?? 1, 1)}
                tone={row.tone}
              />
            ))}
          </div>
        </div>
        <div className="chart-panel">
          <div className="chart-head">
            <div>
              <h2>{text.pnlByMarket}</h2>
              <span>{text.pnlByMarketSubtitle}</span>
            </div>
            <Database size={18} />
          </div>
          <div className="bar-stack">
            {pnlRows.map((row) => (
              <MoneyBarRow
                key={row.label}
                label={row.label}
                value={row.value}
                max={Math.max(...pnlRows.map((item) => Math.abs(item.value)), 1)}
                money={money}
              />
            ))}
            {pnlRows.length === 0 && <div className="empty-state">No closed trades.</div>}
          </div>
        </div>
      </section>

      <section className="source-grid source-grid-wide">
        <div>
          <span>{text.closedTrades}</span>
          <strong>{stats?.closed_trades ?? 0}</strong>
        </div>
        <div>
          <span>Automatic</span>
          <strong>{stats?.automatic_count ?? 0}</strong>
        </div>
        <div>
          <span>Broker manual</span>
          <strong>{stats?.manual_broker_count ?? 0}</strong>
        </div>
      </section>

      <section className="source-grid source-grid-wide">
        {advancedStats(trades).map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong>{item.kind === "money" ? money(item.value) : item.kind === "r" ? `${numberValue(item.value)}R` : numberValue(item.value)}</strong>
          </div>
        ))}
      </section>
    </div>
  );
}

function JournalView({
  estimatedRisk,
  form,
  saveTrade,
  text,
  update
}: {
  estimatedRisk: number | null;
  form: TradeInput;
  saveTrade: (event: FormEvent) => void;
  text: (typeof labels)["fr"];
  update: <Key extends keyof TradeInput>(key: Key, value: TradeInput[Key]) => void;
}) {
  function pasteScreenshot(event: ReactClipboardEvent<HTMLDivElement>) {
    const imageItem = Array.from(event.clipboardData.items).find((item) => item.type.startsWith("image/"));
    if (!imageItem) {
      return;
    }

    event.preventDefault();
    const file = imageItem.getAsFile();
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => update("screenshot_data_url", String(reader.result));
    reader.readAsDataURL(file);
  }

  function selectScreenshot(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => update("screenshot_data_url", String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <form className="trade-form tab-panel" onSubmit={saveTrade}>
      <div className="section-title">
        <h2>{text.newTrade}</h2>
        <span>{pnlModeLabel(form.pnl_calculation_mode)}</span>
      </div>

      <div className="form-row compact">
        <label>
          {text.market}
          <input list="symbol-options" value={form.symbol} onChange={(event) => update("symbol", event.target.value)} />
          <datalist id="symbol-options">
            {popularSymbols.map((symbol) => (
              <option key={symbol} value={symbol} />
            ))}
          </datalist>
        </label>
        <label>
          Date
          <input type="date" value={form.trade_date} onChange={(event) => update("trade_date", event.target.value)} />
        </label>
      </div>

      <div className="segmented-control direction-control">
        <button type="button" className={form.direction === "long" ? "active long-active" : ""} onClick={() => update("direction", "long" satisfies Direction)}>
          Long
        </button>
        <button type="button" className={form.direction === "short" ? "active short-active" : ""} onClick={() => update("direction", "short" satisfies Direction)}>
          Short
        </button>
      </div>

      <div className="segmented-control">
        <button type="button" className={form.pnl_calculation_mode === "automatic" ? "active" : ""} onClick={() => update("pnl_calculation_mode", "automatic" satisfies PnlCalculationMode)}>
          Automatic
        </button>
        <button type="button" className={form.pnl_calculation_mode === "manual_broker_pnl" ? "active" : ""} onClick={() => update("pnl_calculation_mode", "manual_broker_pnl" satisfies PnlCalculationMode)}>
          Broker PnL
        </button>
      </div>

      <div className="form-row">
        <NumberField label="Entry" value={form.entry_price} onChange={(value) => update("entry_price", value ?? 0)} />
        <NumberField label="Stop loss" value={form.stop_loss} onChange={(value) => update("stop_loss", value)} />
        <NumberField label="Take profit" value={form.take_profit} onChange={(value) => update("take_profit", value)} />
        <NumberField label="Size" value={form.position_size} onChange={(value) => update("position_size", value ?? 0)} />
        <NumberField label="Exit" value={form.actual_exit_price} onChange={(value) => update("actual_exit_price", value)} />
        <NumberField label="Fees" value={form.fees} onChange={(value) => update("fees", value ?? 0)} />
      </div>

      {form.pnl_calculation_mode === "manual_broker_pnl" && (
        <div className="manual-panel">
          <NumberField label="Broker net PnL" value={form.manual_broker_net_pnl} onChange={(value) => update("manual_broker_net_pnl", value)} />
          <label>
            Reason
            <select value={form.pnl_manual_override_reason ?? ""} onChange={(event) => update("pnl_manual_override_reason", event.target.value || null)}>
              <option value="">Select</option>
              {manualReasons.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="form-row compact">
        <label>
          Strategy
          <input value={form.strategy ?? ""} onChange={(event) => update("strategy", event.target.value || null)} />
        </label>
        <label>
          Tags
          <input value={form.tags ?? ""} placeholder="breakout, london, news" onChange={(event) => update("tags", event.target.value || null)} />
        </label>
        <NumberField label={`Risk${estimatedRisk ? ` ${numberValue(estimatedRisk)}` : ""}`} value={form.risk_amount} onChange={(value) => update("risk_amount", value)} />
        <label>
          Notes
          <input value={form.notes ?? ""} onChange={(event) => update("notes", event.target.value || null)} />
        </label>
      </div>

      <div className="form-row">
        <NumberField label="Confidence /10" value={form.confidence} onChange={(value) => update("confidence", value)} />
        <NumberField label="Plan followed /10" value={form.plan_followed} onChange={(value) => update("plan_followed", value)} />
        <label>
          Emotion
          <input value={form.emotion ?? ""} onChange={(event) => update("emotion", event.target.value || null)} />
        </label>
        <label>
          Mistake
          <input value={form.mistake ?? ""} onChange={(event) => update("mistake", event.target.value || null)} />
        </label>
      </div>

      <label className="wide-field">
        Review notes
        <input value={form.review_notes ?? ""} onChange={(event) => update("review_notes", event.target.value || null)} />
      </label>

      <div className="screenshot-panel">
        <div className="section-title">
          <h2>{text.screenshot}</h2>
          {form.screenshot_data_url && (
            <button className="secondary-button mini-button" type="button" onClick={() => update("screenshot_data_url", null)}>
              {text.remove}
            </button>
          )}
        </div>
        <div className="paste-target" tabIndex={0} onPaste={pasteScreenshot}>
          {form.screenshot_data_url ? (
            <img src={form.screenshot_data_url} alt="Trade screenshot" />
          ) : (
            <div>
              <Image size={26} />
              <span>{text.pasteScreenshot}</span>
            </div>
          )}
        </div>
        <label className="file-button">
          <Image size={16} />
          Select image
          <input
            accept="image/*"
            type="file"
            onChange={(event) => selectScreenshot(event.target.files?.[0])}
          />
        </label>
      </div>

      <button className="primary-button" type="submit">
        <Plus size={18} />
        {text.save}
      </button>
    </form>
  );
}

function TradesView({
  money,
  text,
  trades
}: {
  money: (value: number | null | undefined) => string;
  text: (typeof labels)["fr"];
  trades: DashboardPayload["trades"];
}) {
  return (
    <section className="table-section tab-panel">
      <div className="section-title">
        <h2>{text.trades}</h2>
        <div className="action-row">
          <button className="secondary-button mini-button" type="button" onClick={() => downloadExport("edgebook-trades.csv", toCsv(trades), "text/csv")}>
            <Download size={14} />
            CSV
          </button>
          <button className="secondary-button mini-button" type="button" onClick={() => downloadExport("edgebook-backup.json", JSON.stringify(trades, null, 2), "application/json")}>
            <Download size={14} />
            JSON
          </button>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Market</th>
              <th>Side</th>
              <th>{text.source}</th>
              <th>Net</th>
              <th>R</th>
              <th>Result</th>
              <th>{text.screenshot}</th>
              <th>Review</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr key={trade.id} className={`trade-row trade-${trade.direction}`}>
                <td>{trade.trade_date}</td>
                <td>{trade.symbol}</td>
                <td>
                  <span className={`side-pill side-${trade.direction}`}>{trade.direction}</span>
                </td>
                <td>
                  <span className={`mode-pill mode-${trade.pnl_calculation_mode}`}>
                    {pnlModeLabel(trade.pnl_calculation_mode)}
                  </span>
                </td>
                <td className={trade.net_pnl && trade.net_pnl < 0 ? "negative-text" : "positive-text"}>
                  {money(trade.net_pnl)}
                </td>
                <td>{trade.r_result === null ? "-" : `${numberValue(trade.r_result)}R`}</td>
                <td>{resultLabel(trade.trade_result)}</td>
                <td>
                  {trade.screenshot_data_url ? (
                    <a href={trade.screenshot_data_url} target="_blank" rel="noreferrer">
                      <img className="trade-thumb" src={trade.screenshot_data_url} alt="Trade screenshot" />
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td>
                  <details className="trade-details">
                    <summary>Open</summary>
                    <div>
                      <strong>{trade.strategy ?? "No strategy"}</strong>
                      <span>{trade.tags ?? "No tags"}</span>
                      <span>Confidence: {trade.confidence ?? "-"}/10</span>
                      <span>Plan: {trade.plan_followed ?? "-"}/10</span>
                      <span>Emotion: {trade.emotion ?? "-"}</span>
                      <span>Mistake: {trade.mistake ?? "-"}</span>
                      <p>{trade.review_notes ?? trade.notes ?? ""}</p>
                    </div>
                  </details>
                </td>
                <td>{trade.pnl_manual_override_reason ?? "-"}</td>
              </tr>
            ))}
            {trades.length === 0 && (
              <tr>
                <td colSpan={10} className="empty-cell">
                  No trades yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CalendarView({
  money,
  trades
}: {
  money: (value: number | null | undefined) => string;
  trades: DashboardPayload["trades"];
}) {
  const days = dailyRows(trades);
  return (
    <section className="table-section tab-panel">
      <div className="section-title">
        <div>
          <h2>Calendar</h2>
          <span>Daily PnL and activity.</span>
        </div>
        <CalendarDays size={18} />
      </div>
      <div className="calendar-grid">
        {days.map((day) => (
          <div key={day.date} className={`calendar-day ${day.pnl >= 0 ? "calendar-win" : "calendar-loss"}`}>
            <span>{day.date}</span>
            <strong>{money(day.pnl)}</strong>
            <small>{day.count} trade{day.count > 1 ? "s" : ""}</small>
          </div>
        ))}
        {days.length === 0 && <div className="empty-state">No closed trades.</div>}
      </div>
    </section>
  );
}

function ReviewView({
  money,
  settings,
  trades
}: {
  money: (value: number | null | undefined) => string;
  settings: AppSettings;
  trades: DashboardPayload["trades"];
}) {
  const reviewTrades = trades.filter((trade) => {
    const riskPct =
      trade.risk_amount && settings.starting_balance > 0 ? (trade.risk_amount / settings.starting_balance) * 100 : 0;
    return (
      trade.trade_result === "loss" ||
      trade.pnl_calculation_mode === "manual_broker_pnl" ||
      !trade.screenshot_data_url ||
      Boolean(trade.mistake) ||
      (settings.max_risk_per_trade !== null && riskPct > settings.max_risk_per_trade)
    );
  });

  return (
    <section className="table-section tab-panel">
      <div className="section-title">
        <div>
          <h2>Review</h2>
          <span>Losses, overrides, missing screenshots and rule breaks.</span>
        </div>
        <ClipboardList size={18} />
      </div>
      <div className="review-list">
        {reviewTrades.map((trade) => (
          <div key={trade.id} className={`review-card trade-${trade.direction}`}>
            <div>
              <strong>#{trade.id} {trade.symbol}</strong>
              <span>{trade.trade_date} · {trade.direction} · {resultLabel(trade.trade_result)}</span>
            </div>
            <div>
              <span>Net</span>
              <strong className={trade.net_pnl && trade.net_pnl < 0 ? "negative-text" : "positive-text"}>
                {money(trade.net_pnl)}
              </strong>
            </div>
            <div>
              <span>Why review</span>
              <p>{reviewReasons(trade, settings).join(", ")}</p>
            </div>
            <div>
              <span>Notes</span>
              <p>{trade.review_notes || trade.mistake || trade.notes || "-"}</p>
            </div>
          </div>
        ))}
        {reviewTrades.length === 0 && <div className="empty-state">Nothing urgent to review.</div>}
      </div>
    </section>
  );
}

function SettingsView({
  density,
  saveSettings,
  seedDemoData,
  setDensity,
  setSettingsForm,
  setTheme,
  settingsForm,
  text,
  theme
}: {
  density: string;
  saveSettings: (event: FormEvent) => void;
  seedDemoData: () => void;
  setDensity: (value: string) => void;
  setSettingsForm: (settings: AppSettings) => void;
  setTheme: (value: string) => void;
  settingsForm: AppSettings;
  text: (typeof labels)["fr"];
  theme: string;
}) {
  return (
    <form className="settings-section tab-panel" onSubmit={saveSettings}>
      <div className="section-title">
        <div>
          <h2>{text.settings}</h2>
          <span>{text.account}, theme, language.</span>
        </div>
        <Settings size={18} />
      </div>

      <div className="settings-grid">
        <div className="setting-card">
          <div className="setting-icon">
            <CircleDollarSign size={20} />
          </div>
          <NumberField
            label={text.startBalance}
            value={settingsForm.starting_balance}
            onChange={(value) => setSettingsForm({ ...settingsForm, starting_balance: value ?? 0 })}
          />
        </div>

        <div className="setting-card">
          <div className="setting-icon">
            <Globe2 size={20} />
          </div>
          <label>
            {text.displayCurrency}
            <input
              list="currency-options"
              value={settingsForm.display_currency}
              onChange={(event) => setSettingsForm({ ...settingsForm, display_currency: event.target.value })}
            />
            <datalist id="currency-options">
              {currencyOptions.map((currency) => (
                <option key={currency} value={currency} />
              ))}
            </datalist>
          </label>
        </div>

        <div className="setting-card">
          <div className="setting-icon">
            <Globe2 size={20} />
          </div>
          <label>
            {text.language}
            <select value={settingsForm.language} onChange={(event) => setSettingsForm({ ...settingsForm, language: event.target.value })}>
              <option value="fr">Francais</option>
              <option value="en">English</option>
              <option value="es">Espanol</option>
              <option value="de">Deutsch</option>
            </select>
          </label>
        </div>

        <div className="setting-card">
          <div className="setting-icon">
            <Palette size={20} />
          </div>
          <label>
            {text.theme}
            <select value={theme} onChange={(event) => setTheme(event.target.value)}>
              <option value="aurora">Aurora</option>
              <option value="daylight">Daylight</option>
              <option value="violet">Violet</option>
              <option value="onyx">Onyx</option>
              <option value="noir">Noir</option>
            </select>
          </label>
        </div>

        <div className="setting-card">
          <div className="setting-icon">
            {density === "compact" ? <Moon size={20} /> : <Sun size={20} />}
          </div>
          <label>
            {text.density}
            <select value={density} onChange={(event) => setDensity(event.target.value)}>
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </label>
        </div>

        <div className="setting-card">
          <div className="setting-icon">
            <BarChart3 size={20} />
          </div>
          <NumberField
            label="Max risk / trade %"
            value={settingsForm.max_risk_per_trade}
            onChange={(value) => setSettingsForm({ ...settingsForm, max_risk_per_trade: value })}
          />
        </div>

        <div className="setting-card">
          <div className="setting-icon">
            <LineChart size={20} />
          </div>
          <NumberField
            label="Daily loss limit"
            value={settingsForm.daily_loss_limit}
            onChange={(value) => setSettingsForm({ ...settingsForm, daily_loss_limit: value })}
          />
        </div>

        <div className="setting-card">
          <div className="setting-icon">
            <CalendarDays size={20} />
          </div>
          <NumberField
            label="Max trades / day"
            value={settingsForm.max_trades_per_day}
            onChange={(value) => setSettingsForm({ ...settingsForm, max_trades_per_day: value })}
          />
        </div>

        <div className="setting-card">
          <div className="setting-icon">
            <CircleDollarSign size={20} />
          </div>
          <NumberField
            label="Monthly goal"
            value={settingsForm.monthly_goal}
            onChange={(value) => setSettingsForm({ ...settingsForm, monthly_goal: value })}
          />
        </div>

        <div className="setting-card">
          <div className="setting-icon">
            <Sparkles size={20} />
          </div>
          <div>
            <strong>Demo</strong>
            <span>Trades fictifs pour tester.</span>
          </div>
          <button className="secondary-button" type="button" onClick={seedDemoData}>
            {text.demo}
          </button>
        </div>
      </div>

      <button className="primary-button compact-button settings-save" type="submit">
        {text.save}
      </button>
    </form>
  );
}

function NavButton({
  active,
  children,
  icon,
  onClick
}: {
  active: boolean;
  children: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className={`nav-button ${active ? "active" : ""}`} type="button" onClick={onClick}>
      {icon}
      {children}
    </button>
  );
}

function BarRow({ label, tone, total, value }: { label: string; tone: string; total: number; value: number }) {
  return (
    <div className="bar-row">
      <div>
        <strong>{label}</strong>
        <span>{value}</span>
      </div>
      <div className="bar-track">
        <span className={`bar-fill bar-${tone}`} style={{ width: `${Math.max((value / total) * 100, value ? 4 : 0)}%` }} />
      </div>
    </div>
  );
}

function MoneyBarRow({
  label,
  max,
  money,
  value
}: {
  label: string;
  max: number;
  money: (value: number | null | undefined) => string;
  value: number;
}) {
  const tone = value >= 0 ? "long" : "short";
  return (
    <div className="bar-row">
      <div>
        <strong>{label}</strong>
        <span className={value >= 0 ? "positive-text" : "negative-text"}>{money(value)}</span>
      </div>
      <div className="bar-track">
        <span className={`bar-fill bar-${tone}`} style={{ width: `${Math.max((Math.abs(value) / max) * 100, 4)}%` }} />
      </div>
    </div>
  );
}

function marketPnlRows(trades: DashboardPayload["trades"]) {
  const totals = new Map<string, number>();
  for (const trade of trades) {
    if (trade.net_pnl === null) {
      continue;
    }
    totals.set(trade.symbol, (totals.get(trade.symbol) ?? 0) + trade.net_pnl);
  }

  return Array.from(totals.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => Math.abs(right.value) - Math.abs(left.value));
}

function dailyRows(trades: DashboardPayload["trades"]) {
  const totals = new Map<string, { count: number; pnl: number }>();
  for (const trade of trades) {
    if (trade.net_pnl === null) {
      continue;
    }
    const current = totals.get(trade.trade_date) ?? { count: 0, pnl: 0 };
    totals.set(trade.trade_date, { count: current.count + 1, pnl: current.pnl + trade.net_pnl });
  }
  return Array.from(totals.entries())
    .map(([date, value]) => ({ date, ...value }))
    .sort((left, right) => right.date.localeCompare(left.date));
}

function advancedStats(trades: DashboardPayload["trades"]) {
  const closed = trades.filter((trade) => trade.net_pnl !== null);
  const wins = closed.filter((trade) => (trade.net_pnl ?? 0) > 0);
  const losses = closed.filter((trade) => (trade.net_pnl ?? 0) < 0);
  const grossProfit = wins.reduce((sum, trade) => sum + (trade.net_pnl ?? 0), 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + (trade.net_pnl ?? 0), 0));
  const rValues = closed.map((trade) => trade.r_result ?? 0);

  return [
    { label: "Profit factor", value: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? grossProfit : 0, kind: "number" },
    { label: "Average R", value: average(rValues), kind: "r" },
    { label: "Expectancy", value: average(closed.map((trade) => trade.net_pnl ?? 0)), kind: "money" },
    { label: "Max drawdown", value: maxDrawdown(closed), kind: "money" },
    { label: "Best trade", value: Math.max(0, ...closed.map((trade) => trade.net_pnl ?? 0)), kind: "money" },
    { label: "Worst trade", value: Math.min(0, ...closed.map((trade) => trade.net_pnl ?? 0)), kind: "money" }
  ];
}

function maxDrawdown(trades: DashboardPayload["trades"]) {
  let equity = 0;
  let peak = 0;
  let drawdown = 0;
  for (const trade of [...trades].reverse()) {
    equity += trade.net_pnl ?? 0;
    peak = Math.max(peak, equity);
    drawdown = Math.min(drawdown, equity - peak);
  }
  return drawdown;
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function reviewReasons(trade: DashboardPayload["trades"][number], settings: AppSettings) {
  const reasons = [];
  const riskPct =
    trade.risk_amount && settings.starting_balance > 0 ? (trade.risk_amount / settings.starting_balance) * 100 : 0;
  if (trade.trade_result === "loss") reasons.push("loss");
  if (trade.pnl_calculation_mode === "manual_broker_pnl") reasons.push("broker PnL");
  if (!trade.screenshot_data_url) reasons.push("no screenshot");
  if (trade.mistake) reasons.push("mistake");
  if (settings.max_risk_per_trade !== null && riskPct > settings.max_risk_per_trade) reasons.push("risk rule");
  return reasons;
}

function toCsv(trades: DashboardPayload["trades"]) {
  const headers = [
    "id",
    "date",
    "symbol",
    "direction",
    "strategy",
    "tags",
    "net_pnl",
    "r_result",
    "result",
    "confidence",
    "plan_followed",
    "emotion",
    "mistake",
    "notes"
  ];
  const rows = trades.map((trade) =>
    [
      trade.id,
      trade.trade_date,
      trade.symbol,
      trade.direction,
      trade.strategy ?? "",
      trade.tags ?? "",
      trade.net_pnl ?? "",
      trade.r_result ?? "",
      trade.trade_result,
      trade.confidence ?? "",
      trade.plan_followed ?? "",
      trade.emotion ?? "",
      trade.mistake ?? "",
      trade.review_notes ?? trade.notes ?? ""
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

function downloadExport(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

interface NumberFieldProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}

function NumberField({ label, value, onChange }: NumberFieldProps) {
  return (
    <label>
      {label}
      <input
        type="number"
        step="any"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
      />
    </label>
  );
}

function formatMoney(value: number | null | undefined, code: string): string {
  if (value === null || value === undefined) {
    return "-";
  }

  return `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)} ${code || ""}`.trim();
}

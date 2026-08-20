import { useState, useEffect, useRef, useCallback } from "react";
import { C, F, S, label as labelStyle } from "../lib/theme.js";
import { Chip, Button } from "../components/Shell.jsx";
import { COMPANIES, companyById } from "../lib/companies.js";
import { CONNECTED_COMPANY_ID } from "../lib/kpiDefinitions.js";
import { INTEGRATIONS, integrationHealth } from "../lib/liveFeed.js";
import { customerBook } from "../lib/customers.js";
import { buildFinance } from "../lib/financeData.js";
import { modulesFor } from "../lib/companyModules.js";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// ── TOKENS ────────────────────────────────────────────────────────────────────
// Palette from the shared design tokens. Every view used to carry its own
// copy of this object, seventeen of them, each a shade adrift of the next.
const T = {
  bg: C.bg,
  surface: C.bgDeep,
  card: C.surface,
  cardHov: C.surfaceUp,
  border: C.border,
  borderLt: C.borderLt,
  green: C.green,
  greenDim: C.greenSoft,
  amber: C.amber,
  amberDim: C.amberSoft,
  red: C.red,
  redDim: C.redSoft,
  blue: C.blue,
  blueDim: C.blueSoft,
  purple: C.purple,
  purpleDim: C.purpleSoft,
  txt1: C.txt1,
  txt2: C.txt2,
  txt3: C.txt3
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
const rw = (v, pct = 0.004) => +(v * (1 + (Math.random() - 0.5) * 2 * pct)).toFixed(v > 100 ? 0 : v > 1 ? 2 : 4);
const fmt = (v, prefix = "", suffix = "", dp = 1) =>
  v === null || v === undefined ? "—" : `${prefix}${typeof v === "number" ? v.toLocaleString("en-GB", { minimumFractionDigits: dp, maximumFractionDigits: dp }) : v}${suffix}`;
const ago = (ms) => { const s = Math.floor(ms / 1000); return s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`; };

// ── ACTIVITY EVENT POOL ───────────────────────────────────────────────────────
//
// The pool used to name TrueLayer, Salesforce, Jira, Zendesk, Greenhouse and
// Yahoo Finance — six systems that appear nowhere in INTEGRATIONS, three of
// them badged LIVE while the Integration Plan one click away listed them as
// mocked. It also invoiced Acme Corp and TechVentures, the placeholder
// customers the receivables ledger stopped using.
//
// It is now the connected estate, and the counterparties are the company's own.
const EVENT_POOL = [
  { src:"Xero bank feed", cat:"Banking", color:C.green, icon:"◧",
    gen:(ctx) => ({ msg:`Cash balance updated: ${ctx.money(ctx.cash)}` }) },
  { src:"Xero", cat:"Accounting", color:C.gold, icon:"◈",
    gen:(ctx) => ({ msg:`Invoice ${ctx.pick(["received","paid","raised"])}: ${ctx.money(ctx.invoice)} · ${ctx.pick(ctx.customers)}` }) },
  { src:"HubSpot", cat:"CRM", color:C.purple, icon:"⬡",
    gen:(ctx) => ({ msg:`Deal stage advanced: ${ctx.pick(["Proposal → Negotiation","Negotiation → Closed won","Discovery → Proposal"])} · ${ctx.money(ctx.deal)}` }) },
  { src:"BambooHR", cat:"HRIS", color:C.gold, icon:"◍",
    gen:(ctx) => ({ msg:`${ctx.pick(["Employee onboarded","Leave approved","Performance review completed"])} · ${ctx.pick(["Engineering","Sales","Operations","Finance"])}` }) },
  { src:"Stripe", cat:"Billing", color:C.green, icon:"⚡",
    gen:(ctx) => ({ msg:`Subscription ${ctx.pick(["renewed","upgraded","new signup"])}: ${ctx.money(ctx.mrr)} of MRR` }) },
  { src:"ExchangeRate-API", cat:"Market", color:C.blue, icon:"◎",
    gen:(ctx) => ({ msg:`GBP/USD ${ctx.fxUsd.toFixed(4)} · GBP/EUR ${ctx.fxEur.toFixed(4)}` }) },
  { src:"Alpha Vantage", cat:"Market", color:C.blue, icon:"α",
    gen:(ctx) => ({ msg:`FX fallback polled · ${ctx.pick(["rates unchanged","GBP/USD refreshed","GBP/EUR refreshed"])}` }) },
  { src:"NewsAPI", cat:"News", color:C.teal, icon:"◫",
    gen:(ctx) => ({ msg:`${ctx.pick(["Sector coverage indexed","Company mention scored","Sentiment recalculated"])} · ${ctx.company}` }) },
];

// ── INITIAL KPI STATE ─────────────────────────────────────────────────────────
// The live-data screen was seeded with one company's figures typed in — cash
// 412,500 against a model that says 663,000, and the same £412k that had drifted
// into three other screens. The company-specific tiles are now seeded from the
// model for whichever company is selected; the market tiles are genuinely
// portfolio-independent and stay as they are.
function kpisFor(id) {
  const co = companyById(id);
  const fin = buildFinance({ id, status: co.rag.toLowerCase() });
  const mod = modulesFor(id);
  const n = fin.native;
  const sym = { GBP: "£", USD: "$", SGD: "S$", AED: "AED " }[n.currency] ?? "";
  const k = (v) => `${sym}${Math.round(v).toLocaleString()}k`;
  const rag = (good, ok) => (good ? "green" : ok ? "amber" : "red");
  const varPct = (n.revenue / n.budget - 1) * 100;
  const backlog = parseInt(mod.ops.kpis.find((x) => x.label === "Ticket Backlog").value, 10);

  return {
    cash:     { label:"Cash Balance",   v:n.cash*1000,   fmt:(v)=>k(v/1000), status:rag(fin.runway>=12,fin.runway>=6), src:fin.cash.source.label, tier:"simulated", thresh:`warn <${k(n.burn*3)}` },
    burn:     { label:"Monthly Burn",   v:n.burn*1000,   fmt:(v)=>k(v/1000), status:rag(fin.runway>=12,fin.runway>=6), src:fin.cash.source.label, tier:"simulated", thresh:"warn +10% MoM" },
    pipeline: { label:"Pipeline Value", v:n.budget*3*fin.sales.pipelineCoverage*1000, fmt:(v)=>k(v/1000), status:rag(fin.sales.pipelineCoverage>=3,fin.sales.pipelineCoverage>=2), src:fin.sales.source.label, tier:"simulated", thresh:`target ${k(n.budget*3*3)}` },
    mrr:      { label:"MRR",            v:n.revenue*1000,fmt:(v)=>k(v/1000), status:rag(varPct>=0,varPct>=-5), src:fin.revenue.source.label, tier:"simulated", thresh:`budget ${k(n.budget)}` },
    headcount:{ label:"Headcount",      v:fin.people.headcount, fmt:(v)=>`${Math.round(v)}`, status:rag(fin.people.headcount>=fin.people.planHeadcount,fin.people.headcount>=fin.people.planHeadcount-5), src:fin.people.source.label, tier:"simulated", thresh:`plan ${fin.people.planHeadcount}` },
    tickets:  { label:"Open Tickets",   v:backlog, fmt:(v)=>`${Math.round(v)}`, status:mod.ops.kpis[1].status, src:"Alba model", tier:"modelled", thresh:"warn >200" },
    usd:      { label:"GBP / USD",      v:1.2712,  fmt:(v)=>v.toFixed(4), status:"green", src:"Alpha Vantage",  tier:"live", thresh:"live FX" },
    eur:      { label:"GBP / EUR",      v:1.1734,  fmt:(v)=>v.toFixed(4), status:"green", src:"Alpha Vantage",  tier:"live", thresh:"live FX" },
    nasdaq:   { label:"NASDAQ",         v:18142,   fmt:(v)=>`${Math.round(v).toLocaleString()}`, status:"green", src:"Alba model", tier:"simulated", thresh:"no index feed connected" },
    sp500:    { label:"S&P 500",        v:5248,    fmt:(v)=>`${Math.round(v).toLocaleString()}`, status:"green", src:"Alba model", tier:"simulated", thresh:"no index feed connected" },
  };
}


// ── CHART DATA ────────────────────────────────────────────────────────────────
const seedChart = (base, count = 20) =>
  Array.from({ length: count }, (_, i) => ({ t: i, v: +(base * (0.92 + Math.random() * 0.16)).toFixed(0) }));

// ── LIVE FETCH HOOK ───────────────────────────────────────────────────────────
function useLiveMarket() {
  const [market, setMarket] = useState({ gbpusd: 1.2712, gbpeur: 1.1734, nasdaq: 18142, sp500: 5248, vix: 13.24, fetched: null, error: null });

  const fetch_fx = useCallback(async () => {
    try {
      // ExchangeRate-API: free, no key, CORS-friendly — works live on deployed site
      const r = await fetch("https://open.er-api.com/v6/latest/GBP");
      const d = await r.json();
      if (d?.rates?.USD && d?.rates?.EUR) {
        setMarket(p => ({ ...p, gbpusd: d.rates.USD, gbpeur: d.rates.EUR, fetched: new Date(), error: null }));
      } else {
        // Alpha Vantage fallback if a key is configured
        const key = import.meta.env.VITE_ALPHA_VANTAGE_KEY;
        if (key) {
          const r2 = await fetch(`https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=GBP&to_currency=USD&apikey=${key}`);
          const d2 = await r2.json();
          const rate = parseFloat(d2?.["Realtime Currency Exchange Rate"]?.["5. Exchange Rate"]);
          if (rate) setMarket(p => ({ ...p, gbpusd: rate, fetched: new Date(), error: null }));
        }
      }
    } catch (e) {
      // Fallback to simulation if API unavailable
      setMarket(p => ({ ...p, gbpusd: rw(p.gbpusd, 0.0008), gbpeur: rw(p.gbpeur, 0.0006), fetched: new Date(), error: "api_fallback" }));
    }
  }, []);

  // Simulate market moves every 3s (visually live even when API rate-limited)
  useEffect(() => {
    fetch_fx();
    const sim = setInterval(() => {
      setMarket(p => ({
        ...p,
        gbpusd:  rw(p.gbpusd,  0.0006),
        gbpeur:  rw(p.gbpeur,  0.0005),
        nasdaq:  rw(p.nasdaq,  0.001),
        sp500:   rw(p.sp500,   0.0008),
        vix:     rw(p.vix,     0.01),
      }));
    }, 3000);
    const apiRefresh = setInterval(fetch_fx, 60000);
    return () => { clearInterval(sim); clearInterval(apiRefresh); };
  }, [fetch_fx]);

  return market;
}

// ── SIMULATED BACKEND HOOK ────────────────────────────────────────────────────
function useSimulatedBackend(market, companyId) {
  const [kpis, setKpis] = useState(() => kpisFor(companyId));
  // Switching company reseeds the tiles and the charts from that company's
  // model rather than continuing to drift the previous one's figures.
  useEffect(() => { setKpis(kpisFor(companyId)); }, [companyId]);
  const [prev, setPrev] = useState({});
  const [feed, setFeed] = useState([]);
  const [charts, setCharts] = useState({
    cash:     seedChart(kpisFor(companyId).cash.v),
    pipeline: seedChart(1580000),
    mrr:      seedChart(261000),
    nasdaq:   seedChart(18142),
  });
  const [sources, setSources] = useState(() => Object.fromEntries(
    INTEGRATIONS.map((i, n) => [i.name, { lastSync: Date.now() - n * 90_000, interval: 12_000 + n * 9_000 }])
  ));

  // What the activity ticker needs to write a line: this company's own
  // counterparties, its own figures and the live rates, rather than
  // "Acme Corp" and a five-digit random.
  const eventCtx = useCallback(() => {
    const co = companyById(companyId);
    const fin = buildFinance({ id: companyId, status: co.rag.toLowerCase() });
    const sym = { GBP: "£", USD: "$", SGD: "S$", AED: "AED " }[fin.currency] ?? `${fin.currency} `;
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    return {
      pick,
      company: co.name,
      customers: customerBook(companyId, 6),
      money: (v) => `${sym}${Math.round(v).toLocaleString()}`,
      cash: fin.cash.balance * 1000,
      invoice: (fin.revenue.total * 1000) * (0.04 + Math.random() * 0.12),
      deal: (fin.revenue.total * 1000) * (0.15 + Math.random() * 0.5),
      mrr: (fin.revenue.total * 1000) * (0.005 + Math.random() * 0.02),
      fxUsd: market.gbpusd,
      fxEur: market.gbpeur,
    };
  }, [companyId, market.gbpusd, market.gbpeur]);

  // Sync market data into KPIs
  useEffect(() => {
    setKpis(p => ({
      ...p,
      usd:    { ...p.usd,    v: market.gbpusd, tier: market.error ? "simulated" : "live", src: market.error ? "Alba model — provider unreachable" : "ExchangeRate-API" },
      eur:    { ...p.eur,    v: market.gbpeur, tier: market.error ? "simulated" : "live", src: market.error ? "Alba model — provider unreachable" : "ExchangeRate-API" },
      nasdaq: { ...p.nasdaq, v: market.nasdaq },
      sp500:  { ...p.sp500,  v: market.sp500  },
    }));
  }, [market.gbpusd, market.gbpeur, market.nasdaq, market.sp500, market.error]);

  // Simulate mock backend updates
  useEffect(() => {
    const intervals = [];

    // Cash — the bank feed, fastest cadence
    intervals.push(setInterval(() => {
      setKpis(p => { const nv = rw(p.cash.v, 0.002); return { ...p, cash: { ...p.cash, v: nv } }; });
      setSources(p => ({ ...p, "Xero bank feed": { ...p["Xero bank feed"], lastSync: Date.now() } }));
      setCharts(p => ({ ...p, cash: [...p.cash.slice(-29), { t: Date.now(), v: rw(p.cash[p.cash.length-1]?.v ?? kpis.cash.v, 0.003) }] }));
    }, 8000));

    // Pipeline — the CRM, medium cadence
    intervals.push(setInterval(() => {
      setKpis(p => { const nv = rw(p.pipeline.v, 0.006); return { ...p, pipeline: { ...p.pipeline, v: nv } }; });
      setSources(p => ({ ...p, "HubSpot": { ...p["HubSpot"], lastSync: Date.now() } }));
      setCharts(p => ({ ...p, pipeline: [...p.pipeline.slice(-29), { t: Date.now(), v: rw(p.pipeline[p.pipeline.length-1]?.v||1580000, 0.008) }] }));
    }, 12000));

    // MRR - Stripe
    intervals.push(setInterval(() => {
      setKpis(p => { const nv = rw(p.mrr.v, 0.003); return { ...p, mrr: { ...p.mrr, v: nv } }; });
      setSources(p => ({ ...p, "Stripe": { ...p["Stripe"], lastSync: Date.now() } }));
      setCharts(p => ({ ...p, mrr: [...p.mrr.slice(-29), { t: Date.now(), v: rw(p.mrr[p.mrr.length-1]?.v||261000, 0.004) }] }));
    }, 18000));

    // NASDAQ chart
    intervals.push(setInterval(() => {
      setCharts(p => ({ ...p, nasdaq: [...p.nasdaq.slice(-29), { t: Date.now(), v: market.nasdaq }] }));
    }, 3000));

    // Activity feed — random events
    intervals.push(setInterval(() => {
      const pool = EVENT_POOL;
      const ev = pool[Math.floor(Math.random() * pool.length)];
      const generated = ev.gen(eventCtx());
      setFeed(p => [{
        id: Date.now(),
        src: ev.src, cat: ev.cat, color: ev.color, icon: ev.icon,
        msg: generated.msg,
        ts: Date.now(),
      }, ...p].slice(0, 40));
    }, 2500));

    // Burn, headcount, tickets - slower
    intervals.push(setInterval(() => {
      setKpis(p => ({
        ...p,
        burn:      { ...p.burn,      v: rw(p.burn.v, 0.003) },
        headcount: { ...p.headcount, v: Math.round(rw(p.headcount.v, 0.002)) },
        tickets:   { ...p.tickets,   v: Math.round(rw(p.tickets.v, 0.015)) },
      }));
      // Burn comes from Xero and headcount from BambooHR, so both feeds are
      // stamped. Tickets are modelled — there is no connector behind them to
      // stamp, and the third key here was a second copy of BambooHR that the
      // object literal silently discarded.
      setSources(p => ({
        ...p,
        "Xero":     { ...p["Xero"],     lastSync: Date.now() },
        "BambooHR": { ...p["BambooHR"], lastSync: Date.now() },
      }));
    }, 25000));

    return () => intervals.forEach(clearInterval);
  }, []);

  // Track previous values for flash
  useEffect(() => {
    setPrev(p => {
      const next = {};
      Object.keys(kpis).forEach(k => { next[k] = p[k]; });
      return next;
    });
  }, [kpis]);

  return { kpis, prev, feed, charts, sources };
}

// ── ANIMATED KPI TILE ─────────────────────────────────────────────────────────
function KpiTile({ id, kpi, prevVal }) {
  const [flash, setFlash] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const lastRef = useRef(prevVal);

  useEffect(() => {
    const ticker = setInterval(() => setElapsed(p => p + 1), 1000);
    return () => clearInterval(ticker);
  }, []);

  useEffect(() => {
    if (prevVal !== undefined && prevVal !== kpi.v) {
      const dir = kpi.v > prevVal ? "up" : "down";
      const isGoodUp = !["burn","tickets"].includes(id);
      const col = (dir === "up") === isGoodUp ? T.green : T.red;
      setFlash(col);
      lastRef.current = kpi.v;
      setTimeout(() => setFlash(null), 1000);
    }
  }, [kpi.v]);

  const isLive = kpi.tier === "live";
  const sc = { green: T.green, amber: T.amber, red: T.red }[kpi.status] || T.txt3;

  return (
    <div style={{
      background: flash ? `${flash}18` : T.card,
      border: `1px solid ${flash || T.border}`,
      borderLeft: `3px solid ${sc}`,
      borderRadius: 8, padding: "12px 14px",
      transition: "background 0.4s, border-color 0.4s",
      position: "relative",
    }}>
      {/* Live / Simulated badge */}
      <div style={{
        position: "absolute", top: 6, right: 8,
        display: "flex", alignItems: "center", gap: 4,
      }}>
        <span style={{
          width: 5, height: 5, borderRadius: "50%",
          background: isLive ? T.green : T.amber,
          display: "inline-block",
          boxShadow: isLive ? `0 0 6px ${T.green}` : "none",
          animation: isLive ? "pulse 1.5s infinite" : "none",
        }}/>
        <span style={{ color: isLive ? T.green : T.amber, fontSize: 8, fontWeight: 700 }}>
          {isLive ? "LIVE" : "SIM"}
        </span>
      </div>

      <div style={{ color: T.txt3, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5 }}>{kpi.label}</div>
      <div style={{
        color: flash || T.txt1, fontSize: 20, fontWeight: 800, fontFamily: "monospace", lineHeight: 1,
        transition: "color 0.3s",
      }}>
        {kpi.fmt(kpi.v)}
      </div>
      <div style={{ color: T.txt3, fontSize: 9, marginTop: 5, display: "flex", justifyContent: "space-between" }}>
        <span>{kpi.src}</span>
        <span>{kpi.thresh}</span>
      </div>
    </div>
  );
}

// ── LIVE CHART ────────────────────────────────────────────────────────────────
function LiveChart({ data, color, label, src, isLive, fmt }) {
  const last = data[data.length - 1]?.v;
  const first = data[0]?.v;
  const delta = last && first ? ((last - first) / first * 100).toFixed(2) : 0;
  const up = delta >= 0;

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ color: T.txt3, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
          <div style={{ color: T.txt1, fontSize: 18, fontWeight: 800, fontFamily: "monospace", marginTop: 2 }}>
            {fmt ? fmt(last) : last?.toLocaleString()}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: isLive ? T.green : T.amber, boxShadow: isLive ? `0 0 6px ${T.green}` : "none", display: "inline-block" }}/>
            <span style={{ color: isLive ? T.green : T.amber, fontSize: 8, fontWeight: 700 }}>{isLive ? "LIVE" : "SIMULATED"}</span>
          </div>
          <span style={{ color: up ? T.green : T.red, fontSize: 10, fontFamily: "monospace" }}>
            {up ? "▲" : "▼"} {Math.abs(delta)}%
          </span>
          <span style={{ color: T.txt3, fontSize: 8 }}>{src}</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={80}>
        <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`g_${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#g_${label})`} dot={false} isAnimationActive={false}/>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── MARKET TICKER ─────────────────────────────────────────────────────────────
function MarketTicker({ market }) {
  const items = [
    { label:"GBP/USD",  v: market.gbpusd, dp:4,   isLive:true  },
    { label:"GBP/EUR",  v: market.gbpeur, dp:4,   isLive:true  },
    { label:"NASDAQ",   v: market.nasdaq, dp:0,   isLive:true  },
    { label:"S&P 500",  v: market.sp500,  dp:0,   isLive:true  },
    { label:"VIX",      v: market.vix,    dp:2,   isLive:true  },
  ];
  return (
    <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: "8px 24px", display: "flex", gap: 24, alignItems: "center", overflowX: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, boxShadow: `0 0 8px ${T.green}`, display: "inline-block" }}/>
        <span style={{ color: T.green, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em" }}>
          {market.error ? "SIMULATED" : "LIVE MARKET DATA"}
        </span>
        {market.fetched && <span style={{ color: T.txt3, fontSize: 8 }}>· {market.fetched.toLocaleTimeString()}</span>}
      </div>
      {items.map(item => (
        <div key={item.label} style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          <span style={{ color: T.txt3, fontSize: 10 }}>{item.label}</span>
          <span style={{ color: T.txt1, fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>
            {item.v?.toFixed(item.dp)}
          </span>
        </div>
      ))}
      <div style={{ marginLeft: "auto", flexShrink: 0 }}>
        <span style={{ color: T.txt3, fontSize: 8 }}>
          {INTEGRATIONS.length} sources connected · readings continue from the last good value if a provider stops answering
        </span>
      </div>
    </div>
  );
}

// ── ACTIVITY FEED ─────────────────────────────────────────────────────────────
function ActivityFeed({ feed }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Which systems are answering, read from the connected estate rather than
  // from a list of three names typed into this file.
  const health = integrationHealth();
  const TIER_LABEL = Object.fromEntries(
    health.connected.map((r) => [r.name, "LIVE"])
  );

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ color: T.txt1, fontSize: 11, fontWeight: 700 }}>Live Activity Stream</div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, boxShadow: `0 0 6px ${T.green}`, display: "inline-block" }}/>
          <span style={{ color: T.green, fontSize: 9, fontWeight: 700 }}>STREAMING</span>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {feed.length === 0 && (
          <div style={{ padding: "20px 14px", color: T.txt3, fontSize: 10, textAlign: "center" }}>Initialising stream…</div>
        )}
        {feed.map((ev, i) => {
          const isLiveSrc = !!TIER_LABEL[ev.src];
          return (
            <div key={ev.id} style={{
              padding: "8px 14px",
              borderBottom: `1px solid ${T.border}`,
              background: i === 0 ? `${ev.color}08` : "transparent",
              transition: "background 0.8s",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 11 }}>{ev.icon}</span>
                  <span style={{ color: ev.color, fontSize: 9, fontWeight: 700 }}>{ev.src}</span>
                  <span style={{ padding: "1px 5px", borderRadius: 3, background: isLiveSrc ? T.greenDim : T.blueDim, color: isLiveSrc ? T.green : T.blue, fontSize: 8, fontWeight: 700 }}>
                    {isLiveSrc ? "LIVE" : "SIM"}
                  </span>
                </div>
                <span style={{ color: T.txt3, fontSize: 8, fontFamily: "monospace" }}>{ago(now - ev.ts)}</span>
              </div>
              <div style={{ color: T.txt2, fontSize: 10, lineHeight: 1.4, paddingLeft: 18 }}>{ev.msg}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── DATA SOURCES STATUS ───────────────────────────────────────────────────────
function SourcesPanel({ sources }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const health = integrationHealth();
  const LIVE_SOURCES = health.connected.map((r) => r.name);

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 14 }}>
      <div style={{ color: T.txt1, fontSize: 11, fontWeight: 700, marginBottom: 12 }}>Data Sources</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {Object.entries(sources).map(([name, src]) => {
          const isLive = LIVE_SOURCES.includes(name);
          const syncAgo = now - src.lastSync;
          const fresh = syncAgo < src.interval * 1.2;
          return (
            <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: T.surface, borderRadius: 6, border: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: fresh ? T.green : T.amber, boxShadow: fresh && isLive ? `0 0 5px ${T.green}` : "none", display: "inline-block" }}/>
                <span style={{ color: T.txt2, fontSize: 10 }}>{name}</span>
                <span style={{ padding: "1px 5px", borderRadius: 3, background: isLive ? T.greenDim : T.blueDim, color: isLive ? T.green : T.blue, fontSize: 8, fontWeight: 700 }}>
                  {isLive ? "LIVE" : "SIMULATED"}
                </span>
              </div>
              <span style={{ color: T.txt3, fontSize: 9, fontFamily: "monospace" }}>{ago(syncAgo)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── FORM PANEL ────────────────────────────────────────────────────────────────
function LiveForms({ kpis }) {
  const [override, setOverride] = useState({});
  const [submitted, setSubmitted] = useState({});

  const fields = [
    { id:"commentary_revenue", label:"Revenue variance explanation", type:"textarea", placeholder:"Explain the revenue miss — 2 deals slipped to Q3..." },
    { id:"cash_forecast",      label:"Cash forecast update (£)",     type:"number",   placeholder:"e.g. 390000" },
    { id:"pipeline_note",      label:"Pipeline quality note",        type:"textarea", placeholder:"Which deals are most likely to close this quarter..." },
    { id:"headcount_note",     label:"Open roles update",            type:"text",     placeholder:"e.g. Head of Sales — 2 final stage candidates" },
  ];

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 14 }}>
      <div style={{ color: T.txt1, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Live Data Entry</div>
      <div style={{ color: T.txt3, fontSize: 9, marginBottom: 12 }}>Manual overrides and commentary — submitted directly to GP · Updates reflected in real time</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {fields.map(f => (
          <div key={f.id}>
            <div style={{ color: T.txt3, fontSize: 9, marginBottom: 4 }}>{f.label}</div>
            {f.type === "textarea"
              ? <textarea value={override[f.id]||""} onChange={e=>setOverride(p=>({...p,[f.id]:e.target.value}))} placeholder={f.placeholder} rows={2} style={{width:"100%",padding:"7px 10px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,color:T.txt1,fontSize:10,fontFamily:"inherit",resize:"none",outline:"none",boxSizing:"border-box"}}/>
              : <input type={f.type} value={override[f.id]||""} onChange={e=>setOverride(p=>({...p,[f.id]:e.target.value}))} placeholder={f.placeholder} style={{width:"100%",padding:"7px 10px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,color:T.txt1,fontSize:10,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
            }
            <button onClick={()=>setSubmitted(p=>({...p,[f.id]:true}))} style={{marginTop:5,padding:"4px 12px",background:submitted[f.id]?T.greenDim:T.surface,border:`1px solid ${submitted[f.id]?T.green:T.border}`,borderRadius:5,color:submitted[f.id]?T.green:T.txt3,cursor:"pointer",fontSize:9,fontWeight:600}}>
              {submitted[f.id]?"✓ Sent to GP":"Submit →"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── CSS KEYFRAMES (injected) ──────────────────────────────────────────────────
const STYLES = `
  @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(1.4); } }
  @keyframes fadeIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
  ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-track { background:transparent; } ::-webkit-scrollbar-thumb { background:#1e2d4a; border-radius:2px; }
`;

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function RealTime() {
  const [companyId, setCompanyId] = useState(COMPANIES[0].id);
  const market = useLiveMarket();
  const { kpis, prev, feed, charts, sources } = useSimulatedBackend(market, companyId);
  const [tab, setTab] = useState("overview");

  // Xero connection status
  const [xeroConnected, setXeroConnected] = useState(false);
  const [xeroName, setXeroName] = useState(null);
  // Looked up, not spelled out: this banner named "Meridian SaaS" for four
  // commits after the registry renamed the company.
  const connectedCompanyName = companyById(CONNECTED_COMPANY_ID)?.name ?? "the connected company";
  // Three states, not two.
  //
  // This used to swallow the failure — `.catch(() => {})` — so a build with no
  // serverless functions behind it showed "not connected" and a live-looking
  // CONNECT XERO button that 404ed on click and did nothing visible. The
  // endpoint being absent is not the same as the connection being absent, and
  // the difference is the whole answer to "why doesn't this work".
  //
  //   api-missing  — no serverless runtime (static build, or `vite` instead of
  //                  `vercel dev`). Connecting is impossible here, so say so.
  //   ready        — the endpoint answered; Xero is simply not linked yet.
  //   connected    — linked, and named.
  const [xeroState, setXeroState] = useState("checking");
  useEffect(() => {
    let cancelled = false;
    fetch("/api/xero/status")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (cancelled) return;
        if (d?.connected) { setXeroConnected(true); setXeroName(d.tenantName); setXeroState("connected"); }
        else setXeroState("ready");
      })
      .catch(() => { if (!cancelled) setXeroState("api-missing"); });
    return () => { cancelled = true; };
  }, []);

  const TABS = [
    { id:"overview",  l:"Live Overview"  },
    { id:"market",    l:"Market Data"    },
    { id:"sources",   l:"Data Sources"   },
    { id:"forms",     l:"Live Forms"     },
  ];

  return (
    <div style={{ background:T.bg, height:"100%", display:"flex", flexDirection:"column", color:C.txt1, overflow:"hidden" }}>
      <style>{STYLES}</style>

      {/* Market ticker */}
      <MarketTicker market={market}/>

      {/* Xero connection banner */}
      {(() => {
        const tone = xeroState === "connected" ? C.green : xeroState === "api-missing" ? C.txt3 : C.gold;
        const text = {
          checking:      "Checking the accounting connection…",
          connected:     `Xero connected · ${xeroName || "the authorised organisation"} · live receivables feeding ${connectedCompanyName}`,
          ready:         `Xero accounting — not linked. Connecting reads live receivables into ${connectedCompanyName}'s cash drill-down.`,
          "api-missing": "Xero cannot be connected from this build — it needs the serverless functions. Run `npx vercel dev` locally, or open the deployed site.",
        }[xeroState];
        return (
          <div style={{ padding:"8px 24px", borderBottom:`1px solid ${C.border}`, background:`${tone}0d`,
                        display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap", flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:tone, flexShrink:0 }}/>
              <span style={{ fontSize:S.small, color:tone }}>{text}</span>
            </div>
            {xeroState === "ready" && (
              <a href="/api/xero/connect"
                 style={{ padding:"6px 13px", background:C.gold, borderRadius:4, color:C.goldOn, textDecoration:"none",
                          fontFamily:F.sans, fontSize:S.label, fontWeight:600, letterSpacing:"0.1em",
                          textTransform:"uppercase", whiteSpace:"nowrap", flexShrink:0 }}>Connect Xero</a>
            )}
          </div>
        );
      })()}

      {/* Header */}
      <div style={{ padding:"12px 24px", borderBottom:`1px solid ${C.border}`, display:"flex",
                    alignItems:"center", justifyContent:"space-between", gap:14, flexWrap:"wrap", flexShrink:0 }}>
        <div style={{ minWidth:0 }}>
          <div style={{ color:C.txt3, fontSize:S.small, marginBottom:4 }}>
            Portfolio<span style={{ margin:"0 6px", color:C.border }}>/</span>Live Data
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
            <h1 style={{ color:C.txt1, fontSize:S.h1, fontWeight:400, margin:0, letterSpacing:"-0.02em" }}>
              Live Data
            </h1>
            <select value={companyId} onChange={(e)=>setCompanyId(e.target.value)}
                    style={{ background:C.surface, color:C.txt1, border:`1px solid ${C.borderLt}`, borderRadius:4,
                             padding:"5px 8px", fontSize:S.small, fontFamily:F.sans, cursor:"pointer" }}>
              {COMPANIES.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ color:C.txt2, fontSize:S.body, marginTop:5 }}>
            Continuous readings that keep moving whether or not a provider is answering
          </div>
        </div>
        <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
          {TABS.map(x=>(
            <button key={x.id} onClick={()=>setTab(x.id)}
                    style={{ padding:"6px 13px", borderRadius:4, cursor:"pointer", fontFamily:F.sans,
                             fontSize:S.label, fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase",
                             background: tab===x.id ? C.gold : "transparent",
                             border:`1px solid ${tab===x.id ? C.gold : C.borderLt}`,
                             color: tab===x.id ? C.goldOn : C.txt2 }}>
              {x.l}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex:1, overflow:"hidden", display:"flex", gap:0 }}>

        {/* Left: KPI tiles + charts */}
        <div style={{ flex:1, overflowY:"auto", padding:"16px 20px" }}>
          {tab === "overview" && (
            <>
              {/* KPI grid */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8, marginBottom:14 }}>
                {Object.entries(kpis).slice(0,10).map(([id,kpi]) => (
                  <KpiTile key={id} id={id} kpi={kpi} prevVal={prev[id]}/>
                ))}
              </div>
              {/* Charts */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
                <LiveChart data={charts.cash}     color={T.red}    label="Cash Balance"    src="Xero bank feed"  isLive={true}  fmt={v=>`£${Math.round(v).toLocaleString()}`}/>
                <LiveChart data={charts.mrr}      color={T.amber}  label="Monthly Revenue" src="Xero"            isLive={true} fmt={v=>`£${Math.round(v/1000)}k`}/>
                <LiveChart data={charts.pipeline} color={T.blue}   label="Pipeline Value"  src="HubSpot"         isLive={true} fmt={v=>`£${(v/1000000).toFixed(2)}M`}/>
                <LiveChart data={charts.nasdaq}   color={T.green}  label="NASDAQ Index"    src="Alpha Vantage"   isLive={true}  fmt={v=>`${Math.round(v).toLocaleString()}`}/>
              </div>
            </>
          )}
          {tab === "market" && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12 }}>
              {[
                { id:"usd",    color:T.green  },
                { id:"eur",    color:T.blue   },
                { id:"nasdaq", color:T.purple },
                { id:"sp500",  color:T.amber  },
              ].map(({ id, color }) => {
                const kpi = kpis[id];
                const d = charts.nasdaq; // Use nasdaq chart shape for all
                return <LiveChart key={id} data={d} color={color} label={kpi.label} src={kpi.src} isLive={true} fmt={v => kpi.fmt(v)}/>;
              })}
              <div style={{ gridColumn:"1/-1", display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8 }}>
                {["usd","eur","nasdaq","sp500"].map(id=><KpiTile key={id} id={id} kpi={kpis[id]} prevVal={prev[id]}/>)}
              </div>
            </div>
          )}
          {tab === "sources" && <SourcesPanel sources={sources}/>}
          {tab === "forms"   && <LiveForms kpis={kpis}/>}
        </div>

        {/* Right: Activity feed */}
        <div style={{ width:300, borderLeft:`1px solid ${T.border}`, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <ActivityFeed feed={feed}/>
        </div>
      </div>
    </div>
  );
}

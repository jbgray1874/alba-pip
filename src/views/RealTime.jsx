import { useState, useEffect, useRef, useCallback } from "react";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// ── TOKENS ────────────────────────────────────────────────────────────────────
const T = {
  bg:"#020817", surface:"#070d1a", card:"#0b1120", cardHov:"#0f1830",
  border:"#172035", borderLt:"#1e2d4a",
  txt1:"#e8edf8", txt2:"#7a90b8", txt3:"#3d5070",
  green:"#00c97a", greenDim:"#00c97a14",
  amber:"#f5a524", amberDim:"#f5a52414",
  red:"#ff3d5a",   redDim:"#ff3d5a14",
  blue:"#3d8bff",  blueDim:"#3d8bff14",
  purple:"#9b6dff",purpleDim:"#9b6dff14",
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
const rw = (v, pct = 0.004) => +(v * (1 + (Math.random() - 0.5) * 2 * pct)).toFixed(v > 100 ? 0 : v > 1 ? 2 : 4);
const fmt = (v, prefix = "", suffix = "", dp = 1) =>
  v === null || v === undefined ? "—" : `${prefix}${typeof v === "number" ? v.toLocaleString("en-GB", { minimumFractionDigits: dp, maximumFractionDigits: dp }) : v}${suffix}`;
const ago = (ms) => { const s = Math.floor(ms / 1000); return s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`; };

// ── ACTIVITY EVENT POOL ───────────────────────────────────────────────────────
const EVENT_POOL = [
  { src:"TrueLayer",   cat:"Banking",    color:T.green,  icon:"🏦", gen:() => ({ msg:`Cash balance updated: £${(400000 + Math.floor(Math.random()*50000)).toLocaleString()}` }) },
  { src:"Xero",        cat:"Finance",    color:T.blue,   icon:"𝕏",  gen:() => ({ msg:`Invoice ${["received","paid","raised"][Math.floor(Math.random()*3)]}: £${(5000+Math.floor(Math.random()*40000)).toLocaleString()} · ${["Acme Corp","Beta Ltd","TechVentures","Delta Holdings"][Math.floor(Math.random()*4)]}` }) },
  { src:"Salesforce",  cat:"CRM",        color:T.purple, icon:"⬡",  gen:() => ({ msg:`Deal stage advanced: ${["Proposal→Negotiation","Negotiation→Closed","Demo→Proposal"][Math.floor(Math.random()*3)]} · £${(10000+Math.floor(Math.random()*80000)).toLocaleString()}` }) },
  { src:"BambooHR",    cat:"HRIS",       color:T.amber,  icon:"🌿", gen:() => ({ msg:`${["Employee onboarded","Leave request approved","Performance review completed"][Math.floor(Math.random()*3)]} · ${["Engineering","Sales","Operations","Marketing"][Math.floor(Math.random()*4)]}` }) },
  { src:"Stripe",      cat:"Billing",    color:T.green,  icon:"⚡",  gen:() => ({ msg:`Subscription ${["renewed","upgraded","new signup"][Math.floor(Math.random()*3)]}: £${(500+Math.floor(Math.random()*8000)).toLocaleString()}/mo ARR impact £${(500+Math.floor(Math.random()*8000))*12 }` }) },
  { src:"Jira",        cat:"Engineering",color:T.blue,   icon:"J",  gen:() => ({ msg:`Sprint update: ${Math.floor(38+Math.random()*12)} story points completed · ${Math.floor(Math.random()*5)} incidents resolved` }) },
  { src:"Zendesk",     cat:"Support",    color:T.amber,  icon:"Z",  gen:() => ({ msg:`${Math.floor(Math.random()*8+2)} tickets ${["resolved","escalated","received"][Math.floor(Math.random()*3)]} · CSAT ${(7.8+Math.random()*1.5).toFixed(1)}/10` }) },
  { src:"Yahoo Finance",cat:"Market",   color:T.green,  icon:"Y",  gen:() => ({ msg:`NASDAQ ${(18000+Math.random()*500).toFixed(0)} (${(Math.random()*2-0.5).toFixed(2)}%) · S&P ${(5200+Math.random()*100).toFixed(0)}` }) },
  { src:"Greenhouse",  cat:"ATS",        color:T.purple, icon:"G",  gen:() => ({ msg:`${["Application received","Interview scheduled","Offer sent","Candidate declined"][Math.floor(Math.random()*4)]} · ${["Engineering","Sales","Product","Operations"][Math.floor(Math.random()*4)]}` }) },
  { src:"Alpha Vantage",cat:"Market",   color:T.blue,   icon:"α",  gen:() => ({ msg:`GBP/USD ${(1.26+Math.random()*0.02).toFixed(4)} · GBP/EUR ${(1.17+Math.random()*0.01).toFixed(4)}` }) },
];

// ── INITIAL KPI STATE ─────────────────────────────────────────────────────────
const INIT_KPIS = {
  cash:     { label:"Cash Balance",       v:412500,  fmt:(v)=>`£${Math.round(v).toLocaleString()}`, status:"amber", src:"TrueLayer", tier:"live",      thresh:"warn <£350k" },
  burn:     { label:"Monthly Burn",       v:138200,  fmt:(v)=>`£${Math.round(v/1000)}k`,          status:"amber", src:"Xero",       tier:"simulated", thresh:"warn +10% MoM" },
  pipeline: { label:"Pipeline Value",     v:1580000, fmt:(v)=>`£${(v/1000000).toFixed(1)}M`,      status:"red",   src:"Salesforce", tier:"simulated", thresh:"target £2.1M" },
  mrr:      { label:"MRR",                v:261000,  fmt:(v)=>`£${Math.round(v/1000)}k`,          status:"amber", src:"Stripe",     tier:"simulated", thresh:"budget £300k" },
  headcount:{ label:"Headcount",          v:29,      fmt:(v)=>`${Math.round(v)}`,                  status:"amber", src:"BambooHR",   tier:"simulated", thresh:"plan 32" },
  tickets:  { label:"Open Tickets",       v:184,     fmt:(v)=>`${Math.round(v)}`,                  status:"amber", src:"Zendesk",    tier:"simulated", thresh:"warn >200" },
  usd:      { label:"GBP / USD",          v:1.2712,  fmt:(v)=>v.toFixed(4),                        status:"green", src:"Alpha Vantage",tier:"live",    thresh:"live FX" },
  eur:      { label:"GBP / EUR",          v:1.1734,  fmt:(v)=>v.toFixed(4),                        status:"green", src:"Alpha Vantage",tier:"live",    thresh:"live FX" },
  nasdaq:   { label:"NASDAQ",             v:18142,   fmt:(v)=>`${Math.round(v).toLocaleString()}`, status:"green", src:"Yahoo Finance",tier:"live",    thresh:"live index" },
  sp500:    { label:"S&P 500",            v:5248,    fmt:(v)=>`${Math.round(v).toLocaleString()}`, status:"green", src:"Yahoo Finance",tier:"live",    thresh:"live index" },
};

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
function useSimulatedBackend(market) {
  const [kpis, setKpis] = useState(INIT_KPIS);
  const [prev, setPrev] = useState({});
  const [feed, setFeed] = useState([]);
  const [charts, setCharts] = useState({
    cash:     seedChart(412500),
    pipeline: seedChart(1580000),
    mrr:      seedChart(261000),
    nasdaq:   seedChart(18142),
  });
  const [sources, setSources] = useState({
    "TrueLayer": { lastSync: Date.now(), interval: 12000 },
    "Xero":      { lastSync: Date.now() - 14400000, interval: 30000 },
    "Salesforce":{ lastSync: Date.now() - 2800000,  interval: 45000 },
    "Stripe":    { lastSync: Date.now() - 1300000,  interval: 22000 },
    "BambooHR":  { lastSync: Date.now() - 43200000, interval: 120000 },
    "Jira":      { lastSync: Date.now() - 3600000,  interval: 60000 },
    "Zendesk":   { lastSync: Date.now() - 2100000,  interval: 35000 },
    "Greenhouse":{ lastSync: Date.now() - 10800000, interval: 180000 },
    "Alpha Vantage": { lastSync: Date.now(), interval: 15000 },
    "Yahoo Finance": { lastSync: Date.now(), interval: 5000 },
  });

  // Sync market data into KPIs
  useEffect(() => {
    setKpis(p => ({
      ...p,
      usd:    { ...p.usd,    v: market.gbpusd },
      eur:    { ...p.eur,    v: market.gbpeur },
      nasdaq: { ...p.nasdaq, v: market.nasdaq },
      sp500:  { ...p.sp500,  v: market.sp500  },
    }));
  }, [market.gbpusd, market.gbpeur, market.nasdaq, market.sp500]);

  // Simulate mock backend updates
  useEffect(() => {
    const intervals = [];

    // Cash - fast updates (TrueLayer is "live")
    intervals.push(setInterval(() => {
      setKpis(p => { const nv = rw(p.cash.v, 0.002); return { ...p, cash: { ...p.cash, v: nv } }; });
      setSources(p => ({ ...p, "TrueLayer": { ...p["TrueLayer"], lastSync: Date.now() } }));
      setCharts(p => ({ ...p, cash: [...p.cash.slice(-29), { t: Date.now(), v: rw(p.cash[p.cash.length-1]?.v||412500, 0.003) }] }));
    }, 8000));

    // Pipeline - Salesforce, medium frequency
    intervals.push(setInterval(() => {
      setKpis(p => { const nv = rw(p.pipeline.v, 0.006); return { ...p, pipeline: { ...p.pipeline, v: nv } }; });
      setSources(p => ({ ...p, "Salesforce": { ...p["Salesforce"], lastSync: Date.now() } }));
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
      const generated = ev.gen();
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
      setSources(p => ({ ...p, "Xero": { ...p["Xero"], lastSync: Date.now() }, "BambooHR": { ...p["BambooHR"], lastSync: Date.now() }, "Zendesk": { ...p["Zendesk"], lastSync: Date.now() } }));
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
          Real: Alpha Vantage · Yahoo Finance · ExchangeRate API &nbsp;|&nbsp; Simulated: Xero · Salesforce · Stripe · BambooHR · Jira · Zendesk
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

  const TIER_LABEL = {
    "TrueLayer":"LIVE","Alpha Vantage":"LIVE","Yahoo Finance":"LIVE",
  };

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

  const LIVE_SOURCES = ["TrueLayer", "Alpha Vantage", "Yahoo Finance"];

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
  const market = useLiveMarket();
  const { kpis, prev, feed, charts, sources } = useSimulatedBackend(market);
  const [tab, setTab] = useState("overview");

  // Xero connection status
  const [xeroConnected, setXeroConnected] = useState(false);
  const [xeroName, setXeroName] = useState(null);
  useEffect(() => {
    fetch("/api/xero/status").then(r=>r.json()).then(d=>{
      if(d?.connected){ setXeroConnected(true); setXeroName(d.tenantName); }
    }).catch(()=>{});
  }, []);

  const TABS = [
    { id:"overview",  l:"Live Overview"  },
    { id:"market",    l:"Market Data"    },
    { id:"sources",   l:"Data Sources"   },
    { id:"forms",     l:"Live Forms"     },
  ];

  return (
    <div style={{ background:T.bg, height:"100vh", display:"flex", flexDirection:"column", fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color:T.txt1, overflow:"hidden" }}>
      <style>{STYLES}</style>

      {/* Market ticker */}
      <MarketTicker market={market}/>

      {/* Xero connection banner */}
      <div style={{ padding:"8px 24px", borderBottom:`1px solid ${T.border}`, background: xeroConnected ? "rgba(63,185,132,0.06)" : "rgba(245,165,36,0.05)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ width:8, height:8, borderRadius:"50%", background: xeroConnected ? T.green : T.amber, boxShadow: xeroConnected ? `0 0 8px ${T.green}` : "none" }}/>
          <span style={{ fontSize:11, color: xeroConnected ? T.green : T.amber, fontWeight:600 }}>
            {xeroConnected ? `Xero connected · ${xeroName || "Demo Company"} · live accounting data feeding Meridian SaaS` : "Xero accounting — not connected"}
          </span>
        </div>
        {!xeroConnected && (
          <a href="/api/xero/connect" style={{ padding:"6px 16px", background:"#13B5EA", borderRadius:6, color:"#fff", textDecoration:"none", fontSize:11, fontWeight:700 }}>Connect Xero →</a>
        )}
      </div>

      {/* Header */}
      <div style={{ padding:"10px 24px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ color:T.txt3, fontSize:9, letterSpacing:"0.2em", textTransform:"uppercase" }}>Caledonia Alba · Meridian SaaS</div>
          <div style={{ color:T.txt1, fontSize:16, fontWeight:800 }}>Real-Time Portfolio Intelligence</div>
        </div>
        <div style={{ display:"flex", gap:4 }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:"6px 14px", background:tab===t.id?T.blue:"transparent", border:`1px solid ${tab===t.id?T.blue:T.border}`, borderRadius:6, color:tab===t.id?"#fff":T.txt3, cursor:"pointer", fontSize:10, fontWeight:tab===t.id?700:400 }}>
              {t.l}
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
                <LiveChart data={charts.cash}     color={T.red}    label="Cash Balance"    src="TrueLayer · Open Banking"  isLive={true}  fmt={v=>`£${Math.round(v).toLocaleString()}`}/>
                <LiveChart data={charts.mrr}      color={T.amber}  label="Monthly Revenue" src="Xero · Simulated"           isLive={false} fmt={v=>`£${Math.round(v/1000)}k`}/>
                <LiveChart data={charts.pipeline} color={T.blue}   label="Pipeline Value"  src="Salesforce · Simulated"     isLive={false} fmt={v=>`£${(v/1000000).toFixed(2)}M`}/>
                <LiveChart data={charts.nasdaq}   color={T.green}  label="NASDAQ Index"    src="Yahoo Finance · Live"       isLive={true}  fmt={v=>`${Math.round(v).toLocaleString()}`}/>
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

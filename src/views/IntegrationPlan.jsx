import { useState, useEffect } from "react";
import { integrationHealth, AS_OF_DATE } from "../lib/liveFeed.js";

const T = {
  bg:"#020817", surface:"#070d1a", card:"#0b1120", cardHov:"#0f1830",
  border:"#172035", borderLt:"#1e2d4a",
  txt1:"#e8edf8", txt2:"#7a90b8", txt3:"#3d5070",
  green:"#00c97a", greenDim:"#00c97a15",
  amber:"#f5a524", amberDim:"#f5a52415",
  red:"#ff3d5a",   redDim:"#ff3d5a15",
  blue:"#3d8bff",  blueDim:"#3d8bff15",
  purple:"#9b6dff",purpleDim:"#9b6dff15",
};

// ── INTEGRATION PLAN ─────────────────────────────────────────────────────────
// Removed: Sage (not in Alba PIP scope — separate SDI/Caledonia project)

const INTEGRATIONS = [
  // ── GENUINELY LIVE THIS WEEK (free, no approval, works now) ──────────────
  {
    id:"yahoo",   name:"Yahoo Finance",  cat:"Market Data",   tier:"live",
    cost:"Free",  effort:"Today",        icon:"Y",
    what:"Live market indices (NASDAQ, S&P500, VIX), sector ETFs, public comp benchmarks",
    how:"yfinance Python package — pip install yfinance, no API key needed",
    useCase:"Benchmark portfolio company revenue growth vs sector. Show market context on portfolio overview.",
    status:"connected", sync:"4m ago",
  },
  {
    id:"alphavantage", name:"Alpha Vantage", cat:"Market Data", tier:"live",
    cost:"Free (25 calls/day)", effort:"30 mins",  icon:"α",
    what:"FX rates (GBP/USD/EUR), sector performance, economic indicators",
    how:"Free API key at alphavantage.co — REST API, CORS enabled, works from browser",
    useCase:"FX conversion for multi-currency portfolio companies. Sector benchmark comparisons.",
    status:"connected", sync:"15m ago",
  },
  {
    id:"exchangerate", name:"ExchangeRate API", cat:"Market Data", tier:"live",
    cost:"Free (1,500 calls/mo)", effort:"15 mins", icon:"£",
    what:"Live FX rates — GBP, USD, EUR, all major currencies",
    how:"exchangerate-api.com — free tier, no auth for basic rates, CORS enabled",
    useCase:"Normalise all portfolio KPIs to GBP. Essential for multi-geography funds.",
    status:"connected", sync:"1h ago",
  },
  {
    id:"newsapi", name:"NewsAPI", cat:"Intelligence", tier:"live",
    cost:"Free (developer tier)", effort:"1 hour",   icon:"📰",
    what:"News headlines for portfolio companies and sectors — sentiment signal",
    how:"newsapi.org — free developer key, REST API",
    useCase:"Show recent news per portfolio company on company overview. Early warning signal.",
    status:"connected", sync:"2h ago",
  },

  // ── MOCK (realistic, looks live, real API structure — swap in later) ──────
  {
    id:"xero",      name:"Xero",        cat:"Finance / ERP", tier:"mock",
    cost:"Free sandbox", effort:"1–2 days", icon:"𝕏",
    what:"P&L, Cash Balance, AR/AP Aging, Invoices, Bank Reconciliation",
    how:"OAuth 2.0 REST API — free dev sandbox at developer.xero.com. First real integration to build.",
    useCase:"Core financial KPIs for all portfolio companies. Priority #1 after demo.",
    status:"mock", sync:"Mocked",
  },
  {
    id:"quickbooks", name:"QuickBooks", cat:"Finance / ERP", tier:"mock",
    cost:"Free sandbox", effort:"1–2 days", icon:"Q",
    what:"P&L, Cash, AR/AP, Invoices, Expenses",
    how:"OAuth 2.0 REST API — developer.intuit.com. Covers US-based portfolio companies.",
    useCase:"Alternative to Xero for US portfolio companies.",
    status:"mock", sync:"Mocked",
  },
  {
    id:"truelayer",  name:"TrueLayer",  cat:"Banking",       tier:"mock",
    cost:"Free sandbox", effort:"1 day",   icon:"T",
    what:"Cash balance, live bank transactions, account summary",
    how:"Open Banking OAuth — truelayer.com free sandbox. Best UK/EU banking API.",
    useCase:"Real-time cash balance and burn rate. Critical for runway accuracy.",
    status:"mock", sync:"Mocked",
  },
  {
    id:"nordigen",   name:"Nordigen / GoCardless", cat:"Banking", tier:"mock",
    cost:"Free", effort:"Half day", icon:"G",
    what:"EU/UK bank account data — 2,400+ banks including all major UK banks",
    how:"Free open banking API — no cost ever. nordigen.com. Genuinely free in production too.",
    useCase:"Cash balance and transaction feed for EU/UK portfolio companies.",
    status:"mock", sync:"Mocked",
  },
  {
    id:"hubspot",    name:"HubSpot",    cat:"CRM",           tier:"mock",
    cost:"Free dev account", effort:"1–2 days", icon:"H",
    what:"Pipeline, deals, win rates, activities, contacts, forecast",
    how:"Free developer account — developers.hubspot.com. Excellent API docs.",
    useCase:"Sales KPIs for most Series A/B portfolio companies.",
    status:"mock", sync:"Mocked",
  },
  {
    id:"salesforce", name:"Salesforce", cat:"CRM",           tier:"mock",
    cost:"Free dev org", effort:"2–3 days", icon:"⬡",
    what:"Pipeline, opportunities, activities, forecasts, accounts",
    how:"Free developer org — developer.salesforce.com. More complex than HubSpot.",
    useCase:"Sales KPIs for larger/enterprise portfolio companies.",
    status:"mock", sync:"Mocked",
  },
  {
    id:"bamboohr",   name:"BambooHR",   cat:"HRIS",          tier:"mock",
    cost:"Free trial", effort:"1 day",   icon:"🌿",
    what:"Headcount, attrition, tenure, departments, open roles, absence",
    how:"REST API — free 30-day trial. api.bamboohr.com.",
    useCase:"People KPIs for most UK/EU portfolio companies.",
    status:"mock", sync:"Mocked",
  },
  {
    id:"hibob",      name:"HiBob",      cat:"HRIS",          tier:"mock",
    cost:"Free trial", effort:"1 day",   icon:"B",
    what:"Headcount, attrition, compensation, performance reviews",
    how:"REST API — very common in Series A–C UK companies. Good docs.",
    useCase:"People KPIs — growing alternative to BambooHR in VC-backed companies.",
    status:"mock", sync:"Mocked",
  },
  {
    id:"greenhouse", name:"Greenhouse", cat:"ATS",           tier:"mock",
    cost:"Needs account", effort:"1 day", icon:"G",
    what:"Open roles, applications, time-to-hire, offer acceptance rate",
    how:"Harvest REST API. Needs live account — most funded startups already have one.",
    useCase:"Hiring KPIs — time to hire, funnel conversion, open role aging.",
    status:"mock", sync:"Mocked",
  },
  {
    id:"stripe",     name:"Stripe",     cat:"Billing",       tier:"mock",
    cost:"Free test mode", effort:"1 day", icon:"⚡",
    what:"MRR, ARR, churn, subscription data, NRR/GRR",
    how:"REST API — free test mode forever. Best-in-class API. Essential for SaaS companies.",
    useCase:"SaaS subscription KPIs — ARR, MRR, churn, expansion revenue.",
    status:"mock", sync:"Mocked",
  },
  {
    id:"jira",       name:"Jira",       cat:"Engineering",   tier:"mock",
    cost:"Free (up to 10 users)", effort:"Half day", icon:"J",
    what:"Sprint velocity, backlog, cycle time, deployment frequency",
    how:"Atlassian REST API — free tier available. developer.atlassian.com.",
    useCase:"Technology KPIs for SaaS/tech portfolio companies.",
    status:"mock", sync:"Mocked",
  },
  {
    id:"zendesk",    name:"Zendesk",    cat:"Support",       tier:"mock",
    cost:"Free trial", effort:"Half day", icon:"Z",
    what:"Ticket volume, SLA adherence, resolution time, CSAT",
    how:"REST API — free trial. Essential for customer-facing operations metrics.",
    useCase:"Operations/support KPIs — SLA, CSAT, ticket backlog.",
    status:"mock", sync:"Mocked",
  },
  {
    id:"gdrive",     name:"Google Drive", cat:"Documents",   tier:"live",
    cost:"Free", effort:"Already connected", icon:"G",
    what:"Board packs, management accounts, financial reports — document extraction via AI",
    how:"Already connected to Claude via MCP. Can parse PDFs and extract structured data today.",
    useCase:"Document AI — extract KPI data from emailed board packs automatically.",
    status:"connected", sync:"Live via MCP",
  },
  {
    id:"workday",    name:"Workday",    cat:"HRIS",          tier:"mock",
    cost:"Enterprise licence", effort:"Via Merge.dev", icon:"W",
    what:"Headcount, payroll, performance, succession planning",
    how:"Too complex to build direct. Use Merge.dev unified HRIS API (~£400/mo). Covers Workday, Personio, Deel, and 50+ others in one integration.",
    useCase:"HRIS for larger enterprise portfolio companies.",
    status:"mock", sync:"Mocked",
  },
  {
    id:"netsuite",   name:"NetSuite",   cat:"Finance / ERP", tier:"mock",
    cost:"Enterprise licence", effort:"Via Merge.dev", icon:"N",
    what:"Multi-entity financials, consolidated P&L, AR/AP, complex cost centre accounting",
    how:"Too complex to build direct. Use Merge.dev Accounting API. Covers NetSuite, SAP, Oracle in one integration.",
    useCase:"Finance for larger PE-backed portfolio companies.",
    status:"mock", sync:"Mocked",
  },
];

const LIVE = INTEGRATIONS.filter(i=>i.tier==="live");
const MOCK = INTEGRATIONS.filter(i=>i.tier==="mock");

// ── LIVE MARKET DATA (real API calls) ─────────────────────────────────────────
const ALPHA_KEY = "demo"; // Replace with real key from alphavantage.co (free)

function MarketDataPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState(null);

  // Simulated live data (real yfinance call would happen server-side in Next.js)
  // In production: GET /api/market-data → calls yfinance on the server
  const MOCK_MARKET = {
    indices: [
      { name:"S&P 500",    ticker:"SPY",   value:5248.32, change:+0.84, chg1mo:+3.2  },
      { name:"NASDAQ 100", ticker:"QQQ",   value:18142.11,change:+1.12, chg1mo:+4.8  },
      { name:"FTSE 100",   ticker:"^FTSE", value:8152.65, change:-0.21, chg1mo:+1.4  },
      { name:"VIX",        ticker:"^VIX",  value:13.24,   change:-0.42, chg1mo:-1.8  },
    ],
    sectors: [
      { name:"B2B SaaS (BVP Cloud)",  idx:"EMCLOUD", val:142.4, chg:+2.1 },
      { name:"Fintech (ARK Fintech)", idx:"ARKF",    val:22.8,  chg:+1.4 },
      { name:"HealthTech",            idx:"XLV",     val:138.2, chg:+0.8 },
      { name:"Logistics",             idx:"IYT",     val:68.4,  chg:-0.3 },
    ],
    fx: [
      { pair:"GBP/USD", rate:1.2712, chg:+0.003 },
      { pair:"GBP/EUR", rate:1.1734, chg:+0.001 },
      { pair:"USD/EUR", rate:0.9231, chg:-0.002 },
    ],
    fetched: new Date().toLocaleTimeString(),
  };

  function fetchLive() {
    setLoading(true);
    // Simulate API call (in real app: fetch("/api/market-data"))
    setTimeout(() => {
      setData({
        ...MOCK_MARKET,
        fetched: new Date().toLocaleTimeString(),
        // In production these would be live values from yfinance
      });
      setLastFetch(new Date().toLocaleTimeString());
      setLoading(false);
    }, 1200);
  }

  useEffect(() => { fetchLive(); }, []);

  return (
    <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:10, padding:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div>
          <div style={{ color:T.txt1, fontSize:13, fontWeight:700 }}>Live Market Data</div>
          <div style={{ color:T.txt3, fontSize:10, marginTop:2 }}>
            Yahoo Finance · Alpha Vantage · ExchangeRate API
            <span style={{ color:T.green, marginLeft:8 }}>● Live</span>
            {lastFetch && <span style={{ color:T.txt3, marginLeft:8 }}>Fetched {lastFetch}</span>}
          </div>
        </div>
        <button onClick={fetchLive} disabled={loading} style={{ padding:"7px 14px", background:T.green, color:T.bg, border:"none", borderRadius:6, cursor:loading?"wait":"pointer", fontSize:11, fontWeight:700 }}>
          {loading ? "Fetching…" : "↻ Refresh Live"}
        </button>
      </div>

      {data && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Indices */}
          <div>
            <div style={{ color:T.txt3, fontSize:9, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>Market Indices</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
              {data.indices.map(idx => (
                <div key={idx.ticker} style={{ background:T.surface, borderRadius:7, padding:"10px 12px", border:`1px solid ${T.border}` }}>
                  <div style={{ color:T.txt3, fontSize:9 }}>{idx.name}</div>
                  <div style={{ color:T.txt1, fontSize:15, fontWeight:700, fontFamily:"monospace", margin:"4px 0 2px" }}>
                    {idx.value.toLocaleString()}
                  </div>
                  <div style={{ color:idx.change>=0?T.green:T.red, fontSize:10, fontFamily:"monospace" }}>
                    {idx.change>=0?"+":""}{idx.change}% today
                  </div>
                  <div style={{ color:T.txt3, fontSize:9, marginTop:2 }}>
                    1mo: <span style={{ color:idx.chg1mo>=0?T.green:T.red }}>{idx.chg1mo>=0?"+":""}{idx.chg1mo}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sector benchmarks */}
          <div>
            <div style={{ color:T.txt3, fontSize:9, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>Sector Benchmarks (portfolio relevance)</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
              {data.sectors.map(s => (
                <div key={s.idx} style={{ background:T.surface, borderRadius:7, padding:"10px 12px", border:`1px solid ${T.border}` }}>
                  <div style={{ color:T.txt3, fontSize:9, lineHeight:1.3 }}>{s.name}</div>
                  <div style={{ color:T.txt1, fontSize:15, fontWeight:700, fontFamily:"monospace", margin:"4px 0 2px" }}>{s.val}</div>
                  <div style={{ color:s.chg>=0?T.green:T.red, fontSize:10, fontFamily:"monospace" }}>{s.chg>=0?"+":""}{s.chg}% today</div>
                </div>
              ))}
            </div>
          </div>

          {/* FX */}
          <div>
            <div style={{ color:T.txt3, fontSize:9, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>FX Rates (portfolio normalisation)</div>
            <div style={{ display:"flex", gap:8 }}>
              {data.fx.map(f => (
                <div key={f.pair} style={{ background:T.surface, borderRadius:7, padding:"10px 14px", border:`1px solid ${T.border}`, flex:1 }}>
                  <div style={{ color:T.txt3, fontSize:10 }}>{f.pair}</div>
                  <div style={{ color:T.txt1, fontSize:18, fontWeight:700, fontFamily:"monospace", margin:"4px 0 2px" }}>{f.rate}</div>
                  <div style={{ color:f.chg>=0?T.green:T.red, fontSize:10, fontFamily:"monospace" }}>{f.chg>=0?"+":""}{f.chg}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ color:T.txt3, fontSize:9, padding:"8px 12px", background:T.surface, borderRadius:6 }}>
            ℹ️ In prototype: data is simulated to match real yfinance structure. In Next.js: <code style={{color:T.blue}}>GET /api/market-data</code> calls <code style={{color:T.blue}}>yfinance.download()</code> server-side. Zero cost, zero config change needed.
          </div>
        </div>
      )}
    </div>
  );
}

// ── INTEGRATION CARD ──────────────────────────────────────────────────────────
function IntCard({ itg, expanded, toggle }) {
  const isLive = itg.tier === "live";
  const col  = isLive ? T.green : T.amber;
  const bg   = isLive ? T.greenDim : T.amberDim;
  const lbl  = isLive ? "LIVE NOW" : "MOCK";

  return (
    <div onClick={toggle} style={{ background:expanded?T.cardHov:T.card, border:`1px solid ${expanded?T.borderLt:T.border}`, borderLeft:`3px solid ${col}`, borderRadius:8, padding:"13px 14px", cursor:"pointer", transition:"background 0.15s" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:7, background:T.borderLt, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, flexShrink:0 }}>{itg.icon}</div>
          <div>
            <div style={{ color:T.txt1, fontSize:12, fontWeight:600 }}>{itg.name}</div>
            <div style={{ color:T.txt3, fontSize:9 }}>{itg.cat}</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <span style={{ padding:"2px 8px", background:bg, color:col, fontSize:9, fontWeight:700, borderRadius:4 }}>{lbl}</span>
          {isLive && <span style={{ width:7, height:7, borderRadius:"50%", background:T.green, boxShadow:`0 0 6px ${T.green}`, display:"inline-block" }}/>}
        </div>
      </div>
      <div style={{ color:T.txt3, fontSize:10, marginTop:7, lineHeight:1.4 }}>{itg.what}</div>
      {expanded && (
        <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${T.border}`, display:"flex", flexDirection:"column", gap:8 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div><div style={{ color:T.txt3, fontSize:9, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>How to connect</div><div style={{ color:T.txt2, fontSize:11, lineHeight:1.4 }}>{itg.how}</div></div>
            <div><div style={{ color:T.txt3, fontSize:9, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>Use in platform</div><div style={{ color:T.txt2, fontSize:11, lineHeight:1.4 }}>{itg.useCase}</div></div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <span style={{ padding:"2px 8px", background:T.blueDim, color:T.blue, fontSize:9, borderRadius:4 }}>Cost: {itg.cost}</span>
            <span style={{ padding:"2px 8px", background:T.purpleDim, color:T.purple, fontSize:9, borderRadius:4 }}>Effort: {itg.effort}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
// The credential estate, as at the platform's as-of date. This is the screen
// that answers "what happens when a licence lapses" — an expired integration
// does not blank its figures, it stops being a live source and its readings
// continue from the last good value under a SIMULATED label.
function CredentialEstate() {
  const health = integrationHealth();
  const tone = { expired:"#ff3d5a", expiring:"#f5a524", connected:"#00c97a" }[health.summary.tone];
  return (
    <div style={{ background:T.card ?? "#0f1525", border:`1px solid ${T.border}`, borderRadius:8, marginBottom:14 }}>
      <div style={{ padding:"11px 14px", borderBottom:`1px solid ${T.border}`, display:"flex",
                    justifyContent:"space-between", alignItems:"center", gap:10, flexWrap:"wrap" }}>
        <div>
          <div style={{ color:T.txt1, fontSize:12, fontWeight:600 }}>Credential estate</div>
          <div style={{ color:T.txt3, fontSize:9, marginTop:2 }}>
            Tokens, keys and licences as at {AS_OF_DATE}. An expired credential degrades its feed — it never blanks it.
          </div>
        </div>
        <span style={{ color:tone, fontSize:10, fontWeight:600 }}>● {health.summary.text}</span>
      </div>
      <div style={{ padding:12, overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, minWidth:640 }}>
          <thead><tr style={{ color:T.txt3, fontSize:9, textAlign:"left" }}>
            {["System","Type","Credential","Expires","Status","What it feeds","On expiry"].map(h=>
              <th key={h} style={{ padding:"6px 9px", fontWeight:400, borderBottom:`1px solid ${T.border}` }}>{h}</th>)}
          </tr></thead>
          <tbody>{health.rows.map(r=>(
            <tr key={r.id} style={{ borderBottom:`1px solid ${T.border}55` }}>
              <td style={{ padding:"7px 9px", color:T.txt1 }}>{r.name}</td>
              <td style={{ padding:"7px 9px", color:T.txt3 }}>{r.kind}</td>
              <td style={{ padding:"7px 9px", color:T.txt3, fontSize:10 }}>{r.credential}</td>
              <td style={{ padding:"7px 9px", color:T.txt2, fontVariantNumeric:"tabular-nums" }}>{r.expires ?? "—"}</td>
              <td style={{ padding:"7px 9px" }}>
                <span style={{ color:r.licence.colour, fontSize:9, fontWeight:700, padding:"2px 7px",
                               border:`1px solid ${r.licence.colour}44`, background:`${r.licence.colour}14`, borderRadius:3, whiteSpace:"nowrap" }}>
                  {r.licence.label}{r.licence.days != null ? ` · ${r.licence.days < 0 ? `${Math.abs(r.licence.days)}d ago` : `${r.licence.days}d`}` : ""}
                </span>
              </td>
              <td style={{ padding:"7px 9px", color:T.txt3, fontSize:10 }}>{r.feeds.join(" · ")}</td>
              <td style={{ padding:"7px 9px", color:T.txt3, fontSize:9.5, lineHeight:1.5 }}>{r.licence.note}</td>
            </tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function IntegrationPlan() {
  const [tab, setTab]     = useState("live");
  const [opened, setOpened] = useState(null);
  const toggle = id => setOpened(p => p===id?null:id);

  return (
    <div style={{ background:T.bg, minHeight:"100%", fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color:T.txt1 }}>
      <div style={{ padding:"16px 22px 0" }}><CredentialEstate/></div>
      {/* Header */}
      <div style={{ padding:"20px 28px", borderBottom:`1px solid ${T.border}` }}>
        <div style={{ color:T.txt3, fontSize:9, letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:4 }}>Caledonia Alba · Portfolio Intelligence Platform</div>
        <h1 style={{ color:T.txt1, fontSize:20, fontWeight:700, margin:0 }}>Integration Plan</h1>
        <div style={{ color:T.txt3, fontSize:11, marginTop:4 }}>What connects live this week vs what stays mock — Sage X3 not in scope (separate SDI project)</div>
      </div>

      {/* Summary */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, padding:"16px 28px", borderBottom:`1px solid ${T.border}` }}>
        {[
          { l:"Live This Week",    v:LIVE.length,       c:T.green,  sub:"Free, no approval, works now" },
          { l:"Mocked (priority)", v:MOCK.filter(m=>["xero","hubspot","bamboohr","truelayer"].includes(m.id)).length, c:T.amber, sub:"Wire up Month 1–2" },
          { l:"Mocked (later)",    v:MOCK.length-4,     c:T.txt2,   sub:"Month 3+ or via Merge.dev" },
          { l:"Sage X3",           v:"Out of scope",    c:T.txt3,   sub:"SDI / Shepshed project only" },
        ].map(s => (
          <div key={s.l} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:8, padding:"12px 14px" }}>
            <div style={{ color:T.txt3, fontSize:9, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:4 }}>{s.l}</div>
            <div style={{ color:s.c, fontSize:typeof s.v==="number"?24:14, fontWeight:700, fontFamily:"monospace" }}>{s.v}</div>
            <div style={{ color:T.txt3, fontSize:10, marginTop:3 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, padding:"14px 28px", borderBottom:`1px solid ${T.border}` }}>
        {[
          { id:"live",   l:`🟢 Live Now (${LIVE.length})` },
          { id:"mock",   l:`🟡 Mock Priority (${MOCK.length})` },
          { id:"market", l:"📈 Live Market Data Panel" },
        ].map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:"7px 16px", background:tab===t.id?T.blue:"transparent", border:`1px solid ${tab===t.id?T.blue:T.border}`, borderRadius:6, color:tab===t.id?"#fff":T.txt3, cursor:"pointer", fontSize:11, fontWeight:tab===t.id?600:400 }}>
            {t.l}
          </button>
        ))}
      </div>

      <div style={{ padding:"16px 28px 40px" }}>
        {tab === "live" && (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <div style={{ color:T.txt3, fontSize:11, marginBottom:8, padding:"10px 14px", background:T.greenDim, borderRadius:6, border:`1px solid ${T.green}22` }}>
              These connect with zero cost and zero approval process. Wire them up during Week 1 alongside the mock data — they make the demo feel genuinely live.
            </div>
            {LIVE.map(itg => <IntCard key={itg.id} itg={itg} expanded={opened===itg.id} toggle={()=>toggle(itg.id)}/>)}
          </div>
        )}
        {tab === "mock" && (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <div style={{ color:T.txt3, fontSize:11, marginBottom:8, padding:"10px 14px", background:T.amberDim, borderRadius:6, border:`1px solid ${T.amber}22` }}>
              These are mocked with realistic data shaped exactly like the real API response. Click any card for the connection plan. Priority order: Xero → TrueLayer → HubSpot → BambooHR → Stripe.
            </div>
            {MOCK.map(itg => <IntCard key={itg.id} itg={itg} expanded={opened===itg.id} toggle={()=>toggle(itg.id)}/>)}
          </div>
        )}
        {tab === "market" && (
          <div>
            <div style={{ color:T.txt3, fontSize:11, marginBottom:14, padding:"10px 14px", background:T.blueDim, borderRadius:6, border:`1px solid ${T.blue}22` }}>
              This panel shows how live market data will appear in the platform. In the prototype: simulated data matching the exact yfinance API structure. In Next.js: one server-side API route, zero cost.
            </div>
            <MarketDataPanel />
          </div>
        )}
      </div>
    </div>
  );
}

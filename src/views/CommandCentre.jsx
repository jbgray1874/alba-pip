// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Portfolio Health Command Centre
//  ----------------------------------------------------------------------------
//  Stage 2 of the demo specification. The landing view, built to one test:
//  an investment professional understands the portfolio in under thirty seconds.
//
//  Requirements it answers, in the specification's words:
//    • Eight to ten companies with credible histories
//    • Status for revenue, EBITDA, cash, people and sales
//    • Overall portfolio health and movement since the previous period
//    • Separate risk alerts and opportunity alerts
//    • Filters by fund, sector, geography and status
//
//  Risks and opportunities sit side by side rather than in one merged list,
//  because a portfolio where everything is a problem gives an operating team
//  nowhere to look. Movement is shown against the prior month from the ledger,
//  not asserted.
// ════════════════════════════════════════════════════════════════════════════

import { C } from "../lib/theme.js";
import { useState, useMemo } from "react";
import { COMPANIES, FUNDS, financeOf } from "../lib/companies.js";
import { buildFinance } from "../lib/financeData.js";
import { buildRevenueMiss } from "../lib/scenarioRevenueMiss.js";
import { buildExpansion } from "../lib/scenarioExpansion.js";
import { fmtMoney } from "../lib/fx.js";
import { useLiveRates } from "../lib/liveData.js";
import LiveBadge from "../components/LiveBadge.jsx";
import LiveStrip from "../components/LiveStrip.jsx";
import InsightCard from "../components/InsightCard.jsx";

// Palette from the shared design tokens. Every view used to carry its own
// copy of this object, seventeen of them, each a shade adrift of the next.
const T = {
  bg: C.bg,
  card: C.surface,
  border: C.border,
  accent: C.surfaceUp,
  blue: C.blue,
  green: C.green,
  amber: C.amber,
  red: C.red,
  purple: C.purple,
  txt1: C.txt1,
  txt2: C.txt2,
  txt3: C.txt3
};

const RAG = { RED: T.red, AMBER: T.amber, GREEN: T.green };
const REPORTING = "GBP";

/** Everything the table needs, computed once from the ledger. */
function usePortfolio(fxVersion = 0) {
  return useMemo(() => {
    return COMPANIES.map((c) => {
      const fin = buildFinance({ id: c.id, status: c.rag.toLowerCase() }, { reportingCurrency: REPORTING });
      const rev = fin.history.revenue;
      const prior = rev[rev.length - 2];
      const now = rev[rev.length - 1];
      const eb = fin.history.ebitda;
      return {
        ...c,
        fin,
        ...financeOf(c.id),
        revenueMoM: prior ? ((now.actual - prior.actual) / prior.actual) * 100 : 0,
        marginMove: eb[eb.length - 1].grossMarginPct - eb[0].grossMarginPct,
        ebitdaPctNow: eb[eb.length - 1].marginPct,
        headcount: fin.people.headcount,
        planHeadcount: fin.people.planHeadcount,
        attrition: fin.people.attritionPct,
        coverage: fin.sales.pipelineCoverage,
        coverageFrom: fin.sales.coverageFrom,
        winRate: fin.sales.winRatePct,
      };
    });
  }, [fxVersion]);
}

function Stat({ label, value, sub, tone }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "11px 13px", minWidth: 132, flex: 1 }}>
      <div style={{ color: T.txt3, fontSize: 9, letterSpacing: 0.5, marginBottom: 5 }}>{label}</div>
      <div style={{ color: tone || T.txt1, fontSize: 21, fontWeight: 700, fontFamily: "Georgia,serif", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: T.txt3, fontSize: 9, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

/** Status pill for one of the five dimensions the specification lists. */
function Pip({ label, tone, title }) {
  return (
    <span title={title}
          style={{ display: "inline-block", width: 7, height: 7, borderRadius: 2, background: tone, marginRight: 3 }}
          aria-label={`${label}: ${title}`} />
  );
}

function statusPips(c) {
  const g = (ok, warn) => (ok ? T.green : warn ? T.amber : T.red);
  return [
    { label: "Revenue", tone: g(c.rvb >= 100, c.rvb >= 95), title: `Revenue ${c.rvb}% of plan` },
    { label: "EBITDA", tone: g(c.ebitdaPct > 0, c.ebitdaPct > -10), title: `EBITDA margin ${c.ebitdaPct}%` },
    { label: "Cash", tone: g(c.runway >= 12, c.runway >= 6), title: `Runway ${c.runway} months` },
    { label: "People", tone: g(c.attrition < 12, c.attrition < 18), title: `Attrition ${c.attrition}% · headcount ${c.headcount} vs plan ${c.planHeadcount}` },
    { label: "Sales", tone: g(c.coverage >= 3, c.coverage >= 2), title: `Pipeline coverage ${c.coverage}x · win rate ${c.winRate}%` },
  ];
}

export default function CommandCentre({ onOpenCompany, onGuide }) {
  const fx = useLiveRates();
  const portfolio = usePortfolio(fx.version);
  const [f, setF] = useState({ fund: "all", sector: "all", geo: "all", status: "all" });
  const [selected, setSelected] = useState(null);

  const options = useMemo(() => ({
    fund: ["all", ...FUNDS.map((x) => x.id)],
    sector: ["all", ...new Set(COMPANIES.map((c) => c.sector))],
    geo: ["all", ...new Set(COMPANIES.map((c) => c.geo))],
    status: ["all", "RED", "AMBER", "GREEN"],
  }), []);

  const rows = portfolio.filter((c) =>
    (f.fund === "all" || c.fund === f.fund) &&
    (f.sector === "all" || c.sector === f.sector) &&
    (f.geo === "all" || c.geo === f.geo) &&
    (f.status === "all" || c.rag === f.status));

  // Fund-level roll-up, in the reporting currency.
  const roll = useMemo(() => {
    const cash = rows.reduce((t, c) => t + c.fin.cash.balance, 0);
    const burning = rows.filter((c) => c.runway < 60);
    return {
      count: rows.length,
      avgHealth: rows.length ? Math.round(rows.reduce((t, c) => t + c.score, 0) / rows.length) : 0,
      red: rows.filter((c) => c.rag === "RED").length,
      cash,
      avgRunway: burning.length ? burning.reduce((t, c) => t + c.runway, 0) / burning.length : Infinity,
      moved: rows.filter((c) => Math.abs(c.revenueMoM) > 2).length,
      burn: rows.reduce((t, c) => t + c.fin.cash.burn, 0),
      revenue: rows.reduce((t, c) => t + c.fin.revenue.total, 0),
      headcount: rows.reduce((t, c) => t + c.fin.people.headcount, 0),
      pipeline: rows.reduce((t, c) => t + c.fin.revenue.budget * 3 * c.fin.sales.pipelineCoverage, 0),
    };
  }, [rows]);

  // The two primary scenarios, separated as the specification requires.
  const { risks, opportunities } = useMemo(() => {
    const visible = new Set(rows.map((c) => c.id));
    const r = [], o = [];
    try { const s = buildRevenueMiss(); if (visible.has(s.company.id)) r.push(s.insight); } catch { /* scenario unavailable */ }
    try { const s = buildExpansion(); if (visible.has(s.company.id)) o.push(s.insight); } catch { /* scenario unavailable */ }
    return { risks: r, opportunities: o };
  }, [rows]);


  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "18px 22px", background: T.bg }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <div>
          <h1 style={{ color: T.txt1, fontSize: 20, fontWeight: 700, margin: 0 }}>Portfolio Health</h1>
          <div style={{ color: T.txt3, fontSize: 10, marginTop: 3 }}>
            {roll.count} companies · reported in {REPORTING} · as of {portfolio[0]?.fin.asOf}
            {onGuide && <>{" · "}
              <button onClick={onGuide} style={{ background: "transparent", border: "none", padding: 0,
                color: T.blue, fontSize: 10, cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}>
                📖 how to read this screen
              </button>
            </>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {/* Four of the nine companies report in something other than sterling,
              so the rate is not a footnote — switching it revalues the table. */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 4 }}>
            <LiveBadge tier={fx.tier} detail={fx.detail} ago={fx.ago} pulse />
            <button onClick={fx.isLive || fx.loading ? fx.goPinned : fx.goLive}
                    title={fx.isLive
                      ? "Return to the rates pinned for the demo"
                      : "Fetch today's rates and revalue the four companies that do not report in sterling"}
                    style={{ padding: "4px 9px", borderRadius: 5, cursor: "pointer", fontFamily: "inherit",
                             fontSize: 9.5, fontWeight: 600,
                             background: fx.isLive ? "#00c97a" : "transparent",
                             border: `1px solid ${fx.isLive ? "#00c97a" : T.border}`,
                             color: fx.isLive ? "#04140d" : T.txt2 }}>
              {fx.loading ? "Fetching…" : fx.isLive ? "Live FX on" : "Use live FX"}
            </button>
          </div>
          {[["fund", options.fund], ["sector", options.sector], ["geo", options.geo], ["status", options.status]].map(([key, opts]) => (
            <select key={key} value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })}
                    style={{ background: T.card, color: T.txt2, border: `1px solid ${T.border}`, borderRadius: 5, padding: "5px 8px", fontSize: 10 }}>
              {opts.map((o) => (
                <option key={o} value={o}>
                  {o === "all" ? `All ${key === "geo" ? "geographies" : key + "s"}` : (key === "fund" ? FUNDS.find((x) => x.id === o)?.name : o)}
                </option>
              ))}
            </select>
          ))}
        </div>
      </div>

      {/* ── Live readings — never empty, never frozen ── */}
      <LiveStrip
        specs={[
          { key: "fund-cash",   label: "Portfolio cash",      base: roll.cash,      amplitude: 0.0025, integration: "bankfeed", fmt: (v) => fmtMoney(v, REPORTING, { k: true }) },
          { key: "fund-burn",   label: "Monthly net burn",    base: roll.burn,      amplitude: 0.004,  integration: "bankfeed", fmt: (v) => fmtMoney(v, REPORTING, { k: true }) },
          { key: "fund-rev",    label: "Monthly revenue",     base: roll.revenue,   amplitude: 0.003,  integration: "xero",     fmt: (v) => fmtMoney(v, REPORTING, { k: true }) },
          { key: "fund-pipe",   label: "Open pipeline",       base: roll.pipeline,  amplitude: 0.005,  integration: "hubspot",  fmt: (v) => fmtMoney(v, REPORTING, { k: true }) },
          { key: "fund-heads",  label: "Portfolio headcount", base: roll.headcount, amplitude: 0.0012, integration: "bamboo",   fmt: (v) => Math.round(v).toLocaleString() },
          { key: "fund-gbpusd", label: "GBP / USD",           base: 1.2712,         amplitude: 0.0011, integration: "fx",       fmt: (v) => v.toFixed(4) },
        ]}
        note="Live readings across the fund, moving around the reported figures below. A lapsed credential keeps its reading moving and drops the badge to SIMULATED rather than blanking the tile."
      />

      {/* ── Fund KPI banner ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <Stat label="AVERAGE HEALTH" value={roll.avgHealth} sub={`${roll.count} companies`} />
        <Stat label="COMPANIES IN RED" value={roll.red} tone={roll.red ? T.red : T.green} sub="requires intervention" />
        <Stat label="PORTFOLIO CASH" value={fmtMoney(roll.cash, REPORTING, { k: true })} sub="converted at pinned FX" />
        <Stat label="AVERAGE RUNWAY" value={Number.isFinite(roll.avgRunway) ? `${roll.avgRunway.toFixed(1)}mo` : "—"} sub="cash-consuming companies" />
        <Stat label="MOVED THIS MONTH" value={roll.moved} sub="revenue moved over 2%" />
      </div>

      {/* ── Risks and opportunities, side by side ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ color: T.red, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, marginBottom: 7 }}>
            RISK ALERTS ({risks.length})
          </div>
          {risks.length ? risks.map((i) => <InsightCard key={i.id} insight={i} />)
            : <div style={{ color: T.txt3, fontSize: 11, padding: 12 }}>No risk alerts for this selection.</div>}
        </div>
        <div>
          <div style={{ color: T.green, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, marginBottom: 7 }}>
            OPPORTUNITY ALERTS ({opportunities.length})
          </div>
          {opportunities.length ? opportunities.map((i) => <InsightCard key={i.id} insight={i} />)
            : <div style={{ color: T.txt3, fontSize: 11, padding: 12 }}>No opportunity alerts for this selection.</div>}
        </div>
      </div>

      {/* ── Portfolio table ── */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 13px", borderBottom: `1px solid ${T.border}` }}>
          <span style={{ color: T.txt1, fontSize: 12, fontWeight: 600 }}>Portfolio</span>
          <span style={{ color: T.txt3, fontSize: 9 }}>Revenue · EBITDA · Cash · People · Sales</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 780 }}>
            <thead>
              <tr style={{ color: T.txt3, fontSize: 9, textAlign: "left" }}>
                {["Company", "Fund", "Geography", "Status", "Health", "Revenue vs plan", "MoM", "Runway", "Cash"].map((h) => (
                  <th key={h} style={{ padding: "7px 11px", fontWeight: 400, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} onClick={() => { setSelected(c.id); onOpenCompany?.(c.id); }}
                    style={{ borderBottom: `1px solid ${T.accent}`, cursor: "pointer",
                             background: selected === c.id ? T.accent : "transparent" }}>
                  <td style={{ padding: "8px 11px" }}>
                    <div style={{ color: T.txt1, fontWeight: 600 }}>{c.name}</div>
                    <div style={{ color: T.txt3, fontSize: 9 }}>{c.sector} · {c.stage} · reports {c.currency}</div>
                  </td>
                  <td style={{ padding: "8px 11px", color: T.txt2, fontSize: 10 }}>{FUNDS.find((x) => x.id === c.fund)?.name}</td>
                  <td style={{ padding: "8px 11px", color: T.txt2, fontSize: 10 }}>{c.geo}</td>
                  <td style={{ padding: "8px 11px" }}>
                    <span style={{ color: RAG[c.rag], fontSize: 9, fontWeight: 700, padding: "2px 6px", background: `${RAG[c.rag]}18`, borderRadius: 3 }}>{c.rag}</span>
                    <div style={{ marginTop: 4 }}>{statusPips(c).map((p) => <Pip key={p.label} {...p} />)}</div>
                  </td>
                  <td style={{ padding: "8px 11px", color: T.txt1, fontWeight: 600 }}>{c.score}</td>
                  <td style={{ padding: "8px 11px", color: c.rvb >= 100 ? T.green : c.rvb >= 95 ? T.amber : T.red }}>{c.rvb}%</td>
                  <td style={{ padding: "8px 11px", color: c.revenueMoM >= 0 ? T.green : T.red, whiteSpace: "nowrap" }}>
                    {c.revenueMoM >= 0 ? "▲" : "▼"} {Math.abs(c.revenueMoM).toFixed(1)}%
                  </td>
                  <td style={{ padding: "8px 11px", color: c.runway < 6 ? T.red : c.runway < 12 ? T.amber : T.txt2, whiteSpace: "nowrap" }}>
                    {c.runway < 60 ? `${c.runway}mo` : "cash gen"}
                  </td>
                  <td style={{ padding: "8px 11px", color: T.txt2, whiteSpace: "nowrap" }}>
                    {fmtMoney(c.fin.cash.balance, REPORTING, { k: true })}
                    {c.currency !== REPORTING && <div style={{ color: T.txt3, fontSize: 8.5 }}>{fmtMoney(c.cashK, c.currency, { k: true })} native</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ color: T.txt3, fontSize: 9, marginTop: 9 }}>
        Status pips read left to right: revenue, EBITDA, cash, people, sales. Hover for the figure behind each.
      </div>
    </div>
  );
}

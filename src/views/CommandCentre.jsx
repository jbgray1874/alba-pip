// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Screen 1: Portfolio Command Centre  (PORTFOLIO)
//  ----------------------------------------------------------------------------
//  The landing view, built to one test: an investment professional understands
//  the portfolio in under thirty seconds.
//
//  The order on the page is the order the question is asked in. How many
//  companies, and how many are in trouble. How healthy overall, how much runway,
//  which way revenue is moving. Then which companies to look at first, and what
//  the platform has found that a monthly pack would not have.
//
//  Risks and opportunities stay in separate columns rather than one merged list,
//  because a portfolio where everything is a problem gives an operating team
//  nowhere to look. Movement is read from the ledger, never asserted.
// ════════════════════════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { C, F, S, label as labelStyle, metric as metricStyle } from "../lib/theme.js";
import { Page, PageHeader, Chip, Button, Metric, Panel, TwoColumn, ProvenanceBar, Dot } from "../components/Shell.jsx";
import { COMPANIES, FUNDS, financeOf } from "../lib/companies.js";
import { buildFinance } from "../lib/financeData.js";
import { buildRevenueMiss } from "../lib/scenarioRevenueMiss.js";
import { buildExpansion } from "../lib/scenarioExpansion.js";
import { portfolioAlerts } from "../lib/alertsFeed.js";
import { integrationHealth } from "../lib/liveFeed.js";
import { fmtMoney } from "../lib/fx.js";
import { useLiveRates } from "../lib/liveData.js";
import LiveBadge from "../components/LiveBadge.jsx";
import LiveStrip from "../components/LiveStrip.jsx";
import InsightCard from "../components/InsightCard.jsx";

const RAG = { RED: C.red, AMBER: C.gold, GREEN: C.green };
const REPORTING = "GBP";

/**
 * The "everything" option in each filter, written out.
 *
 * These were pluralised by appending an "s" to the filter's own key, which
 * produced "All statuss" in the dropdown on the landing page — the first screen
 * anybody sees. English plurals are not a string operation.
 */
const ALL_LABEL = {
  fund: "All funds",
  sector: "All sectors",
  geo: "All geographies",
  status: "All statuses",
};

/** Everything the table needs, computed once from the ledger. */
function usePortfolio(fxVersion = 0) {
  return useMemo(() => COMPANIES.map((c) => {
    const fin = buildFinance({ id: c.id, status: c.rag.toLowerCase() }, { reportingCurrency: REPORTING });
    const rev = fin.history.revenue;
    const prior = rev[rev.length - 2];
    const now = rev[rev.length - 1];
    const eb = fin.history.ebitda;
    return {
      ...c, fin, ...financeOf(c.id),
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
  }), [fxVersion]);
}

// ── Panel parts ─────────────────────────────────────────────────────────────

/** The health ring — score in the centre over `/100`, as the reference draws it. */
function HealthRing({ score, size = 116 }) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const on = (score / 100) * circ;
  const colour = score >= 75 ? C.green : score >= 50 ? C.gold : C.red;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }} aria-label={`Portfolio health ${score} of 100`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.border} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colour} strokeWidth={stroke}
              strokeDasharray={`${on} ${circ}`} strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 - 2} textAnchor="middle" dominantBaseline="middle"
            fill={C.txt1} fontFamily={F.sans} fontSize={30} fontWeight={300}>{score}</text>
      <text x={size / 2} y={size / 2 + 20} textAnchor="middle" dominantBaseline="middle"
            fill={C.txt3} fontFamily={F.sans} fontSize={10}>/100</text>
    </svg>
  );
}

/** A filled area sparkline — the reference's revenue-growth panel. */
function AreaSpark({ data, colour = C.green, w = 240, h = 54 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pt = (v, i) => [(i / (data.length - 1)) * w, h - ((v - min) / range) * (h - 6) - 3];
  const line = data.map((v, i) => pt(v, i).join(",")).join(" ");
  const id = `spark-${Math.round(w)}-${data.length}`;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colour} stopOpacity="0.28" />
          <stop offset="100%" stopColor={colour} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${line} ${w},${h}`} fill={`url(#${id})`} />
      <polyline points={line} fill="none" stroke={colour} strokeWidth="1.6" />
    </svg>
  );
}

/** A rounded square carrying the company's initial, as the priority map does. */
function Mark({ name, tone }) {
  return (
    <span style={{
      width: 20, height: 20, borderRadius: 4, flexShrink: 0,
      border: `1px solid ${tone}55`, background: `${tone}18`, color: tone,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: S.micro, fontWeight: 700,
    }}>{name.charAt(0)}</span>
  );
}

function LegendRow({ colour, label, count }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: colour, flexShrink: 0 }} />
      <span style={{ color: C.txt2, fontSize: S.small, flex: 1 }}>{label}</span>
      <span style={{ color: C.txt1, fontSize: S.small, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{count}</span>
    </div>
  );
}

/** One card in PRIORITY INTELLIGENCE. */
function IntelCard({ category, tone, glyph, company, detail, confidence, sources }) {
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: "11px 12px",
                  background: C.bgDeep, marginBottom: 8 }}>
      <div style={{ ...labelStyle(tone), marginBottom: 7 }}>{category}</div>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{
          width: 22, height: 22, borderRadius: "50%", flexShrink: 0, marginTop: 1,
          border: `1px solid ${tone}55`, background: `${tone}18`, color: tone,
          display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700,
        }}>{glyph}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ color: C.txt1, fontSize: S.body, fontWeight: 600 }}>{company}</div>
          <div style={{ color: C.txt2, fontSize: S.small, marginTop: 3, lineHeight: 1.5 }}>{detail}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <Chip tone={tone === C.green ? "green" : tone === C.red ? "red" : "gold"}>{confidence}</Chip>
          <div style={{ color: C.txt3, fontSize: S.micro, marginTop: 5 }}>{sources}</div>
        </div>
      </div>
    </div>
  );
}

// ── The screen ──────────────────────────────────────────────────────────────

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

  const alerts = useMemo(() => portfolioAlerts(), []);
  const health = useMemo(() => integrationHealth(), []);

  // Fund-level roll-up, in the reporting currency.
  const roll = useMemo(() => {
    const cash = rows.reduce((t, c) => t + c.fin.cash.balance, 0);
    const burning = rows.filter((c) => c.runway < 60);

    // Portfolio revenue, month by month, so the growth figure has a shape
    // behind it rather than a percentage on its own.
    const months = rows[0]?.fin.history.revenue.length ?? 0;
    const series = Array.from({ length: months }, (_, i) =>
      rows.reduce((t, c) => t + (c.fin.history.revenue[i]?.actual ?? 0), 0));
    const growth = series.length > 1 && series[0] > 0
      ? ((series[series.length - 1] - series[0]) / series[0]) * 100 : 0;

    return {
      count: rows.length,
      avgHealth: rows.length ? Math.round(rows.reduce((t, c) => t + c.score, 0) / rows.length) : 0,
      green: rows.filter((c) => c.rag === "GREEN").length,
      amber: rows.filter((c) => c.rag === "AMBER").length,
      red: rows.filter((c) => c.rag === "RED").length,
      cash,
      avgRunway: burning.length ? burning.reduce((t, c) => t + c.runway, 0) / burning.length : Infinity,
      moved: rows.filter((c) => Math.abs(c.revenueMoM) > 2).length,
      burn: rows.reduce((t, c) => t + c.fin.cash.burn, 0),
      revenue: rows.reduce((t, c) => t + c.fin.revenue.total, 0),
      headcount: rows.reduce((t, c) => t + c.fin.people.headcount, 0),
      pipeline: rows.reduce((t, c) => t + c.fin.revenue.budget * 3 * c.fin.sales.pipelineCoverage, 0),
      series, growth, months,
    };
  }, [rows]);

  // Which company to look at first — ranked on health, with the worst breach it
  // is carrying named beside it, so the rank and the reason come from the same
  // place the alert list does.
  const priority = useMemo(() => rows
    .slice()
    .sort((a, b) => a.score - b.score)
    .slice(0, 6)
    .map((c) => ({
      ...c,
      issue: alerts.find((a) => a.companyId === c.id)?.kpi ?? "No threshold breached",
      reading: alerts.find((a) => a.companyId === c.id)?.reading ?? "—",
    })), [rows, alerts]);

  // The two primary scenarios, separated as the specification requires.
  const { risks, opportunities, revenueMiss, expansion } = useMemo(() => {
    const visible = new Set(rows.map((c) => c.id));
    const r = [], o = [];
    let rm = null, ex = null;
    try { rm = buildRevenueMiss(); if (visible.has(rm.company.id)) r.push(rm.insight); } catch { /* unavailable */ }
    try { ex = buildExpansion(); if (visible.has(ex.company.id)) o.push(ex.insight); } catch { /* unavailable */ }
    return { risks: r, opportunities: o, revenueMiss: rm, expansion: ex };
  }, [rows]);

  const liquidity = useMemo(() => alerts.find((a) => a.key === "runway" && a.severity === "critical")
    ?? alerts.find((a) => a.key === "runway") ?? null, [alerts]);

  const money = (v) => fmtMoney(v, REPORTING, { k: true });

  return (
    <Page>
      <PageHeader
        crumbs={["Portfolio", "Command Centre"]}
        title="Portfolio Command Centre"
        chips={roll.red > 0 ? <Chip tone="red">{roll.red} critical</Chip> : <Chip tone="green">No company in red</Chip>}
        purpose={`Live operating intelligence across ${roll.count} portfolio ${roll.count === 1 ? "company" : "companies"}, reported in ${REPORTING}`}
        meta={`As of ${portfolio[0]?.fin.asOf} · ${health.summary.text}`}
        actions={<>
          <LiveBadge tier={fx.tier} detail={fx.detail} ago={fx.ago} pulse />
          <Button variant={fx.isLive ? "primary" : "outline"}
                  onClick={fx.isLive || fx.loading ? fx.goPinned : fx.goLive}
                  title={fx.isLive
                    ? "Return to the rates pinned for the demo"
                    : "Fetch today's rates and revalue the four companies that do not report in sterling"}>
            {fx.loading ? "Fetching…" : fx.isLive ? "Live FX on" : "Use live FX"}
          </Button>
          {onGuide && <Button variant="ghost" onClick={onGuide}>How to read this</Button>}
        </>}
      />

      {/* ── The four counts, as the reference sets them beside the title ── */}
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginBottom: 12 }}>
        <Metric label="Portfolio companies" value={roll.count} sub={`${FUNDS.length} funds · ${new Set(rows.map((c) => c.geo)).size} geographies`} />
        <Metric label="Healthy" value={roll.green} tone={C.green} sub="No threshold breached" />
        <Metric label="Attention" value={roll.amber} tone={C.gold} sub="One or more indicators moving" />
        <Metric label="Critical" value={roll.red} tone={C.red} sub="Intervention required this cycle" />
      </div>

      {/* ── Filters ── */}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <span style={labelStyle()}>Filter</span>
        {[["fund", options.fund], ["sector", options.sector], ["geo", options.geo], ["status", options.status]].map(([key, opts]) => (
          <select key={key} value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })}
                  style={{ background: C.surface, color: C.txt2, border: `1px solid ${C.border}`,
                           borderRadius: 4, padding: "5px 8px", fontSize: S.small, fontFamily: F.sans }}>
            {opts.map((o) => (
              <option key={o} value={o}>
                {o === "all" ? ALL_LABEL[key] : (key === "fund" ? FUNDS.find((x) => x.id === o)?.name : o)}
              </option>
            ))}
          </select>
        ))}
        {rows.length !== COMPANIES.length && (
          <Button variant="ghost" onClick={() => setF({ fund: "all", sector: "all", geo: "all", status: "all" })}>
            Clear · showing {rows.length} of {COMPANIES.length}
          </Button>
        )}
      </div>

      {/* ── Health, runway, growth ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr 1fr", gap: 12, alignItems: "start" }}
           className="alba-three-col">
        <Panel title="Portfolio health" sub={`Weighted across ${roll.count} companies`}>
          <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
            <HealthRing score={roll.avgHealth} />
            <div style={{ flex: 1, minWidth: 130 }}>
              <LegendRow colour={C.green} label="Healthy" count={roll.green} />
              <LegendRow colour={C.gold} label="Attention" count={roll.amber} />
              <LegendRow colour={C.red} label="Critical" count={roll.red} />
              <div style={{ color: C.txt3, fontSize: S.micro, marginTop: 8, lineHeight: 1.5 }}>
                {roll.moved} {roll.moved === 1 ? "company" : "companies"} moved revenue by more than 2% this month.
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Cash runway" sub="Mean across the cash-consuming companies">
          <div style={metricStyle(Number.isFinite(roll.avgRunway) && roll.avgRunway < 9 ? C.gold : C.txt1, 44)}>
            {Number.isFinite(roll.avgRunway) ? roll.avgRunway.toFixed(1) : "—"}
          </div>
          <div style={{ ...labelStyle(), marginTop: 4 }}>Months</div>
          <div style={{ color: C.txt3, fontSize: S.micro, marginTop: 10, lineHeight: 1.5 }}>
            {money(roll.cash)} of cash against {money(roll.burn)} of net burn a month.
            {" "}{rows.filter((c) => c.runway < 9).length} {rows.filter((c) => c.runway < 9).length === 1 ? "company is" : "companies are"} inside nine months.
          </div>
        </Panel>

        <Panel title="Revenue growth" sub={`Over the ${roll.months}-month ledger`}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
            <span style={metricStyle(roll.growth >= 0 ? C.green : C.red, 30)}>
              {roll.growth >= 0 ? "+" : ""}{roll.growth.toFixed(1)}%
            </span>
            <span style={{ color: C.txt3, fontSize: S.small }}>{money(roll.revenue)} a month</span>
          </div>
          <div style={{ marginTop: 10 }}>
            <AreaSpark data={roll.series} colour={roll.growth >= 0 ? C.green : C.red} />
          </div>
        </Panel>
      </div>

      <div style={{ height: 12 }} />

      {/* ── Priority map and priority intelligence ── */}
      <TwoColumn
        left={
          <Panel title="Portfolio priority map" sub="Worst health first, with the breach each company is carrying">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: S.small, minWidth: 460 }}>
                <thead><tr>
                  {["Rank", "Company", "Status", "Primary issue"].map((h) => (
                    <th key={h} style={{ ...labelStyle(), textAlign: "left", padding: "6px 10px",
                                         borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{priority.map((c, i) => (
                  <tr key={c.id} onClick={() => { setSelected(c.id); onOpenCompany?.(c.id); }}
                      style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer",
                               background: selected === c.id ? C.surfaceUp : "transparent" }}>
                    <td style={{ padding: "8px 10px", color: C.txt3, fontVariantNumeric: "tabular-nums" }}>{i + 1}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <Mark name={c.name} tone={RAG[c.rag]} />
                        <span>
                          <span style={{ color: C.txt1 }}>{c.name}</span>
                          <span style={{ color: C.txt3, display: "block", fontSize: S.micro }}>{c.sector} · {c.geo}</span>
                        </span>
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <Dot status={c.rag} />
                        <span style={{ color: RAG[c.rag] }}>{c.rag.charAt(0) + c.rag.slice(1).toLowerCase()}</span>
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", color: C.txt2 }}>
                      {c.issue}
                      <span style={{ color: C.txt3, display: "block", fontSize: S.micro }}>{c.reading}</span>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </Panel>
        }
        right={
          <Panel title="Priority intelligence" sub="What the platform found that a monthly pack would not have">
            {revenueMiss && (
              <IntelCard
                category="Revenue risk" tone={C.gold} glyph="⚠"
                company={revenueMiss.company.name}
                detail={`Next-quarter forecast ${fmtMoney(revenueMiss.forecast.forecastGap, revenueMiss.currency, { k: true })} under plan while reported revenue is only ${Math.abs(revenueMiss.currentQuarter.variancePct).toFixed(1)}% below.`}
                confidence={revenueMiss.insight.confidence.label} sources="CRM + Finance" />
            )}
            {liquidity && (
              <IntelCard
                category="Liquidity" tone={C.red} glyph="▼"
                company={liquidity.company} detail={liquidity.message}
                confidence={liquidity.severity === "critical" ? "Critical" : "High"} sources={liquidity.source} />
            )}
            {expansion && (
              <IntelCard
                category="Value creation" tone={C.green} glyph="▲"
                company={expansion.company.name}
                detail={expansion.insight.headline}
                confidence={expansion.insight.confidence.label} sources="CRM + Product" />
            )}
            {!revenueMiss && !liquidity && !expansion && (
              <div style={{ color: C.txt3, fontSize: S.small, padding: 4 }}>
                Nothing above threshold for this selection.
              </div>
            )}
          </Panel>
        }
      />

      {/* ── Live readings — never empty, never frozen ── */}
      <LiveStrip
        specs={[
          { key: "fund-cash",   label: "Portfolio cash",      base: roll.cash,      amplitude: 0.0025, integration: "bankfeed", fmt: money },
          { key: "fund-burn",   label: "Monthly net burn",    base: roll.burn,      amplitude: 0.004,  integration: "bankfeed", fmt: money },
          { key: "fund-rev",    label: "Monthly revenue",     base: roll.revenue,   amplitude: 0.003,  integration: "xero",     fmt: money },
          { key: "fund-pipe",   label: "Open pipeline",       base: roll.pipeline,  amplitude: 0.005,  integration: "hubspot",  fmt: money },
          { key: "fund-heads",  label: "Portfolio headcount", base: roll.headcount, amplitude: 0.0012, integration: "bamboo",   fmt: (v) => Math.round(v).toLocaleString() },
          { key: "fund-gbpusd", label: "GBP / USD",           base: 1.2712,         amplitude: 0.0011, integration: "fx",       fmt: (v) => v.toFixed(4) },
        ]}
        note="Live readings across the fund, moving around the reported figures below. A lapsed credential keeps its reading moving and drops the badge to SIMULATED rather than blanking the tile."
      />

      {/* ── Risks and opportunities, side by side ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ ...labelStyle(C.red), marginBottom: 7 }}>Risk alerts ({risks.length})</div>
          {risks.length ? risks.map((i) => <InsightCard key={i.id} insight={i} />)
            : <div style={{ color: C.txt3, fontSize: S.small, padding: 12 }}>No risk alerts for this selection.</div>}
        </div>
        <div>
          <div style={{ ...labelStyle(C.green), marginBottom: 7 }}>Opportunity alerts ({opportunities.length})</div>
          {opportunities.length ? opportunities.map((i) => <InsightCard key={i.id} insight={i} />)
            : <div style={{ color: C.txt3, fontSize: S.small, padding: 12 }}>No opportunity alerts for this selection.</div>}
        </div>
      </div>

      {/* ── The full portfolio ── */}
      <Panel title="Portfolio" sub="Revenue · EBITDA · Cash · People · Sales"
             right={<span style={{ color: C.txt3, fontSize: S.micro }}>
               Status pips read left to right; hover for the figure behind each
             </span>}
             pad={0}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: S.small, minWidth: 800 }}>
            <thead>
              <tr>
                {["Company", "Fund", "Geography", "Status", "Health", "Revenue vs plan", "MoM", "Runway", "Cash"].map((h) => (
                  <th key={h} style={{ ...labelStyle(), textAlign: "left", padding: "8px 11px",
                                       borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} onClick={() => { setSelected(c.id); onOpenCompany?.(c.id); }}
                    style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer",
                             background: selected === c.id ? C.surfaceUp : "transparent" }}>
                  <td style={{ padding: "8px 11px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <Mark name={c.name} tone={RAG[c.rag]} />
                      <span>
                        <span style={{ color: C.txt1 }}>{c.name}</span>
                        <span style={{ color: C.txt3, display: "block", fontSize: S.micro }}>
                          {c.sector} · {c.stage} · reports {c.currency}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td style={{ padding: "8px 11px", color: C.txt2 }}>{FUNDS.find((x) => x.id === c.fund)?.name}</td>
                  <td style={{ padding: "8px 11px", color: C.txt2 }}>{c.geo}</td>
                  <td style={{ padding: "8px 11px", whiteSpace: "nowrap" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Dot status={c.rag} />
                      <span style={{ color: RAG[c.rag] }}>{c.rag.charAt(0) + c.rag.slice(1).toLowerCase()}</span>
                    </span>
                    <div style={{ marginTop: 4, display: "flex", gap: 3 }}>
                      {statusPips(c).map((p) => (
                        <span key={p.label} title={p.title} aria-label={`${p.label}: ${p.title}`}
                              style={{ width: 7, height: 7, borderRadius: 2, background: p.tone, display: "inline-block" }} />
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: "8px 11px", color: C.txt1, fontVariantNumeric: "tabular-nums" }}>{c.score}</td>
                  <td style={{ padding: "8px 11px", fontVariantNumeric: "tabular-nums",
                               color: c.rvb >= 100 ? C.green : c.rvb >= 95 ? C.gold : C.red }}>{c.rvb}%</td>
                  <td style={{ padding: "8px 11px", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums",
                               color: c.revenueMoM >= 0 ? C.green : C.red }}>
                    {c.revenueMoM >= 0 ? "▲" : "▼"} {Math.abs(c.revenueMoM).toFixed(1)}%
                  </td>
                  <td style={{ padding: "8px 11px", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums",
                               color: c.runway < 6 ? C.red : c.runway < 12 ? C.gold : C.txt2 }}>
                    {c.runway < 60 ? `${c.runway}mo` : "cash gen"}
                  </td>
                  <td style={{ padding: "8px 11px", color: C.txt2, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                    {money(c.fin.cash.balance)}
                    {c.currency !== REPORTING && (
                      <div style={{ color: C.txt3, fontSize: S.micro }}>{fmtMoney(c.cashK, c.currency, { k: true })} native</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <ProvenanceBar items={[
        `${roll.count} companies from the registry`,
        `${health.rows.length} source systems`,
        `${alerts.length} threshold breaches open`,
        `Reported in ${REPORTING}${fx.isLive ? " at live rates" : " at pinned rates"}`,
      ]} />
    </Page>
  );
}

/** Status pips for the five dimensions the specification lists. */
function statusPips(c) {
  const g = (ok, warn) => (ok ? C.green : warn ? C.gold : C.red);
  return [
    { label: "Revenue", tone: g(c.rvb >= 100, c.rvb >= 95), title: `Revenue ${c.rvb}% of plan` },
    { label: "EBITDA", tone: g(c.ebitdaPct > 0, c.ebitdaPct > -10), title: `EBITDA margin ${c.ebitdaPct}%` },
    { label: "Cash", tone: g(c.runway >= 12, c.runway >= 6), title: `Runway ${c.runway} months` },
    { label: "People", tone: g(c.attrition < 12, c.attrition < 18), title: `Attrition ${c.attrition}% · headcount ${c.headcount} vs plan ${c.planHeadcount}` },
    { label: "Sales", tone: g(c.coverage >= 3, c.coverage >= 2), title: `Pipeline coverage ${c.coverage}x · win rate ${c.winRate}%` },
  ];
}

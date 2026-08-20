// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Scenario 1 screen: revenue miss before the board pack
//  ----------------------------------------------------------------------------
//  Stage 3 of the demo specification: company drill-down, pipeline trends,
//  forecast miss, driver bridge, recommended actions and report.
//
//  The bridge is the load-bearing element. Plan, less each driver, arrives at
//  the forecast — and because the forecast is defined that way rather than
//  modelled separately, the bars cannot fail to add up to the gap. The running
//  total is drawn so a viewer can check it rather than take it on trust.
// ════════════════════════════════════════════════════════════════════════════

import { C } from "../lib/theme.js";
import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ReferenceLine } from "recharts";
import { buildRevenueMiss } from "../lib/scenarioRevenueMiss.js";
import { buildExceptionReport } from "../lib/reports.js";
import { fmtMoney } from "../lib/fx.js";
import InsightCard from "../components/InsightCard.jsx";
import ReportPanel from "../components/ReportPanel.jsx";

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
  txt1: C.txt1,
  txt2: C.txt2,
  txt3: C.txt3
};

function Panel({ title, sub, right, children }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
                    padding: "10px 14px", borderBottom: `1px solid ${T.border}`, flexWrap: "wrap" }}>
        <div>
          <div style={{ color: T.txt1, fontSize: 12, fontWeight: 600 }}>{title}</div>
          {sub && <div style={{ color: T.txt3, fontSize: 9, marginTop: 2 }}>{sub}</div>}
        </div>
        {right}
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

/** Waterfall: plan on the left, each driver taking a bite, forecast on the right. */
function DriverBridge({ plan, gap, bridge, ccy }) {
  const money = (v) => fmtMoney(v, ccy, { k: true });
  const max = plan;
  let running = plan;
  const steps = [
    { label: "Plan", value: plan, kind: "total", from: 0, to: plan },
    ...bridge.map((b) => {
      const to = running;
      running -= b.value;
      return { label: b.driver, value: b.value, kind: "neg", from: running, to, workings: b.workings };
    }),
    { label: "Forecast", value: plan - gap, kind: "total", from: 0, to: plan - gap },
  ];

  return (
    <div>
      {steps.map((s, i) => {
        const left = (s.from / max) * 100;
        const width = Math.max(((s.to - s.from) / max) * 100, 0.4);
        const tone = s.kind === "total" ? (i === 0 ? T.blue : T.amber) : T.red;
        return (
          <div key={s.label} style={{ marginBottom: 9 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 3, flexWrap: "wrap" }}>
              <span style={{ color: s.kind === "total" ? T.txt1 : T.txt2, fontSize: 11,
                             fontWeight: s.kind === "total" ? 600 : 400 }}>{s.label}</span>
              <span style={{ color: tone, fontSize: 11, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {s.kind === "neg" ? "−" : ""}{money(s.value)}
              </span>
            </div>
            <div style={{ position: "relative", height: 16, background: T.bg, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ position: "absolute", left: `${left}%`, width: `${width}%`, top: 0, bottom: 0,
                            background: tone, opacity: s.kind === "total" ? 0.85 : 0.7 }} />
            </div>
            {s.workings && <div style={{ color: T.txt3, fontSize: 8.5, marginTop: 3 }}>{s.workings}</div>}
          </div>
        );
      })}
      <div style={{ marginTop: 10, paddingTop: 9, borderTop: `1px solid ${T.accent}`,
                    display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span style={{ color: T.txt2, fontSize: 10 }}>Plan less the four drivers</span>
        <span style={{ color: T.txt1, fontSize: 10, fontWeight: 600 }}>
          {money(plan)} − {money(gap)} = {money(plan - gap)}
        </span>
      </div>
    </div>
  );
}

export default function ScenarioRevenueMiss() {
  const s = useMemo(() => buildRevenueMiss(), []);
  const [tab, setTab] = useState("evidence");
  const ccy = s.currency;
  const money = (v) => fmtMoney(v, ccy, { k: true });
  const report = useMemo(() => buildExceptionReport(s), [s]);
  const [showReport, setShowReport] = useState(false);

  const trend = s.fin.sales.history.map((m, i) => ({
    month: m.month.slice(2),
    coverage: m.pipelineCoverage,
    winRate: m.winRatePct,
    revenue: s.insight.drillDown.series[i]?.actual,
    plan: s.insight.drillDown.series[i]?.budget,
  }));

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "18px 22px", background: T.bg }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div>
          <h1 style={{ color: T.txt1, fontSize: 20, fontWeight: 700, margin: 0 }}>{s.company.name}</h1>
          <div style={{ color: T.txt3, fontSize: 10, marginTop: 3 }}>
            {s.company.sectorLong} · {s.company.geo} · reports {ccy} · as of {s.fin.asOf}
          </div>
        </div>
        <button onClick={() => setShowReport(true)}
                style={{ padding: "7px 14px", background: T.blue, border: "none", borderRadius: 6,
                         color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
          Generate exception report
        </button>
      </div>

      {/* Headline numbers */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {[
          { l: "QUARTER TO DATE", v: money(s.currentQuarter.revenue), s: `plan ${money(s.currentQuarter.plan)} · ${s.currentQuarter.variancePct.toFixed(1)}%`, t: T.txt1 },
          { l: "NEXT QUARTER PLAN", v: money(s.forecast.planRevenue), s: "board-approved", t: T.txt1 },
          { l: "FORECAST", v: money(s.forecast.forecastRevenue), s: "plan less drivers", t: T.amber },
          { l: "GAP", v: money(s.forecast.forecastGap), s: `${((s.forecast.forecastGap / s.forecast.planRevenue) * 100).toFixed(1)}% of plan`, t: T.red },
        ].map((x) => (
          <div key={x.l} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "11px 13px", flex: 1, minWidth: 150 }}>
            <div style={{ color: T.txt3, fontSize: 9, letterSpacing: 0.5, marginBottom: 5 }}>{x.l}</div>
            <div style={{ color: x.t, fontSize: 20, fontWeight: 700, fontFamily: "Georgia,serif", lineHeight: 1 }}>{x.v}</div>
            <div style={{ color: T.txt3, fontSize: 9, marginTop: 4 }}>{x.s}</div>
          </div>
        ))}
      </div>

      <InsightCard insight={s.insight} defaultOpen={false} />

      <Panel title="Driver bridge"
             sub="The forecast is plan less the sum of these drivers, so the bars cannot fail to add up">
        <DriverBridge plan={s.forecast.planRevenue} gap={s.forecast.forecastGap} bridge={s.bridge} ccy={ccy} />
      </Panel>

      <Panel title="Forward indicators"
             sub={`Pipeline coverage and win rate over ${trend.length} months · ${s.fin.sales.source.label}`}>
        <div style={{ height: 190 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={T.accent} strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="month" stroke={T.txt3} tick={{ fontSize: 9 }} />
              <YAxis stroke={T.txt3} tick={{ fontSize: 9 }} />
              <Tooltip contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11 }} />
              <ReferenceLine y={3} stroke={T.txt3} strokeDasharray="3 3" label={{ value: "3x coverage", fill: T.txt3, fontSize: 8, position: "insideTopRight" }} />
              <Line type="monotone" dataKey="coverage" name="Pipeline coverage (x)" stroke={T.amber} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="winRate" name="Win rate (%)" stroke={T.blue} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Open pipeline" sub={`${s.deals.length} opportunities · ${money(s.forecast.openPipelineAcv)} ACV · coverage ${s.forecast.coverage}x against a ${money(s.forecast.bookingsQuota)} quota`}
             right={<div style={{ display: "flex", gap: 5 }}>
               {["evidence", "slipped"].map((t) => (
                 <button key={t} onClick={() => setTab(t)}
                         style={{ padding: "4px 9px", background: tab === t ? T.blue : "transparent",
                                  border: `1px solid ${tab === t ? T.blue : T.border}`, borderRadius: 4,
                                  color: tab === t ? "#fff" : T.txt3, fontSize: 9, cursor: "pointer" }}>
                   {t === "evidence" ? "Open deals" : "Re-dated"}
                 </button>))}
             </div>}>
        <div style={{ overflowX: "auto" }}>
          {tab === "evidence" ? (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 520 }}>
              <thead><tr style={{ color: T.txt3, fontSize: 9, textAlign: "left" }}>
                {["Account", "Stage", "Probability", "ACV", "In-quarter revenue"].map((h) =>
                  <th key={h} style={{ padding: "6px 10px", fontWeight: 400, borderBottom: `1px solid ${T.border}` }}>{h}</th>)}
              </tr></thead>
              <tbody>{s.deals.map((d) => (
                <tr key={d.account} style={{ borderBottom: `1px solid ${T.accent}` }}>
                  <td style={{ padding: "7px 10px", color: T.txt1 }}>{d.account}</td>
                  <td style={{ padding: "7px 10px", color: T.txt2 }}>{d.stage}</td>
                  <td style={{ padding: "7px 10px", color: T.txt2 }}>{d.probability}%</td>
                  <td style={{ padding: "7px 10px", color: T.txt2 }}>{money(d.acv)}</td>
                  <td style={{ padding: "7px 10px", color: T.txt2 }}>{money(d.quarterRevenue)}</td>
                </tr>))}
              </tbody>
            </table>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 520 }}>
              <thead><tr style={{ color: T.txt3, fontSize: 9, textAlign: "left" }}>
                {["Account", "Opportunity", "ACV", "Was due", "Now due"].map((h) =>
                  <th key={h} style={{ padding: "6px 10px", fontWeight: 400, borderBottom: `1px solid ${T.border}` }}>{h}</th>)}
              </tr></thead>
              <tbody>{s.insight.evidence.find((e) => e.detail?.deals)?.detail.deals.map((d) => (
                <tr key={d.account} style={{ borderBottom: `1px solid ${T.accent}` }}>
                  <td style={{ padding: "7px 10px", color: T.txt1 }}>{d.account}</td>
                  <td style={{ padding: "7px 10px", color: T.txt2 }}>{d.detail}</td>
                  <td style={{ padding: "7px 10px", color: T.red }}>{money(d.acv)}</td>
                  <td style={{ padding: "7px 10px", color: T.txt3 }}>{d.wasDue}</td>
                  <td style={{ padding: "7px 10px", color: T.amber }}>{d.nowDue}</td>
                </tr>))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>
      {showReport && <ReportPanel report={report} onClose={() => setShowReport(false)}/>}
    </div>
  );
}

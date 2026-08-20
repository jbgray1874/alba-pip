// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Scenario 3 screen: margin deterioration behind revenue growth
//  ----------------------------------------------------------------------------
//  ForgeTech reads green on every headline. The screen has to make the case
//  against its own summary, which means leading with the comparison that does
//  the work: what the margin loss is worth against what the revenue beat is
//  worth. Everything below that exists to let a sceptical CFO take it apart.
// ════════════════════════════════════════════════════════════════════════════

import { C, F, S, label as labelStyle, metric as metricStyle } from "../lib/theme.js";
import { Page, PageHeader, Chip, Button, MetricRow, Panel, TwoColumn, ProvenanceBar } from "../components/Shell.jsx";
import { useMemo, useState } from "react";
import { buildMargin, LINES, PARAMS } from "../lib/scenarioMargin.js";
import { fmtMoney } from "../lib/fx.js";
import { buildMarginReport } from "../lib/reports.js";
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
  purple: C.purple,
  txt1: C.txt1,
  txt2: C.txt2,
  txt3: C.txt3
};

export default function ScenarioMargin() {
  const s = useMemo(() => buildMargin(), []);
  const ccy = s.currency;
  const money = (v) => fmtMoney(v, ccy, { k: true });
  const report = useMemo(() => buildMarginReport(s), [s]);
  const [showReport, setShowReport] = useState(false);
  const [open, setOpen] = useState(s.bridge[0].driver);

  const selected = s.bridge.find((b) => b.driver === open);
  const worst = Math.max(...s.bridge.map((b) => Math.abs(b.value)));
  const history = s.fin.history.ebitda;
  const gmMin = Math.min(...history.map((h) => h.grossMarginPct));
  const gmMax = Math.max(...history.map((h) => h.grossMarginPct));

  return (
    <Page>
      <PageHeader
        crumbs={["Intelligence", s.company.name, "Margin Erosion"]}
        title="Margin Erosion"
        chips={<>
          <Chip tone="green">Reads green</Chip>
          <Chip tone="red">{Math.abs(s.marginMove)} points lost</Chip>
        </>}
        purpose={`${s.company.name} beats its revenue plan, scores ${s.company.score} and shows ${s.company.rag} on every headline — and has lost ${Math.abs(s.marginMove)} points of gross margin doing it`}
        meta={`${s.company.sectorLong} · ${s.company.geo} · reports ${ccy} · as of ${s.fin.asOf} · Xero`}
        actions={<Button variant="primary" onClick={() => setShowReport(true)}>Generate margin review</Button>}
      />

      <MetricRow items={[
        { label: "Health score", value: s.company.score, tone: C.green, sub: `${s.company.rag} on the standard scoring` },
        { label: "Revenue vs plan", value: `${s.varPct >= 0 ? "+" : ""}${s.varPct.toFixed(1)}%`, tone: C.green,
          sub: `${money(s.revenue)} of ${money(s.fin.revenue.budget)}` },
        { label: "EBITDA margin", value: `${s.fin.ebitda.pct}%`, tone: C.green, sub: money(s.fin.ebitda.value) },
        { label: "Gross margin", value: `${s.marginNow}%`, tone: C.red, sub: `from ${s.marginThen}% — ${s.marginMove} points` },
      ]} />

      {/* ── The comparison that makes the case ── */}
      <Panel title="What the company is praised for, against what it is losing"
             tone={`${C.red}44`}>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <div style={{ ...labelStyle(), marginBottom: 6 }}>Revenue outperformance, annualised</div>
            <div style={metricStyle(C.green, S.metricSm)}>{money(s.revenueOutperformance)}</div>
          </div>
          <div style={{ color: C.txt3, fontSize: 15, paddingBottom: 5 }}>vs</div>
          <div>
            <div style={{ ...labelStyle(), marginBottom: 6 }}>Gross profit lost to margin, annualised</div>
            <div style={metricStyle(C.red, S.metricSm)}>{money(s.annualGrossProfitLost)}</div>
          </div>
          <div style={{ color: C.txt2, fontSize: S.body, lineHeight: 1.65, flex: 1, minWidth: 240 }}>
            The margin loss is {(s.annualGrossProfitLost / s.revenueOutperformance).toFixed(1)}× the revenue beat.
            Neither the health score, the RAG status, nor the EBITDA margin shows it.
          </div>
        </div>
      </Panel>

      <InsightCard insight={s.insight} />

      <TwoColumn ratio="1fr 1fr" left={<>

        {/* ── The bridge ── */}
        <Panel title={`Where the ${Math.abs(s.marginMove)} points went`}
               sub="Four drivers that sum to the observed movement exactly — select one for its workings">
          {s.bridge.map((b) => (
            <div key={b.driver} onClick={() => setOpen(b.driver)}
                 style={{ padding: "8px 9px", marginBottom: 5, borderRadius: 5, cursor: "pointer",
                          background: open === b.driver ? T.accent : "transparent",
                          border: `1px solid ${open === b.driver ? C.goldLine : C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                <span style={{ color: T.txt1, fontSize: 11 }}>
                  {b.driver}
                  {b.residual && <span style={{ color: T.txt3, fontSize: 9, marginLeft: 6 }}>residual</span>}
                </span>
                <span style={{ color: b.value < 0 ? T.red : T.green, fontSize: 11, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                  {b.value > 0 ? "+" : ""}{b.value} pts
                </span>
              </div>
              <div style={{ height: 5, background: T.bg, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${(Math.abs(b.value) / worst) * 100}%`, height: "100%",
                              background: b.residual ? T.txt3 : b.value < 0 ? T.red : T.green, opacity: 0.75 }} />
              </div>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 9, marginTop: 4,
                        borderTop: `1px solid ${T.border}` }}>
            <span style={{ color: T.txt2, fontSize: 11, fontWeight: 600 }}>Total</span>
            <span style={{ color: T.red, fontSize: 11, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {s.marginMove} pts · {s.marginThen}% → {s.marginNow}%
            </span>
          </div>
          {selected && (
            <div style={{ marginTop: 11, padding: "9px 11px", background: T.bg, borderRadius: 5,
                          border: `1px solid ${T.accent}` }}>
              <div style={{ color: T.txt3, fontSize: 9, marginBottom: 4 }}>WORKINGS · {String(selected.source?.label ?? selected.source)}</div>
              <div style={{ color: T.txt2, fontSize: 10.5, lineHeight: 1.6 }}>{selected.workings}</div>
              {selected.residual && (
                <div style={{ color: T.amber, fontSize: 9.5, marginTop: 7, lineHeight: 1.55 }}>
                  This line is what remains once the other three are accounted for — {Math.round((Math.abs(selected.value) / Math.abs(s.marginMove)) * 100)}%
                  of the movement. It is shown rather than distributed across the others, because the ledger does not
                  separate freight, scrap and absorption. That is a data gap, not a finding.
                </div>
              )}
            </div>
          )}
        </Panel>

      </>} right={<>
        {/* ── Mix ── */}
        <Panel title="Product mix" sub="Revenue has grown into the lowest-margin line it sells">
          {s.lines.map((l) => (
            <div key={l.key} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                <span style={{ color: T.txt1, fontSize: 11 }}>{l.label}</span>
                <span style={{ color: T.txt2, fontSize: 10.5, fontVariantNumeric: "tabular-nums" }}>
                  {l.marginPct}% margin
                </span>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                <div style={{ flex: 1, height: 14, background: T.bg, borderRadius: 3, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${l.shareThen * 100}%`,
                                background: T.txt3, opacity: 0.35 }} />
                  <div style={{ position: "absolute", left: 0, top: 3, bottom: 3, width: `${l.shareNow * 100}%`,
                                background: l.shareMove > 0 && l.marginPct < 40 ? T.red : l.shareMove < 0 ? T.amber : T.green,
                                opacity: 0.85, borderRadius: 2 }} />
                </div>
                <span style={{ color: l.shareMove > 0 ? (l.marginPct < 40 ? T.red : T.green) : T.amber,
                               fontSize: 10, fontWeight: 600, width: 42, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {l.shareMove > 0 ? "+" : ""}{l.shareMove}pts
                </span>
              </div>
              <div style={{ color: T.txt3, fontSize: 8.5 }}>
                {(l.shareThen * 100).toFixed(0)}% → {(l.shareNow * 100).toFixed(0)}% of revenue ·
                {" "}{money(l.revenueNow)} a month · contributes {l.contribution > 0 ? "+" : ""}{l.contribution} points to margin
              </div>
            </div>
          ))}
          <div style={{ color: T.txt3, fontSize: 9, marginTop: 4, lineHeight: 1.6 }}>
            The pale bar is the share {history.length} months ago; the solid bar is now. Contract manufacturing carries
            {" "}{LINES[2].marginPct}% against {LINES[0].marginPct}% on precision work, and it is the line that has grown.
          </div>
        </Panel>
      </>} />

      {/* ── Eighteen months of margin ── */}
      <Panel title="Gross margin, month by month"
             sub={`${history.length} months from the ledger — the fall is steady rather than a single event`}>
        <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 92 }}>
          {history.map((h) => {
            const pct = gmMax === gmMin ? 1 : (h.grossMarginPct - gmMin + 1) / (gmMax - gmMin + 1);
            return (
              <div key={h.month} title={`${h.month} · gross margin ${h.grossMarginPct}% · EBITDA ${h.marginPct}%`}
                   style={{ flex: 1, height: `${Math.max(6, pct * 100)}%`, borderRadius: "2px 2px 0 0",
                            background: h.grossMarginPct >= s.marginThen - 2 ? T.green
                                       : h.grossMarginPct >= s.marginThen - 5 ? T.amber : T.red,
                            opacity: 0.8 }} />
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", color: T.txt3, fontSize: 9, marginTop: 6 }}>
          <span>{history[0].month} · {s.marginThen}%</span>
          <span>Input costs +{PARAMS.inputCostInflationPct}% · discounting {PARAMS.discountingPriorPct}% → {PARAMS.discountingPct}%</span>
          <span>{history[history.length - 1].month} · {s.marginNow}%</span>
        </div>
      </Panel>
      <ProvenanceBar items={[
        "Calculation: four drivers summing to the observed movement",
        `Evidence: ${s.insight.evidence.length} metrics`,
        `${history.length} months of ledger`,
        "The residual is shown, not distributed",
      ]} />

      {showReport && <ReportPanel report={report} onClose={() => setShowReport(false)}/>}
    </Page>
  );
}

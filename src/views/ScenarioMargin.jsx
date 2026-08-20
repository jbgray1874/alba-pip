// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Scenario 3 screen: margin deterioration behind revenue growth
//  ----------------------------------------------------------------------------
//  ForgeTech reads green on every headline. The screen has to make the case
//  against its own summary, which means leading with the comparison that does
//  the work: what the margin loss is worth against what the revenue beat is
//  worth. Everything below that exists to let a sceptical CFO take it apart.
// ════════════════════════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import { buildMargin, LINES, PARAMS } from "../lib/scenarioMargin.js";
import { fmtMoney } from "../lib/fx.js";
import InsightCard from "../components/InsightCard.jsx";

const T = {
  bg: "#020817", card: "#0f1525", border: "#1e2740", accent: "#172035",
  txt1: "#e8edf8", txt2: "#7a90b8", txt3: "#3d5070",
  blue: "#3d8bff", green: "#00c97a", amber: "#f5a524", red: "#ff3d5a", purple: "#9b6dff",
};

function Panel({ title, sub, children }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 12 }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ color: T.txt1, fontSize: 12, fontWeight: 600 }}>{title}</div>
        {sub && <div style={{ color: T.txt3, fontSize: 9, marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

export default function ScenarioMargin() {
  const s = useMemo(() => buildMargin(), []);
  const ccy = s.currency;
  const money = (v) => fmtMoney(v, ccy, { k: true });
  const [open, setOpen] = useState(s.bridge[0].driver);

  const selected = s.bridge.find((b) => b.driver === open);
  const worst = Math.max(...s.bridge.map((b) => Math.abs(b.value)));
  const history = s.fin.history.ebitda;
  const gmMin = Math.min(...history.map((h) => h.grossMarginPct));
  const gmMax = Math.max(...history.map((h) => h.grossMarginPct));

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "18px 22px", background: T.bg }}>
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ color: T.txt1, fontSize: 20, fontWeight: 700, margin: 0 }}>{s.company.name}</h1>
        <div style={{ color: T.txt3, fontSize: 10, marginTop: 3 }}>
          {s.company.sectorLong} · {s.company.geo} · reports {ccy} · as of {s.fin.asOf}
        </div>
      </div>

      {/* ── The company as every other screen shows it, then the one that doesn't ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {[
          { l: "HEALTH SCORE", v: `${s.company.score}`, s: s.company.rag, t: T.green },
          { l: "REVENUE VS PLAN", v: `${s.varPct >= 0 ? "+" : ""}${s.varPct.toFixed(1)}%`, s: `${money(s.revenue)} of ${money(s.fin.revenue.budget)}`, t: T.green },
          { l: "EBITDA MARGIN", v: `${s.fin.ebitda.pct}%`, s: money(s.fin.ebitda.value), t: T.green },
          { l: "GROSS MARGIN", v: `${s.marginNow}%`, s: `from ${s.marginThen}% — ${s.marginMove} points`, t: T.red },
        ].map((x) => (
          <div key={x.l} style={{ background: T.card, border: `1px solid ${x.t === T.red ? `${T.red}44` : T.border}`,
                                  borderRadius: 8, padding: "11px 13px", flex: 1, minWidth: 150 }}>
            <div style={{ color: T.txt3, fontSize: 9, letterSpacing: 0.5, marginBottom: 5 }}>{x.l}</div>
            <div style={{ color: x.t, fontSize: 20, fontWeight: 700, fontFamily: "Georgia,serif", lineHeight: 1 }}>{x.v}</div>
            <div style={{ color: T.txt3, fontSize: 9, marginTop: 4 }}>{x.s}</div>
          </div>
        ))}
      </div>

      {/* ── The comparison that makes the case ── */}
      <div style={{ background: `${T.red}0d`, border: `1px solid ${T.red}33`, borderRadius: 8,
                    padding: "13px 16px", marginBottom: 12 }}>
        <div style={{ color: T.red, fontSize: 9, letterSpacing: "0.12em", marginBottom: 7 }}>
          WHAT THE COMPANY IS PRAISED FOR, AGAINST WHAT IT IS LOSING
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <div style={{ color: T.txt3, fontSize: 9 }}>REVENUE OUTPERFORMANCE, ANNUALISED</div>
            <div style={{ color: T.green, fontSize: 22, fontWeight: 700, fontFamily: "Georgia,serif" }}>
              {money(s.revenueOutperformance)}
            </div>
          </div>
          <div style={{ color: T.txt3, fontSize: 16, paddingBottom: 6 }}>vs</div>
          <div>
            <div style={{ color: T.txt3, fontSize: 9 }}>GROSS PROFIT LOST TO MARGIN, ANNUALISED</div>
            <div style={{ color: T.red, fontSize: 22, fontWeight: 700, fontFamily: "Georgia,serif" }}>
              {money(s.annualGrossProfitLost)}
            </div>
          </div>
          <div style={{ color: T.txt2, fontSize: 11, lineHeight: 1.6, flex: 1, minWidth: 240 }}>
            The margin loss is {(s.annualGrossProfitLost / s.revenueOutperformance).toFixed(1)}× the revenue beat.
            Neither the health score, the RAG status, nor the EBITDA margin shows it.
          </div>
        </div>
      </div>

      <InsightCard insight={s.insight} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))", gap: 12 }}>

        {/* ── The bridge ── */}
        <Panel title={`Where the ${Math.abs(s.marginMove)} points went`}
               sub="Four drivers that sum to the observed movement exactly — select one for its workings">
          {s.bridge.map((b) => (
            <div key={b.driver} onClick={() => setOpen(b.driver)}
                 style={{ padding: "8px 9px", marginBottom: 5, borderRadius: 5, cursor: "pointer",
                          background: open === b.driver ? T.accent : "transparent",
                          border: `1px solid ${open === b.driver ? T.blue : T.accent}` }}>
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
      </div>

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
    </div>
  );
}

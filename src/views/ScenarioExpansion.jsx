// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Scenario 4 screen: sales acceleration and expansion opportunity
//  ----------------------------------------------------------------------------
//  Stage 4 of the demo specification: opportunity radar, customer expansion
//  list, value estimate, recommended campaign and report.
//
//  The specification's acceptance criterion here is narrow and specific — "the
//  opportunity score explains why each target account was selected". So the
//  score is never shown as a bare number. Selecting an account opens the six
//  factors, the points each contributed, and the basis it scored on.
// ════════════════════════════════════════════════════════════════════════════

import { C } from "../lib/theme.js";
import { useMemo, useState } from "react";
import { buildExpansion, PRODUCTS, WEIGHTS, PRIOR_WINS, PARAMS } from "../lib/scenarioExpansion.js";
import { buildGrowthBrief } from "../lib/reports.js";
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
  purple: C.purple,
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

export default function ScenarioExpansion() {
  const s = useMemo(() => buildExpansion(), []);
  const ccy = s.currency;
  const money = (v) => fmtMoney(v, ccy, { k: true });
  const [openAccount, setOpenAccount] = useState(s.qualified[0]?.account ?? null);
  const report = useMemo(() => buildGrowthBrief(s), [s]);
  const [showReport, setShowReport] = useState(false);
  const t = s.totals;

  const selected = s.qualified.find((c) => c.account === openAccount);
  const maxValue = Math.max(...s.qualified.map((c) => c.expectedValue));

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
                style={{ padding: "7px 14px", background: T.green, border: "none", borderRadius: 6,
                         color: "#04140d", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
          Generate growth brief
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {[
          { l: "QUALIFIED ACCOUNTS", v: String(s.qualified.length), s: `of ${s.customers.length} customers`, t: T.txt1 },
          { l: "EXPECTED ARR", v: money(t.expected), s: `${money(t.low)} – ${money(t.high)}`, t: T.green },
          { l: "GROSS BEFORE CONVERSION", v: money(t.gross), s: `${Math.round(PARAMS.attachRate * 100)}% attach rate`, t: T.txt1 },
          { l: "CURRENT PENETRATION", v: `${(t.penetration * 100).toFixed(0)}%`, s: `own the ${PRODUCTS.B}`, t: T.amber },
        ].map((x) => (
          <div key={x.l} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "11px 13px", flex: 1, minWidth: 150 }}>
            <div style={{ color: T.txt3, fontSize: 9, letterSpacing: 0.5, marginBottom: 5 }}>{x.l}</div>
            <div style={{ color: x.t, fontSize: 20, fontWeight: 700, fontFamily: "Georgia,serif", lineHeight: 1 }}>{x.v}</div>
            <div style={{ color: T.txt3, fontSize: 9, marginTop: 4 }}>{x.s}</div>
          </div>
        ))}
      </div>

      <InsightCard insight={s.insight} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))", gap: 12 }}>

        {/* ── Opportunity radar: accounts ranked by expected value ── */}
        <Panel title="Opportunity radar" sub="Qualified accounts ranked by expected value — select one to see why">
          {s.qualified.map((c) => (
            <div key={c.account} onClick={() => setOpenAccount(c.account)}
                 style={{ padding: "7px 9px", marginBottom: 4, borderRadius: 5, cursor: "pointer",
                          background: openAccount === c.account ? T.accent : "transparent",
                          border: `1px solid ${openAccount === c.account ? T.blue : T.accent}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                <span style={{ color: T.txt1, fontSize: 11 }}>{c.account}</span>
                <span style={{ color: T.green, fontSize: 11, fontWeight: 600 }}>{money(c.expectedValue)}</span>
              </div>
              <div style={{ height: 5, background: T.bg, borderRadius: 2, overflow: "hidden", marginBottom: 3 }}>
                <div style={{ width: `${(c.expectedValue / maxValue) * 100}%`, height: "100%", background: T.green, opacity: 0.75 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: T.txt3, fontSize: 8.5 }}>
                <span>{c.segment} · score {c.score} · {Math.round(c.conversionProbability * 100)}% convert</span>
                <span>renews {c.renewalDate}</span>
              </div>
            </div>
          ))}
        </Panel>

        {/* ── Why this account: the score, taken apart ── */}
        <Panel title={selected ? `Why ${selected.account}?` : "Why this account?"}
               sub={selected ? `Score ${selected.score} of 100 · ${Math.round(selected.conversionProbability * 100)}% conversion · expected ${money(selected.expectedValue)}` : null}>
          {selected ? (
            <>
              {selected.breakdown.map((f) => (
                <div key={f.factor} style={{ marginBottom: 9 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
                    <span style={{ color: T.txt2, fontSize: 10.5 }}>{f.factor}</span>
                    <span style={{ color: T.txt1, fontSize: 10.5, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                      {f.points} <span style={{ color: T.txt3, fontWeight: 400 }}>of {f.of}</span>
                    </span>
                  </div>
                  <div style={{ height: 6, background: T.bg, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${(f.points / f.of) * 100}%`, height: "100%",
                                  background: f.points / f.of > 0.66 ? T.green : f.points / f.of > 0.33 ? T.amber : T.red, opacity: 0.8 }} />
                  </div>
                  <div style={{ color: T.txt3, fontSize: 8.5, marginTop: 3 }}>{f.basis}</div>
                </div>
              ))}
              <div style={{ marginTop: 10, paddingTop: 9, borderTop: `1px solid ${T.accent}` }}>
                <div style={{ color: T.txt3, fontSize: 9, marginBottom: 4 }}>CURRENT PRODUCTS</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {Object.values(PRODUCTS).map((p) => {
                    const owns = selected.products.includes(p);
                    return (
                      <span key={p} style={{ fontSize: 9, padding: "3px 8px", borderRadius: 3,
                                             border: `1px solid ${owns ? T.green : T.border}`,
                                             color: owns ? T.green : T.txt3,
                                             background: owns ? `${T.green}12` : "transparent" }}>
                        {owns ? "✓ " : "— "}{p}
                      </span>
                    );
                  })}
                </div>
              </div>
            </>
          ) : <div style={{ color: T.txt3, fontSize: 11 }}>Select an account.</div>}
        </Panel>
      </div>

      <Panel title="Comparison set"
             sub={`The ${PRIOR_WINS.length} accounts that previously adopted the ${PRODUCTS.B} — the profile every customer is scored against`}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 480 }}>
            <thead><tr style={{ color: T.txt3, fontSize: 9, textAlign: "left" }}>
              {["Account", "Usage trend at purchase", "ARR at purchase", "Tenure"].map((h) =>
                <th key={h} style={{ padding: "6px 10px", fontWeight: 400, borderBottom: `1px solid ${T.border}` }}>{h}</th>)}
            </tr></thead>
            <tbody>{PRIOR_WINS.map((w) => (
              <tr key={w.account} style={{ borderBottom: `1px solid ${T.accent}` }}>
                <td style={{ padding: "7px 10px", color: T.txt1 }}>{w.account}</td>
                <td style={{ padding: "7px 10px", color: T.green }}>+{Math.round(w.usageTrend * 100)}%</td>
                <td style={{ padding: "7px 10px", color: T.txt2 }}>{money(w.arrAtPurchase)}</td>
                <td style={{ padding: "7px 10px", color: T.txt2 }}>{w.tenure} months</td>
              </tr>))}
            </tbody>
          </table>
        </div>
        <div style={{ color: T.txt3, fontSize: 9, marginTop: 9 }}>
          Scoring weights — {Object.entries(WEIGHTS).map(([k, v]) => `${k} ${v}`).join(" · ")}. Qualifying score {PARAMS.qualifyingScore}.
        </div>
      </Panel>
      {showReport && <ReportPanel report={report} onClose={() => setShowReport(false)}/>}
    </div>
  );
}

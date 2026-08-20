// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Screen 3: Customer Expansion  (INTELLIGENCE)
//  ----------------------------------------------------------------------------
//  The Opportunity Radar ranks one opportunity per company across the fund.
//  This is the drill-down inside one of them: which of this company's own
//  accounts to approach, in what order, and why.
//
//  The specification's acceptance criterion here is narrow and specific — "the
//  opportunity score explains why each target account was selected". So the
//  score is never shown as a bare number. Selecting an account opens the six
//  factors, the observed value each read, and the points it contributed, and
//  the weights are printed at the foot of the screen rather than held back.
// ════════════════════════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import { C, F, S, label as labelStyle, metric as metricStyle } from "../lib/theme.js";
import { Page, PageHeader, Chip, Button, MetricRow, Panel, TwoColumn, ProvenanceBar } from "../components/Shell.jsx";
import { buildExpansion, PRODUCTS, WEIGHTS, PRIOR_WINS, PARAMS } from "../lib/scenarioExpansion.js";
import { buildGrowthBrief } from "../lib/reports.js";
import { fmtMoney } from "../lib/fx.js";
import ReportPanel from "../components/ReportPanel.jsx";

const RENEWAL_WINDOW_DAYS = 120;

/**
 * The 90-day usage trend, drawn as a shape.
 *
 * The model holds one number per account. A trend is a rate, so the linear
 * reading of it is the line drawn here — this adds no information the number
 * does not already carry, it just makes a column of them comparable at a
 * glance, which a column of percentages is not.
 */
function TrendSpark({ trend, w = 54, h = 18 }) {
  const n = 7;
  const pts = Array.from({ length: n }, (_, i) => {
    const v = 1 + trend * (i / (n - 1));
    return v;
  });
  const min = Math.min(...pts, 1), max = Math.max(...pts, 1), range = max - min || 1;
  const line = pts.map((v, i) => `${(i / (n - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(" ");
  const colour = trend >= 0 ? C.green : C.red;
  return (
    <svg width={w} height={h} style={{ display: "block", flexShrink: 0 }} aria-label={`Usage trend ${(trend * 100).toFixed(0)}%`}>
      <polyline points={line} fill="none" stroke={colour} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={w} cy={h - ((pts[n - 1] - min) / range) * (h - 4) - 2} r="1.8" fill={colour} />
    </svg>
  );
}

function healthTone(health) {
  return health >= 0.8 ? "green" : health >= 0.6 ? "gold" : "red";
}

function healthWord(health) {
  return health >= 0.8 ? "Healthy" : health >= 0.6 ? "Watch" : "At risk";
}

/** A numbered gold circle — the priority marker down the left of the table. */
function Rank({ n }) {
  return (
    <span style={{
      width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
      border: `1px solid ${C.goldLine}`, background: C.goldSoft, color: C.gold,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: S.micro, fontWeight: 700, fontVariantNumeric: "tabular-nums",
    }}>{n}</span>
  );
}

export default function ScenarioExpansion() {
  const s = useMemo(() => buildExpansion(), []);
  const ccy = s.currency;
  const money = (v) => fmtMoney(v, ccy, { k: true });
  const [openAccount, setOpenAccount] = useState(s.qualified[0]?.account ?? null);
  const report = useMemo(() => buildGrowthBrief(s), [s]);
  const [showReport, setShowReport] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const t = s.totals;

  const selected = s.qualified.find((c) => c.account === openAccount);
  const avgScore = s.qualified.length
    ? s.qualified.reduce((a, c) => a + c.score, 0) / s.qualified.length : 0;
  const renewingSoon = s.qualified.filter((c) => c.renewalInDays <= RENEWAL_WINDOW_DAYS);

  return (
    <Page>
      <PageHeader
        crumbs={["Intelligence", "Opportunity Radar", s.company.name]}
        title="Customer Expansion"
        chips={<Chip tone="green">Qualified</Chip>}
        purpose={`${s.company.name} · ${s.company.sectorLong} · ${money(t.low)}–${money(t.high)} of additional ARR across ${s.qualified.length} accounts`}
        meta={`${s.company.geo} · reports ${ccy} · as of ${s.fin.asOf} · HubSpot + Product analytics + Stripe`}
        actions={<>
          <Button variant="primary" onClick={() => setShowReport(true)}>Generate growth brief</Button>
          <Button variant="outline" onClick={() => setShowModel((v) => !v)}>
            {showModel ? "Hide scoring model" : "View scoring model"}
          </Button>
        </>}
      />

      <MetricRow items={[
        { label: "Eligible accounts", value: s.qualified.length, tone: C.txt1,
          sub: `of ${s.customers.length} customers · qualifying score ${PARAMS.qualifyingScore}` },
        { label: "Estimated upside", value: money(t.expected), tone: C.green,
          sub: `${money(t.low)} – ${money(t.high)} at ±${Math.round(PARAMS.sensitivity * 100)}%` },
        { label: "Avg opportunity score", value: avgScore.toFixed(1), tone: C.txt1,
          sub: `Gross before conversion ${money(t.gross)}` },
        { label: `Renewal within ${RENEWAL_WINDOW_DAYS} days`, value: renewingSoon.length, tone: C.gold,
          sub: `${money(renewingSoon.reduce((a, c) => a + c.expectedValue, 0))} of the upside` },
      ]} />

      <TwoColumn
        left={
          <Panel title="Prioritised accounts"
                 sub="Ranked on expected value — select a row to see the score taken apart"
                 right={<span style={{ color: C.txt3, fontSize: S.micro }}>
                   Current penetration {(t.penetration * 100).toFixed(0)}% own the {PRODUCTS.B}
                 </span>}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: S.small, minWidth: 620 }}>
                <thead><tr>
                  {["#", "Account", "Usage trend", "Products", "Renewal", "Health", "Score", "Est. ARR"].map((h) => (
                    <th key={h} style={{ ...labelStyle(), textAlign: "left", padding: "6px 9px",
                                         borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{s.qualified.map((c, i) => {
                  const on = openAccount === c.account;
                  return (
                    <tr key={c.account} onClick={() => setOpenAccount(c.account)}
                        style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer",
                                 background: on ? C.surfaceUp : "transparent" }}>
                      <td style={{ padding: "8px 9px" }}><Rank n={i + 1} /></td>
                      <td style={{ padding: "8px 9px", color: C.txt1, minWidth: 150 }}>
                        {c.account}
                        <span style={{ color: C.txt3, display: "block", fontSize: S.micro }}>{c.segment}</span>
                      </td>
                      <td style={{ padding: "8px 9px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                          <TrendSpark trend={c.usageTrend} />
                          <span style={{ color: c.usageTrend >= 0 ? C.green : C.red, fontVariantNumeric: "tabular-nums" }}>
                            {c.usageTrend >= 0 ? "+" : ""}{(c.usageTrend * 100).toFixed(0)}%
                          </span>
                        </span>
                      </td>
                      <td style={{ padding: "8px 9px", color: C.txt2, whiteSpace: "nowrap" }}>
                        {c.products.length} of {Object.keys(PRODUCTS).length}
                      </td>
                      <td style={{ padding: "8px 9px", color: c.renewalInDays <= RENEWAL_WINDOW_DAYS ? C.gold : C.txt2,
                                   whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                        {c.renewalDate}
                        <span style={{ color: C.txt3, display: "block", fontSize: S.micro }}>{c.renewalInDays} days</span>
                      </td>
                      <td style={{ padding: "8px 9px" }}><Chip tone={healthTone(c.health)}>{healthWord(c.health)}</Chip></td>
                      <td style={{ padding: "8px 9px", color: C.txt1, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{c.score}</td>
                      <td style={{ padding: "8px 9px", color: C.green, fontWeight: 600, whiteSpace: "nowrap",
                                   fontVariantNumeric: "tabular-nums" }}>{money(c.expectedValue)}</td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          </Panel>
        }
        right={
          <Panel title="Selected account"
                 sub={selected ? `${Math.round(selected.conversionProbability * 100)}% conversion on the scoring model` : null}>
            {selected ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                              gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: C.txt1, fontSize: S.h2, fontWeight: 600 }}>{selected.account}</div>
                    <div style={{ color: C.txt3, fontSize: S.micro, marginTop: 3 }}>
                      {selected.segment} · {selected.tenure} months tenure · {money(selected.arr)} ARR today
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={metricStyle(C.green, S.metricSm)}>{money(selected.expectedValue)}</div>
                    <div style={{ marginTop: 5 }}><Chip tone="gold">{selected.score} / 100</Chip></div>
                  </div>
                </div>

                <div style={{ ...labelStyle(C.txt2), marginBottom: 8 }}>Why this account</div>
                {selected.breakdown.map((f) => (
                  <div key={f.factor} style={{ display: "flex", justifyContent: "space-between", gap: 10,
                                               alignItems: "baseline", padding: "7px 0",
                                               borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ color: C.txt2, fontSize: S.small, flexShrink: 0, minWidth: 96 }}>{f.factor}</span>
                    <span style={{ color: C.txt3, fontSize: S.micro, flex: 1, lineHeight: 1.45 }}>{f.basis}</span>
                    <span style={{ color: C.green, fontSize: S.small, fontWeight: 600, whiteSpace: "nowrap",
                                   fontVariantNumeric: "tabular-nums" }}>
                      +{f.points} pts
                      <span style={{ color: C.txt3, fontWeight: 400 }}> of {f.of}</span>
                    </span>
                  </div>
                ))}

                <div style={{ ...labelStyle(C.txt2), marginTop: 14, marginBottom: 6 }}>Current products</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {Object.values(PRODUCTS).map((p) => {
                    const owns = selected.products.includes(p);
                    return (
                      <span key={p} style={{ fontSize: S.micro, padding: "3px 8px", borderRadius: 3,
                                             border: `1px solid ${owns ? C.green : C.border}`,
                                             color: owns ? C.green : C.txt3,
                                             background: owns ? C.greenSoft : "transparent" }}>
                        {owns ? "✓ " : "— "}{p}
                      </span>
                    );
                  })}
                </div>

                <div style={{ ...labelStyle(C.txt2), marginTop: 14, marginBottom: 6 }}>Comparable pattern</div>
                <div style={{ color: C.txt2, fontSize: S.small, lineHeight: 1.6 }}>
                  The {PRIOR_WINS.length} accounts that already adopted the {PRODUCTS.B} were averaging{" "}
                  {(PRIOR_WINS.reduce((a, w) => a + w.usageTrend, 0) / PRIOR_WINS.length * 100).toFixed(0)}% usage growth at
                  the point of purchase. {selected.account} is at {(selected.usageTrend * 100).toFixed(0)}%, on{" "}
                  {money(selected.arr)} of ARR against a prior-win average of{" "}
                  {money(PRIOR_WINS.reduce((a, w) => a + w.arrAtPurchase, 0) / PRIOR_WINS.length)}.
                </div>

                <div style={{ display: "flex", gap: 7, marginTop: 14, flexWrap: "wrap" }}>
                  <Button variant="primary" onClick={() => setShowReport(true)}>Add to campaign</Button>
                  <Button variant="outline" onClick={() => setShowModel(true)}>View scoring</Button>
                </div>
              </>
            ) : <div style={{ color: C.txt3, fontSize: S.small }}>Select an account.</div>}
          </Panel>
        }
      />

      {showModel && (
        <Panel title="Scoring model"
               sub={`Six weighted factors, scored against the ${PRIOR_WINS.length} accounts that previously adopted the ${PRODUCTS.B}`}>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 12 }}>
            {Object.entries(WEIGHTS).map(([k, v]) => (
              <span key={k} style={{ padding: "4px 9px", borderRadius: 4, border: `1px solid ${C.border}`,
                                     background: C.bgDeep, color: C.txt2, fontSize: S.micro }}>
                {k.replace(/([A-Z])/g, " $1").replace(/^./, (m) => m.toUpperCase())}
                <span style={{ color: C.gold, fontWeight: 700, marginLeft: 6, fontVariantNumeric: "tabular-nums" }}>{v}</span>
              </span>
            ))}
            <span style={{ padding: "4px 9px", borderRadius: 4, border: `1px solid ${C.goldLine}`,
                           background: C.goldSoft, color: C.gold, fontSize: S.micro, fontWeight: 700 }}>
              Qualifying score {PARAMS.qualifyingScore}
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: S.small, minWidth: 480 }}>
              <thead><tr>
                {["Comparison account", "Usage trend at purchase", "ARR at purchase", "Tenure"].map((h) => (
                  <th key={h} style={{ ...labelStyle(), textAlign: "left", padding: "6px 10px",
                                       borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{PRIOR_WINS.map((w) => (
                <tr key={w.account} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "7px 10px", color: C.txt1 }}>{w.account}</td>
                  <td style={{ padding: "7px 10px", color: C.green, fontVariantNumeric: "tabular-nums" }}>
                    +{Math.round(w.usageTrend * 100)}%
                  </td>
                  <td style={{ padding: "7px 10px", color: C.txt2, fontVariantNumeric: "tabular-nums" }}>{money(w.arrAtPurchase)}</td>
                  <td style={{ padding: "7px 10px", color: C.txt2, fontVariantNumeric: "tabular-nums" }}>{w.tenure} months</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Panel>
      )}

      <ProvenanceBar items={[
        "Opportunity scores use transparent rules",
        `Scored against ${PRIOR_WINS.length} prior adoptions`,
        `${s.customers.length} accounts assessed, ${s.qualified.length} qualified`,
        `Attach rate ${Math.round(PARAMS.attachRate * 100)}% · conversion from the score, not assumed`,
      ]} />

      {showReport && <ReportPanel report={report} onClose={() => setShowReport(false)} />}
    </Page>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Screen 2: Opportunity Radar  (INTELLIGENCE)
//  ----------------------------------------------------------------------------
//  The portfolio-wide value-creation view. ScenarioExpansion scores accounts
//  inside one company; this ranks one opportunity per company across all nine,
//  so the partner's question — where is the next pound of value in this fund —
//  is answered on one screen rather than in nine board packs.
//
//  Every figure comes from src/lib/opportunityRadar.js. Nothing on this screen
//  is typed, including the confidence percentages: those are counted from how
//  many independent indicators agree, and the indicator list sits beside the
//  headline so a sceptic can check the count rather than take it.
// ════════════════════════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { C, F, S, label as labelStyle, metric as metricStyle } from "../lib/theme.js";
import {
  Page, PageHeader, MetricRow, Panel, TwoColumn, ProvenanceBar, Button, Chip, Dot,
} from "../components/Shell.jsx";
import {
  buildOpportunityRadar, scoringRules, qualificationFloors, PARAMS,
} from "../lib/opportunityRadar.js";
import { fmtMoney } from "../lib/fx.js";

// ── Chart parts ─────────────────────────────────────────────────────────────

/**
 * One bubble, with its label already positioned by the model.
 *
 * Radius carries value, colour carries rank — gold for the leader, green for
 * everything else — and the label is drawn here rather than by a LabelList so
 * the company and the amount can take different colours on two lines.
 */
function Bubble(props) {
  const { cx, cy, payload, selectedId, onSelect } = props;
  if (!payload || !Number.isFinite(cx) || !Number.isFinite(cy)) return null;

  const colour = payload.leader ? C.gold : C.green;
  const chosen = payload.companyId === selectedId;
  const { anchor, dx, dy, lineHeight } = payload.label;

  return (
    <g onClick={() => onSelect && onSelect(payload.companyId)} style={{ cursor: "pointer" }}>
      {chosen && (
        <circle cx={cx} cy={cy} r={payload.radius + 4} fill="none"
                stroke={colour} strokeOpacity={0.45} strokeWidth={1} strokeDasharray="2 3" />
      )}
      <circle cx={cx} cy={cy} r={payload.radius} fill={colour} fillOpacity={chosen ? 0.34 : 0.18}
              stroke={colour} strokeWidth={1.3} />
      <circle cx={cx} cy={cy} r={1.8} fill={colour} />
      <text x={cx + dx} y={cy + dy} textAnchor={anchor} fill={chosen ? C.txt1 : C.txt2}
            fontFamily={F.sans} fontSize={9.5} fontWeight={500}>{payload.company}</text>
      <text x={cx + dx} y={cy + dy + lineHeight} textAnchor={anchor} fill={colour}
            fontFamily={F.sans} fontSize={9} fontWeight={500}>{payload.valueLabel}</text>
    </g>
  );
}

function LegendKey({ colour, children }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: C.txt3, fontSize: S.micro,
                   letterSpacing: "0.08em", textTransform: "uppercase" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: `${colour}33`,
                     border: `1px solid ${colour}`, display: "inline-block" }} />
      {children}
    </span>
  );
}

// ── Small repeating rows ────────────────────────────────────────────────────

function KeyValue({ label, value, tone }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline",
                  padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
      <span style={{ color: C.txt2, fontSize: S.small }}>{label}</span>
      <span style={{ color: tone ?? C.txt1, fontSize: S.small, fontWeight: 500, textAlign: "right",
                     fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

function ConfidenceBar({ confidence }) {
  const floor = PARAMS.confidenceFloor;
  const filled = Math.max(0, Math.min(1, (confidence - floor) / (100 - floor)));
  const tone = confidence >= PARAMS.highConfidence ? C.green
    : confidence >= PARAMS.mediumConfidence ? C.gold : C.txt3;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
      <div style={{ width: 54, height: 4, borderRadius: 2, background: C.bgDeep, overflow: "hidden" }}>
        <div style={{ width: `${filled * 100}%`, height: "100%", background: tone }} />
      </div>
      <span style={{ color: tone, fontSize: S.small, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
        {confidence}%
      </span>
    </div>
  );
}

const TH = { padding: "6px 10px", fontWeight: 500, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" };
const TD = { padding: "9px 10px", borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" };

// ── The screen ──────────────────────────────────────────────────────────────

export default function OpportunityRadar() {
  const s = useMemo(() => buildOpportunityRadar(), []);
  const rules = useMemo(() => scoringRules(), []);
  const floors = useMemo(() => qualificationFloors(), []);

  const [selectedId, setSelectedId] = useState(s.leader ? s.leader.companyId : null);
  const [showRules, setShowRules] = useState(false);
  const [showWorkings, setShowWorkings] = useState(false);

  const money = (v) => fmtMoney(v, s.currency, { k: true });
  const t = s.totals;
  const selected = s.opportunities.find((o) => o.companyId === selectedId) ?? s.leader;

  if (!selected) {
    return (
      <Page>
        <PageHeader
          crumbs={["Intelligence", "Opportunity Radar"]}
          title="Opportunity Radar"
          purpose="No portfolio company currently carries a qualifying value-creation signal."
        />
      </Page>
    );
  }

  const selectedTone = selected.leader ? C.gold : C.green;

  return (
    <Page>
      <PageHeader
        crumbs={["Intelligence", "Opportunity Radar"]}
        title="Opportunity Radar"
        chips={[
          <Chip key="high" tone="green">{t.highConfidenceCount} high confidence</Chip>,
          <Chip key="levers" tone="gold">{t.typesInPlay} of {t.typesAssessed} levers in play</Chip>,
        ]}
        purpose={
          `One value-creation opportunity per company, ranked across the ${t.companiesAssessed} portfolio ` +
          `companies on confidence-weighted value. Confidence is counted from how many independent indicators ` +
          `agree, never chosen.`
        }
        meta={`Ledger as of ${s.asOf} · ${s.connected} · restated into ${s.currency}`}
        actions={
          <>
            <Button onClick={() => setShowRules((v) => !v)}>
              {showRules ? "Hide scoring rules" : "Scoring rules"}
            </Button>
            <Button variant="secondary" onClick={() => setShowWorkings((v) => !v)}>
              {showWorkings ? "Hide workings" : "Value workings"}
            </Button>
          </>
        }
      />

      <MetricRow items={[
        { label: "Qualified upside", value: t.qualifiedUpsideLabel, tone: C.green,
          sub: `${t.lowLabel} to ${t.highLabel} at ±${Math.round(PARAMS.sensitivity * 100)}% sensitivity` },
        { label: "High-confidence opportunities", value: `${t.highConfidenceCount}`,
          sub: `of ${t.companiesWithSignals} · scored ${PARAMS.highConfidence}% or above` },
        { label: "Companies with signals", value: `${t.companiesWithSignals}`,
          sub: `of ${t.companiesAssessed} assessed · ${t.excludedCount} excluded` },
        { label: "Median confidence", value: `${t.medianConfidence}%`,
          sub: `counted from indicator agreement, floor ${PARAMS.confidenceFloor}%` },
      ]} />

      {showRules && (
        <Panel title="Scoring rules"
               sub="Four levers, each with a gate it has to pass and arithmetic that can be read aloud">
          {rules.map((r) => (
            <div key={r.type.id} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 5 }}>
                <Chip tone="gold">{r.type.chip}</Chip>
                <span style={{ color: C.txt1, fontSize: S.body }}>{r.type.label}</span>
                <span style={{ color: C.txt3, fontSize: S.small }}>{r.type.question}</span>
              </div>
              <div style={{ color: C.txt2, fontSize: S.small, marginBottom: 3 }}>
                <span style={{ color: C.txt3 }}>Gate — </span>{r.gate}
              </div>
              <div style={{ color: C.txt2, fontSize: S.small, marginBottom: 3, fontFamily: F.mono }}>
                {r.formula}
              </div>
              <div style={{ color: C.txt3, fontSize: S.small, lineHeight: 1.6 }}>{r.note}</div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 12 }}>
            {floors.map((f) => (
              <div key={f.label} style={{ flex: 1, minWidth: 200 }}>
                <div style={labelStyle()}>{f.label}</div>
                <div style={{ color: C.txt1, fontSize: S.body, margin: "4px 0 3px" }}>{f.value}</div>
                <div style={{ color: C.txt3, fontSize: S.small, lineHeight: 1.6 }}>{f.note}</div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <TwoColumn
        left={
          <Panel
            title="Value-creation map"
            sub={`Estimated annual value against counted confidence · bubble area is value · select a bubble to open it`}
            right={
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <LegendKey colour={C.gold}>Leader</LegendKey>
                <LegendKey colour={C.green}>Qualified</LegendKey>
              </div>
            }
          >
            <div style={{ height: 360 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 14, right: 96, bottom: 30, left: 4 }}>
                  <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
                  <XAxis
                    type="number" dataKey="x" name="Confidence"
                    domain={s.axes.confidence} ticks={s.axes.confidenceTicks}
                    tick={{ fill: C.txt3, fontSize: 9 }}
                    axisLine={{ stroke: C.border }} tickLine={{ stroke: C.border }}
                    tickFormatter={(v) => `${v}%`}
                    label={{ value: "CONFIDENCE", position: "insideBottom", offset: -18,
                             fill: C.txt3, fontSize: 9, letterSpacing: 1.2 }}
                  />
                  <YAxis
                    type="number" dataKey="y" name="Estimated value" scale="log"
                    domain={s.axes.value} ticks={s.axes.valueTicks} width={64}
                    tick={{ fill: C.txt3, fontSize: 9 }}
                    axisLine={{ stroke: C.border }} tickLine={{ stroke: C.border }}
                    tickFormatter={(v) => money(v)}
                    label={{ value: "ESTIMATED VALUE", angle: -90, position: "insideLeft", offset: 6,
                             fill: C.txt3, fontSize: 9, letterSpacing: 1.2 }}
                  />
                  <Scatter
                    data={s.scatter}
                    isAnimationActive={false}
                    shape={<Bubble selectedId={selected.companyId} onSelect={setSelectedId} />}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div style={{ color: C.txt3, fontSize: S.small, marginTop: 8, lineHeight: 1.6 }}>
              The value axis is logarithmic: the leader is worth more than the other six together, and a linear
              axis would put the rest on the floor. Confidence starts at {PARAMS.confidenceFloor}% because that is
              the score an opportunity carries when none of its indicators agree.
            </div>
          </Panel>
        }
        right={
          <>
            <Panel
              title={selected.leader ? "Top opportunity" : "Selected opportunity"}
              sub={`Rank ${selected.rank} of ${t.companiesWithSignals} · ${selected.sectorLong} · ${selected.geo}`}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 10 }}>
                <span style={{ color: C.txt1, fontSize: 15, fontWeight: 500 }}>{selected.company}</span>
                <Chip tone={selected.leader ? "gold" : "green"}>{selected.type.chip}</Chip>
              </div>

              <div style={metricStyle(C.green, S.metricSm)}>
                {money(selected.low)} – {money(selected.high)}
              </div>
              <div style={{ color: C.green, fontSize: S.small, marginTop: 6 }}>
                {selected.confidence}% confidence · {selected.agreeing} of {selected.indicatorCount} indicators agree
              </div>
              <div style={{ color: C.txt3, fontSize: S.small, marginTop: 3 }}>
                {selected.band.label} confidence — {selected.band.note}
              </div>

              <p style={{ color: C.txt2, fontSize: S.body, lineHeight: 1.65, margin: "12px 0 12px" }}>
                {selected.summary}
              </p>

              <div style={{ borderTop: `1px solid ${C.border}` }}>
                {selected.facts.map((f) => (
                  <KeyValue key={f.label} label={f.label} value={f.value} />
                ))}
              </div>

              <div style={{ display: "flex", gap: 7, marginTop: 13, flexWrap: "wrap" }}>
                <Button onClick={() => setShowWorkings((v) => !v)}>
                  {showWorkings ? "Hide opportunity" : "Open opportunity"}
                </Button>
                <Button variant="secondary" onClick={() => setShowRules((v) => !v)}>View scoring</Button>
              </div>

              {showWorkings && (
                <div style={{ marginTop: 13, paddingTop: 11, borderTop: `1px solid ${C.border}` }}>
                  <div style={{ ...labelStyle(), marginBottom: 7 }}>How the figure is built</div>
                  {selected.workings.map((w, i) => (
                    <div key={w.step} style={{ display: "flex", justifyContent: "space-between", gap: 12,
                                               padding: "5px 0", alignItems: "baseline" }}>
                      <span style={{ color: i === selected.workings.length - 1 ? C.txt1 : C.txt2, fontSize: S.small }}>
                        {w.step}
                      </span>
                      <span style={{ color: i === selected.workings.length - 1 ? C.green : C.txt1,
                                     fontSize: S.small, fontWeight: i === selected.workings.length - 1 ? 600 : 500,
                                     fontVariantNumeric: "tabular-nums" }}>{w.value}</span>
                    </div>
                  ))}
                  <div style={{ color: C.txt3, fontSize: S.small, marginTop: 8, lineHeight: 1.6 }}>
                    Basis — {selected.basis}. Range applies ±{Math.round(PARAMS.sensitivity * 100)}% to the
                    conversion assumption, the same sensitivity the expansion model uses.
                  </div>
                  {selected.alternatives.length > 0 && (
                    <div style={{ color: C.txt3, fontSize: S.small, marginTop: 8, lineHeight: 1.6 }}>
                      Also qualifying at {selected.company}:{" "}
                      {selected.alternatives.map((a) => `${a.type.label} ${a.valueLabel} at ${a.confidence}%`).join(" · ")}.
                      The lever shown is the one with the highest confidence-weighted value.
                    </div>
                  )}
                </div>
              )}
            </Panel>

            <Panel title="Indicator agreement"
                   sub={`${selected.agreeing} of ${selected.indicatorCount} independent readings support this opportunity`}>
              {selected.indicators.map((i) => (
                <div key={i.label} style={{ display: "flex", gap: 9, alignItems: "flex-start",
                                            padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ marginTop: 4 }}>
                    <Dot status={i.agrees ? "green" : "grey"} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: i.agrees ? C.txt1 : C.txt2, fontSize: S.small, fontWeight: 500 }}>
                      {i.label}
                    </div>
                    <div style={{ color: C.txt3, fontSize: S.small, marginTop: 2 }}>{i.observed}</div>
                  </div>
                  <span style={{ flexShrink: 0, color: C.txt3, fontSize: S.micro, letterSpacing: "0.08em",
                                 textTransform: "uppercase", border: `1px solid ${C.border}`,
                                 borderRadius: 3, padding: "2px 6px" }}>{i.source}</span>
                </div>
              ))}
              <div style={{ color: C.txt3, fontSize: S.small, marginTop: 10, lineHeight: 1.6 }}>
                Confidence is {PARAMS.confidenceFloor} plus {PARAMS.confidenceSpan} × the share of these readings
                that agree, plus up to {PARAMS.dataQualityBonus} for the freshness of this company's own feeds,
                which stands at {selected.freshness}%.
              </div>
            </Panel>
          </>
        }
      />

      <Panel title="Ranked opportunities"
             sub="Ordered on confidence-weighted value, so a large number nothing supports never outranks a smaller one the evidence agrees with">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: S.small, minWidth: 720 }}>
            <thead>
              <tr style={{ ...labelStyle(), textAlign: "left" }}>
                <th style={{ ...TH, ...labelStyle(), width: 34 }}>#</th>
                <th style={{ ...TH, ...labelStyle() }}>Company</th>
                <th style={{ ...TH, ...labelStyle() }}>Opportunity</th>
                <th style={{ ...TH, ...labelStyle(), textAlign: "right" }}>Estimated value</th>
                <th style={{ ...TH, ...labelStyle(), textAlign: "right" }}>Confidence</th>
                <th style={{ ...TH, ...labelStyle(), textAlign: "right" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {s.opportunities.map((o) => {
                const chosen = o.companyId === selected.companyId;
                const tone = o.leader ? C.gold : C.green;
                return (
                  <tr key={o.companyId} onClick={() => setSelectedId(o.companyId)}
                      style={{ cursor: "pointer", background: chosen ? C.surfaceUp : "transparent" }}>
                    <td style={{ ...TD }}>
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
                                     width: 18, height: 18, borderRadius: "50%",
                                     border: `1px solid ${o.leader ? C.goldLine : C.border}`,
                                     color: o.leader ? C.gold : C.txt3, fontSize: S.micro, fontWeight: 600 }}>
                        {o.rank}
                      </span>
                    </td>
                    <td style={{ ...TD }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
                                       width: 18, height: 18, borderRadius: 4, background: `${tone}1F`,
                                       color: tone, fontSize: S.micro, fontWeight: 700 }}>{o.initial}</span>
                        <span>
                          <span style={{ color: C.txt1, display: "block" }}>{o.company}</span>
                          <span style={{ color: C.txt3, fontSize: S.micro }}>{o.sector}</span>
                        </span>
                      </div>
                    </td>
                    <td style={{ ...TD, color: C.txt2 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <Chip tone={o.leader ? "gold" : "green"}>{o.type.chip}</Chip>
                        <span>{o.type.label}</span>
                      </div>
                    </td>
                    <td style={{ ...TD, textAlign: "right", color: C.green, fontWeight: 500,
                                 fontVariantNumeric: "tabular-nums" }}>
                      {o.valueLabel}
                      <div style={{ color: C.txt3, fontSize: S.micro, fontWeight: 400 }}>
                        {o.shareOfRevenuePct.toFixed(1)}% of revenue
                      </div>
                    </td>
                    <td style={{ ...TD }}>
                      <ConfidenceBar confidence={o.confidence} />
                      <div style={{ color: C.txt3, fontSize: S.micro, textAlign: "right", marginTop: 3 }}>
                        {o.agreeing} of {o.indicatorCount} agree
                      </div>
                    </td>
                    <td style={{ ...TD, textAlign: "right" }}>
                      <Chip tone={o.status.tone}>{o.status.label}</Chip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Assessed and excluded"
             sub={`${t.excludedCount} of ${t.companiesAssessed} companies carry no qualifying signal`}>
        {s.excluded.map((e) => (
          <div key={e.companyId} style={{ display: "flex", gap: 10, alignItems: "flex-start",
                                          padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ marginTop: 5 }}><Dot status={e.rag} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: C.txt1, fontSize: S.small, fontWeight: 500 }}>
                {e.company} <span style={{ color: C.txt3, fontWeight: 400 }}>· {e.sector}</span>
              </div>
              <div style={{ color: C.txt2, fontSize: S.small, marginTop: 2, lineHeight: 1.6 }}>{e.reason}</div>
            </div>
            <span style={{ flexShrink: 0, color: C.txt3, fontSize: S.micro, letterSpacing: "0.08em",
                           textTransform: "uppercase" }}>
              {e.candidates} candidate{e.candidates === 1 ? "" : "s"} assessed
            </span>
          </div>
        ))}
        <div style={{ color: C.txt3, fontSize: S.small, marginTop: 10, lineHeight: 1.6 }}>
          An excluded company is not a company with nothing happening. Each of these has arithmetic that would
          produce a number; what it does not have is agreement between the independent readings, so the number is
          named here rather than ranked above. A company inside {PARAMS.runwayBar} months of runway and behind
          plan is carrying a liquidity question, and answering that comes first.
        </div>
      </Panel>

      <ProvenanceBar items={s.provenance} />
    </Page>
  );
}

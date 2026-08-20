// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Screen 5: Revenue Risk Investigation  (INTELLIGENCE)
//  ----------------------------------------------------------------------------
//  The company is still reporting growth. Revenue is barely under plan and
//  nothing in the monthly pack asks for attention — and next quarter misses.
//  This screen has to make that case to somebody paid to disbelieve it, so it
//  is built as three arguments in order:
//
//    the bridge      — plan less four quantified drivers IS the forecast, so
//                      the waterfall cannot fail to add up to the gap
//    the evidence    — each driver traced to the system it was read from
//    the timeline    — when each indicator moved, and how far ahead of the
//                      board pack the alert landed
//
//  Nothing on the page is typed, including the confidence: it is counted from
//  how many independent indicators agree, and the count is on the screen.
// ════════════════════════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import { C, F, S, label as labelStyle, metric as metricStyle } from "../lib/theme.js";
import { Page, PageHeader, Chip, Button, MetricRow, Panel, TwoColumn, ProvenanceBar } from "../components/Shell.jsx";
import { buildRevenueMiss, PARAMS } from "../lib/scenarioRevenueMiss.js";
import { buildSignalDevelopment } from "../lib/signalDevelopment.js";
import { buildExceptionReport } from "../lib/reports.js";
import { fmtMoney } from "../lib/fx.js";
import SignalTimeline from "../components/SignalTimeline.jsx";
import ReportPanel from "../components/ReportPanel.jsx";
import InsightCard from "../components/InsightCard.jsx";

// ── The bridge ──────────────────────────────────────────────────────────────

const PLOT_H = 200;

/**
 * A waterfall: gold columns at both ends, red floating bars between, dashed
 * connectors joining the close of one column to the open of the next.
 *
 * The connector level is the *end* level of each step, which for a total is its
 * top and for a deduction is its bottom. Drawn rather than implied, because a
 * waterfall whose steps do not visibly join is a chart nobody checks.
 */
function RevenueBridge({ plan, gap, bridge, money }) {
  const forecast = plan - gap;
  let running = plan;

  const steps = [
    { label: "Plan", value: plan, kind: "total", from: 0, to: plan, end: plan },
    ...bridge.map((b) => {
      const to = running;
      running -= b.value;
      return { label: b.driver, value: b.value, kind: "neg", from: running, to, end: running, workings: b.workings };
    }),
    { label: "Forecast", value: forecast, kind: "total", from: 0, to: forecast, end: null },
  ];

  // Headroom for the value labels.
  //
  // At 1.02 the first two deduction bars top out at the plan level, so their
  // labels were drawn above the plot and clipped — the two largest drivers in
  // the bridge were the two you could not read. The scale now reserves enough
  // room above the tallest bar for a label and its gap.
  const LABEL_ROOM = 22;                                   // px above the tallest bar
  const max = plan / (1 - (LABEL_ROOM / PLOT_H));
  const pct = (v) => (v / max) * 100;

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: 520 }}>
        <div style={{ display: "flex", gap: 12, height: PLOT_H, alignItems: "stretch" }}>
          {steps.map((s, i) => {
            const tone = s.kind === "total" ? C.gold : C.red;
            return (
              <div key={s.label} style={{ position: "relative", flex: 1, minWidth: 0 }}>
                {/* the bar */}
                <div style={{
                  position: "absolute", left: 0, right: 0,
                  bottom: `${pct(s.from)}%`, height: `${Math.max(pct(s.to - s.from), 0.6)}%`,
                  background: s.kind === "total" ? `${tone}D9` : `${tone}B3`,
                  borderTop: `2px solid ${tone}`, borderRadius: "2px 2px 0 0",
                }} />
                {/* the value, above the bar — on its own ground so the dashed
                    connector cannot run through the digits */}
                <div style={{
                  position: "absolute", left: 0, right: 0, bottom: `calc(${pct(s.to)}% + 6px)`,
                  textAlign: "center", whiteSpace: "nowrap",
                }}>
                  <span style={{
                    background: C.surface, padding: "0 5px", color: tone,
                    fontSize: S.small, fontWeight: 600, fontVariantNumeric: "tabular-nums",
                  }}>
                    {s.kind === "neg" ? "−" : ""}{money(s.value)}
                  </span>
                </div>
                {/* the dashed connector into the next column */}
                {s.end !== null && i < steps.length - 1 && (
                  <div style={{
                    position: "absolute", left: "100%", width: 12, bottom: `${pct(s.end)}%`,
                    borderTop: `1px dashed ${C.borderLt}`,
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* categories beneath */}
        <div style={{ display: "flex", gap: 12, marginTop: 7, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
          {steps.map((s) => (
            <div key={s.label} style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
              <div style={{ color: s.kind === "total" ? C.txt1 : C.txt2, fontSize: S.micro,
                            fontWeight: s.kind === "total" ? 600 : 400, lineHeight: 1.4 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 10, paddingTop: 9, borderTop: `1px dashed ${C.borderLt}`,
                      display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <span style={{ color: C.txt3, fontSize: S.micro }}>
            Plan less the {bridge.length} drivers — the forecast is defined this way, so the bars cannot fail to add up
          </span>
          <span style={{ color: C.txt2, fontSize: S.micro, fontFamily: F.mono, fontVariantNumeric: "tabular-nums" }}>
            {money(plan)} − {money(gap)} = {money(forecast)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Root cause evidence ─────────────────────────────────────────────────────

/**
 * Which system each driver was read from, and which way the underlying metric
 * moved. Keyed on the driver text so a change in scenarioRevenueMiss.js that
 * this map has not caught falls back to the Alba calculation rather than
 * silently attributing the figure to the wrong system.
 */
const DRIVER_META = [
  { match: "conversion", glyph: "↓", tone: "red",   source: "HubSpot",
    detail: (s) => `Win rate ${PARAMS.winRateNow}% against a plan of ${PARAMS.winRatePlan}% across the open book` },
  { match: "later quarter", glyph: "→", tone: "amber", source: "HubSpot",
    detail: () => `${PARAMS.slippedDeals.map((d) => d.account).join(" and ")} re-dated out of the quarter` },
  { match: "churn", glyph: "↑", tone: "red",   source: "Stripe",
    detail: () => `Quarterly churn ${PARAMS.churnActualPct}% against a plan of ${PARAMS.churnPlanPct}%` },
  { match: "capacity", glyph: "−", tone: "amber", source: "BambooHR",
    detail: () => `${PARAMS.salesHires.plan - PARAMS.salesHires.inSeat} of ${PARAMS.salesHires.plan} quota-carrying roles not in seat` },
];

const TONE = { red: C.red, amber: C.amber, green: C.green, blue: C.blue };

function CauseRow({ driver, value, workings, money, share }) {
  const meta = DRIVER_META.find((m) => driver.toLowerCase().includes(m.match));
  const glyph = meta?.glyph ?? "·";
  const tone = TONE[meta?.tone] ?? C.txt2;
  const source = meta?.source ?? "Alba calculation";
  const detail = meta ? meta.detail() : workings;

  return (
    <div style={{ display: "flex", gap: 11, alignItems: "flex-start", padding: "11px 0",
                  borderBottom: `1px solid ${C.border}` }}>
      <span style={{
        width: 22, height: 22, borderRadius: "50%", flexShrink: 0, marginTop: 1,
        border: `1px solid ${tone}55`, background: `${tone}18`, color: tone,
        display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700,
      }}>{glyph}</span>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ color: C.txt1, fontSize: S.body, fontWeight: 500 }}>{driver}</div>
        <div style={{ color: C.txt2, fontSize: S.small, marginTop: 3, lineHeight: 1.5 }}>{detail}</div>
        <div style={{ color: C.txt3, fontSize: S.micro, marginTop: 4, lineHeight: 1.5 }}>{workings}</div>
      </div>

      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ color: C.red, fontSize: S.small, fontWeight: 600, fontVariantNumeric: "tabular-nums",
                      whiteSpace: "nowrap" }}>
          Impact −{money(value)}
        </div>
        <div style={{ color: C.txt3, fontSize: S.micro, marginTop: 2 }}>{share}% of the gap</div>
        <span style={{
          display: "inline-block", marginTop: 5, padding: "1px 7px", borderRadius: 3,
          border: `1px solid ${C.borderLt}`, color: C.txt3,
          fontSize: S.micro, fontWeight: 600, letterSpacing: "0.09em", textTransform: "uppercase",
        }}>{source}</span>
      </div>
    </div>
  );
}

// ── The screen ──────────────────────────────────────────────────────────────

export default function ScenarioRevenueMiss({ onOpenPlan }) {
  const s = useMemo(() => buildRevenueMiss(), []);
  const signal = useMemo(() => buildSignalDevelopment({ scenario: s }), [s]);
  const report = useMemo(() => buildExceptionReport(s), [s]);
  const [showReport, setShowReport] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const ccy = s.currency;
  const money = (v) => fmtMoney(v, ccy, { k: true });
  const gap = s.forecast.forecastGap;
  const conf = signal.confidence;

  return (
    <Page>
      <PageHeader
        crumbs={["Intelligence", s.company.name, "Revenue Risk Investigation"]}
        title="Revenue Risk Investigation"
        chips={<>
          <Chip tone="red">High priority</Chip>
          <Chip tone="gold">{conf.confidence}% confidence</Chip>
        </>}
        purpose={`Why next quarter misses plan by ${money(gap)} while the monthly pack still reads as growth`}
        meta={`${s.company.sectorLong} · ${s.company.geo} · reports ${ccy} · as of ${s.fin.asOf} · HubSpot + Stripe + BambooHR + Xero`}
        actions={<>
          <Button variant="primary" onClick={() => onOpenPlan && onOpenPlan()}>Create action plan</Button>
          <Button variant="outline" onClick={() => setShowRaw((v) => !v)}>
            {showRaw ? "Hide raw evidence" : "View raw evidence"}
          </Button>
        </>}
      />

      <MetricRow items={[
        { label: "Plan",             value: money(s.forecast.planRevenue), tone: C.txt1,
          sub: `Board-approved · ${((PARAMS.planStepUp - 1) * 100).toFixed(0)}% on the current quarter` },
        { label: "Current forecast", value: money(s.forecast.forecastRevenue), tone: C.gold,
          sub: `Plan less ${s.bridge.length} quantified drivers` },
        { label: "Forecast gap",     value: `−${money(gap)}`, tone: C.red,
          sub: `${((gap / s.forecast.planRevenue) * 100).toFixed(1)}% of plan` },
        { label: "Lead time",        value: `${signal.leadTimeWeeks} weeks`, tone: C.green,
          sub: `Ahead of the board review in week ${signal.boardWeek}` },
      ]} />

      <TwoColumn
        left={
          <Panel title="Revenue bridge"
                 sub={`${money(s.forecast.planRevenue)} plan, less each driver, arrives at the ${money(s.forecast.forecastRevenue)} forecast`}>
            <RevenueBridge plan={s.forecast.planRevenue} gap={gap} bridge={s.bridge} money={money} />
          </Panel>
        }
        right={
          <Panel title="Root cause evidence"
                 sub={`${s.bridge.length} drivers, each read from a source system`}
                 right={<span style={{ color: C.txt3, fontSize: S.micro }}>
                   {conf.agreeing} of {conf.indicatorCount} indicators agree
                 </span>}>
            {s.bridge.map((b) => (
              <CauseRow key={b.driver} driver={b.driver} value={b.value} workings={b.workings} money={money}
                        share={((b.value / gap) * 100).toFixed(0)} />
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, paddingTop: 11 }}>
              <span style={{ color: C.txt2, fontSize: S.small }}>Total forecast gap</span>
              <span style={{ color: C.red, fontSize: S.small, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                −{money(gap)}
              </span>
            </div>
            <div style={{ color: C.txt3, fontSize: S.micro, marginTop: 9, lineHeight: 1.6 }}>
              {conf.basis}
            </div>
          </Panel>
        }
      />

      <Panel title="Signal development"
             sub={`How the miss became visible, week by week, ahead of the board review`}
             right={<Chip tone="green">{signal.leadTimeWeeks} weeks early</Chip>}>
        <SignalTimeline
          weeks={signal.weeks}
          alertWeek={signal.alertWeek}
          leadTimeWeeks={signal.leadTimeWeeks}
          reconciliation={signal.reconciliation}
          money={money}
        />
      </Panel>

      {showRaw && (
        <Panel title="Raw evidence"
               sub="Every reading behind the investigation, with its source and refresh date">
          <InsightCard insight={s.insight} defaultOpen />
        </Panel>
      )}

      <ProvenanceBar items={[
        "Calculation: transparent driver bridge",
        `Evidence: ${s.insight.evidence.length} metrics`,
        `Sources: ${conf.sourceCount} systems`,
        "Human review: pending",
        <Button key="rep" variant="ghost" onClick={() => setShowReport(true)}>Generate exception report</Button>,
      ]} />

      {showReport && <ReportPanel report={report} onClose={() => setShowReport(false)} />}
    </Page>
  );
}

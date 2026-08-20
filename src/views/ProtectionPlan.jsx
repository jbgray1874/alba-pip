// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Screen 8: Revenue Protection Plan  (ACTIONS)
//  ----------------------------------------------------------------------------
//  Screen 5 decomposes the forecast gap. This one converts it into interventions
//  somebody owns, and states plainly how much of the gap they close and how much
//  is left over.
//
//  The recovery path is an identity, not three chosen numbers:
//
//      forecast risk − targeted recovery = residual gap
//
//  and the targeted recovery is the sum of the expected impacts in the table
//  above it. A plan whose arithmetic a CFO can take apart in ten seconds is the
//  only kind worth approving, so the operators are drawn on the page rather
//  than left for the reader to assume.
// ════════════════════════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import { C, S, label as labelStyle, metric as metricStyle } from "../lib/theme.js";
import { Page, PageHeader, Chip, Button, MetricRow, Panel, TwoColumn, ProvenanceBar } from "../components/Shell.jsx";
import { buildProtectionPlan, fmtDate, fmtDayMonth } from "../lib/protectionPlan.js";
import { useApproval } from "../lib/approval.js";
import { buildExceptionReport } from "../lib/reports.js";
import ReportPanel from "../components/ReportPanel.jsx";

const TONE = { gold: C.gold, green: C.green, blue: C.blue, purple: C.purple, red: C.red, txt1: C.txt1, muted: C.txt3 };

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

/** Initials in a ringed circle, with the name beside it. */
function Owner({ name, initials, tone = "gold", role }) {
  const colour = TONE[tone] ?? C.gold;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, minWidth: 0 }}>
      <span style={{
        width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
        border: `1px solid ${colour}55`, background: `${colour}18`, color: colour,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 8, fontWeight: 700,
      }}>{initials}</span>
      <span style={{ color: C.txt2, fontSize: S.small, whiteSpace: "nowrap" }}>
        {name}{role ? <span style={{ color: C.txt3 }}> · {role}</span> : null}
      </span>
    </span>
  );
}

const STATUS = {
  in_progress: { label: "In progress", tone: "gold" },
  not_started: { label: "Not started", tone: "muted" },
  scheduled:   { label: "Scheduled", tone: "green" },
  done:        { label: "Complete", tone: "green" },
};

function StatusChip({ status }) {
  const s = STATUS[status] ?? STATUS.not_started;
  const colour = TONE[s.tone] ?? C.txt3;
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 3, whiteSpace: "nowrap",
      border: `1px solid ${colour}55`, background: `${colour}18`, color: colour,
      fontSize: S.micro, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
    }}>{s.label}</span>
  );
}

/**
 * One term of the recovery equation.
 *
 * Drawn as a bordered box rather than a line of text because the reference
 * makes the arithmetic the object on the page — a reader should be able to
 * point at the term they disagree with.
 */
function Term({ item, money, wide }) {
  const colour = TONE[item.tone] ?? C.txt1;
  return (
    <div style={{
      background: C.bgDeep, border: `1px solid ${item.tone === "red" ? `${C.red}44` : C.border}`,
      borderRadius: 6, padding: "11px 13px", flex: wide ? 1.15 : 1, minWidth: 116,
    }}>
      <div style={{ ...labelStyle(), marginBottom: 7 }}>{item.label}</div>
      <div style={metricStyle(colour, 21)}>{money(item.value)}</div>
      {item.sub && <div style={{ color: C.txt3, fontSize: S.micro, marginTop: 5, lineHeight: 1.5 }}>{item.sub}</div>}
    </div>
  );
}

/** The small circular + = − between the terms. */
function Operator({ glyph }) {
  return (
    <span style={{
      width: 20, height: 20, borderRadius: "50%", flexShrink: 0, alignSelf: "center",
      border: `1px solid ${C.goldLine}`, background: C.goldSoft, color: C.gold,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: 11, fontWeight: 700,
    }}>{glyph}</span>
  );
}

export default function ProtectionPlan() {
  const s = useMemo(() => buildProtectionPlan(), []);
  const money = (v) => `${s.currency === "USD" ? "$" : s.currency === "GBP" ? "£" : `${s.currency} `}${Math.round(v).toLocaleString()}k`;
  const report = useMemo(() => buildExceptionReport(s.scenario), [s]);
  const [showReport, setShowReport] = useState(false);
  // APPROVE PLAN was a gold primary button with no onClick. See src/lib/approval.js.
  const approval = useApproval(`protection:${s.company.id}`);
  const t = s.totals;

  return (
    <Page>
      <PageHeader
        crumbs={["Portfolio", s.company.name, "Revenue Protection Plan"]}
        title="Revenue Protection Plan"
        chips={approval.approved
          ? <Chip tone="green">Approved · {approval.by.initials}</Chip>
          : <Chip tone="red">Action required</Chip>}
        purpose={`Convert the ${money(t.risk)} forecast risk into accountable interventions`}
        meta={approval.approved
          ? `Approved by ${approval.by.name}, ${approval.by.role}, on ${fmtDate(approval.on)} · ${s.sources.map((x) => x.label).join(" + ")}`
          : `Plan created by Alba · Awaiting investment-team approval · ${s.sources.map((x) => x.label).join(" + ")}`}
        actions={<>
          {approval.approved
            ? <Button variant="outline" onClick={approval.withdraw}>Withdraw approval</Button>
            : <Button variant="primary" onClick={approval.approve}>Approve plan</Button>}
          <Button variant="outline" onClick={() => setShowReport(true)}>Generate report</Button>
        </>}
      />

      <MetricRow items={[
        { label: "Forecast risk",   value: money(t.risk),     tone: C.red,   sub: `${(t.riskShareOfPlan * 100).toFixed(1)}% of the ${money(t.plan)} plan` },
        { label: "Recovery target", value: money(t.target),   tone: C.green, sub: `${(t.recoveredShare * 100).toFixed(0)}% of the risk, across ${s.recoveryRows.length} interventions` },
        { label: "Residual gap",    value: money(t.residual), tone: C.red,   sub: `${(t.residualShareOfPlan * 100).toFixed(1)}% of plan still short` },
        { label: "Next review",     value: fmtDayMonth(t.nextReviewDate), tone: C.txt1, sub: `${t.dueByNextReview} of ${s.actions.length} actions fall due by then` },
      ]} />

      {/* ── Recommended actions, full width ── */}
      <Panel title="Recommended actions"
             sub={`${s.recoveryRows.length} carry a money impact and ${s.controlRows.length} carry governance. Impacts sum to the recovery target.`}
             right={<span style={{ color: C.txt3, fontSize: S.micro }}>
               {t.reusedCount} carried through from the investigation
             </span>}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: S.small, minWidth: 760 }}>
            <thead><tr>
              {["Priority", "Action", "Owner", "Due", "Expected impact", "Status"].map((h) => (
                <th key={h} style={{ ...labelStyle(), textAlign: "left", padding: "6px 10px",
                                     borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{s.actions.map((a, i) => (
              <tr key={a.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: "9px 10px" }}><Rank n={i + 1} /></td>
                <td style={{ padding: "9px 10px", color: C.txt1, minWidth: 260 }}>
                  {a.action}
                  <div style={{ color: C.txt3, fontSize: S.micro, marginTop: 3, lineHeight: 1.5 }}>{a.rationale}</div>
                </td>
                <td style={{ padding: "9px 10px" }}>
                  <Owner name={a.owner.name} initials={a.owner.initials} tone={a.owner.tone} role={a.owner.role} />
                </td>
                <td style={{ padding: "9px 10px", color: C.txt2, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                  {fmtDayMonth(a.dueDate)}
                </td>
                <td style={{ padding: "9px 10px", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums",
                             color: a.kind === "recovery" ? C.green : C.txt3, fontWeight: a.kind === "recovery" ? 600 : 400 }}>
                  {a.kind === "recovery" ? money(a.impact) : "Governance"}
                </td>
                <td style={{ padding: "9px 10px" }}><StatusChip status={a.status} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div style={{ color: C.txt3, fontSize: S.micro, marginTop: 10, lineHeight: 1.6 }}>
          {s.advisory}
        </div>
      </Panel>

      <TwoColumn
        ratio="1.25fr 1fr"
        left={
          <Panel title="Recovery path"
                 sub="Forecast risk less targeted recovery is the residual gap — an identity, not three separate figures">
            <div style={{ display: "flex", gap: 9, alignItems: "stretch", flexWrap: "wrap" }}>
              {s.path.map((item, i) => (
                <span key={item.id} style={{ display: "contents" }}>
                  <Term item={item} money={money} wide={item.id === "current" || item.id === "revised"} />
                  {i < s.operators.length && <Operator glyph={s.operators[i]} />}
                </span>
              ))}
            </div>
            {/* The dashed bracket the reference draws beneath the equation. */}
            <div style={{ marginTop: 10, borderTop: `1px dashed ${C.borderLt}`, paddingTop: 8,
                          color: C.txt3, fontSize: S.micro, lineHeight: 1.6 }}>
              {money(t.currentForecast)} + {money(t.target)} = {money(t.revisedCase)}, against a plan of{" "}
              {money(t.plan)}. The plan is met when the residual reaches nil; on the current interventions it
              closes {(t.recoveredShare * 100).toFixed(0)}% of the gap.
            </div>
          </Panel>
        }
        right={
          <Panel title="Alba recommendation">
            <div style={{ color: C.txt2, fontSize: S.body, lineHeight: 1.7, marginBottom: 14 }}>
              {s.recommendation}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {s.accountability.map((row) => (
                <div key={row.label}>
                  <div style={{ ...labelStyle(), marginBottom: 5 }}>{row.label}</div>
                  <Owner name={row.name} initials={row.initials} tone={row.tone} />
                  {row.detail && (
                    <div style={{ color: C.txt3, fontSize: S.micro, marginTop: 4, marginLeft: 27, lineHeight: 1.5 }}>
                      {row.detail}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        }
      />

      <ProvenanceBar items={[
        `Based on ${s.evidenceCount} metrics`,
        `${s.sources.length} source systems`,
        "Impact estimates are transparent",
        `Board re-forecast ${fmtDate(t.boardDate)}`,
      ]} />

      {showReport && <ReportPanel report={report} onClose={() => setShowReport(false)} />}
    </Page>
  );
}

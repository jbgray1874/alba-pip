// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Screen 4: Commercial Action Plan  (ACTIONS)
//  ----------------------------------------------------------------------------
//  The screen where an opportunity stops being an observation. Screens 2 and 3
//  find the cohort and explain the score; this one puts a name, a date and a
//  stage against each account, and states who is accountable when the pipeline
//  review comes round.
//
//  Nothing on this page is typed. Every figure, every date and every sentence
//  of the playbook comes out of buildActionPlan() in src/lib/actionPlan.js,
//  which in turn reads buildExpansion(). The dates are anchored to the ledger's
//  as-of month rather than to the clock, so the plan a partner rehearses on
//  Tuesday is the plan they present on Thursday.
// ════════════════════════════════════════════════════════════════════════════

import { useMemo } from "react";
import { C, S, label as labelStyle } from "../lib/theme.js";
import { Page, PageHeader, Chip, Button, MetricRow, Panel, TwoColumn, ProvenanceBar } from "../components/Shell.jsx";
import { buildActionPlan, fmtDate, fmtDayMonth, fmtMonth } from "../lib/actionPlan.js";

/** The tones the model names, resolved against the design tokens. */
const TONE = { gold: C.gold, green: C.green, blue: C.blue, purple: C.purple, red: C.red, muted: C.txt3 };

// ── Small parts the reference asks for and Shell does not carry ─────────────

/** A numbered gold circle, as down the left of every ranked table. */
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

/** 20px initials in a coloured ring — the owner marker on screens 4 and 8. */
function Avatar({ initials, tone = "gold", size = 20 }) {
  const colour = TONE[tone] ?? C.gold;
  return (
    <span style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      border: `1px solid ${colour}`, background: `${colour}1F`, color: colour,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: S.micro, fontWeight: 700, letterSpacing: "0.02em",
    }}>{initials}</span>
  );
}

/**
 * The stage marker. Shell's Chip is used everywhere else on this page, but its
 * tone map has no purple and DISCOVERY is purple on the reference, so the three
 * stages are drawn here to one rule rather than two of them borrowing Chip and
 * the third looking like something else. Same geometry as Chip.
 */
function StageChip({ label, tone }) {
  const colour = TONE[tone] ?? C.gold;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", flexShrink: 0,
      padding: "2px 8px", borderRadius: 3,
      border: `1px solid ${colour}55`, background: `${colour}18`, color: colour,
      fontSize: S.micro, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
      whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

/** A step numeral in a gold circle, for the playbook. */
function Step({ n }) {
  return (
    <span style={{
      width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
      border: `1px solid ${C.goldLine}`, background: C.goldSoft, color: C.gold,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: S.label, fontWeight: 600, fontVariantNumeric: "tabular-nums",
    }}>{n}</span>
  );
}

function Tick() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.4 6.3 4.7 8.6 9.6 3.7" stroke={C.green} strokeWidth="1.6"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const TH = {
  ...labelStyle(),
  padding: "0 10px 8px",
  textAlign: "left",
  fontWeight: 500,
  borderBottom: `1px solid ${C.border}`,
  whiteSpace: "nowrap",
};
const TD = { padding: "10px", borderBottom: `1px solid ${C.border}`, verticalAlign: "top" };
const SUB = { color: C.txt3, fontSize: S.micro, marginTop: 3, lineHeight: 1.45 };

// ── The screen ──────────────────────────────────────────────────────────────

export default function ActionPlan({ opts }) {
  const p = useMemo(() => buildActionPlan(opts ?? {}), [opts]);
  const { money, totals, cohort, campaign, milestones, playbook, accountability, assumptions, product } = p;

  const attachPct = Math.round(assumptions.attachRate * 100);
  const sensitivityPct = Math.round(assumptions.sensitivity * 100);

  return (
    <Page>
      <PageHeader
        crumbs={["Actions", p.company.name, `${product.target} cross-sell`]}
        title="Commercial Action Plan"
        chips={<Chip tone="green">Ready for approval</Chip>}
        purpose={
          `${cohort.qualified} qualified accounts, the top ${totals.targetAccounts} of them owned, dated and staged ` +
          `to attach the ${product.target} to customers already running ${product.base}.`
        }
        meta={`As of ${fmtMonth(p.asOf)} · ${p.sources.map((s) => s.label).join(" + ")}`}
        actions={
          <>
            <Button variant="primary">Approve campaign</Button>
            <Button variant="outline">Generate brief</Button>
          </>
        }
      />

      <MetricRow items={[
        { label: "Target accounts", value: totals.targetAccounts,
          sub: `of ${cohort.qualified} qualified across ${cohort.customers} customers` },
        { label: "Qualified upside", value: money(totals.expected), tone: C.green,
          sub: `${money(totals.expectedLow)}–${money(totals.expectedHigh)} at ±${sensitivityPct}% conversion` },
        { label: "Expected conversion", value: `${Math.round(totals.conversionRate * 100)}%`, tone: C.green,
          sub: `${totals.expectedWins} of ${totals.targetAccounts} accounts on current scores` },
        { label: "First actions due", value: fmtDayMonth(totals.firstActionDate), tone: C.green,
          sub: `${totals.firstWave} accounts inside the first fortnight` },
      ]} />

      <TwoColumn
        ratio="1.5fr 1fr"
        left={
          <Panel title="Prioritised campaign"
                 sub={`Ranked on expected ARR · ${totals.pulledForward} accounts pulled forward by a renewal date`}
                 pad={0}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720,
                              fontFamily: "inherit", fontSize: S.small }}>
                <thead>
                  <tr>
                    <th style={{ ...TH, paddingLeft: 14, width: 34 }} />
                    <th style={TH}>Account</th>
                    <th style={TH}>Owner</th>
                    <th style={TH}>Cross-sell proposition</th>
                    <th style={TH}>Action date</th>
                    <th style={TH}>Stage</th>
                    <th style={{ ...TH, textAlign: "right", paddingRight: 14 }}>Est. ARR</th>
                  </tr>
                </thead>
                <tbody>
                  {campaign.map((row) => (
                    <tr key={row.account}>
                      <td style={{ ...TD, paddingLeft: 14, paddingRight: 0 }}><Rank n={row.rank} /></td>

                      <td style={TD}>
                        <div style={{ color: C.txt1, fontSize: S.small, fontWeight: 600 }}>{row.account}</div>
                        <div style={SUB}>{row.segment} · score {row.score}</div>
                      </td>

                      <td style={TD}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <Avatar initials={row.owner.initials} tone={row.owner.tone} />
                          <span style={{ color: C.txt2, fontSize: S.small, whiteSpace: "nowrap" }}>{row.owner.name}</span>
                        </div>
                        <div style={{ ...SUB, marginLeft: 27 }}>{row.owner.role}</div>
                      </td>

                      <td style={{ ...TD, maxWidth: 260 }}>
                        <div style={{ color: C.txt1, fontSize: S.small }}>{row.proposition.headline}</div>
                        <div style={SUB}>{row.proposition.basis}</div>
                      </td>

                      <td style={TD}>
                        <div style={{ color: C.txt1, fontSize: S.small, fontVariantNumeric: "tabular-nums",
                                      whiteSpace: "nowrap" }}>
                          {fmtDate(row.actionDate)}
                        </div>
                        <div style={SUB}>
                          {row.pulledForward
                            ? `Pulled forward · renews in ${row.renewalInDays} days`
                            : `Renews ${fmtDate(row.renewalDate)}`}
                        </div>
                      </td>

                      <td style={TD}><StageChip label={row.stage.label} tone={row.stage.tone} /></td>

                      <td style={{ ...TD, textAlign: "right", paddingRight: 14 }}>
                        <div style={{ color: C.green, fontSize: S.small, fontWeight: 600,
                                      fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                          {money(row.expectedArr)}
                        </div>
                        <div style={SUB}>{Math.round(row.conversionProbability * 100)}% of {money(row.grossOpportunity)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ padding: "11px 14px", color: C.txt3, fontSize: S.small, lineHeight: 1.6 }}>
              These {campaign.length} accounts carry {money(totals.expected)} of the {money(cohort.expected)} identified
              across all {cohort.qualified} qualified accounts, {Math.round(totals.shareOfCohort * 100)}% of the cohort.
              Action dates are worked back from each renewal and anchored to the {fmtMonth(p.asOf)} ledger.
            </div>
          </Panel>
        }
        right={
          <>
            <Panel title="Campaign playbook" sub="Four steps, each one measurable">
              {playbook.map((s, i) => (
                <div key={s.step}
                     style={{ display: "flex", gap: 11, alignItems: "flex-start",
                              paddingTop: i === 0 ? 0 : 11, paddingBottom: i === playbook.length - 1 ? 0 : 11,
                              borderBottom: i === playbook.length - 1 ? "none" : `1px solid ${C.border}` }}>
                  <Step n={s.step} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: C.txt1, fontSize: S.body, fontWeight: 600 }}>{s.title}</div>
                    <div style={{ color: C.txt2, fontSize: S.small, marginTop: 4, lineHeight: 1.55 }}>{s.detail}</div>
                  </div>
                </div>
              ))}
            </Panel>

            <Panel title="Accountability" sub="Named, not implied">
              <div style={{ display: "grid", gap: 12 }}>
                {accountability.map((a) => (
                  <div key={a.label}>
                    <div style={labelStyle()}>{a.label}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                      <Avatar initials={a.initials} tone={a.tone} />
                      <span style={{ color: C.txt1, fontSize: S.body }}>{a.name}</span>
                    </div>
                    <div style={{ ...SUB, marginLeft: 28, fontSize: S.small, color: C.txt3 }}>{a.detail}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 9, alignItems: "flex-start",
                            marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                <span style={{
                  width: 15, height: 15, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                  border: `1px solid ${C.goldLine}`, background: C.goldSoft, color: C.gold,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontSize: S.micro, fontWeight: 700, fontStyle: "italic",
                }}>i</span>
                <span style={{ color: C.txt3, fontSize: S.small, lineHeight: 1.6 }}>{p.advisory}</span>
              </div>
            </Panel>
          </>
        }
      />

      <Panel title="Milestones"
             sub={`Approval to pipeline review, anchored to the ${fmtMonth(p.asOf)} ledger`}
             pad="18px 14px 14px">
        <div style={{ position: "relative" }}>
          <div aria-hidden="true"
               style={{ position: "absolute", top: 11, left: `${100 / (milestones.length * 2)}%`,
                        right: `${100 / (milestones.length * 2)}%`, borderTop: `1px dashed ${C.border}` }} />
          <div style={{ position: "relative", display: "grid",
                        gridTemplateColumns: `repeat(${milestones.length}, minmax(0, 1fr))`, gap: 10 }}>
            {milestones.map((m) => (
              <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: "center",
                                       textAlign: "center", minWidth: 0 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  border: `1px solid ${m.done ? C.green : C.goldLine}`,
                  background: m.done ? C.greenSoft : C.surface,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}>
                  {m.done ? <Tick /> : <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold }} />}
                </span>
                <div style={{ ...labelStyle(m.done ? C.green : C.txt2), marginTop: 9 }}>{m.label}</div>
                <div style={{ color: C.txt1, fontSize: S.small, marginTop: 5,
                              fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                  {fmtDate(m.date)}
                </div>
                <div style={{ color: C.txt3, fontSize: S.micro, marginTop: 4, lineHeight: 1.5 }}>{m.note}</div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <ProvenanceBar items={[
        "Expected ARR uses account-level estimates",
        `Assumptions visible: ${attachPct}% attach rate, ±${sensitivityPct}% sensitivity`,
        p.tracked
          ? `Progress tracked in Alba as ${p.tracked.id.toUpperCase()}, due ${p.tracked.due}`
          : "Progress tracked in Alba",
        `Sources: ${p.sources.map((s) => s.label).join(", ")}`,
      ]} />
    </Page>
  );
}

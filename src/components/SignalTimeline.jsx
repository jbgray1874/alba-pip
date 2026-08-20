// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Signal development timeline
//  ----------------------------------------------------------------------------
//  The single strongest claim on any screen in the product: not that a revenue
//  miss was found, but that it was found N weeks before the board pack would
//  have found it. So the N is drawn, not written — the alert node is placed at
//  the week the model says the first leading indicator tripped, the board node
//  sits at week zero, and the red span between them is measured from those two
//  positions. Move a driver and the span moves with it.
//
//  Everything here is positioned from the week index, so the component takes no
//  view on how many weeks there are.
// ════════════════════════════════════════════════════════════════════════════

import { C, F, S, label as labelStyle } from "../lib/theme.js";

const ROW_H = 74;      // the band the rule, nodes and alert marker live in
const NODE = 11;

/** A node on the rule — hollow by default, filled once the indicator has tripped. */
function Node({ week, tone, filled, ring }) {
  return (
    <span style={{
      width: NODE, height: NODE, borderRadius: "50%", boxSizing: "border-box",
      border: `1.5px solid ${tone}`,
      background: filled ? tone : C.bgDeep,
      boxShadow: ring ? `0 0 0 4px ${tone}22` : "none",
      display: "block",
    }} aria-label={`Week ${week}`} />
  );
}

/**
 * @param {object} p
 * @param {Array}  p.weeks    rows from buildSignalDevelopment
 * @param {number} p.alertWeek
 * @param {number} p.leadTimeWeeks
 * @param {string} p.reconciliation
 * @param {(v:number)=>string} p.money
 */
export default function SignalTimeline({ weeks, alertWeek, leadTimeWeeks, reconciliation, money }) {
  const n = weeks.length;
  const centre = (i) => ((i + 0.5) / n) * 100;
  const alertIndex = weeks.findIndex((w) => w.week === alertWeek);
  const boardIndex = n - 1;

  const spanFrom = alertIndex >= 0 ? centre(alertIndex) : null;
  const spanTo = centre(boardIndex);

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: 700 }}>

        {/* ── End caps ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, ...labelStyle(C.green) }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green }} />
            Early indicator
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, ...labelStyle(C.gold) }}>
            Board meeting
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold }} />
          </span>
        </div>

        {/* ── The rule, the alert marker and the lead-time span ── */}
        <div style={{ position: "relative", height: ROW_H }}>

          {/* ALBA ALERT, above its node */}
          {spanFrom !== null && (
            <div style={{ position: "absolute", left: `${spanFrom}%`, top: 0, transform: "translateX(-50%)",
                          textAlign: "center", whiteSpace: "nowrap" }}>
              <div style={{ ...labelStyle(C.red), marginBottom: 3 }}>Alba alert</div>
              <div style={{ color: C.txt3, fontSize: S.micro, fontVariantNumeric: "tabular-nums" }}>
                Week {alertWeek}
              </div>
            </div>
          )}

          {/* The dashed lead-time span, alert node → board node */}
          {spanFrom !== null && (
            <>
              <div style={{ position: "absolute", left: `${spanFrom}%`, width: `${spanTo - spanFrom}%`,
                            top: 40, borderTop: `1px dashed ${C.red}`, opacity: 0.8 }} />
              {[spanFrom, spanTo].map((x, i) => (
                <div key={i} style={{ position: "absolute", left: `${x}%`, top: 34, height: 12,
                                      borderLeft: `1px solid ${C.red}`, opacity: 0.8 }} />
              ))}
              <div style={{ position: "absolute", left: `${(spanFrom + spanTo) / 2}%`, top: 30,
                            transform: "translateX(-50%)", background: C.surface, padding: "0 8px",
                            color: C.red, fontSize: S.label, fontWeight: 700, letterSpacing: "0.11em",
                            textTransform: "uppercase", whiteSpace: "nowrap" }}>
                {leadTimeWeeks} week{leadTimeWeeks === 1 ? "" : "s"} early
              </div>
            </>
          )}

          {/* The rule itself, with a node per week */}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 12, height: 1, background: C.border }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 7,
                        display: "grid", gridTemplateColumns: `repeat(${n}, 1fr)` }}>
            {weeks.map((w) => {
              const tone = w.isBoard ? C.gold : w.week === alertWeek ? C.red : w.breached ? C.amber : C.green;
              return (
                <div key={w.week} style={{ display: "flex", justifyContent: "center" }}>
                  <Node week={w.week} tone={tone} filled={w.breached || w.isBoard} ring={w.week === alertWeek} />
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Captions ── */}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${n}, 1fr)`, gap: 8, marginTop: 9 }}>
          {weeks.map((w) => {
            const tone = w.isBoard ? C.gold : w.week === alertWeek ? C.red : C.txt2;
            return (
              <div key={w.week} style={{ textAlign: "center", minWidth: 0 }}>
                <div style={{ ...labelStyle(w.isBoard ? C.gold : C.txt3), marginBottom: 4,
                              fontVariantNumeric: "tabular-nums" }}>
                  {w.isBoard ? "Week 0" : `Week ${w.week}`}
                </div>
                <div style={{ color: tone, fontSize: S.small, fontWeight: 500, lineHeight: 1.35, marginBottom: 3 }}>
                  {w.indicator}
                </div>
                <div style={{ color: C.txt3, fontSize: S.micro, lineHeight: 1.45 }}>{w.caption}</div>
                <div style={{ color: w.accrued > 0 ? C.red : C.txt3, fontSize: S.micro, marginTop: 4,
                              fontFamily: F.mono, fontVariantNumeric: "tabular-nums" }}>
                  {w.accrued > 0 ? `−${money(w.accrued)}` : "—"}
                </div>
                <div style={{ color: C.txt3, fontSize: S.micro, marginTop: 2 }}>{w.source}</div>
              </div>
            );
          })}
        </div>

        {/* ── The reconciliation, in the model's own words ── */}
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px dashed ${C.borderLt}`,
                      color: C.txt3, fontSize: S.small, lineHeight: 1.65 }}>
          {reconciliation}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Scenario 2 screen: cash and runway
//  ----------------------------------------------------------------------------
//  The specification puts scenario calculations on the must-work side of the
//  line: changing an assumption has to change the forecast immediately, and the
//  user has to see why. So the levers below recompute the model rather than
//  select between pre-baked outcomes, and the thirteen-week table shows the
//  arithmetic that produced each closing balance.
// ════════════════════════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import { buildCash, buildCashScenario, PARAMS } from "../lib/scenarioCash.js";
import { fmtMoney } from "../lib/fx.js";
import InsightCard from "../components/InsightCard.jsx";

const T = {
  bg: "#020817", card: "#0f1525", border: "#1e2740", accent: "#172035",
  txt1: "#e8edf8", txt2: "#7a90b8", txt3: "#3d5070",
  blue: "#3d8bff", green: "#00c97a", amber: "#f5a524", red: "#ff3d5a", purple: "#9b6dff",
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

export default function ScenarioCash() {
  const s = useMemo(() => buildCash(), []);
  const ccy = s.currency;
  const money = (v) => fmtMoney(v, ccy, { k: true });

  const [dso, setDso] = useState(0);
  const [pause, setPause] = useState(false);
  const [cut, setCut] = useState(0);

  const live = useMemo(
    () => buildCashScenario(
      { collectionsDaysImprovement: dso, hiringPause: pause, discretionaryCutPct: cut / 100 },
      { baseline: s.baseline },
    ),
    [dso, pause, cut, s.baseline],
  );

  const t = s.burnTrend;
  const maxCash = Math.max(...live.weeks.map((w) => w.closing), s.baseline.openingCash);
  const runwayDelta = live.runwayMonths - s.trajectory.runwayMonths;

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "18px 22px", background: T.bg }}>
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ color: T.txt1, fontSize: 20, fontWeight: 700, margin: 0 }}>{s.company.name}</h1>
        <div style={{ color: T.txt3, fontSize: 10, marginTop: 3 }}>
          {s.company.sectorLong} · {s.company.geo} · reports {ccy} · as of {s.fin.asOf}
        </div>
      </div>

      {/* ── The finding, in four numbers ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {[
          { l: "CASH ON HAND", v: money(s.baseline.openingCash), s: `burn ${money(s.baseline.reportedBurn)}/mo`, t: T.txt1 },
          { l: "RUNWAY AS REPORTED", v: `${s.fin.runway}mo`, s: "cash ÷ current burn, held flat", t: T.amber },
          { l: "BURN, 17 MONTHS AGO", v: money(t.from), s: `now ${money(t.to)} — ${t.multiple}×`, t: T.red },
          { l: "ON THE OBSERVED TREND", v: `${s.bases[2].months}mo`, s: `burn +${(t.monthlyGrowth * 100).toFixed(1)}%/month`, t: T.red },
        ].map((x) => (
          <div key={x.l} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "11px 13px", flex: 1, minWidth: 150 }}>
            <div style={{ color: T.txt3, fontSize: 9, letterSpacing: 0.5, marginBottom: 5 }}>{x.l}</div>
            <div style={{ color: x.t, fontSize: 20, fontWeight: 700, fontFamily: "Georgia,serif", lineHeight: 1 }}>{x.v}</div>
            <div style={{ color: T.txt3, fontSize: 9, marginTop: 4 }}>{x.s}</div>
          </div>
        ))}
      </div>

      <InsightCard insight={s.insight} />

      {/* ── Three runway bases ── */}
      <Panel title="Runway on three bases"
             sub="The reported figure is not wrong — it answers a narrower question than the board asked">
        {s.bases.map((b) => (
          <div key={b.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start",
                                   padding: "9px 0", borderBottom: `1px solid ${T.accent}` }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: T.txt1, fontSize: 11.5, fontWeight: 600 }}>{b.label}</div>
              <div style={{ color: T.txt3, fontSize: 9, marginTop: 3 }}>{b.basis}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ color: b.id === "trend" ? T.red : b.id === "plan" ? T.amber : T.txt2,
                            fontSize: 16, fontWeight: 700, fontFamily: "Georgia,serif" }}>
                {b.months === Infinity ? "—" : `${b.months}mo`}
              </div>
              <div style={{ color: T.txt3, fontSize: 9, marginTop: 2 }}>
                floor month {b.monthsToFloor ?? "—"}
              </div>
            </div>
          </div>
        ))}
        <div style={{ color: T.txt3, fontSize: 9, marginTop: 10, lineHeight: 1.6 }}>
          Board cash floor {money(PARAMS.minimumCash)}. The trend rate is measured across the {t.months} months
          on file, not chosen. No floor breach is claimed inside the thirteen-week view below — on this company's
          figures there is not one.
        </div>
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))", gap: 12 }}>

        {/* ── Levers ── */}
        <Panel title="Management levers"
               sub="Each one recomputes the model below — nothing here selects a pre-baked answer">
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ color: T.txt2, fontSize: 10.5 }}>Days out of DSO</span>
              <span style={{ color: T.txt1, fontSize: 10.5, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {dso} of {PARAMS.dsoDays - PARAMS.dsoPlanDays} available
              </span>
            </div>
            <input type="range" min={0} max={PARAMS.dsoDays - PARAMS.dsoPlanDays} value={dso}
                   onChange={(e) => setDso(Number(e.target.value))}
                   style={{ width: "100%", accentColor: T.blue }} />
            <div style={{ color: T.txt3, fontSize: 8.5, marginTop: 3 }}>
              Releases {money(live.workingCapitalRelease)} of working capital over {PARAMS.collectionsReleaseWeeks} weeks —
              once, not every month.
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={pause} onChange={(e) => setPause(e.target.checked)}
                     style={{ accentColor: T.blue }} />
              <span style={{ color: T.txt2, fontSize: 10.5 }}>
                Pause the {PARAMS.plannedHires} approved hires
              </span>
            </label>
            <div style={{ color: T.txt3, fontSize: 8.5, marginTop: 3, marginLeft: 24 }}>
              Headcount {live.headcount} · payroll {money(live.monthlyPayroll)}/month
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ color: T.txt2, fontSize: 10.5 }}>Supplier and overhead cut</span>
              <span style={{ color: T.txt1, fontSize: 10.5, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{cut}%</span>
            </div>
            <input type="range" min={0} max={30} value={cut} onChange={(e) => setCut(Number(e.target.value))}
                   style={{ width: "100%", accentColor: T.blue }} />
            <div style={{ color: T.txt3, fontSize: 8.5, marginTop: 3 }}>
              Suppliers {money(live.monthlySuppliers)}/month
            </div>
          </div>

          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.accent}`,
                        display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div style={{ color: T.txt3, fontSize: 9 }}>RUNWAY UNDER THESE LEVERS</div>
              <div style={{ color: runwayDelta > 0.05 ? T.green : T.txt1, fontSize: 22, fontWeight: 700, fontFamily: "Georgia,serif", lineHeight: 1.1 }}>
                {live.runwayMonths === Infinity ? "cash positive" : `${live.runwayMonths}mo`}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: T.txt3, fontSize: 9 }}>AGAINST CURRENT TRAJECTORY</div>
              <div style={{ color: runwayDelta > 0.05 ? T.green : runwayDelta < -0.05 ? T.red : T.txt3, fontSize: 13, fontWeight: 600 }}>
                {live.runwayMonths === Infinity ? "—" : `${runwayDelta >= 0 ? "+" : ""}${runwayDelta.toFixed(1)} months`}
              </div>
            </div>
          </div>
        </Panel>

        {/* ── Where the money goes ── */}
        <Panel title="Where the outflow goes"
               sub="Anchored to reported burn: receipts less outflow equals the figure on every other screen">
          {s.baseline.composition.map((c) => (
            <div key={c.label} style={{ marginBottom: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
                <span style={{ color: T.txt2, fontSize: 10.5 }}>{c.label}</span>
                <span style={{ color: T.txt1, fontSize: 10.5, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                  {money(c.value)} <span style={{ color: T.txt3, fontWeight: 400 }}>· {(c.share * 100).toFixed(0)}%</span>
                </span>
              </div>
              <div style={{ height: 6, background: T.bg, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${c.share * 100}%`, height: "100%", background: T.purple, opacity: 0.8 }} />
              </div>
              <div style={{ color: T.txt3, fontSize: 8.5, marginTop: 3 }}>{c.basis}</div>
            </div>
          ))}
          <div style={{ marginTop: 10, paddingTop: 9, borderTop: `1px solid ${T.accent}`, color: T.txt3, fontSize: 9, lineHeight: 1.6 }}>
            Monthly receipts {money(s.baseline.monthlyReceipts)} · total outflow {money(s.baseline.monthlyOutflow)} ·
            net burn {money(s.baseline.reportedBurn)}. Supplier spend is the residual, so the composition cannot
            drift away from the reported figure.
          </div>
        </Panel>
      </div>

      {/* ── The thirteen weeks ── */}
      <Panel title="Thirteen-week cash flow"
             sub="Each line rounded before the closing balance is derived from it, so the columns add up as shown">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5, minWidth: 620 }}>
            <thead><tr style={{ color: T.txt3, fontSize: 9, textAlign: "right" }}>
              {["Week", "Opening", "Receipts", "Payroll", "Suppliers", "Debt", "Closing"].map((h, i) =>
                <th key={h} style={{ padding: "6px 10px", fontWeight: 400, borderBottom: `1px solid ${T.border}`,
                                     textAlign: i === 0 ? "left" : "right" }}>{h}</th>)}
            </tr></thead>
            <tbody>{live.weeks.map((w) => (
              <tr key={w.week} style={{ borderBottom: `1px solid ${T.accent}`,
                                        background: w.belowMinimum ? `${T.red}12` : w.payroll > 0 ? `${T.amber}08` : "transparent" }}>
                <td style={{ padding: "6px 10px", color: T.txt2 }}>{w.week}</td>
                <td style={{ padding: "6px 10px", color: T.txt3, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{money(w.opening)}</td>
                <td style={{ padding: "6px 10px", color: T.green, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{money(w.receipts)}</td>
                <td style={{ padding: "6px 10px", color: w.payroll ? T.amber : T.txt3, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {w.payroll ? money(w.payroll) : "—"}
                </td>
                <td style={{ padding: "6px 10px", color: T.txt2, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{money(w.suppliers)}</td>
                <td style={{ padding: "6px 10px", color: T.txt3, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{money(w.debtService)}</td>
                <td style={{ padding: "6px 10px", color: w.belowMinimum ? T.red : T.txt1, textAlign: "right",
                             fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{money(w.closing)}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", gap: 3, marginTop: 12, alignItems: "flex-end", height: 54 }}>
          {live.weeks.map((w) => (
            <div key={w.week} title={`Week ${w.week} · ${money(w.closing)}`}
                 style={{ flex: 1, height: `${Math.max(4, (w.closing / maxCash) * 100)}%`, borderRadius: "2px 2px 0 0",
                          background: w.belowMinimum ? T.red : w.payroll > 0 ? T.amber : T.blue, opacity: 0.75 }} />
          ))}
        </div>
        <div style={{ color: T.txt3, fontSize: 9, marginTop: 8 }}>
          Amber weeks are payroll weeks — payroll clears every {PARAMS.payrollClearsEveryNthWeek}th week rather than
          evenly, which is why the balance steps rather than slopes. Closing {money(live.closingCash)} at week {PARAMS.weeks}.
        </div>
      </Panel>

      {/* ── Management cases ── */}
      <Panel title="Management cases" sub="The same model under four combinations of the levers above">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 540 }}>
            <thead><tr style={{ color: T.txt3, fontSize: 9, textAlign: "left" }}>
              {["Case", "Monthly burn", "Runway", "Closing cash, week 13", "Against trajectory"].map((h) =>
                <th key={h} style={{ padding: "6px 10px", fontWeight: 400, borderBottom: `1px solid ${T.border}` }}>{h}</th>)}
            </tr></thead>
            <tbody>{s.cases.map((c) => {
              const d = c.result.runwayMonths - s.trajectory.runwayMonths;
              return (
                <tr key={c.id} style={{ borderBottom: `1px solid ${T.accent}` }}>
                  <td style={{ padding: "7px 10px", color: T.txt1 }}>{c.name}</td>
                  <td style={{ padding: "7px 10px", color: T.txt2, fontVariantNumeric: "tabular-nums" }}>{money(c.result.monthlyBurn)}</td>
                  <td style={{ padding: "7px 10px", color: T.txt1, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                    {c.result.runwayMonths === Infinity ? "cash positive" : `${c.result.runwayMonths}mo`}
                  </td>
                  <td style={{ padding: "7px 10px", color: T.txt2, fontVariantNumeric: "tabular-nums" }}>{money(c.result.closingCash)}</td>
                  <td style={{ padding: "7px 10px", color: d > 0.05 ? T.green : T.txt3, fontVariantNumeric: "tabular-nums" }}>
                    {c.result.runwayMonths === Infinity ? "—" : `${d >= 0 ? "+" : ""}${d.toFixed(1)}mo`}
                  </td>
                </tr>);
            })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

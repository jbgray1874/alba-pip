// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Scenario 5 screen: cross-portfolio cost and procurement
//  ----------------------------------------------------------------------------
//  The screen that only a platform can draw. Its credibility rests on one
//  behaviour: spend whose supplier identity is a candidate match rather than a
//  confirmed one is held out of the headline figure and shown separately, with
//  the ledger names that caused the doubt. A saving number nobody can take
//  apart is a number nobody acts on.
// ════════════════════════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import { buildProcurement, CATEGORIES, PARAMS } from "../lib/scenarioProcurement.js";
import { fmtMoney } from "../lib/fx.js";
import InsightCard from "../components/InsightCard.jsx";

const T = {
  bg: "#020817", card: "#0f1525", border: "#1e2740", accent: "#172035",
  txt1: "#e8edf8", txt2: "#7a90b8", txt3: "#3d5070",
  blue: "#3d8bff", green: "#00c97a", amber: "#f5a524", red: "#ff3d5a", purple: "#9b6dff",
};

const QUALITY = {
  exact:      { label: "Exact", colour: T.green },
  normalised: { label: "Normalised", colour: T.blue },
  review:     { label: "Needs review", colour: T.amber },
  different:  { label: "Different", colour: T.red },
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

export default function ScenarioProcurement() {
  const s = useMemo(() => buildProcurement(), []);
  const ccy = s.currency;
  const money = (v) => fmtMoney(v, ccy, { k: true });
  const t = s.totals;
  const [open, setOpen] = useState(s.vendors[0]?.canonical ?? null);

  const selected = s.vendors.find((v) => v.canonical === open);
  const maxSaving = Math.max(...s.byCategory.map((c) => c.saving));

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "18px 22px", background: T.bg }}>
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ color: T.txt1, fontSize: 20, fontWeight: 700, margin: 0 }}>Portfolio procurement</h1>
        <div style={{ color: T.txt3, fontSize: 10, marginTop: 3 }}>
          {t.companies} companies · {t.suppliers} shared suppliers · restated into {ccy} at pinned rates · as of 2026-05
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {[
          { l: "COMMON SUPPLIER SPEND", v: money(t.totalSpend), s: `across ${t.suppliers} suppliers`, t: T.txt1 },
          { l: "ADDRESSABLE, CONFIRMED", v: money(t.confirmedSpend), s: `${t.addressableSuppliers} suppliers, ${PARAMS.minCompaniesForAction}+ companies each`, t: T.txt1 },
          { l: "ANNUAL SAVING", v: money(t.saving), s: `${money(t.low)} – ${money(t.high)}`, t: T.green },
          { l: "HELD PENDING REVIEW", v: money(t.pendingSpend), s: `worth a further ${money(t.savingIfConfirmed)}`, t: T.amber },
        ].map((x) => (
          <div key={x.l} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "11px 13px", flex: 1, minWidth: 155 }}>
            <div style={{ color: T.txt3, fontSize: 9, letterSpacing: 0.5, marginBottom: 5 }}>{x.l}</div>
            <div style={{ color: x.t, fontSize: 20, fontWeight: 700, fontFamily: "Georgia,serif", lineHeight: 1 }}>{x.v}</div>
            <div style={{ color: T.txt3, fontSize: 9, marginTop: 4 }}>{x.s}</div>
          </div>
        ))}
      </div>

      <InsightCard insight={s.insight} />

      {/* ── Category savings ── */}
      <Panel title="Where the saving is"
             sub="Every rate is a named assumption, shown against the figure it produces">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 660 }}>
            <thead><tr style={{ color: T.txt3, fontSize: 9, textAlign: "left" }}>
              {["Category", "Confirmed spend", "Rate", "Saving", "Companies", "Next renewal", "Basis"].map((h) =>
                <th key={h} style={{ padding: "6px 10px", fontWeight: 400, borderBottom: `1px solid ${T.border}` }}>{h}</th>)}
            </tr></thead>
            <tbody>{s.byCategory.map((c) => (
              <tr key={c.category} style={{ borderBottom: `1px solid ${T.accent}` }}>
                <td style={{ padding: "7px 10px", color: T.txt1 }}>{c.category}</td>
                <td style={{ padding: "7px 10px", color: T.txt2, fontVariantNumeric: "tabular-nums" }}>{money(c.spend)}</td>
                <td style={{ padding: "7px 10px", color: T.txt3, fontVariantNumeric: "tabular-nums" }}>{(c.rate * 100).toFixed(0)}%</td>
                <td style={{ padding: "7px 10px", fontVariantNumeric: "tabular-nums" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ color: T.green, fontWeight: 600 }}>{money(c.saving)}</span>
                    <div style={{ width: 54, height: 5, background: T.bg, borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: `${(c.saving / maxSaving) * 100}%`, height: "100%", background: T.green, opacity: 0.75 }} />
                    </div>
                  </div>
                </td>
                <td style={{ padding: "7px 10px", color: T.txt2 }}>{c.companies}</td>
                <td style={{ padding: "7px 10px", color: T.txt2 }}>{c.earliestRenewal}</td>
                <td style={{ padding: "7px 10px", color: T.txt3, fontSize: 9.5 }}>{c.basis}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 12 }}>

        {/* ── Suppliers ── */}
        <Panel title="Shared suppliers"
               sub={`Ranked by portfolio spend — select one to see the ledger names it was matched from`}>
          {s.vendors.map((v) => (
            <div key={v.canonical} onClick={() => setOpen(v.canonical)}
                 style={{ padding: "7px 9px", marginBottom: 4, borderRadius: 5, cursor: "pointer",
                          background: open === v.canonical ? T.accent : "transparent",
                          border: `1px solid ${open === v.canonical ? T.blue : T.accent}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
                <span style={{ color: T.txt1, fontSize: 11 }}>
                  {v.canonical}
                  {!v.addressable && <span style={{ color: T.txt3, fontSize: 8.5, marginLeft: 6 }}>below threshold</span>}
                </span>
                <span style={{ color: T.txt1, fontSize: 11, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{money(v.totalSpend)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: T.txt3, fontSize: 8.5 }}>
                <span>{v.category} · {v.companies} companies · {v.ledgerVariants.length} ledger names</span>
                <span style={{ color: v.needsReview.length ? T.amber : T.green }}>
                  {v.needsReview.length ? `${v.needsReview.length} to review` : "all matched"}
                </span>
              </div>
            </div>
          ))}
          <div style={{ color: T.txt3, fontSize: 9, marginTop: 8, lineHeight: 1.6 }}>
            {s.belowThreshold.length} supplier{s.belowThreshold.length === 1 ? " is" : "s are"} used by fewer than
            {" "}{PARAMS.minCompaniesForAction} companies and excluded — below that, the coordination costs more than
            the saving is worth.
          </div>
        </Panel>

        {/* ── Normalisation, taken apart ── */}
        <Panel title={selected ? `${selected.canonical} — how it was matched` : "How it was matched"}
               sub={selected ? `${selected.companies} contracts · ${money(selected.totalSpend)} a year · renews from ${selected.earliestRenewal}` : null}>
          {selected ? (
            <>
              {selected.contracts.map((c) => {
                const q = QUALITY[c.quality];
                return (
                  <div key={c.company} style={{ padding: "7px 0", borderBottom: `1px solid ${T.accent}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 2 }}>
                      <span style={{ color: T.txt2, fontSize: 10.5 }}>{c.companyName}</span>
                      <span style={{ color: T.txt1, fontSize: 10.5, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        {money(c.annualSpend)}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                      <span style={{ color: T.txt3, fontSize: 9, fontFamily: "monospace" }}>{c.ledgerName}</span>
                      <span style={{ color: q.colour, fontSize: 8.5, padding: "1px 6px", borderRadius: 3,
                                     border: `1px solid ${q.colour}44`, background: `${q.colour}12`, flexShrink: 0 }}>
                        {q.label}
                      </span>
                    </div>
                    <div style={{ color: T.txt3, fontSize: 8.5, marginTop: 2 }}>renews {c.renewal}</div>
                  </div>
                );
              })}
              <div style={{ marginTop: 10, padding: "9px 11px", background: T.bg, borderRadius: 5, border: `1px solid ${T.accent}` }}>
                <div style={{ color: T.txt3, fontSize: 9, marginBottom: 4 }}>MATCHED AGAINST</div>
                <div style={{ color: T.txt2, fontSize: 10, fontFamily: "monospace", marginBottom: 6 }}>{selected.referenceName}</div>
                <div style={{ color: T.txt3, fontSize: 9, lineHeight: 1.6 }}>
                  {selected.autoMatched} of {selected.companies} matched automatically
                  {selected.needsReview.length > 0 && <>, {money(selected.pendingSpend)} held pending confirmation</>}.
                  Names are reduced to brand tokens by stripping legal form, punctuation and geography.
                </div>
              </div>
            </>
          ) : <div style={{ color: T.txt3, fontSize: 11 }}>Select a supplier.</div>}
        </Panel>
      </div>

      {/* ── The review queue ── */}
      <Panel title="Held pending human confirmation"
             sub="Excluded from the headline saving until a person confirms these are the same supplier"
             right={<span style={{ color: T.amber, fontSize: 10, fontWeight: 600 }}>
               {money(t.pendingSpend)} · worth {money(t.savingIfConfirmed)}
             </span>}>
        {s.reviewQueue.length ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 620 }}>
              <thead><tr style={{ color: T.txt3, fontSize: 9, textAlign: "left" }}>
                {["Supplier", "Company", "Name in that ledger", "Matched against", "Annual spend"].map((h) =>
                  <th key={h} style={{ padding: "6px 10px", fontWeight: 400, borderBottom: `1px solid ${T.border}` }}>{h}</th>)}
              </tr></thead>
              <tbody>{s.reviewQueue.map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${T.accent}` }}>
                  <td style={{ padding: "7px 10px", color: T.txt1 }}>{r.supplier}</td>
                  <td style={{ padding: "7px 10px", color: T.txt2 }}>{r.company}</td>
                  <td style={{ padding: "7px 10px", color: T.amber, fontFamily: "monospace", fontSize: 9.5 }}>{r.ledgerName}</td>
                  <td style={{ padding: "7px 10px", color: T.txt3, fontFamily: "monospace", fontSize: 9.5 }}>{r.matchedAgainst}</td>
                  <td style={{ padding: "7px 10px", color: T.txt1, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{money(r.annualSpend)}</td>
                </tr>))}
              </tbody>
            </table>
          </div>
        ) : <div style={{ color: T.txt3, fontSize: 11 }}>Every supplier record matched automatically.</div>}
      </Panel>

      {/* ── Renewals ── */}
      <Panel title="Next renewals" sub="A contract cannot be renegotiated on a date that has passed">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {s.nextRenewals.map((r) => (
            <div key={r.supplier} style={{ background: T.bg, border: `1px solid ${T.accent}`, borderRadius: 6,
                                           padding: "9px 11px", flex: 1, minWidth: 150 }}>
              <div style={{ color: T.amber, fontSize: 10, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{r.renewal}</div>
              <div style={{ color: T.txt1, fontSize: 11, marginTop: 3 }}>{r.supplier}</div>
              <div style={{ color: T.txt3, fontSize: 9, marginTop: 2 }}>
                {r.category} · {r.companies} companies · {money(r.spend)}
              </div>
            </div>
          ))}
        </div>
        <div style={{ color: T.txt3, fontSize: 9, marginTop: 10, lineHeight: 1.6 }}>
          Consolidation rates by category — {Object.entries(CATEGORIES).map(([k, v]) => `${k} ${(v.rate * 100).toFixed(0)}%`).join(" · ")}.
          Realised over {PARAMS.implementationMonths} months as contracts reach renewal.
        </div>
      </Panel>
    </div>
  );
}

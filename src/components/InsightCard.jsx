// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Standard Insight Card
//  ----------------------------------------------------------------------------
//  Shared component 3 from the demo specification. Every risk and opportunity
//  renders through this, so a user learns the shape once: what happened, why it
//  matters, the evidence, the impact, the action, the confidence, and where the
//  numbers came from.
//
//  Evidence is collapsed by default and one click away. The specification's
//  test is that an alert can be traced to its evidence "without breaking the
//  flow" — a second screen breaks the flow; a disclosure does not.
// ════════════════════════════════════════════════════════════════════════════

import { useState } from "react";

const T = {
  card: "#0f1525", bg: "#020817", border: "#1e2740", accent: "#172035",
  txt1: "#e8edf8", txt2: "#7a90b8", txt3: "#3d5070",
  blue: "#3d8bff", green: "#00c97a", amber: "#f5a524", red: "#ff3d5a", purple: "#9b6dff",
};

function money(v, ccy) {
  const sym = { GBP: "£", USD: "$", EUR: "€", SGD: "S$", AED: "AED " }[ccy] ?? "";
  return `${sym}${Math.round(Math.abs(v)).toLocaleString()}k`;
}

export default function InsightCard({ insight, defaultOpen = false, onAction }) {
  const [showEvidence, setShowEvidence] = useState(defaultOpen);
  const [showMethod, setShowMethod] = useState(false);
  if (!insight) return null;

  const risk = insight.type === "risk";
  const tone = risk ? T.red : T.green;
  const sign = risk ? "−" : "+";

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderLeft: `3px solid ${tone}`,
                  borderRadius: 8, padding: "14px 16px", marginBottom: 10 }}>

      {/* ── Header: type, company, headline, impact ── */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ color: tone, fontSize: 9, fontWeight: 700, padding: "2px 7px",
                           background: `${tone}18`, borderRadius: 3, letterSpacing: 0.4 }}>
              {risk ? "RISK" : "OPPORTUNITY"}
            </span>
            <span style={{ color: T.txt1, fontSize: 12, fontWeight: 600 }}>{insight.companyName}</span>
            <span style={{ color: T.txt3, fontSize: 9 }}>· raised {insight.raisedOn}</span>
          </div>
          <div style={{ color: T.txt1, fontSize: 14, fontWeight: 600, lineHeight: 1.35, marginBottom: 8 }}>
            {insight.headline}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ color: tone, fontSize: 22, fontWeight: 700, fontFamily: "Georgia,serif", lineHeight: 1 }}>
            {sign}{money(insight.impact.value, insight.impact.currency)}
          </div>
          <div style={{ color: T.txt3, fontSize: 9, marginTop: 3 }}>{insight.impact.horizon}</div>
        </div>
      </div>

      {/* ── What happened / why it matters ── */}
      <div style={{ color: T.txt2, fontSize: 11.5, lineHeight: 1.55, marginBottom: 6 }}>
        {insight.whatHappened}
      </div>
      <div style={{ color: T.txt2, fontSize: 11.5, lineHeight: 1.55, marginBottom: 10 }}>
        {insight.whyItMatters}
      </div>

      {/* ── Confidence + disclosure controls ── */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: showEvidence || showMethod ? 10 : 0 }}>
        <span title={insight.confidence.note}
              style={{ color: T.txt2, fontSize: 9, padding: "2px 7px", border: `1px solid ${T.border}`, borderRadius: 3 }}>
          Confidence: {insight.confidence.label}
        </span>
        <button onClick={() => setShowEvidence((v) => !v)}
                style={{ padding: "3px 9px", background: showEvidence ? T.accent : "transparent",
                         border: `1px solid ${T.border}`, borderRadius: 3, color: T.txt2, fontSize: 9, cursor: "pointer" }}>
          {showEvidence ? "▾" : "▸"} Evidence ({insight.evidence.length})
        </button>
        <button onClick={() => setShowMethod((v) => !v)}
                style={{ padding: "3px 9px", background: showMethod ? T.accent : "transparent",
                         border: `1px solid ${T.border}`, borderRadius: 3, color: T.txt2, fontSize: 9, cursor: "pointer" }}>
          {showMethod ? "▾" : "▸"} How this was calculated
        </button>
      </div>

      {/* ── Evidence: every row names its source and refresh date ── */}
      {showEvidence && (
        <div style={{ background: T.bg, border: `1px solid ${T.accent}`, borderRadius: 6, padding: "8px 10px", marginBottom: 8 }}>
          {insight.evidence.map((e, i) => (
            <div key={i} style={{ padding: "6px 0", borderTop: i ? `1px solid ${T.accent}` : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <span style={{ color: T.txt2, fontSize: 10.5 }}>{e.label}</span>
                <span style={{ color: T.txt1, fontSize: 10.5, fontWeight: 600, textAlign: "right" }}>{e.value}</span>
              </div>
              <div style={{ color: T.txt3, fontSize: 8.5, marginTop: 2 }}>{e.source} · as of {e.asOf}</div>
            </div>
          ))}
        </div>
      )}

      {showMethod && (
        <div style={{ background: T.bg, border: `1px solid ${T.accent}`, borderRadius: 6,
                      padding: "8px 10px", marginBottom: 8, color: T.txt2, fontSize: 10.5, lineHeight: 1.5 }}>
          {insight.methodology}
        </div>
      )}

      {/* ── Actions: owner and date, per the specification ── */}
      {insight.actions?.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ color: T.txt3, fontSize: 9, letterSpacing: 0.6, marginBottom: 5 }}>RECOMMENDED ACTIONS</div>
          {insight.actions.map((a, i) => (
            <div key={i} onClick={() => onAction?.(a, insight)}
                 style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "5px 8px",
                          background: T.bg, border: `1px solid ${T.accent}`, borderRadius: 4, marginBottom: 4,
                          cursor: onAction ? "pointer" : "default", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ color: T.txt1, fontSize: 10.5 }}>{a.action}</div>
                {a.rationale && <div style={{ color: T.txt3, fontSize: 8.5, marginTop: 2 }}>{a.rationale}</div>}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ color: T.txt2, fontSize: 9 }}>{a.owner}</div>
                <div style={{ color: T.txt3, fontSize: 8.5 }}>due {a.due}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

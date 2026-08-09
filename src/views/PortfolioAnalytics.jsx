import { useState, useEffect, useCallback } from "react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
         LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { forAnalytics } from "../lib/companies.js";
import { attentionActions } from "../lib/investigation.js";

// ── Design tokens ────────────────────────────────────────────────
const T = {
  bg: "#080B14", card: "#0F1525", border: "#1E2740",
  txt1: "#F2EFE6", txt2: "#9AA3B5", txt3: "#5A6478",
  gold: "#C5A572", goldb: "#E0C088",
  green: "#3FB984", amber: "#F5A524", red: "#E25563", blue: "#5B8DEF",
};

// ── Seed data ─────────────────────────────────────────────────────
const COMPANIES = forAnalytics();

const RAG_COLOR = { GREEN: T.green, AMBER: T.amber, RED: T.red };
const DEPTS = ["Finance", "Sales", "Product", "HR", "Ops", "Tech", "Marketing", "Risk", "Compliance"];

// ─────────────────────────────────────────────────────────────────
// Fund-level KPI Banner
// ─────────────────────────────────────────────────────────────────
function KPIBanner({ stripe }) {
  const avgHealth = Math.round(COMPANIES.reduce((s, c) => s + c.score, 0) / COMPANIES.length);
  const totalCash = COMPANIES.reduce((s, c) => s + c.cashK, 0);
  const reds = COMPANIES.filter(c => c.rag === "RED").length;
  const avgRunway = (COMPANIES.reduce((s, c) => s + c.runway, 0) / COMPANIES.length).toFixed(1);
  const portfolioMRR = stripe?.data?.mrr || COMPANIES.reduce((s, c) => s + c.revenueK, 0);
  const avgIRR = Math.round(COMPANIES.reduce((s, c) => s + c.irr, 0) / COMPANIES.length);

  const kpis = [
    { label: "Avg Health", value: `${avgHealth}/100`, color: avgHealth > 70 ? T.green : avgHealth > 50 ? T.amber : T.red },
    { label: "Companies in RED", value: reds, color: reds > 0 ? T.red : T.green },
    { label: "Portfolio Cash", value: `£${(totalCash / 1000).toFixed(1)}M`, color: T.gold },
    { label: "Avg Runway", value: `${avgRunway}mo`, color: parseFloat(avgRunway) < 4 ? T.red : T.green },
    { label: "Portfolio MRR", value: stripe?.connected ? `£${portfolioMRR.toLocaleString()}` : `£${(portfolioMRR / 1000).toFixed(0)}k`, color: stripe?.connected ? T.green : T.txt2 },
    { label: "Avg IRR", value: `${avgIRR}%`, color: T.gold },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 1, marginBottom: 24, background: T.border, borderRadius: 10, overflow: "hidden" }}>
      {kpis.map((k, i) => (
        <div key={i} style={{ background: T.card, padding: "14px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: k.color, fontFamily: "Georgia,serif" }}>{k.value}</div>
          <div style={{ fontSize: 10, color: T.txt3, marginTop: 3, textTransform: "uppercase", letterSpacing: 1 }}>{k.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// RAG Heatmap
// ─────────────────────────────────────────────────────────────────
function RAGHeatmap() {
  const [hover, setHover] = useState(null);

  function score2color(s) {
    if (s >= 80) return T.green;
    if (s >= 60) return T.amber;
    if (s >= 40) return "#E89B30";
    return T.red;
  }

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 20, marginBottom: 24 }}>
      <div style={{ fontSize: 11, color: T.gold, letterSpacing: 3, textTransform: "uppercase", marginBottom: 14 }}>Portfolio RAG Heatmap</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ width: 130, textAlign: "left", fontSize: 10, color: T.txt3, padding: "4px 8px" }}>Company</th>
              {DEPTS.map(d => (
                <th key={d} style={{ fontSize: 9, color: T.txt3, padding: "4px 6px", textAlign: "center", fontWeight: 400 }}>{d}</th>
              ))}
              <th style={{ fontSize: 10, color: T.txt3, padding: "4px 8px", textAlign: "center" }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {COMPANIES.map(c => (
              <tr key={c.id}>
                <td style={{ padding: "5px 8px" }}>
                  <div style={{ fontSize: 12, color: T.txt1, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 9, color: T.txt3 }}>{c.stage}</div>
                </td>
                {DEPTS.map(d => {
                  const s = c.depts[d];
                  const isHover = hover === `${c.id}-${d}`;
                  return (
                    <td key={d} style={{ padding: 3, textAlign: "center" }}
                      onMouseEnter={() => setHover(`${c.id}-${d}`)}
                      onMouseLeave={() => setHover(null)}>
                      <div style={{
                        width: 36, height: 28, margin: "0 auto", borderRadius: 4,
                        background: score2color(s),
                        opacity: isHover ? 1 : 0.75,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, color: "#000", fontWeight: 700,
                        cursor: "default", transition: "opacity 0.15s",
                        boxShadow: isHover ? `0 0 8px ${score2color(s)}` : "none",
                      }}>
                        {s}
                      </div>
                    </td>
                  );
                })}
                <td style={{ textAlign: "center", padding: 5 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: RAG_COLOR[c.rag], fontFamily: "Georgia,serif" }}>{c.score}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 12, justifyContent: "flex-end" }}>
        {[["≥80 Green", T.green], ["60–79 Amber", T.amber], ["40–59 Warning", "#E89B30"], ["<40 Red", T.red]].map(([l, c]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
            <span style={{ fontSize: 9, color: T.txt3 }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Scenario Planning Slider
// ─────────────────────────────────────────────────────────────────
function ScenarioPlanner() {
  const [selected, setSelected] = useState("meridian");
  const [burnDelta, setBurnDelta] = useState(0);
  const [revDelta, setRevDelta] = useState(0);

  const co = COMPANIES.find(c => c.id === selected);
  const adjBurn = co.burnK * (1 + burnDelta / 100);
  const adjRev = co.revenueK * (1 + revDelta / 100);
  const adjRunway = co.cashK / adjBurn;
  const baseRunway = co.cashK / co.burnK;
  const runwayDiff = adjRunway - baseRunway;
  const runwayColor = adjRunway < 3 ? T.red : adjRunway < 6 ? T.amber : T.green;

  // 6-month projection
  const months = ["Now", "Mo 1", "Mo 2", "Mo 3", "Mo 4", "Mo 5", "Mo 6"];
  const chartData = months.map((m, i) => ({
    month: m,
    cash: Math.max(0, Math.round(co.cashK - adjBurn * i)),
    baseCash: Math.max(0, Math.round(co.cashK - co.burnK * i)),
  }));

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 20, marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: T.gold, letterSpacing: 3, textTransform: "uppercase" }}>Scenario Planning</div>
        <select value={selected} onChange={e => setSelected(e.target.value)}
          style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.txt1, borderRadius: 6, padding: "4px 10px", fontSize: 12 }}>
          {COMPANIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Sliders */}
        <div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: T.txt2 }}>Burn rate change</span>
              <span style={{ fontSize: 12, color: burnDelta > 0 ? T.red : T.green, fontWeight: 700 }}>
                {burnDelta > 0 ? "+" : ""}{burnDelta}% → £{Math.round(adjBurn)}k/mo
              </span>
            </div>
            <input type="range" min={-50} max={100} value={burnDelta}
              onChange={e => setBurnDelta(Number(e.target.value))}
              style={{ width: "100%", accentColor: T.gold }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: T.txt3 }}>
              <span>-50% (efficiency)</span><span>+100% (scale)</span>
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: T.txt2 }}>Revenue change</span>
              <span style={{ fontSize: 12, color: revDelta > 0 ? T.green : T.red, fontWeight: 700 }}>
                {revDelta > 0 ? "+" : ""}{revDelta}% → £{Math.round(adjRev)}k/mo
              </span>
            </div>
            <input type="range" min={-50} max={100} value={revDelta}
              onChange={e => setRevDelta(Number(e.target.value))}
              style={{ width: "100%", accentColor: T.gold }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: T.txt3 }}>
              <span>-50% (downturn)</span><span>+100% (upside)</span>
            </div>
          </div>

          {/* Scenario result */}
          <div style={{ marginTop: 20, background: T.bg, borderRadius: 8, padding: 14, border: `1px solid ${runwayColor}40` }}>
            <div style={{ fontSize: 10, color: T.txt3, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Scenario Runway</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: runwayColor, fontFamily: "Georgia,serif" }}>
              {adjRunway.toFixed(1)}<span style={{ fontSize: 16 }}>mo</span>
            </div>
            <div style={{ fontSize: 11, color: runwayDiff >= 0 ? T.green : T.red, marginTop: 4 }}>
              {runwayDiff >= 0 ? "+" : ""}{runwayDiff.toFixed(1)}mo vs base ({baseRunway.toFixed(1)}mo)
            </div>
            {adjRunway < 3 && (
              <div style={{ marginTop: 8, fontSize: 11, color: T.red, fontWeight: 600 }}>
                ⚠ Critical — bridge financing required within 30 days
              </div>
            )}
          </div>
        </div>

        {/* Cash projection chart */}
        <div>
          <div style={{ fontSize: 10, color: T.txt3, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>6-Month Cash Projection</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid stroke={T.border} strokeDasharray="2 4" />
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: T.txt3 }} />
              <YAxis tick={{ fontSize: 9, fill: T.txt3 }} tickFormatter={v => `£${v}k`} />
              <Tooltip contentStyle={{ background: T.card, border: `1px solid ${T.border}`, fontSize: 11 }}
                formatter={(v, n) => [`£${v}k`, n === "cash" ? "Scenario" : "Base case"]} />
              <Line type="monotone" dataKey="baseCash" stroke={T.txt3} strokeWidth={1} strokeDasharray="4 4" dot={false} name="baseCash" />
              <Line type="monotone" dataKey="cash" stroke={runwayColor} strokeWidth={2} dot={false} name="cash" />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 16, marginTop: 6, justifyContent: "center" }}>
            <span style={{ fontSize: 9, color: T.txt3 }}>-- Base case</span>
            <span style={{ fontSize: 9, color: runwayColor }}>— Scenario</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// IRR / MOIC table
// ─────────────────────────────────────────────────────────────────
function IRRTable() {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 20, marginBottom: 24 }}>
      <div style={{ fontSize: 11, color: T.gold, letterSpacing: 3, textTransform: "uppercase", marginBottom: 14 }}>Returns Tracker</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${T.border}` }}>
            {["Company", "Stage", "IRR", "MOIC", "Health", "Runway"].map(h => (
              <th key={h} style={{ fontSize: 10, color: T.txt3, padding: "6px 10px", textAlign: "left", fontWeight: 400 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...COMPANIES].sort((a, b) => b.irr - a.irr).map((c, i) => (
            <tr key={c.id} style={{ borderBottom: `1px solid ${T.border}20` }}>
              <td style={{ padding: "10px 10px" }}>
                <div style={{ fontSize: 13, color: T.txt1, fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 9, color: T.txt3 }}>{c.sector}</div>
              </td>
              <td style={{ padding: "10px 10px", fontSize: 11, color: T.txt2 }}>{c.stage}</td>
              <td style={{ padding: "10px 10px" }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: c.irr > 30 ? T.green : c.irr > 15 ? T.amber : T.red, fontFamily: "Georgia,serif" }}>
                  {c.irr}%
                </span>
              </td>
              <td style={{ padding: "10px 10px" }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: c.moic > 2 ? T.green : c.moic > 1 ? T.amber : T.red, fontFamily: "Georgia,serif" }}>
                  {c.moic}x
                </span>
              </td>
              <td style={{ padding: "10px 10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 60, height: 5, background: T.border, borderRadius: 3 }}>
                    <div style={{ width: `${c.score}%`, height: "100%", background: RAG_COLOR[c.rag], borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 11, color: RAG_COLOR[c.rag] }}>{c.score}</span>
                </div>
              </td>
              <td style={{ padding: "10px 10px" }}>
                <span style={{ fontSize: 13, color: c.runway < 3 ? T.red : c.runway < 6 ? T.amber : T.green }}>
                  {c.runway}mo
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 10, fontSize: 9, color: T.txt3 }}>IRR and MOIC are fund model figures · Updated quarterly</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Attention Required panel (AI-powered)
// ─────────────────────────────────────────────────────────────────
// The five actions the portfolio most needs, computed from the finance model.
// These were five hardcoded rows, one of which read "£7.2k overdue AR — DIISR
// and Rex Media Group require escalation": Meridian's overdue balance is £73k
// and neither debtor exists in the ledger. Refresh calls the same calculation
// server-side; the initial render does not wait for the network.
const STATIC_ACTIONS = attentionActions();

function AttentionPanel() {
  const [loading, setLoading] = useState(false);
  const [actions, setActions] = useState(STATIC_ACTIONS);
  const [live, setLive] = useState(false);

  // Previously the reply was fetched and discarded — only `live` was read, so
  // the button lit a badge and left the stale rows exactly where they were.
  async function refresh() {
    setLoading(true);
    try {
      const r = await fetch("/api/ai/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "attention" }),
      });
      const d = await r.json();
      if (Array.isArray(d.actions) && d.actions.length) setActions(d.actions);
      setLive(!!d.live);
    } catch (e) {
      // Leave what is on screen rather than replace it with nothing.
    }
    setLoading(false);
  }

  const sevColor = { critical: T.red, high: T.amber, medium: "#E0C088" };

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 20, marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: T.gold, letterSpacing: 3, textTransform: "uppercase" }}>Attention Required Today</div>
          <div style={{ fontSize: 10, color: T.txt3, marginTop: 2 }}>
            {live ? "● Grok · live analysis" : "● Static · add XAI_API_KEY for live AI"}
          </div>
        </div>
        <button onClick={refresh} disabled={loading}
          style={{ padding: "6px 14px", background: "transparent", border: `1px solid ${T.gold}`, color: T.gold, borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
          {loading ? "Analysing…" : "↻ Refresh"}
        </button>
      </div>
      {actions.map((a, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: i < actions.length - 1 ? `1px solid ${T.border}40` : "none" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: sevColor[a.severity], marginTop: 5, flexShrink: 0, boxShadow: `0 0 6px ${sevColor[a.severity]}` }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: T.txt1 }}>{a.action}</div>
            <div style={{ fontSize: 10, color: T.txt3, marginTop: 2 }}>
              {a.company} · {a.owner} · Due {a.due}{a.rationale ? ` · ${a.rationale}` : ""}
            </div>
          </div>
          <div style={{ fontSize: 9, color: sevColor[a.severity], textTransform: "uppercase", letterSpacing: 1, flexShrink: 0 }}>{a.severity}</div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Board Pack Export
// ─────────────────────────────────────────────────────────────────
function BoardPackExport() {
  const [selected, setSelected] = useState("meridian");
  const [generating, setGenerating] = useState(false);
  const [pack, setPack] = useState(null);
  const [live, setLive] = useState(false);

  const co = COMPANIES.find(c => c.id === selected);

  async function generate() {
    setGenerating(true);
    setPack(null);
    try {
      const r = await fetch("/api/ai/boardpack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: co, finance: {} }),
      });
      const d = await r.json();
      setPack(d.pack);
      setLive(d.live);
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  }

  function exportHTML() {
    if (!pack) return;
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Board Pack — ${co.name}</title>
<style>
  body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; color: #1a1a2e; line-height: 1.6; }
  h1 { font-size: 28px; border-bottom: 2px solid #C5A572; padding-bottom: 12px; }
  h2 { font-size: 16px; color: #C5A572; text-transform: uppercase; letter-spacing: 2px; margin-top: 28px; }
  .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin: 16px 0; }
  .kpi { background: #f8f7f4; padding: 12px; border-radius: 6px; text-align: center; }
  .kpi-val { font-size: 22px; font-weight: 700; }
  .kpi-label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
  .kpi-vs { font-size: 11px; color: #888; }
  .green { color: #2d8a5e; } .amber { color: #c87d0e; } .red { color: #c0392b; }
  .risk { background: #fff8f0; border-left: 3px solid #c87d0e; padding: 10px 14px; margin: 8px 0; border-radius: 0 6px 6px 0; }
  .action { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 13px; }
  .badge { background: #C5A572; color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 10px; }
  .footer { margin-top: 40px; font-size: 11px; color: #aaa; border-top: 1px solid #eee; padding-top: 12px; }
</style></head><body>
<h1>Board Pack — ${co.name}</h1>
<div class="meta">Prepared by Alba PIP · Caledonia Alba · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · ${live ? "AI-generated by Grok" : "AI-assisted · Demo"}</div>
<h2>Executive Summary</h2>
<p>${pack.executiveSummary}</p>
<h2>Key Metrics</h2>
<div class="kpi-grid">
${pack.keyMetrics.map(m => `<div class="kpi"><div class="kpi-val ${m.rag}">${m.value}</div><div class="kpi-label">${m.label}</div><div class="kpi-vs">vs ${m.vs}</div></div>`).join("")}
</div>
<h2>Key Risks</h2>
${pack.risks.map(r => `<div class="risk"><strong>${r.title}</strong><br>${r.detail}</div>`).join("")}
<h2>Opportunities</h2>
${pack.opportunities.map(o => `<div class="risk" style="border-color:#2d8a5e;background:#f0fff8"><strong>${o.title}</strong><br>${o.detail}</div>`).join("")}
<h2>Recommended Actions</h2>
${pack.actions.map(a => `<div class="action"><span>${a.action}</span><div style="text-align:right;flex-shrink:0;margin-left:12px"><div style="font-size:11px;color:#888">${a.owner} · ${a.deadline}</div><span class="badge">${a.priority}</span></div></div>`).join("")}
<h2>Outlook</h2>
<p>${pack.outlook}</p>
<div class="footer">Alba PIP · Caledonia Alba · Portfolio Intelligence Platform · Confidential</div>
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `BoardPack_${co.name.replace(/\s/g, "_")}_${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
  }

  const ragCol = { green: T.green, amber: T.amber, red: T.red };

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 20, marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: T.gold, letterSpacing: 3, textTransform: "uppercase" }}>Board Pack Export</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select value={selected} onChange={e => { setSelected(e.target.value); setPack(null); }}
            style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.txt1, borderRadius: 6, padding: "4px 10px", fontSize: 12 }}>
            {COMPANIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={generate} disabled={generating}
            style={{ padding: "6px 16px", background: T.gold, border: "none", color: "#0B0F1C", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            {generating ? "Generating…" : "Generate Pack"}
          </button>
          {pack && (
            <button onClick={exportHTML}
              style={{ padding: "6px 16px", background: "transparent", border: `1px solid ${T.green}`, color: T.green, borderRadius: 6, fontSize: 12, cursor: "pointer" }}>
              ↓ Export
            </button>
          )}
        </div>
      </div>

      {!pack && !generating && (
        <div style={{ textAlign: "center", padding: "32px 0", color: T.txt3 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 13 }}>Select a company and click Generate Pack</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>{live ? "Powered by Grok · live AI" : "Demo mode — add XAI_API_KEY for live AI generation"}</div>
        </div>
      )}

      {generating && (
        <div style={{ textAlign: "center", padding: "32px 0", color: T.txt2 }}>
          <div style={{ fontSize: 13 }}>Grok is analysing {co.name}…</div>
          <div style={{ marginTop: 12, display: "flex", justifyContent: "center", gap: 6 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: T.gold, animation: `pulse 1.2s ease-in-out ${i * 0.4}s infinite` }} />
            ))}
          </div>
        </div>
      )}

      {pack && (
        <div>
          <div style={{ fontSize: 12, color: T.txt2, marginBottom: 12, fontStyle: "italic" }}>
            {live ? `Generated by Grok (grok-2-1212) · ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : "Demo mode — representative content"}
          </div>
          <div style={{ marginBottom: 12, padding: 14, background: T.bg, borderRadius: 8, fontSize: 13, color: T.txt1, lineHeight: 1.6 }}>
            {pack.executiveSummary}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
            {pack.keyMetrics?.map((m, i) => (
              <div key={i} style={{ background: T.bg, borderRadius: 8, padding: 10, textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: ragCol[m.rag] || T.gold, fontFamily: "Georgia,serif" }}>{m.value}</div>
                <div style={{ fontSize: 9, color: T.txt3, textTransform: "uppercase", letterSpacing: 1 }}>{m.label}</div>
                <div style={{ fontSize: 9, color: T.txt3 }}>{m.vs}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: T.txt2 }}>
            {pack.actions?.slice(0, 2).map((a, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${T.border}40` }}>
                <span>{a.action}</span>
                <span style={{ color: T.txt3, fontSize: 10, flexShrink: 0, marginLeft: 8 }}>{a.owner} · {a.deadline}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main Portfolio Analytics view
// ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
// HubSpot Pipeline Panel
// ─────────────────────────────────────────────────────────────────
function HubSpotPipeline({ hubspot }) {
  const STAGE_COLORS = {
    "Qualified": T.blue, "Meeting Set": T.blue, "Demo": T.gold,
    "Proposal": T.amber, "Contract Sent": T.amber, "Won": T.green, "Lost": T.red,
  };

  // Fallback seed data when not connected
  const seedDeals = [
    { name: "Enterprise SaaS Renewal", amount: 84000, stage: "Contract Sent", probability: 85 },
    { name: "HealthTech Platform", amount: 62000, stage: "Proposal", probability: 60 },
    { name: "Logistics Dashboard", amount: 45000, stage: "Demo", probability: 40 },
    { name: "PE Fund Analytics", amount: 120000, stage: "Qualified", probability: 20 },
    { name: "Manufacturing ERP", amount: 38000, stage: "Meeting Set", probability: 30 },
    { name: "Retail Intelligence", amount: 29000, stage: "Proposal", probability: 55 },
  ];

  const deals = hubspot?.connected ? (hubspot.data?.topDeals || []) : seedDeals;
  const pipelineValue = hubspot?.connected ? hubspot.data?.pipelineValue : deals.reduce((s,d)=>s+d.amount,0);
  const weightedValue = hubspot?.connected ? hubspot.data?.weightedValue : Math.round(deals.reduce((s,d)=>s+(d.amount*d.probability/100),0));
  const contactCount = hubspot?.connected ? hubspot.data?.contactCount : 247;
  const companyCount = hubspot?.connected ? hubspot.data?.companyCount : 84;

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 20, marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: T.gold, letterSpacing: 3, textTransform: "uppercase" }}>HubSpot CRM Pipeline</div>
          <div style={{ fontSize: 10, color: T.txt3, marginTop: 2 }}>
            {hubspot?.connected ? `● HubSpot live · ${new Date(hubspot.syncedAt).toLocaleTimeString("en-GB", {hour:"2-digit",minute:"2-digit"})}` : "● Simulated · add HUBSPOT_ACCESS_TOKEN for live data"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          {[
            ["Pipeline", `£${(pipelineValue/1000).toFixed(0)}k`, T.gold],
            ["Weighted", `£${(weightedValue/1000).toFixed(0)}k`, T.blue],
            ["Contacts", contactCount, T.txt2],
            ["Companies", companyCount, T.txt2],
          ].map(([l,v,c]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: c, fontFamily: "Georgia,serif" }}>{v}</div>
              <div style={{ fontSize: 9, color: T.txt3, textTransform: "uppercase", letterSpacing: 1 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${T.border}` }}>
            {["Deal", "Stage", "Value", "Probability", "Weighted"].map(h => (
              <th key={h} style={{ fontSize: 10, color: T.txt3, padding: "6px 10px", textAlign: "left", fontWeight: 400 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {deals.map((d, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${T.border}20` }}>
              <td style={{ padding: "10px 10px", fontSize: 13, color: T.txt1 }}>{d.name || d.dealname}</td>
              <td style={{ padding: "10px 10px" }}>
                <span style={{ fontSize: 10, color: STAGE_COLORS[d.stage] || T.txt2, background: `${STAGE_COLORS[d.stage] || T.txt2}20`, padding: "3px 8px", borderRadius: 10 }}>
                  {d.stage}
                </span>
              </td>
              <td style={{ padding: "10px 10px", fontSize: 13, color: T.gold, fontWeight: 600 }}>
                £{(d.amount/1000).toFixed(0)}k
              </td>
              <td style={{ padding: "10px 10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 60, height: 4, background: T.border, borderRadius: 2 }}>
                    <div style={{ width: `${d.probability}%`, height: "100%", background: T.blue, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 11, color: T.txt2 }}>{d.probability}%</span>
                </div>
              </td>
              <td style={{ padding: "10px 10px", fontSize: 13, color: T.blue }}>
                £{Math.round(d.amount * d.probability / 100 / 1000)}k
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PortfolioAnalytics() {
  const [stripe, setStripe] = useState(null);
  const [hubspot, setHubspot] = useState(null);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    fetch("/api/stripe/data").then(r => r.json()).then(setStripe).catch(() => {});
    fetch("/api/hubspot/data").then(r => r.json()).then(setHubspot).catch(() => {});
  }, []);

  const TABS = [
    { id: "overview", l: "Overview" },
    { id: "pipeline", l: "CRM Pipeline" },
    { id: "heatmap", l: "RAG Heatmap" },
    { id: "scenario", l: "Scenario Planning" },
    { id: "returns", l: "Returns" },
    { id: "boardpack", l: "Board Pack" },
  ];

  return (
    <div style={{ background: T.bg, minHeight: "100vh", padding: "28px 32px", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color: T.txt1 }}>
      <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: T.gold, letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 }}>Caledonia Alba · Portfolio Intelligence</div>
        <h1 style={{ margin: 0, fontFamily: "Georgia,serif", fontSize: 28, color: T.txt1 }}>Portfolio Analytics</h1>
        <div style={{ fontSize: 12, color: T.txt2, marginTop: 4 }}>
          Fund overview · Scenario modelling · Returns · Board packs
          {stripe?.connected && <span style={{ marginLeft: 12, color: T.green }}>● Stripe live</span>}
          {hubspot?.connected && <span style={{ marginLeft: 12, color: T.green }}>● HubSpot live</span>}
        </div>
      </div>

      {/* Fund KPI Banner — always visible */}
      <KPIBanner stripe={stripe} />

      {/* Tab nav */}
      <div style={{ display: "flex", gap: 2, marginBottom: 24, background: T.card, borderRadius: 8, padding: 4, width: "fit-content" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "7px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500,
              background: tab === t.id ? T.gold : "transparent",
              color: tab === t.id ? "#0B0F1C" : T.txt2, transition: "all 0.15s" }}>
            {t.l}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <>
          <AttentionPanel />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div><RAGHeatmap /></div>
            <div><HubSpotPipeline hubspot={hubspot} /></div>
          </div>
        </>
      )}
      {tab === "pipeline" && <HubSpotPipeline hubspot={hubspot} />}
      {tab === "heatmap" && <RAGHeatmap />}
      {tab === "scenario" && <ScenarioPlanner />}
      {tab === "returns" && <IRRTable />}
      {tab === "boardpack" && <BoardPackExport />}
    </div>
  );
}

import { useState } from "react";
import { C } from "../lib/theme.js";

// Palette from the shared design tokens. Every view used to carry its own
// copy of this object, seventeen of them, each a shade adrift of the next.
const T = {
  bg: C.bg,
  surface: C.bgDeep,
  card: C.surface,
  border: C.border,
  borderLt: C.borderLt,
  green: C.green,
  greenDim: C.greenSoft,
  amber: C.amber,
  amberDim: C.amberSoft,
  red: C.red,
  redDim: C.redSoft,
  blue: C.blue,
  blueDim: C.blueSoft,
  purple: C.purple,
  purpleDim: C.purpleSoft,
  teal: C.teal,
  tealDim: C.tealSoft,
  txt1: C.txt1,
  txt2: C.txt2,
  txt3: C.txt3
};

const IMPROVEMENTS = [
  // ── VISUAL / UI ───────────────────────────────────────────────────────────
  { id:1,  cat:"Visual & UI",    impact:"high",   effort:"low",   day:1,
    title:"Premium typography",
    what:"Replace system font with DM Sans (headings) + DM Mono (numbers). Transforms the professional feel immediately.",
    result:"Looks like a £500/mo SaaS product instead of a prototype" },

  { id:2,  cat:"Visual & UI",    impact:"high",   effort:"low",   day:1,
    title:"Skeleton loading screens",
    what:"Grey animated placeholders while data loads instead of blank screens. Every chart and KPI tile gets one.",
    result:"Feels responsive and production-grade from first click" },

  { id:3,  cat:"Visual & UI",    impact:"high",   effort:"low",   day:1,
    title:"Smooth page transitions",
    what:"Fade + slide animations between views. 200ms ease. Feels like a real app not a page reload.",
    result:"Demo quality jumps immediately — biggest bang for effort" },

  { id:4,  cat:"Visual & UI",    impact:"high",   effort:"low",   day:1,
    title:"Toast notifications",
    what:"Pop-up alerts when a threshold is breached, action completed, or data synced. Slides in from top-right.",
    result:"Reinforces the 'live system' feel — something is always happening" },

  { id:5,  cat:"Visual & UI",    impact:"medium", effort:"low",   day:2,
    title:"Hover micro-interactions",
    what:"Cards lift on hover (box-shadow + translateY). Buttons pulse. KPI tiles flash on value change. Charts highlight on hover.",
    result:"Makes every interaction feel intentional and premium" },

  { id:6,  cat:"Visual & UI",    impact:"medium", effort:"low",   day:2,
    title:"Dark / light mode toggle",
    what:"Full light mode (white background, ink text) for boardroom projector use. One button switches. CSS variables make it trivial.",
    result:"Essential for demos — projectors wash out dark themes" },

  { id:7,  cat:"Visual & UI",    impact:"medium", effort:"medium",day:3,
    title:"Responsive layout",
    what:"Portfolio table collapses to cards on tablet. Sidebar collapses to bottom nav on mobile. Charts reflow.",
    result:"Works on iPad for boardroom demos, phone for on-the-go" },

  { id:8,  cat:"Visual & UI",    impact:"medium", effort:"low",   day:2,
    title:"Better chart tooltips",
    what:"Rich tooltips showing value, delta, budget, trend direction. Formatted currency. Source attribution.",
    result:"Charts tell a story when you hover, not just show a number" },

  // ── NAVIGATION & UX ───────────────────────────────────────────────────────
  { id:9,  cat:"Navigation & UX", impact:"high",  effort:"low",   day:2,
    title:"Portfolio search + filter bar",
    what:"Live search by company name. Filter chips: sector, stage, status (Red/Amber/Green), runway <6mo. Instant results.",
    result:"GP can slice a 30-company portfolio in seconds — huge demo moment" },

  { id:10, cat:"Navigation & UX", impact:"high",  effort:"medium",day:3,
    title:"Company comparison view",
    what:"Select 2–3 companies → side-by-side KPI comparison. Same metric, different companies. Sector benchmark overlay.",
    result:"The cross-portfolio analysis GPs do manually in Excel — done in 2 clicks" },

  { id:11, cat:"Navigation & UX", impact:"medium",effort:"low",   day:2,
    title:"Keyboard shortcuts",
    what:"/ to search, 1-5 to jump between companies, Esc to go back, ← → to navigate company tabs.",
    result:"Power users feel at home. Impressive in live demos." },

  { id:12, cat:"Navigation & UX", impact:"medium",effort:"low",   day:2,
    title:"Breadcrumb + back navigation",
    what:"Portfolio → a company → Finance. Click any level to jump back. History preserved.",
    result:"Users never feel lost. Reduces demo friction." },

  { id:13, cat:"Navigation & UX", impact:"medium",effort:"medium",day:4,
    title:"Notification centre",
    what:"Bell icon with unread count. Slide-out panel of all alerts, actions due, data freshness warnings. Mark all read.",
    result:"Completes the 'operating system' feel" },

  // ── CHARTS & DATA VIZ ─────────────────────────────────────────────────────
  { id:14, cat:"Charts & Visualisation", impact:"high",  effort:"medium",day:3,
    title:"Portfolio analytics page",
    what:"Fund-level aggregate charts: total AUM exposure by status, sector breakdown donut, portfolio health distribution histogram, combined cash runway waterfall.",
    result:"The single most impressive screen for a GP — fund-wide pattern recognition" },

  { id:15, cat:"Charts & Visualisation", impact:"high",  effort:"medium",day:3,
    title:"Forecast overlay on all charts",
    what:"Dashed line extending 6 months forward from current data. Shaded confidence interval. 'At current trajectory' label.",
    result:"Answers the GP's core question: where is this going, not just where is it now" },

  { id:16, cat:"Charts & Visualisation", impact:"high",  effort:"low",   day:2,
    title:"Sparklines in portfolio table",
    what:"12-month mini trend line in each row for revenue, cash, attrition. 60px wide. Instantly shows trajectory.",
    result:"Portfolio table goes from a snapshot to a motion picture" },

  { id:17, cat:"Charts & Visualisation", impact:"medium",effort:"medium",day:4,
    title:"Waterfall / bridge charts",
    what:"Revenue bridge (budget → actual, showing drivers). Cash waterfall (opening → inflows → outflows → closing). Budget variance bridge.",
    result:"The charts finance people actually use. Highly credible with CFOs." },

  { id:18, cat:"Charts & Visualisation", impact:"medium",effort:"low",   day:3,
    title:"RAG heatmap grid",
    what:"Portfolio companies as rows, departments as columns. Each cell is green/amber/red. Instantly shows which company has which problem.",
    result:"One screen that answers 'where are the problems across the portfolio'" },

  // ── FEATURES ──────────────────────────────────────────────────────────────
  { id:19, cat:"Features",        impact:"high",  effort:"medium",day:4,
    title:"Board pack generator",
    what:"One-click PDF export: company summary, KPI charts, alerts, actions, AI commentary. Formatted for print. Uses browser print API.",
    result:"Replaces the 2-day manual board pack process. Best demo moment for GPs." },

  { id:20, cat:"Features",        impact:"high",  effort:"low",   day:2,
    title:"CSV / Excel upload",
    what:"Drag-and-drop file upload for portfolio company data. Parses common column names → canonical KPI schema. Shows import preview.",
    result:"Portfolio companies without integrations can still submit data. Covers the gap." },

  { id:21, cat:"Features",        impact:"high",  effort:"medium",day:5,
    title:"Scenario planning slider",
    what:"Slide burn rate ±20%, revenue growth ±30% → runway and EBITDA projections update in real time. Visual and interactive.",
    result:"GPs use this in board meetings. High-impact 60-second demo moment." },

  { id:22, cat:"Features",        impact:"medium",effort:"medium",day:5,
    title:"Value creation plan tracker",
    what:"Per company: list of strategic initiatives, owner, milestone dates, status, linked KPIs. Shows progress against investment thesis.",
    result:"Differentiates from pure reporting — this is an operating system for value creation" },

  { id:23, cat:"Features",        impact:"medium",effort:"low",   day:3,
    title:"Company news feed",
    what:"NewsAPI integration pulling headlines for each portfolio company name. Shown on company overview. Sentiment indicator.",
    result:"External signal alongside internal data. Genuinely live from day one." },

  { id:24, cat:"Features",        impact:"medium",effort:"medium",day:5,
    title:"Investment timeline",
    what:"Per company: investment date, entry valuation, key milestones, capital deployed, current implied valuation. Visual timeline.",
    result:"Contextualises all KPI data against the investment story" },

  // ── DATA QUALITY ──────────────────────────────────────────────────────────
  { id:25, cat:"Data Quality",    impact:"high",  effort:"medium",day:4,
    title:"Richer seed data — 24 months",
    what:"Extend all company histories to 24 months. Add budget lines, forecast lines, prior year comparisons. Each company has a coherent story arc.",
    result:"Charts have depth. Trend analysis is meaningful. Demo is more convincing." },

  { id:26, cat:"Data Quality",    impact:"high",  effort:"low",   day:2,
    title:"Budget vs forecast vs actual — three lines on every chart",
    what:"Budget (plan at start of year), Forecast (current view), Actual (what happened). Three distinct lines, different styles.",
    result:"This is how FDs and GPs actually read performance. Much more credible." },

  { id:27, cat:"Data Quality",    impact:"medium",effort:"low",   day:3,
    title:"Data quality warnings",
    what:"Yellow banner on stale data. 'Last updated 3 days ago — may not reflect current position.' Confidence score visible without clicking.",
    result:"Shows the platform is honest about data quality — builds trust" },

  { id:28, cat:"Data Quality",    impact:"medium",effort:"medium",day:5,
    title:"Manual override with audit trail",
    what:"Any KPI can be overridden with a reason. Override shown with 📝 icon. Full history of changes. GP can see who changed what and when.",
    result:"Addresses the 'what if the data is wrong' objection immediately" },
];

const CATS  = ["All", ...Array.from(new Set(IMPROVEMENTS.map(i=>i.cat)))];
const DAYS  = [1,2,3,4,5];
const DAY_LABELS = {1:"Day 1 — Mon",2:"Day 2 — Tue",3:"Day 3 — Wed",4:"Day 4 — Thu",5:"Day 5 — Fri"};

const impactCol = { high:T.green, medium:T.amber, low:T.txt3 };
const effortCol = { low:T.green,  medium:T.amber, high:T.red  };

export default function Improvements() {
  const [cat,    setCat]    = useState("All");
  const [opened, setOpened] = useState(null);
  const [view,   setView]   = useState("priority"); // priority | day

  const visible = IMPROVEMENTS.filter(i => cat==="All" || i.cat===cat);
  const highImpactLow = visible.filter(i=>i.impact==="high"&&i.effort==="low");
  const highImpactMed = visible.filter(i=>i.impact==="high"&&i.effort==="medium");
  const medImpact     = visible.filter(i=>i.impact==="medium");

  const Card = ({ item }) => {
    const open = opened===item.id;
    return (
      <div onClick={()=>setOpened(open?null:item.id)}
        style={{ background:open?T.card:"transparent", border:`1px solid ${open?T.borderLt:T.border}`,
                 borderRadius:8, padding:"11px 13px", cursor:"pointer", transition:"all 0.15s",
                 borderLeft:`3px solid ${impactCol[item.impact]}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", gap:7, alignItems:"center", marginBottom:4, flexWrap:"wrap" }}>
              <span style={{ color:T.txt1, fontSize:12, fontWeight:600 }}>{item.title}</span>
              <span style={{ padding:"1px 6px", background:impactCol[item.impact]+"18", color:impactCol[item.impact], fontSize:8, fontWeight:700, borderRadius:3 }}>
                {item.impact.toUpperCase()} IMPACT
              </span>
              <span style={{ padding:"1px 6px", background:effortCol[item.effort]+"18", color:effortCol[item.effort], fontSize:8, fontWeight:700, borderRadius:3 }}>
                {item.effort.toUpperCase()} EFFORT
              </span>
              <span style={{ color:T.txt3, fontSize:9 }}>Day {item.day}</span>
            </div>
            <div style={{ color:T.txt3, fontSize:10, lineHeight:1.4 }}>{item.what}</div>
          </div>
        </div>
        {open && (
          <div style={{ marginTop:10, padding:"9px 11px", background:T.surface, borderRadius:6, border:`1px solid ${T.border}` }}>
            <div style={{ color:T.txt3, fontSize:9, marginBottom:3 }}>DEMO IMPACT</div>
            <div style={{ color:T.green, fontSize:11, lineHeight:1.5 }}>→ {item.result}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ background:T.bg, minHeight:"100vh", padding:"24px 28px",
                  fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color:T.txt1 }}>

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ color:T.txt3, fontSize:9, letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:4 }}>
          Alba PIP · 7-Day Sprint
        </div>
        <h1 style={{ fontSize:20, fontWeight:800, margin:0 }}>UI & Feature Improvements</h1>
        <div style={{ color:T.txt3, fontSize:11, marginTop:4 }}>
          {IMPROVEMENTS.length} improvements identified · {IMPROVEMENTS.filter(i=>i.impact==="high"&&i.effort==="low").length} high-impact / low-effort wins · Click any card for demo impact
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, marginBottom:20 }}>
        {[
          { l:"Total improvements",     v:IMPROVEMENTS.length,                                            c:T.txt1 },
          { l:"High impact / low effort",v:IMPROVEMENTS.filter(i=>i.impact==="high"&&i.effort==="low").length, c:T.green },
          { l:"High impact / med effort",v:IMPROVEMENTS.filter(i=>i.impact==="high"&&i.effort==="medium").length,c:T.amber },
          { l:"Visual / UX wins",       v:IMPROVEMENTS.filter(i=>i.cat==="Visual & UI").length,            c:T.blue },
          { l:"New features",           v:IMPROVEMENTS.filter(i=>i.cat==="Features").length,               c:T.purple },
        ].map(s=>(
          <div key={s.l} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:8, padding:"12px 14px" }}>
            <div style={{ color:T.txt3, fontSize:9, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:4 }}>{s.l}</div>
            <div style={{ color:s.c, fontSize:22, fontWeight:800, fontFamily:"monospace" }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ display:"flex", gap:4 }}>
          {["priority","day"].map(v=>(
            <button key={v} onClick={()=>setView(v)} style={{ padding:"6px 14px", background:view===v?T.blue:"transparent", border:`1px solid ${view===v?T.blue:T.border}`, borderRadius:6, color:view===v?"#fff":T.txt3, cursor:"pointer", fontSize:10, fontWeight:view===v?700:400 }}>
              {v==="priority"?"By Priority":"By Day"}
            </button>
          ))}
        </div>
        <div style={{ width:1, height:20, background:T.border }}/>
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {CATS.map(c=>(
            <button key={c} onClick={()=>setCat(c)} style={{ padding:"5px 11px", background:cat===c?T.surface:"transparent", border:`1px solid ${cat===c?T.borderLt:T.border}`, borderRadius:5, color:cat===c?T.txt1:T.txt3, cursor:"pointer", fontSize:9 }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* BY PRIORITY VIEW */}
      {view==="priority" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

          {/* Do first */}
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
              <span style={{ color:T.green, fontSize:9, fontWeight:700, letterSpacing:"0.1em" }}>🎯 DO FIRST — HIGH IMPACT / LOW EFFORT ({highImpactLow.length})</span>
              <div style={{ flex:1, height:1, background:T.green+"33" }}/>
              <span style={{ color:T.txt3, fontSize:9 }}>Days 1–2</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
              {highImpactLow.map(i=><Card key={i.id} item={i}/>)}
            </div>
          </div>

          {/* Do second */}
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
              <span style={{ color:T.amber, fontSize:9, fontWeight:700, letterSpacing:"0.1em" }}>⚡ HIGH VALUE — HIGH IMPACT / MEDIUM EFFORT ({highImpactMed.length})</span>
              <div style={{ flex:1, height:1, background:T.amber+"33" }}/>
              <span style={{ color:T.txt3, fontSize:9 }}>Days 3–5</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
              {highImpactMed.map(i=><Card key={i.id} item={i}/>)}
            </div>
          </div>

          {/* Medium */}
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
              <span style={{ color:T.blue, fontSize:9, fontWeight:700, letterSpacing:"0.1em" }}>→ MEDIUM IMPACT ({medImpact.length})</span>
              <div style={{ flex:1, height:1, background:T.blue+"33" }}/>
              <span style={{ color:T.txt3, fontSize:9 }}>Fill remaining time</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
              {medImpact.map(i=><Card key={i.id} item={i}/>)}
            </div>
          </div>
        </div>
      )}

      {/* BY DAY VIEW */}
      {view==="day" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {DAYS.map(day=>{
            const items = visible.filter(i=>i.day===day);
            if (!items.length) return null;
            const highCount = items.filter(i=>i.impact==="high").length;
            return (
              <div key={day}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                  <span style={{ color:T.txt2, fontSize:10, fontWeight:700 }}>{DAY_LABELS[day]}</span>
                  <span style={{ color:T.green, fontSize:9 }}>{highCount} high-impact</span>
                  <span style={{ color:T.txt3, fontSize:9 }}>· {items.length} total</span>
                  <div style={{ flex:1, height:1, background:T.border }}/>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
                  {items.map(i=><Card key={i.id} item={i}/>)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop:28, padding:"14px 16px", background:T.card, border:`1px solid ${T.border}`, borderRadius:8, color:T.txt3, fontSize:10, lineHeight:1.7 }}>
        <span style={{ color:T.txt1, fontWeight:600 }}>Realistic 7-day scope for 1 developer:</span> Days 1–2 focus entirely on the high-impact / low-effort wins — typography, transitions, skeleton loaders, search/filter, sparklines, toast notifications, dark/light mode. These alone transform how the prototype looks and feels. Days 3–5 tackle the bigger features — portfolio analytics, forecast overlays, comparison view, board pack export, scenario planning. Day 6–7 for polish, data depth, and demo run-throughs. Click any card to see the specific demo moment each improvement creates.
      </div>
    </div>
  );
}

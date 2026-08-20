import { useState, useMemo } from "react";
import { C, F, S, label as labelStyle } from "../lib/theme.js";
import { PageHeader, Chip, Metric } from "../components/Shell.jsx";
import ReportPanel from "../components/ReportPanel.jsx";
import { buildInvestigation, investigationTargets } from "../lib/investigation.js";
import { buildInvestigationReport } from "../lib/reports.js";
import { COMPANIES } from "../lib/companies.js";
import { attentionActions } from "../lib/investigation.js";
import { fmtMoney } from "../lib/fx.js";

// Every demo below posts to /api/ai/agent, which grounds the request on the
// finance model server-side. It previously called api.anthropic.com direct from
// the browser with no Authorization header — three requests that could only
// ever fail, silently caught, leaving a scripted demo that looked live.
async function askAgent(body) {
  const r = await fetch("/api/ai/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`agent ${r.status}`);
  return r.json();
}

// Palette from the shared design tokens. Every view used to carry its own
// copy of this object, seventeen of them, each a shade adrift of the next.
const T = {
  bg: C.bg,
  surface: C.bgDeep,
  card: C.surface,
  cardHov: C.surfaceUp,
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
  pink: C.pink,
  pinkDim: C.pinkSoft,
  txt1: C.txt1,
  txt2: C.txt2,
  txt3: C.txt3
};

// ── AGENT REGISTRY ────────────────────────────────────────────────────────────
const AGENTS = [
  // ── MONITORING ────────────────────────────────────────────────────────────
  {
    id:"monitor", cat:"Monitoring", tier:"prototype", icon:"👁",
    name:"Portfolio Monitor Agent",
    tagline:"Watches every KPI across the portfolio autonomously. You don't have to.",
    color:T.red,
    what:"Runs on a schedule (every 15 mins in production, every interaction in prototype). Checks all KPI thresholds for all portfolio companies. When a value breaches a threshold, it: (1) evaluates severity, (2) cross-references related KPIs to assess whether it's a one-off or systemic, (3) drafts an alert with context, (4) suggests an action. No human triggered it.",
    prototype:"Runs against the seeded portfolio data on page load. Fires toast alerts when it detects threshold breaches. Shows its reasoning chain.",
    production:"Scheduled Lambda function every 15 minutes. Writes alerts to database. Routes notifications by severity and company ownership. Sends push/email to relevant GP.",
    tools:["KPI database query","Threshold config lookup","Alert creation","Email/push notification"],
    why:"GPs currently catch problems when portfolio companies report them — often weeks late. This agent catches them before the P&L shows it.",
    build:"Claude API + scheduled job + database triggers",
  },
  {
    id:"investigate", cat:"Monitoring", tier:"prototype", icon:"🔍",
    name:"Root Cause Investigation Agent",
    tagline:"When a KPI turns red, it investigates why before you even ask.",
    color:T.amber,
    what:"Triggered by a threshold breach. Runs a multi-step investigation: queries related KPIs, looks for correlations (e.g. cash falling = AR rising + revenue missing), cross-references HR data (high attrition + low headcount = execution risk), then generates a root cause narrative with a chain of evidence. Shows its reasoning steps on screen.",
    prototype:"Live demo — click Investigate on any red KPI. Runs 4–5 visible reasoning steps. Returns root cause + evidence chain, then sets the whole investigation as an A4 PDF from the same object it reasoned over.",
    production:"Auto-triggered by Monitor Agent. Attached to every critical alert. Feeds into action recommendations.",
    tools:["Multi-KPI query","Correlation engine","Historical trend fetch","Narrative generation"],
    why:"A GP seeing 'cash runway 4.8 months' doesn't know if it's an AR problem, a burn problem, or a revenue problem. This agent tells them in 10 seconds.",
    build:"Claude API with tool use + KPI data context",
  },
  {
    id:"anomaly", cat:"Monitoring", tier:"production", icon:"📡",
    name:"Anomaly Detection Agent",
    tagline:"Spots problems before they breach thresholds — the leading indicator layer.",
    color:T.purple,
    what:"Uses statistical models (Prophet, Z-score, IQR) to detect unusual patterns in time-series KPI data — even before values breach RAG thresholds. A revenue number might still be green but trending in a way that historically precedes a miss. The agent flags these 'pre-red' signals.",
    prototype:"Simulated — shows pre-computed anomaly scores on KPI tiles.",
    production:"Python + Prophet on AWS SageMaker. Runs nightly. Feeds anomaly scores into health scoring engine.",
    tools:["Time-series analysis","Historical pattern matching","Statistical scoring","Alert generation"],
    why:"The most valuable early warning system. Tells you a company is deteriorating 4–6 weeks before the numbers confirm it.",
    build:"SageMaker + Prophet + Claude for narrative generation",
  },

  // ── DOCUMENT AI ───────────────────────────────────────────────────────────
  {
    id:"docextract", cat:"Document AI", tier:"prototype", icon:"📄",
    name:"Document Extraction Agent",
    tagline:"Drop in a board pack PDF. Get structured KPI data out. No manual entry.",
    color:T.blue,
    what:"Portfolio companies email or upload PDFs (management accounts, board packs, investor updates). This agent reads the document, identifies financial tables and KPI mentions, maps them to the canonical KPI schema, flags discrepancies vs prior submissions, and updates the database — all without a human touching it.",
    prototype:"Live demo — paste text from a management accounts document. Agent extracts KPIs and maps to canonical schema on screen.",
    production:"AWS Textract for PDF parsing → Claude for semantic mapping → validation engine → database write.",
    tools:["PDF text extraction","Table parsing","Canonical KPI mapping","Discrepancy detection","Database write"],
    why:"Most PE portfolio companies send data as PDFs or Excel. This eliminates all manual re-entry and catches errors automatically.",
    build:"AWS Textract + Claude API + Prisma ORM",
  },
  {
    id:"emailparser", cat:"Document AI", tier:"production", icon:"📧",
    name:"Email Intelligence Agent",
    tagline:"Reads the CFO's monthly update email. Extracts the numbers. Updates the platform.",
    color:T.teal,
    what:"Monitors a dedicated inbox (e.g. reporting@caledoniaalba.com). When a portfolio company sends their monthly numbers — even in free-text email format — the agent reads it, extracts all KPI values mentioned, validates them against prior data, and creates a data submission record. Replies to the CFO confirming what was received.",
    prototype:"Simulated — shows example email → extracted KPIs transformation.",
    production:"AWS SES email ingestion → Lambda → Claude API → validation → database write → auto-reply.",
    tools:["Email parsing","Entity extraction","KPI mapping","Validation","Auto-reply"],
    why:"Some portfolio companies will never use an integration. This is the zero-friction fallback — they just send an email.",
    build:"AWS SES + Claude API + Lambda",
  },

  // ── REPORTING ─────────────────────────────────────────────────────────────
  {
    id:"boardpack", cat:"Reporting", tier:"prototype", icon:"📋",
    name:"Board Pack Generator Agent",
    tagline:"One click. Full board pack. PDF ready in 30 seconds.",
    color:T.green,
    what:"Takes all current KPI data, alerts, actions, and trend data for a company. Generates: executive summary, performance commentary, KPI scorecard, risk section, action tracker, and forward outlook. Formats it as a print-ready document. Human reviews and approves before sending — agent does the drafting.",
    prototype:"Live demo — click Generate Board Pack for any company, then Pack as PDF. The narrative is drafted; the figures, the ranked causes and the actions under it are calculated. Real A4 typesetting in the browser, text throughout rather than a picture of a page.",
    production:"Claude API for the narrative; the document itself is already produced client-side. Versioned. Human approval gate before export. Audit log of all generated packs.",
    tools:["KPI data fetch","Alert summary","Action tracker query","Narrative generation","PDF typesetting"],
    why:"Board pack preparation is 1–2 days of work per company per month. This makes it 30 minutes.",
    build:"Claude API + Puppeteer PDF + human approval gate",
  },
  {
    id:"lpreport", cat:"Reporting", tier:"production", icon:"📊",
    name:"LP Report Agent",
    tagline:"Generates LP quarterly reports across the whole fund automatically.",
    color:T.amber,
    what:"At quarter end, aggregates all portfolio company data, calculates fund-level KPIs, generates the LP narrative report with performance commentary, valuation movements, new investments, exits, and outlook. Handles the entire drafting process. Partners review and approve.",
    prototype:"Simulated — shows example LP report structure.",
    production:"Scheduled quarterly trigger. Multi-company data aggregation. Claude API for narrative. Partner approval workflow.",
    tools:["Fund aggregation","Valuation calculation","Narrative generation","Document assembly","Approval workflow"],
    why:"LP reporting is one of the most time-consuming tasks in fund management. This is a 10× productivity multiplier.",
    build:"Claude API + Airflow scheduler + PDF generation",
  },

  // ── PORTFOLIO Q&A ─────────────────────────────────────────────────────────
  {
    id:"portfolioqa", cat:"Portfolio Q&A", tier:"prototype", icon:"💬",
    name:"Portfolio Q&A Agent",
    tagline:"Ask any question about your portfolio in plain English. Get a cited answer.",
    color:T.purple,
    what:"Natural language interface across all portfolio companies and all KPIs. Ask cross-portfolio questions: 'Which companies are most likely to need capital in the next 90 days?', 'Which company has the best gross margin trend?', 'Where is attrition above sector benchmark?'. Agent queries relevant data, reasons across it, returns a cited answer.",
    prototype:"Live — ask any question in the demo panel below. Runs against every portfolio company, restated into the fund's reporting currency.",
    production:"LangChain RAG over KPI database + vector embeddings. Sources cited. Confidence scores. Audit log of every query.",
    tools:["Multi-company KPI query","Cross-portfolio analysis","Benchmark comparison","Cited response generation"],
    why:"GPs currently get the answer to these questions by building Excel models. This is a 2-second natural language query.",
    build:"Claude API + LangChain + pgvector",
  },
  {
    id:"companyqa", cat:"Portfolio Q&A", tier:"prototype", icon:"🎯",
    name:"Company Deep-Dive Agent",
    tagline:"Ask anything about a specific company. Gets the answer from every data source simultaneously.",
    color:T.blue,
    what:"Company-scoped Q&A. Knows the full context: all KPIs, all historical data, all alerts, all actions, all GP notes. Ask: 'Is the sales team actually the problem or is it the product?', 'What would happen to runway if we froze hiring?', 'Compare this company's performance to this time last year.' Reasons across all available context.",
    prototype:"Live — already built into the AI Analysis tab of each company. Extended here with multi-turn conversation.",
    production:"Company-scoped RAG. Multi-turn conversation memory. Sources always cited. Human override if AI gets it wrong.",
    tools:["Full company context fetch","Multi-source reasoning","Historical comparison","What-if modelling"],
    why:"Replaces the 45-minute operating partner pre-meeting prep. Done in 3 questions.",
    build:"Claude API + conversation history + company data context",
  },

  // ── OPERATIONS ────────────────────────────────────────────────────────────
  {
    id:"dataqualityagent", cat:"Operations", tier:"prototype", icon:"✅",
    name:"Data Quality Agent",
    tagline:"Finds missing data, stale feeds, and reconciliation failures before GPs see them.",
    color:T.teal,
    what:"Runs before every dashboard view. Checks: data freshness per source, missing KPI values, reconciliation mismatches (e.g. AR total doesn't match AR aging buckets), implausible values (revenue jumped 300% MoM), and missing company submissions. Generates a data quality score and specific warnings shown in the UI.",
    prototype:"Runs on every portfolio page load. Quality warnings shown on each company card and KPI tile.",
    production:"Pre-compute layer before API responses. Blocks dashboard if data quality below threshold. Auto-requests refresh from source systems.",
    tools:["Freshness check","Completeness check","Reconciliation validation","Anomaly detection","Quality scoring"],
    why:"A dashboard with bad data is worse than no dashboard. Trust depends on data quality being visibly managed.",
    build:"Validation engine + Claude for anomaly flagging + database quality scores",
  },
  {
    id:"onboarding", cat:"Operations", tier:"production", icon:"🚀",
    name:"Portfolio Company Onboarding Agent",
    tagline:"Walks a new portfolio company through setup. No implementation consultant needed.",
    color:T.green,
    what:"When a new company is added to the fund, this agent: (1) identifies the company's sector and maps to appropriate KPI template, (2) asks the CFO a series of guided questions to configure thresholds and budgets, (3) walks through integration setup step by step, (4) validates first data submission and flags gaps, (5) generates a data quality baseline report.",
    prototype:"Simulated conversation flow shown.",
    production:"Multi-step conversational agent. Embedded in the onboarding UI. Tracks completion state. Escalates blockers to fund admin.",
    tools:["Sector classification","KPI template selection","Guided configuration","Integration setup","Validation"],
    why:"Current onboarding requires an implementation consultant. This agent does 80% of it autonomously.",
    build:"Claude API multi-turn + configuration database + validation engine",
  },
  {
    id:"forecast", cat:"Operations", tier:"production", icon:"🔮",
    name:"Cash & Revenue Forecast Agent",
    tagline:"Runs 90-day cash and revenue forecasts for every portfolio company nightly.",
    color:T.purple,
    what:"Builds forward projections using: historical actuals, budget, pipeline data (from CRM), headcount plan, and known upcoming cash flows. Runs Monte Carlo simulation to show confidence ranges. Flags companies whose P10 (pessimistic) scenario hits a covenant or cash threshold within 90 days. Generates the forecast narrative.",
    prototype:"Simulated — pre-computed forecast curves shown on company finance tab.",
    production:"Python Prophet + Monte Carlo on SageMaker. Nightly job. Feeds into health scoring. Alerts when P10 hits threshold.",
    tools:["Historical data fetch","Pipeline data integration","Monte Carlo simulation","Scenario generation","Narrative summary"],
    why:"The most financially valuable agent. Early warning on cash is worth millions in avoided dilutive rounds.",
    build:"Prophet + Monte Carlo + Claude API + SageMaker",
  },
  {
    id:"news", cat:"Operations", tier:"prototype", icon:"📰",
    name:"News Intelligence Agent",
    tagline:"Monitors news for every portfolio company. Flags material developments before they become board items.",
    color:T.pink,
    what:"Runs daily. Queries NewsAPI and Google News for each portfolio company name, key people, sector keywords. Rates each article for materiality and sentiment. Flags: funding rounds (competitive threat), regulatory actions, key person departures, major customer wins/losses, sector headwinds. Posts to the company activity feed.",
    prototype:"Live — already integrated with NewsAPI free tier. Runs on company page load.",
    production:"Daily scheduled job. Sentiment scoring. Material flag threshold. Push notification to GP for high-priority items.",
    tools:["NewsAPI query","Sentiment analysis","Materiality scoring","Company feed update","GP alert"],
    why:"External signals often precede internal KPI movements by weeks. This closes the loop between what's happening and what the numbers show.",
    build:"NewsAPI + Claude API for sentiment + scheduled job",
  },
];


// ── LIVE AGENT DEMOS ──────────────────────────────────────────────────────────
//  The reasoning chain, the board pack and the Q&A fallback are all computed
//  from the finance model. What the agent says on screen is therefore the same
//  arithmetic the finance drill-down shows, and a figure cannot drift in one
//  place without moving in the other.
function InvestigationDemo() {
  const TARGETS = useMemo(() => investigationTargets(3), []);
  const [target, setTarget] = useState(TARGETS[0].id);
  const [running, setRunning] = useState(false);
  const [shown, setShown] = useState(0);
  const [summary, setSummary] = useState(null);
  const [live, setLive] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const inv = useMemo(() => buildInvestigation(target), [target]);

  // The investigation used to end on the screen. Everything it worked out —
  // the findings, the ranked causes, the actions — went when the panel closed,
  // which makes it a demonstration rather than a tool. The same object becomes
  // the report, so nothing is re-derived and nothing is lost.
  const report = useMemo(
    () => buildInvestigationReport(inv, summary
      ? { commentary: { text: summary, source: live
          ? "Drafted by the analytical layer over the calculated evidence in this report."
          : "Drafted from the calculated evidence in this report. No analytical layer was reachable." } }
      : {}),
    [inv, summary, live]);

  const done = shown >= inv.steps.length;

  async function runInvestigation() {
    setRunning(true); setShown(0); setSummary(null); setLive(false); setShowReport(false);

    // Reveal the computed chain a step at a time. The pace is fixed rather than
    // random — nothing on this screen should be non-deterministic.
    for (let i = 0; i < inv.steps.length; i++) {
      await new Promise((r) => setTimeout(r, i === 0 ? 300 : 620));
      setShown(i + 1);
    }

    try {
      const d = await askAgent({ type: "investigate", companyId: target });
      setSummary(d.text);
      setLive(!!d.live);
    } catch (e) {
      setSummary(inv.rootCause);
    }
    setRunning(false);
  }

  const visible = inv.steps.slice(0, shown);
  const kindColour = { rootCause: T.amber, action: T.green };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{color:T.txt3,fontSize:10,marginBottom:4}}>
        Select a company to investigate — ranked on runway and revenue against plan:
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {TARGETS.map(t=>(
          <button key={t.id} onClick={()=>{setTarget(t.id);setShown(0);setSummary(null);setShowReport(false);}}
            style={{padding:"6px 12px",background:target===t.id?T.red:T.surface,
              border:`1px solid ${target===t.id?T.red:T.border}`,borderRadius:6,
              color:target===t.id?C.goldOn:C.txt2,cursor:"pointer",fontSize:S.small}}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center"}}>
        <button onClick={runInvestigation} disabled={running} style={{
          padding:"9px 20px",background:running?T.borderLt:T.amber,color:running?T.txt3:T.bg,
          border:"none",borderRadius:7,cursor:running?"wait":"pointer",fontSize:12,fontWeight:700}}>
          {running?"🔍 Investigating…":"🔍 Run Investigation"}
        </button>
        {/* Only once there is an investigation to report on. A button that
            produces an empty document is worse than no button. */}
        {done && !running && (
          <button onClick={()=>setShowReport(true)} style={{
            padding:"9px 18px",background:"transparent",color:C.gold,
            border:`1px solid ${C.goldLine}`,borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700}}>
            📄 Report as PDF
          </button>
        )}
      </div>

      {visible.length>0&&(
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:16,
          display:"flex",flexDirection:"column",gap:6}}>
          {visible.map((s,i)=>(
            <div key={i} style={{color:kindColour[s.kind]??T.txt2,
              fontSize:11,lineHeight:1.6,padding:s.kind==="rootCause"?"10px 12px":"4px 0",
              background:s.kind==="rootCause"?T.amberDim:"transparent",
              borderRadius:s.kind==="rootCause"?6:0,
              whiteSpace:"pre-wrap",animation:"fadeIn 0.3s ease"}}>
              {s.icon} {s.text}
            </div>
          ))}
          {running&&<div style={{color:T.blue,fontSize:10,animation:"pulse 1s infinite"}}>Agent reasoning…</div>}

          {summary&&(
            <div style={{marginTop:8,padding:"10px 12px",background:T.blueDim,border:`1px solid ${T.blue}33`,
              borderRadius:6,color:T.txt2,fontSize:11,lineHeight:1.7,whiteSpace:"pre-wrap"}}>
              <div style={{color:T.blue,fontSize:9,fontWeight:700,letterSpacing:"0.1em",marginBottom:6}}>
                EXECUTIVE SUMMARY · {live ? "Grok, over the calculated evidence above" : "calculated — set XAI_API_KEY for the analytical layer"}
              </div>
              {summary}
            </div>
          )}
        </div>
      )}

      {showReport && <ReportPanel report={report} onClose={()=>setShowReport(false)} />}

      {done&&inv.contributions.length>0&&(
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"12px 14px"}}>
          <div style={{color:T.txt3,fontSize:9,letterSpacing:"0.1em",marginBottom:8}}>
            {inv.underStress ? "HOW THE CAUSES WERE RANKED" : "WATCH LIST — NO THRESHOLD BREACHED"}
          </div>
          {inv.contributions.map(c=>(
            <div key={c.key} style={{marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:8,marginBottom:3}}>
                <span style={{color:T.txt2,fontSize:10.5}}>{c.label}</span>
                <span style={{color:T.txt1,fontSize:10.5,fontWeight:600,fontVariantNumeric:"tabular-nums"}}>
                  {fmtMoney(c.impact, inv.currency, {k:true})} <span style={{color:T.txt3,fontWeight:400}}>· {c.share}%</span>
                </span>
              </div>
              <div style={{height:5,background:T.bg,borderRadius:2,overflow:"hidden"}}>
                <div style={{width:`${c.share}%`,height:"100%",background:T.amber,opacity:0.8}}/>
              </div>
              <div style={{color:T.txt3,fontSize:8.5,marginTop:3}}>{c.basis}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PortfolioQADemo() {
  const [q,setQ]=useState("");const [ans,setAns]=useState(null);const [loading,setLoading]=useState(false);
  const QUICK = [
    "Which companies are most likely to need capital in the next 90 days?",
    "Where is there hidden attrition risk across the portfolio?",
    "Which company has the best risk-adjusted growth profile?",
    "What are the top 3 risks to fund performance this quarter?",
    "Compare all companies on gross margin and burn multiple",
  ];
  const [live,setLive]=useState(false);
  async function ask(question) {
    const qText = question||q; if (!qText.trim()) return;
    setLoading(true); setAns(null); setLive(false);
    try {
      const d = await askAgent({ type:"qa", question:qText });
      setAns(d.text||"Unable to answer.");
      setLive(!!d.live);
    } catch(e) {
      // No serverless function behind this build (a static preview, or the API
      // is down). Answer from the same calculation the endpoint would have used
      // rather than showing an error — the figures are the point, not the prose.
      const top = attentionActions(3);
      setAns(
        `Ranked on runway and revenue against plan, the companies needing attention are: ` +
        top.map(a => `${a.company} — ${a.rationale}`).join("; ") + ".\n\n" +
        `First is ${top[0].company}: ${top[0].action} (${top[0].owner}).\n\n` +
        `This is the calculated ranking rather than an answer to the specific question — ` +
        `no analysis endpoint is reachable from this build.`);
    }
    setLoading(false);
  }
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{color:T.txt3,fontSize:9}}>
        Answered over all {COMPANIES.length} portfolio companies, restated into GBP.
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {QUICK.map(qq=><button key={qq} onClick={()=>{setQ(qq);ask(qq);}}
          style={{padding:"5px 10px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:5,
            color:T.blue,cursor:"pointer",fontSize:9,textAlign:"left",lineHeight:1.4}}>{qq}</button>)}
      </div>
      <div style={{display:"flex",gap:8}}>
        <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&ask()}
          placeholder="Ask anything about the portfolio…"
          style={{flex:1,padding:"9px 12px",background:T.surface,border:`1px solid ${T.border}`,
            borderRadius:6,color:T.txt1,fontSize:11,fontFamily:"inherit",outline:"none"}}/>
        <button onClick={()=>ask()} disabled={loading} style={{padding:"9px 18px",background:T.purple,
          color:C.goldOn,border:"none",borderRadius:4,cursor:"pointer",fontSize:S.small,fontWeight:700}}>
          {loading?"…":"Ask"}
        </button>
      </div>
      {ans&&<div style={{background:T.surface,border:`1px solid ${T.borderLt}`,borderRadius:8,
        padding:16,color:T.txt2,fontSize:12,lineHeight:1.7,whiteSpace:"pre-wrap"}}>
        <div style={{color:live?T.green:T.txt3,fontSize:9,letterSpacing:"0.1em",marginBottom:8}}>
          {live?"● GROK · OVER CALCULATED PORTFOLIO DATA":"● CALCULATED · SET XAI_API_KEY FOR THE ANALYTICAL LAYER"}
        </div>
        {ans}
      </div>}
    </div>
  );
}

function BoardPackDemo() {
  const [co, setCo] = useState("meridian");
  const [loading, setLoading] = useState(false);
  const [pack, setPack] = useState(null);
  const [live, setLive] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // The card above promises a PDF. Until this existed the demo produced a
  // paragraph of text on screen and nothing else, which is the gap between a
  // claim and a product. The pack is the same calculated report the
  // investigation circulates, with the drafted narrative carried in front of it
  // under its own heading.
  const report = useMemo(
    () => buildInvestigationReport(buildInvestigation(co), {
      kind: "Board Pack",
      commentary: pack ? { text: pack, source: live
        ? "Drafted by the analytical layer over the calculated evidence in this report."
        : "Drafted from the calculated evidence in this report. No analytical layer was reachable." } : null,
    }),
    [co, pack, live]);

  // Drawn from the registry rather than restated, so a company added to the
  // fund appears here without anyone remembering to edit this file.
  const COS = useMemo(() => COMPANIES.map((c) => ({
    id: c.id,
    l: `${c.name} (${c.rag[0]}${c.rag.slice(1).toLowerCase()})`,
  })), []);

  async function generate() {
    setLoading(true); setPack(null); setLive(false); setShowReport(false);
    try {
      const d = await askAgent({ type:"boardpack", companyId:co });
      setPack(d.text);
      setLive(!!d.live);
    } catch(e) {
      const inv = buildInvestigation(co);
      setPack(
        `**${inv.company.name}**\n\n${inv.rootCause}\n\n**RECOMMENDED ACTIONS**\n` +
        inv.actions.slice(0, 3).map(a => `• ${a.action} — ${a.owner}. ${a.rationale}.`).join("\n") +
        `\n\n_Calculated from connected data as at ${inv.fin.asOf}. No analysis endpoint is reachable ` +
        `from this build, so the narrative layer is absent — every figure above is unaffected._`);
    }
    setLoading(false);
  }
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {COS.map(c=><button key={c.id} onClick={()=>{setCo(c.id);setPack(null);setShowReport(false);}}
          style={{padding:"6px 12px",background:co===c.id?T.green:T.surface,
            border:`1px solid ${co===c.id?T.green:T.border}`,borderRadius:6,
            color:co===c.id?T.bg:T.txt3,cursor:"pointer",fontSize:10}}>
          {c.l}
        </button>)}
      </div>
      <div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center"}}>
        <button onClick={generate} disabled={loading} style={{padding:"9px 20px",
          background:loading?T.borderLt:T.green,color:loading?T.txt3:T.bg,border:"none",
          borderRadius:7,cursor:loading?"wait":"pointer",fontSize:12,fontWeight:700}}>
          {loading?"Generating board pack…":"📋 Generate Board Pack"}
        </button>
        {pack && !loading && (
          <button onClick={()=>setShowReport(true)} style={{
            padding:"9px 18px",background:"transparent",color:C.gold,
            border:`1px solid ${C.goldLine}`,borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700}}>
            📄 Pack as PDF
          </button>
        )}
      </div>
      {showReport && <ReportPanel report={report} onClose={()=>setShowReport(false)} />}
      {pack&&<div style={{background:T.surface,border:`1px solid ${T.borderLt}`,borderRadius:8,
        padding:16,color:T.txt2,fontSize:11,lineHeight:1.8,whiteSpace:"pre-wrap",
        fontFamily:"inherit"}}>
        <div style={{color:live?T.green:T.txt3,fontSize:9,letterSpacing:"0.1em",marginBottom:8}}>
          {live?"● GROK · OVER CALCULATED COMPANY DATA":"● CALCULATED · SET XAI_API_KEY FOR THE ANALYTICAL LAYER"}
        </div>
        {pack}
      </div>}
    </div>
  );
}

// ── AGENT CARD ────────────────────────────────────────────────────────────────
function AgentCard({agent,expanded,toggle}) {
  return (
    <div onClick={toggle} style={{background:expanded?T.card:T.surface,border:`1px solid ${expanded?T.borderLt:T.border}`,
      borderLeft:`3px solid ${agent.color}`,borderRadius:8,padding:"13px 14px",cursor:"pointer",transition:"all 0.15s"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{display:"flex",gap:10,alignItems:"flex-start",flex:1}}>
          <span style={{fontSize:18,flexShrink:0}}>{agent.icon}</span>
          <div>
            <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:3,flexWrap:"wrap"}}>
              <span style={{color:T.txt1,fontSize:12,fontWeight:700}}>{agent.name}</span>
              <span style={{padding:"1px 7px",background:agent.tier==="prototype"?T.greenDim:T.amberDim,
                color:agent.tier==="prototype"?T.green:T.amber,fontSize:8,fontWeight:700,borderRadius:3}}>
                {agent.tier==="prototype"?"THIS WEEK":"PRODUCTION"}
              </span>
            </div>
            <div style={{color:agent.color,fontSize:10,fontStyle:"italic",marginBottom:4}}>{agent.tagline}</div>
            <div style={{color:T.txt3,fontSize:10,lineHeight:1.4}}>{agent.what.substring(0,120)}…</div>
          </div>
        </div>
        <span style={{color:T.txt3,fontSize:10,marginLeft:10,flexShrink:0}}>{expanded?"▲":"▼"}</span>
      </div>
      {expanded&&(
        <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${T.border}`,display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div><div style={{color:T.txt3,fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>Full description</div>
              <div style={{color:T.txt2,fontSize:10,lineHeight:1.5}}>{agent.what}</div></div>
            <div>
              <div style={{color:T.txt3,fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>Why it matters</div>
              <div style={{color:T.txt2,fontSize:10,lineHeight:1.5,marginBottom:8}}>{agent.why}</div>
              <div style={{color:T.txt3,fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>Build with</div>
              <div style={{color:T.blue,fontSize:10}}>{agent.build}</div>
            </div>
          </div>
          <div>
            <div style={{color:T.txt3,fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>Tools used</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {agent.tools.map(t=><span key={t} style={{padding:"2px 8px",background:T.border,color:T.txt2,fontSize:9,borderRadius:4}}>{t}</span>)}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div style={{background:T.greenDim,border:`1px solid ${T.green}22`,borderRadius:6,padding:"8px 10px"}}>
              <div style={{color:T.green,fontSize:9,fontWeight:700,marginBottom:3}}>PROTOTYPE (THIS WEEK)</div>
              <div style={{color:T.txt2,fontSize:10,lineHeight:1.4}}>{agent.prototype}</div>
            </div>
            <div style={{background:T.amberDim,border:`1px solid ${T.amber}22`,borderRadius:6,padding:"8px 10px"}}>
              <div style={{color:T.amber,fontSize:9,fontWeight:700,marginBottom:3}}>PRODUCTION</div>
              <div style={{color:T.txt2,fontSize:10,lineHeight:1.4}}>{agent.production}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function Agents() {
  const [cat,setCat]=useState("All");
  const [opened,setOpened]=useState(null);
  const [demoTab,setDemoTab]=useState("investigate");
  const toggle=id=>setOpened(p=>p===id?null:id);
  const visible=AGENTS.filter(a=>cat==="All"||a.cat===cat);
  const protoCount=AGENTS.filter(a=>a.tier==="prototype").length;
  const DEMO_TABS=[{id:"investigate",l:"🔍 Investigation Agent"},{id:"qa",l:"💬 Portfolio Q&A"},{id:"boardpack",l:"📋 Board Pack Agent"}];

  return (
    <div style={{background:C.bg,height:"100%",display:"flex",flexDirection:"column",color:C.txt1,overflow:"hidden"}}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      <div style={{padding:"20px 24px 0",flexShrink:0}}>
        <PageHeader
          crumbs={["Actions", "AI Agents"]}
          title="AI Agents"
          chips={<Chip tone="green">{protoCount} buildable this week</Chip>}
          purpose="Autonomous systems that act on the data rather than answer questions about it"
          meta={`${AGENTS.length} agents · ${AGENTS.length-protoCount} for production · every prompt is grounded in the finance model server-side`}
        />

        <div style={{display:"flex",gap:9,flexWrap:"wrap",marginBottom:14}}>
          <Metric label="Total agents" value={AGENTS.length} sub="Across investigation, reporting and monitoring" />
          <Metric label="Prototype this week" value={protoCount} tone={C.green} sub="Buildable on the current data model" />
          <Metric label="Production" value={AGENTS.length-protoCount} tone={C.gold} sub="Need connectors or approval flows" />
          <Metric label="Live demos below" value={3} tone={C.blue} sub="Investigation · Q&A · Board pack" />
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 380px",gap:0,flex:1,minHeight:0,overflow:"hidden",borderTop:`1px solid ${C.border}`}}>

        {/* Left: agent list */}
        <div style={{overflowY:"auto",padding:"16px 28px",borderRight:`1px solid ${T.border}`}}>
          {/* Filter */}
          <div style={{display:"flex",gap:5,marginBottom:14,flexWrap:"wrap"}}>
            {["All",...Array.from(new Set(AGENTS.map(a=>a.cat)))].map(c=>(
              <button key={c} onClick={()=>setCat(c)} style={{padding:"5px 12px",background:cat===c?C.gold:"transparent",
                border:`1px solid ${cat===c?C.gold:C.borderLt}`,borderRadius:4,color:cat===c?C.goldOn:C.txt2,cursor:"pointer",fontSize:S.label,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase"}}>
                {c}
              </button>
            ))}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {visible.map(a=><AgentCard key={a.id} agent={a} expanded={opened===a.id} toggle={()=>toggle(a.id)}/>)}
          </div>
        </div>

        {/* Right: live demos */}
        <div style={{overflowY:"auto",background:T.surface,borderLeft:`1px solid ${T.border}`}}>
          <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.border}`}}>
            <div style={{color:T.txt1,fontSize:12,fontWeight:700,marginBottom:10}}>Live Agent Demos</div>
            <div style={{display:"flex",gap:4,flexDirection:"column"}}>
              {DEMO_TABS.map(t=>(
                <button key={t.id} onClick={()=>setDemoTab(t.id)} style={{padding:"7px 12px",background:demoTab===t.id?T.card:"transparent",
                  border:`1px solid ${demoTab===t.id?T.borderLt:T.border}`,borderRadius:6,
                  color:demoTab===t.id?T.txt1:T.txt3,cursor:"pointer",fontSize:10,textAlign:"left",fontWeight:demoTab===t.id?600:400}}>
                  {t.l}
                </button>
              ))}
            </div>
          </div>
          <div style={{padding:"16px 18px"}}>
            {demoTab==="investigate" && <InvestigationDemo/>}
            {demoTab==="qa"          && <PortfolioQADemo/>}
            {demoTab==="boardpack"   && <BoardPackDemo/>}
          </div>
        </div>
      </div>
    </div>
  );
}

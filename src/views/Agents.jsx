import { useState, useEffect, useRef } from "react";

const T = {
  bg:"#020817", surface:"#070d1a", card:"#0b1120", cardHov:"#0f1830",
  border:"#172035", borderLt:"#1e2d4a",
  txt1:"#e8edf8", txt2:"#7a90b8", txt3:"#3d5070",
  green:"#00c97a", greenDim:"#00c97a14",
  amber:"#f5a524", amberDim:"#f5a52414",
  red:"#ff3d5a",   redDim:"#ff3d5a14",
  blue:"#3d8bff",  blueDim:"#3d8bff14",
  purple:"#9b6dff",purpleDim:"#9b6dff14",
  teal:"#00c9c9",  tealDim:"#00c9c914",
  pink:"#f43f8e",  pinkDim:"#f43f8e14",
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
    prototype:"Live demo — click Investigate on any red KPI. Runs 4–5 visible reasoning steps. Returns root cause + evidence chain.",
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
    prototype:"Live demo — click Generate Board Pack for any company. Returns structured board pack text with all sections populated from live KPI data.",
    production:"Claude API + PDF generation (Puppeteer/WeasyPrint). Versioned. Human approval gate before export. Audit log of all generated packs.",
    tools:["KPI data fetch","Alert summary","Action tracker query","Narrative generation","PDF formatting"],
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
    prototype:"Live — ask any question in the demo panel below. Runs against all 5 seeded portfolio companies.",
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

const CATS = ["All", ...Array.from(new Set(AGENTS.map(a=>a.cat)))];
const PORTFOLIO_CONTEXT = `
Portfolio: Caledonia Alba Fund I
Companies:
1. Meridian SaaS (B2B SaaS, Series A, score 62/100 AMBER) — Cash runway 4.8mo, revenue 87% of budget, attrition 14%, DSO 47 days, burn £138k/mo
2. PayFlo (Fintech/Payments, Growth PE, score 88/100 GREEN) — Cash runway 11.2mo, revenue 112% of budget, attrition 7%, NRR 118%, GMV +23% MoM
3. SwiftLogix (Logistics, Series B, score 71/100 AMBER) — Cash runway 8.1mo, revenue 96% of budget, attrition 19%, on-time delivery 87% vs 95% SLA
4. CareOS (HealthTech, Series A, score 34/100 RED) — Cash runway 2.3mo CRITICAL, revenue 64% of budget, attrition 23%, pipeline coverage 0.8x
5. ForgeTech (Manufacturing, PE Growth, score 84/100 GREEN) — Cash runway 9.4mo, revenue 103% of budget, attrition 9%, EBITDA 18%
Fund health: 1 RED, 2 AMBER, 2 GREEN. Average health score: 68/100.
`;

// ── LIVE AGENT DEMOS ──────────────────────────────────────────────────────────
function InvestigationDemo() {
  const [target, setTarget] = useState("meridian_cash");
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState([]);
  const [done, setDone] = useState(false);

  const TARGETS = [
    { id:"meridian_cash",   label:"Meridian SaaS — Cash Runway (RED)",   company:"Meridian SaaS" },
    { id:"careos_revenue",  label:"CareOS — Revenue vs Budget (RED)",     company:"CareOS" },
    { id:"swiftlogix_sla",  label:"SwiftLogix — On-Time Delivery (AMBER)",company:"SwiftLogix" },
  ];

  const MOCK_STEPS = {
    meridian_cash:[
      "🔍 Fetching all finance KPIs for Meridian SaaS...",
      "📊 Cash balance: £412k. Monthly burn: £138k (+£12k MoM). Runway: 4.8 months.",
      "🔗 Cross-referencing AR data... DSO has widened from 32 to 47 days. AR overdue >30 days: £74k.",
      "📈 Checking revenue trend... Revenue 87% of budget. Gap widening for 3rd consecutive month.",
      "👥 Checking HR data... 6 open roles including Head of Sales. Attrition 14% — sales team most affected.",
      "🧮 Root cause identified: Cash pressure is compound. Primary: AR collections slowing (DSO +15 days = ~£58k trapped). Secondary: Burn creeping up (payroll for unfilled roles still on budget). Revenue miss compounding the gap.",
      "⚡ Recommended actions: (1) Emergency AR review — top 5 overdue accounts = £74k recoverable in 30 days. (2) Freeze discretionary spend immediately. (3) Reassess open roles — 3 of 6 non-critical.",
    ],
    careos_revenue:[
      "🔍 Fetching all KPIs for CareOS...",
      "📊 Revenue £162k vs budget £415k — 64% attainment. Gap is £253k/month.",
      "🔗 Cross-referencing pipeline data... Pipeline coverage 0.8x. Win rate 18% (down from 25%). Sales cycle 54 days (up 18 days).",
      "👥 Checking HR data... Head of Sales vacant 60+ days. Sales team attrition 28% — 2 of 5 reps left in last 90 days.",
      "💰 Cross-referencing cash... Burn £185k/mo. Runway 2.3 months. At current trajectory, cash out in 9 weeks.",
      "🧮 Root cause identified: Revenue miss is a go-to-market execution failure, not a market problem. Vacant Head of Sales + 40% rep attrition has gutted sales capacity. Pipeline exists but conversion is broken.",
      "⚡ CRITICAL: Company has ~9 weeks of cash. GP must act this week: (1) Interim sales leadership immediately. (2) Emergency board meeting — bridge financing or cost restructure required. (3) Assess if existing pipeline can be accelerated.",
    ],
    swiftlogix_sla:[
      "🔍 Fetching operations KPIs for SwiftLogix...",
      "📊 On-time delivery: 87% vs 95% SLA target. 2 enterprise clients issued formal warnings.",
      "🔗 Cross-referencing HR data... Operations team attrition: 24% (highest in company). 12 driver vacancies across 3 depots.",
      "⚙️ Checking ops metrics... Throughput down 8% vs plan. Backlog up 22 items MoM. Route efficiency declining.",
      "💰 Revenue at risk: 2 enterprise clients represent £420k ARR. SLA breach penalty clauses trigger at <85% over 60 days.",
      "🧮 Root cause identified: Capacity constraint from driver attrition is directly causing SLA misses. Not a process problem — a staffing problem. 12 driver vacancies = 8–12% capacity shortfall.",
      "⚡ Recommended actions: (1) Emergency response to 2 client warnings — escalation call with COO this week. (2) Temporary agency driver cover — £40–60k cost vs £420k revenue at risk. (3) Root cause of driver attrition — comp benchmarking urgent.",
    ],
  };

  async function runInvestigation() {
    setRunning(true); setSteps([]); setDone(false);
    const mockSteps = MOCK_STEPS[target];
    for (let i = 0; i < mockSteps.length; i++) {
      await new Promise(r => setTimeout(r, 700 + Math.random() * 600));
      setSteps(p => [...p, mockSteps[i]]);
    }
    // Try real API call for final narrative
    try {
      const tgt = TARGETS.find(t=>t.id===target);
      const r = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:300,
          system:"You are a PE portfolio analyst running an automated investigation. You have already completed the step-by-step analysis. Write a 3-sentence executive summary of your findings and the single most important action the GP must take in the next 48 hours. Be specific and cite numbers.",
          messages:[{role:"user",content:`Investigation target: ${tgt?.label}\n\nPortfolio context:\n${PORTFOLIO_CONTEXT}\n\nAnalysis steps completed:\n${mockSteps.join("\n")}\n\nGenerate executive summary and #1 priority action.`}]
        })
      });
      const d = await r.json();
      const summary = d.content?.[0]?.text;
      if (summary) setSteps(p => [...p, `\n📋 EXECUTIVE SUMMARY:\n${summary}`]);
    } catch(e) { /* mock steps are sufficient */ }
    setDone(true); setRunning(false);
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{color:T.txt3,fontSize:10,marginBottom:4}}>Select a KPI alert to investigate:</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {TARGETS.map(t=>(
          <button key={t.id} onClick={()=>{setTarget(t.id);setSteps([]);setDone(false);}}
            style={{padding:"6px 12px",background:target===t.id?T.red:T.surface,
              border:`1px solid ${target===t.id?T.red:T.border}`,borderRadius:6,
              color:target===t.id?"#fff":T.txt3,cursor:"pointer",fontSize:10}}>
            {t.label}
          </button>
        ))}
      </div>
      <button onClick={runInvestigation} disabled={running} style={{
        padding:"9px 20px",background:running?T.borderLt:T.amber,color:running?T.txt3:T.bg,
        border:"none",borderRadius:7,cursor:running?"wait":"pointer",fontSize:12,fontWeight:700,
        alignSelf:"flex-start"}}>
        {running?"🔍 Investigating…":"🔍 Run Investigation"}
      </button>
      {steps.length>0&&(
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:16,
          display:"flex",flexDirection:"column",gap:6}}>
          {steps.map((s,i)=>(
            <div key={i} style={{color:s.includes("EXECUTIVE")||s.includes("Root cause")||s.includes("CRITICAL")?T.amber:T.txt2,
              fontSize:11,lineHeight:1.6,padding:s.includes("EXECUTIVE")?"10px 12px":"4px 0",
              background:s.includes("EXECUTIVE")?T.amberDim:"transparent",
              borderRadius:s.includes("EXECUTIVE")?6:0,
              whiteSpace:"pre-wrap",
              animation:"fadeIn 0.3s ease"}}>
              {s}
            </div>
          ))}
          {running&&<div style={{color:T.blue,fontSize:10,animation:"pulse 1s infinite"}}>Agent reasoning…</div>}
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
  async function ask(question) {
    const qText = question||q; if (!qText.trim()) return;
    setLoading(true); setAns(null);
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",max_tokens:500,
          system:"You are a senior PE portfolio analyst. Answer questions about the portfolio concisely and directly. Always cite specific numbers. Structure your answer clearly. Flag the most important action or insight at the end.",
          messages:[{role:"user",content:`Portfolio data:\n${PORTFOLIO_CONTEXT}\n\nQuestion: ${qText}`}]
        })
      });
      const d = await r.json();
      setAns(d.content?.[0]?.text||"Unable to answer.");
    } catch(e) {
      setAns(`Based on current portfolio data: CareOS (2.3 months runway) and Meridian SaaS (4.8 months) are the highest capital risk companies. CareOS requires immediate GP attention — at current burn rate, cash is exhausted in approximately 9 weeks. Meridian's situation is serious but manageable with debtor collection acceleration. The other three companies (PayFlo, SwiftLogix, ForgeTech) have adequate runway for the next 12 months.`);
    }
    setLoading(false);
  }
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
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
          color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700}}>
          {loading?"…":"Ask"}
        </button>
      </div>
      {ans&&<div style={{background:T.surface,border:`1px solid ${T.borderLt}`,borderRadius:8,
        padding:16,color:T.txt2,fontSize:12,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{ans}</div>}
    </div>
  );
}

function BoardPackDemo() {
  const [co, setCo] = useState("meridian");
  const [loading, setLoading] = useState(false);
  const [pack, setPack] = useState(null);
  const COS = [{id:"meridian",l:"Meridian SaaS (Amber)"},{id:"careos",l:"CareOS (Red)"},{id:"payflo",l:"PayFlo (Green)"}];
  const CO_DATA = {
    meridian:"Meridian SaaS, B2B SaaS, Series A, 22% ownership. Health score 62/100 AMBER. Cash runway 4.8 months (RED). Revenue 87% of budget (AMBER). Attrition 14% (AMBER). DSO 47 days (RED). Pipeline coverage 2.1x (RED). Gross margin 71% (GREEN). Monthly burn £138k. ARR £3.1M. NRR 94%.",
    careos:"CareOS, HealthTech, Series A, 29% ownership. Health score 34/100 RED. Cash runway 2.3 months (CRITICAL RED). Revenue 64% of budget (RED). Attrition 23% (RED). Pipeline coverage 0.8x (RED). Head of Sales vacant 60+ days. Burn £185k/mo. 5 critical roles unfilled.",
    payflo:"PayFlo, Fintech/Payments, Growth PE, 41% ownership. Health score 88/100 GREEN. Cash runway 11.2 months. Revenue 112% of budget. Attrition 7%. NRR 118%. GMV +23% MoM. Take rate compressing slightly.",
  };
  async function generate() {
    setLoading(true); setPack(null);
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",max_tokens:700,
          system:`You are generating a board pack executive section for a PE portfolio company. Format exactly as:\n\n**EXECUTIVE SUMMARY**\n[2–3 sentences]\n\n**PERFORMANCE SCORECARD**\n[5 bullet KPIs with RAG status]\n\n**KEY RISKS THIS QUARTER**\n[3 risks with specific numbers]\n\n**ACTIONS FOR BOARD RESOLUTION**\n[3 specific actions with owners and deadlines]\n\n**OUTLOOK**\n[2 sentences forward view]\n\nBe specific. Cite all numbers. No waffle.`,
          messages:[{role:"user",content:`Generate board pack executive section for:\n${CO_DATA[co]}`}]
        })
      });
      const d = await r.json();
      setPack(d.content?.[0]?.text||"Error generating board pack.");
    } catch(e) {
      setPack(`**EXECUTIVE SUMMARY**\nMeridian SaaS enters Q3 with cash runway at 4.8 months — the critical constraint requiring board resolution this quarter. Revenue at 87% of budget reflects a pipeline coverage problem (2.1× vs 3× target) compounded by a 3-month win rate decline. Immediate action is required on both debtors (DSO 47 days) and sales leadership.\n\n**PERFORMANCE SCORECARD**\n• Cash Runway: 4.8 months 🔴 (target >9 months)\n• Revenue vs Budget: 87% 🟡 (budget £300k, actual £261k)\n• Gross Margin: 71% 🟢 (target >65%)\n• Attrition: 14% 🟡 (target <12%)\n• NRR: 94% 🟡 (target >100%)\n\n**KEY RISKS THIS QUARTER**\n• Cash depletion: At current burn trajectory (£138k/mo), cash exhausts in October without intervention\n• Revenue recovery: Pipeline coverage 2.1× is insufficient to bridge the £39k monthly gap — needs to reach 3× by August\n• Team stability: 6 open roles including Head of Sales; 14% attrition in engineering is a delivery risk\n\n**ACTIONS FOR BOARD RESOLUTION**\n• Approve emergency debtor escalation programme — target £74k AR recovery in 30 days (Owner: CFO, Deadline: 15 June)\n• Approve interim Head of Sales appointment — shortlist of 3 candidates ready (Owner: CEO, Deadline: 30 June)\n• Board to approve hiring freeze on 3 non-critical open roles pending cash recovery (Owner: Board, Deadline: This meeting)\n\n**OUTLOOK**\nWith the debtor programme and hiring freeze, runway extends to 7+ months — sufficient to execute the pipeline recovery plan. Q3 remains achievable if the two priority deals (£180k combined) close on current timeline.`);
    }
    setLoading(false);
  }
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",gap:6}}>
        {COS.map(c=><button key={c.id} onClick={()=>{setCo(c.id);setPack(null);}}
          style={{padding:"6px 12px",background:co===c.id?T.green:T.surface,
            border:`1px solid ${co===c.id?T.green:T.border}`,borderRadius:6,
            color:co===c.id?T.bg:T.txt3,cursor:"pointer",fontSize:10}}>
          {c.l}
        </button>)}
      </div>
      <button onClick={generate} disabled={loading} style={{padding:"9px 20px",
        background:loading?T.borderLt:T.green,color:loading?T.txt3:T.bg,border:"none",
        borderRadius:7,cursor:loading?"wait":"pointer",fontSize:12,fontWeight:700,alignSelf:"flex-start"}}>
        {loading?"Generating board pack…":"📋 Generate Board Pack"}
      </button>
      {pack&&<div style={{background:T.surface,border:`1px solid ${T.borderLt}`,borderRadius:8,
        padding:16,color:T.txt2,fontSize:11,lineHeight:1.8,whiteSpace:"pre-wrap",
        fontFamily:"inherit"}}>{pack}</div>}
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
    <div style={{background:T.bg,minHeight:"100vh",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",color:T.txt1}}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      {/* Header */}
      <div style={{padding:"20px 28px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{color:T.txt3,fontSize:9,letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:4}}>Alba PIP · AI Layer</div>
        <h1 style={{fontSize:20,fontWeight:800,margin:0}}>AI Agents</h1>
        <div style={{color:T.txt3,fontSize:11,marginTop:4}}>Autonomous systems that act, not just answer · {protoCount} buildable this week · {AGENTS.length-protoCount} for production</div>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,padding:"14px 28px",borderBottom:`1px solid ${T.border}`}}>
        {[
          {l:"Total agents",      v:AGENTS.length,       c:T.txt1},
          {l:"Prototype this week",v:protoCount,          c:T.green},
          {l:"Production",        v:AGENTS.length-protoCount,c:T.amber},
          {l:"Live demos below",  v:3,                    c:T.blue},
          {l:"Powered by Claude", v:AGENTS.length,        c:T.purple},
        ].map(s=><div key={s.l} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 14px"}}>
          <div style={{color:T.txt3,fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>{s.l}</div>
          <div style={{color:s.c,fontSize:20,fontWeight:800,fontFamily:"monospace"}}>{s.v}</div>
        </div>)}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 380px",gap:0,height:"calc(100vh - 200px)",overflow:"hidden"}}>

        {/* Left: agent list */}
        <div style={{overflowY:"auto",padding:"16px 28px",borderRight:`1px solid ${T.border}`}}>
          {/* Filter */}
          <div style={{display:"flex",gap:5,marginBottom:14,flexWrap:"wrap"}}>
            {["All",...Array.from(new Set(AGENTS.map(a=>a.cat)))].map(c=>(
              <button key={c} onClick={()=>setCat(c)} style={{padding:"5px 12px",background:cat===c?T.blue:"transparent",
                border:`1px solid ${cat===c?T.blue:T.border}`,borderRadius:5,color:cat===c?"#fff":T.txt3,cursor:"pointer",fontSize:9}}>
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

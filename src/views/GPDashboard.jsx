import { useState } from "react";
import { ComposedChart, AreaChart, BarChart, LineChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import FinanceDrilldown from "./FinanceDrilldown.jsx";
import { forDashboard } from "../lib/companies.js";

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
};
const MO = ["May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr"];
const ragCol = s => ({green:T.green,amber:T.amber,red:T.red}[s]||T.txt3);
const ragBg  = s => ({green:T.greenDim,amber:T.amberDim,red:T.redDim}[s]||"transparent");

// ── COMPANIES ─────────────────────────────────────────────────────────────────
const COMPANIES = forDashboard();

// ── KPI DATA ──────────────────────────────────────────────────────────────────
const mk = vals => MO.map((m,i) => ({ m, v: vals[i] }));

const MODULES = {
  meridian: {
    finance:{
      src:"Xero · TrueLayer · 4h ago", qual:98,
      kpis:[
        { label:"Cash Balance",       value:"£412k",   status:"amber", delta:"-£28k MoM",  src:"TrueLayer",  threshold:"Warn <£300k",  confidence:98 },
        { label:"Cash Runway",        value:"4.8 mo",  status:"red",   delta:"-1.2 mo",    src:"Xero",       threshold:"Red <6 mo",    confidence:98 },
        { label:"Monthly Burn",       value:"£138k",   status:"amber", delta:"+£12k MoM",  src:"Xero",       threshold:"Warn +10% MoM",confidence:96 },
        { label:"Revenue vs Budget",  value:"87%",     status:"amber", delta:"-4% MoM",    src:"Xero",       threshold:"Red <85%",     confidence:99 },
        { label:"Gross Margin",       value:"71%",     status:"green", delta:"+1%",         src:"Xero",       threshold:"Green >60%",   confidence:97 },
        { label:"EBITDA Margin",      value:"-8%",     status:"red",   delta:"-2%",         src:"Xero",       threshold:"Red <-15%",   confidence:97 },
        { label:"ARR",                value:"£3.1M",   status:"amber", delta:"+£80k QoQ",  src:"Stripe",     threshold:"Watch",        confidence:100 },
        { label:"NRR",                value:"94%",     status:"amber", delta:"-3%",         src:"Stripe",     threshold:"Red <90%",    confidence:100 },
        { label:"DSO",                value:"47 days", status:"red",   delta:"+15 days",   src:"Xero",       threshold:"Red >45 days", confidence:94 },
        { label:"Burn Multiple",      value:"2.8×",    status:"amber", delta:"+0.4×",      src:"Derived",    threshold:"Red >3×",     confidence:92 },
        { label:"Working Capital",    value:"£274k",   status:"amber", delta:"-£42k",      src:"Xero",       threshold:"Watch",        confidence:97 },
        { label:"Covenant Headroom",  value:"18%",     status:"green", delta:"-3%",         src:"Xero",       threshold:"Red <10%",    confidence:90 },
      ],
      rev:  MO.map((m,i)=>({m,actual:[210,224,235,248,255,261,268,272,261,255,258,261][i],budget:[240,248,255,262,270,278,285,292,298,304,310,315][i]})),
      cash: [{m:"May",v:1100},{m:"Jun",v:980},{m:"Jul",v:860},{m:"Aug",v:740},{m:"Sep",v:620},{m:"Oct",v:500},{m:"Nov",v:380},{m:"Dec",v:250},{m:"Jan",v:120}],
      burn: mk([118,121,124,126,129,131,133,135,136,137,138,138]),
      arAging:[{bucket:"Current",val:142},{bucket:"1–30d",val:58},{bucket:"31–60d",val:34},{bucket:"61–90d",val:22},{bucket:">90d",val:18}],
    },
    sales:{
      src:"Salesforce · HubSpot · 47m ago", qual:100,
      kpis:[
        { label:"Revenue vs Budget",  value:"87%",     status:"amber", delta:"-4%",        src:"Xero",       threshold:"Red <85%",     confidence:99 },
        { label:"Pipeline Coverage",  value:"2.1×",    status:"red",   delta:"-0.4×",      src:"Salesforce", threshold:"Red <2×",     confidence:100 },
        { label:"Win Rate",           value:"28%",     status:"amber", delta:"-4%",         src:"Salesforce", threshold:"Warn <30%",   confidence:100 },
        { label:"Avg Deal Size",      value:"£24k",    status:"green", delta:"+£2k",        src:"Salesforce", threshold:"Watch",        confidence:100 },
        { label:"Quota Attainment",   value:"82%",     status:"amber", delta:"-5%",         src:"Salesforce", threshold:"Red <75%",    confidence:100 },
        { label:"Logo Churn",         value:"8%",      status:"amber", delta:"+2%",         src:"Stripe",     threshold:"Red >10%",    confidence:100 },
        { label:"Sales Cycle",        value:"47 days", status:"amber", delta:"+8 days",    src:"Salesforce", threshold:"Warn >45d",   confidence:100 },
        { label:"Forecast Accuracy",  value:"74%",     status:"amber", delta:"-6%",         src:"Salesforce", threshold:"Red <70%",    confidence:98 },
        { label:"NRR",                value:"94%",     status:"amber", delta:"-3%",         src:"Stripe",     threshold:"Red <90%",    confidence:100 },
        { label:"New Logos",          value:"3",       status:"red",   delta:"-4 MoM",     src:"Salesforce", threshold:"Watch",        confidence:100 },
        { label:"Customer Conc. Top3",value:"38%",     status:"amber", delta:"+3%",         src:"Salesforce", threshold:"Warn >40%",   confidence:95 },
        { label:"GRR",                value:"92%",     status:"green", delta:"-1%",         src:"Stripe",     threshold:"Red <85%",    confidence:100 },
      ],
      pipe: MO.map((m,i)=>({m,pipe:[1800,1920,1850,2100,2050,1980,1900,1820,1750,1680,1620,1580][i],target:2100})),
      funnel:[{stage:"Leads",v:380},{stage:"Qualified",v:142},{stage:"Demo",v:68},{stage:"Proposal",v:41},{stage:"Negotiation",v:22},{stage:"Closed Won",v:12}],
    },
    hr:{
      src:"BambooHR · Greenhouse · 12h ago", qual:97,
      kpis:[
        { label:"Headcount",          value:"29",      status:"amber", delta:"vs plan 32", src:"BambooHR",   threshold:"Watch",        confidence:100 },
        { label:"Attrition Rate",     value:"14%",     status:"amber", delta:"+3% MoM",   src:"BambooHR",   threshold:"Red >20%",     confidence:97 },
        { label:"Voluntary Attrition",value:"11%",     status:"amber", delta:"+2%",        src:"BambooHR",   threshold:"Watch",        confidence:97 },
        { label:"Time to Hire",       value:"38 days", status:"amber", delta:"+6 days",   src:"Greenhouse", threshold:"Warn >35d",   confidence:100 },
        { label:"Open Roles",         value:"6",       status:"red",   delta:"3 critical", src:"Greenhouse", threshold:"Watch critical",confidence:100 },
        { label:"Offer Accept Rate",  value:"71%",     status:"amber", delta:"-9%",        src:"Greenhouse", threshold:"Red <65%",    confidence:100 },
        { label:"Payroll vs Budget",  value:"94%",     status:"green", delta:"-6%",        src:"BambooHR",   threshold:"Green <100%", confidence:97 },
        { label:"Avg Tenure",         value:"18 mo",   status:"amber", delta:"-2 mo",     src:"BambooHR",   threshold:"Watch",        confidence:97 },
        { label:"Span of Control",    value:"5.8",     status:"green", delta:"stable",     src:"BambooHR",   threshold:"Green 4–8",   confidence:97 },
      ],
      att: MO.map((m,i)=>({m,att:[8,9,9,10,10,11,12,12,13,13,14,14][i],bench:10})),
      hcWaterfall:[{m:"Aug",hires:2,leavers:-1},{m:"Sep",hires:1,leavers:-2},{m:"Oct",hires:3,leavers:-1},{m:"Nov",hires:0,leavers:-3},{m:"Dec",hires:2,leavers:-2},{m:"Jan",hires:1,leavers:-2}],
    },
    ops:{
      src:"Jira · Zendesk · 1h ago", qual:96,
      kpis:[
        { label:"SLA Adherence",      value:"91%",     status:"amber", delta:"-3%",        src:"Zendesk",    threshold:"Red <90%",     confidence:99 },
        { label:"Ticket Backlog",     value:"184",     status:"amber", delta:"+22 MoM",   src:"Jira",       threshold:"Warn >150",    confidence:100 },
        { label:"Sprint Velocity",    value:"42 pts",  status:"green", delta:"+4 pts",     src:"Jira",       threshold:"Watch",        confidence:100 },
        { label:"Cycle Time",         value:"4.2 days",status:"amber", delta:"+0.8d",     src:"Jira",       threshold:"Warn >4d",    confidence:100 },
        { label:"CSAT Score",         value:"8.1/10",  status:"green", delta:"+0.2",       src:"Zendesk",    threshold:"Red <7",      confidence:98 },
        { label:"Incident Rate",      value:"3/wk",    status:"green", delta:"-1/wk",     src:"Jira",       threshold:"Warn >5/wk",  confidence:100 },
        { label:"Defect Rate",        value:"2.4%",    status:"green", delta:"-0.3%",      src:"Jira",       threshold:"Red >5%",     confidence:100 },
        { label:"On-Time Delivery",   value:"94%",     status:"green", delta:"+1%",        src:"Internal",   threshold:"Red <90%",    confidence:92 },
        { label:"Utilisation Rate",   value:"78%",     status:"green", delta:"+2%",        src:"Internal",   threshold:"Warn >90%",   confidence:88 },
      ],
      chart: mk([88,89,90,91,90,91,92,91,91,91,91,91]),
    },
    procurement:{
      src:"Xero · Internal · 4h ago", qual:96,
      kpis:[
        { label:"Spend vs Budget",    value:"97%",     status:"green", delta:"-3%",        src:"Xero",       threshold:"Red >110%",    confidence:98 },
        { label:"Supplier Conc.",     value:"44%",     status:"amber", delta:"+4%",        src:"Xero",       threshold:"Warn >40%",   confidence:95 },
        { label:"Contract Coverage",  value:"78%",     status:"amber", delta:"+2%",        src:"Internal",   threshold:"Warn <80%",   confidence:88 },
        { label:"Maverick Spend",     value:"12%",     status:"amber", delta:"-2%",        src:"Xero",       threshold:"Red >15%",    confidence:95 },
        { label:"Savings Delivered",  value:"£24k",    status:"green", delta:"vs £20k tgt",src:"Xero",       threshold:"Watch",        confidence:95 },
        { label:"Overdue Renewals",   value:"3",       status:"amber", delta:"30–60 days", src:"Internal",   threshold:"Watch",        confidence:90 },
        { label:"PO Compliance",      value:"84%",     status:"amber", delta:"+3%",        src:"Xero",       threshold:"Warn <85%",   confidence:95 },
        { label:"Avg Payment Terms",  value:"32 days", status:"green", delta:"stable",     src:"Xero",       threshold:"Green <45d",  confidence:98 },
        { label:"Critical Suppliers", value:"7",       status:"green", delta:"stable",     src:"Internal",   threshold:"Watch",        confidence:85 },
      ],
      chart: mk([94,96,97,98,97,97,98,97,97,97,97,97]),
    },
    technology:{
      src:"Jira · AWS · 1h ago", qual:96,
      kpis:[
        { label:"Uptime",             value:"99.7%",   status:"green", delta:"stable",     src:"AWS",        threshold:"Red <99%",     confidence:100 },
        { label:"Incidents / Month",  value:"3",       status:"green", delta:"-2 MoM",    src:"Jira",       threshold:"Warn >5",     confidence:100 },
        { label:"MTTR",               value:"48 min",  status:"green", delta:"-12 min",   src:"Jira",       threshold:"Warn >2h",    confidence:100 },
        { label:"Cloud Spend",        value:"£12.4k",  status:"amber", delta:"+£1.2k MoM",src:"AWS",        threshold:"Warn +10%",   confidence:100 },
        { label:"Deploy Frequency",   value:"8/wk",    status:"green", delta:"+2/wk",     src:"Jira",       threshold:"Green >5/wk", confidence:100 },
        { label:"Change Fail Rate",   value:"4%",      status:"green", delta:"-1%",        src:"Jira",       threshold:"Red >10%",    confidence:100 },
        { label:"Security Patches",   value:"98%",     status:"green", delta:"current",   src:"Internal",   threshold:"Red <95%",    confidence:90 },
        { label:"Active Users",       value:"284",     status:"green", delta:"+18 MoM",   src:"Internal",   threshold:"Watch",        confidence:88 },
        { label:"Vulnerability Count",value:"2 low",   status:"green", delta:"-1 MoM",   src:"Internal",   threshold:"Red: any crit",confidence:90 },
      ],
      chart: mk([99.8,99.9,99.7,99.8,99.9,99.7,99.8,99.9,99.7,99.8,99.7,99.7]),
    },
    compliance:{
      src:"Internal · 1d ago", qual:94,
      kpis:[
        { label:"KYC Completion",     value:"96%",     status:"green", delta:"+2%",        src:"Internal",   threshold:"Red <90%",     confidence:92 },
        { label:"Overdue KYC",        value:"4",       status:"amber", delta:"+2 MoM",    src:"Internal",   threshold:"Warn >3",     confidence:92 },
        { label:"AML Alerts Open",    value:"1",       status:"green", delta:"-2 MoM",    src:"Internal",   threshold:"Watch",        confidence:92 },
        { label:"GDPR Training",      value:"100%",    status:"green", delta:"complete",  src:"Internal",   threshold:"Red <90%",    confidence:95 },
        { label:"Policy Attestations",value:"94%",     status:"green", delta:"+4%",        src:"Internal",   threshold:"Red <85%",    confidence:90 },
        { label:"Open Audit Issues",  value:"3",       status:"amber", delta:"2 med, 1 lo",src:"Internal",  threshold:"Watch",        confidence:90 },
        { label:"Risk Score",         value:"Low",     status:"green", delta:"stable",    src:"Internal",   threshold:"Watch",        confidence:85 },
        { label:"Data Incidents",     value:"0",       status:"green", delta:"YTD clean", src:"Internal",   threshold:"Red: any",    confidence:95 },
        { label:"Regulatory Filings", value:"Current", status:"green", delta:"all filed", src:"Internal",   threshold:"Red: overdue", confidence:95 },
      ],
      chart: mk([90,91,92,93,93,94,94,95,95,96,96,96]),
    },
    crossFunctional:{
      src:"Xero · Salesforce · BambooHR · Derived", qual:94,
      kpis:[
        { label:"Revenue per Employee",value:"£107k",  status:"amber", delta:"-£4k",      src:"Derived",    threshold:"Watch",        confidence:96 },
        { label:"Burn per Employee",   value:"£4.8k",  status:"amber", delta:"+£0.4k",   src:"Derived",    threshold:"Watch",        confidence:96 },
        { label:"Sales Efficiency",    value:"0.42",    status:"amber", delta:"-0.06",     src:"Derived",    threshold:"Green >0.5",  confidence:95 },
        { label:"Rule of 40",          value:"29",      status:"amber", delta:"-4",        src:"Derived",    threshold:"Red <20",     confidence:94 },
        { label:"CAC Payback",         value:"18 mo",   status:"amber", delta:"+2 mo",    src:"Derived",    threshold:"Warn >18 mo", confidence:90 },
        { label:"LTV / CAC",           value:"3.2×",    status:"green", delta:"-0.2×",    src:"Derived",    threshold:"Red <3×",     confidence:88 },
        { label:"Cash Conv. Cycle",    value:"52 days", status:"red",   delta:"+12 days", src:"Derived",    threshold:"Red >45d",    confidence:92 },
        { label:"ARR per Employee",    value:"£107k",   status:"amber", delta:"+£3k",     src:"Derived",    threshold:"Watch",        confidence:94 },
      ],
    },
  },
};
// Populate other companies from Meridian base
["payflo","swiftlogix","careos","forgetech"].forEach(id => {
  MODULES[id] = JSON.parse(JSON.stringify(MODULES.meridian));
});

// ── ALERTS ────────────────────────────────────────────────────────────────────
const ALERTS_DATA = [
  { id:1,  co:"CareOS",       sev:"critical", kpi:"Cash Runway",      msg:"Cash runway at 2.3 months. Bridge financing or emergency cost reduction required. GP must act this week.", time:"3h ago",   st:"open" },
  { id:2,  co:"CareOS",       sev:"critical", kpi:"Revenue vs Budget",msg:"Revenue 36% below budget. Pipeline coverage 0.8× — shortfall unrecoverable without significant pipeline injection.", time:"3h ago",   st:"open" },
  { id:3,  co:"Meridian SaaS",sev:"high",     kpi:"Cash Runway",      msg:"Runway 4.8 months. Burn +£12k MoM, DSO widened 15 days. Debtor collection escalation needed immediately.", time:"4h ago",   st:"open" },
  { id:4,  co:"CareOS",       sev:"high",     kpi:"Attrition",        msg:"23% annualised attrition. 5 critical roles vacant 60+ days. Execution capacity materially impaired.", time:"1d ago",   st:"acknowledged" },
  { id:5,  co:"SwiftLogix",   sev:"high",     kpi:"On-Time Delivery", msg:"SLA at 87% vs 95% target. Two enterprise clients issued formal warnings. £420k revenue at risk.", time:"Yesterday",st:"open" },
  { id:6,  co:"Meridian SaaS",sev:"high",     kpi:"Pipeline Coverage",msg:"Pipeline 2.1× vs 3× target. Win rate declining third consecutive month. Sales cycle +8 days.", time:"4h ago",   st:"open" },
  { id:7,  co:"SwiftLogix",   sev:"watchlist",kpi:"Attrition",        msg:"19% attrition — approaching red. Operations most affected at 24%.", time:"2d ago",   st:"open" },
  { id:8,  co:"ForgeTech",    sev:"watchlist",kpi:"Inventory Turnover",msg:"Inventory aging 11% above target. Recommend SKU review before Q2 close.", time:"1d ago",   st:"open" },
];

// ── ACTIONS ───────────────────────────────────────────────────────────────────
const ACTIONS_DATA = [
  { id:1, co:"CareOS",       dept:"Finance",    title:"Emergency debtor review — top 5 overdue accounts (£94k)", owner:"GP Team",       due:"2026-06-02", pri:"critical", st:"open",       kpi:"Cash Runway",       created:"Today" },
  { id:2, co:"CareOS",       dept:"Finance",    title:"Prepare bridge financing options for board review",        owner:"CFO",           due:"2026-06-05", pri:"critical", st:"open",       kpi:"Cash Runway",       created:"Today" },
  { id:3, co:"CareOS",       dept:"People",     title:"Head of Sales role — 60+ days vacant, escalate immediately",owner:"CEO",          due:"2026-06-03", pri:"high",     st:"open",       kpi:"Open Roles",        created:"Yesterday" },
  { id:4, co:"Meridian SaaS",dept:"Finance",    title:"Debtor collection escalation — DSO at 47 days",           owner:"CFO",           due:"2026-06-07", pri:"high",     st:"open",       kpi:"DSO",               created:"Today" },
  { id:5, co:"Meridian SaaS",dept:"Finance",    title:"Hiring freeze — all non-critical open roles",             owner:"CEO",           due:"2026-06-01", pri:"high",     st:"in_progress",kpi:"Cash Runway",       created:"2d ago" },
  { id:6, co:"Meridian SaaS",dept:"Sales",      title:"Pipeline review — top 10 most winnable deals",           owner:"Head of Sales", due:"2026-06-10", pri:"high",     st:"open",       kpi:"Pipeline Coverage", created:"Today" },
  { id:7, co:"SwiftLogix",   dept:"Operations", title:"Enterprise SLA response — 2 client formal warnings",     owner:"COO",           due:"2026-06-04", pri:"high",     st:"in_progress",kpi:"On-Time Delivery",  created:"Yesterday" },
  { id:8, co:"ForgeTech",    dept:"Procurement","title":"Inventory aging review — slow-moving SKU identification",owner:"COO",          due:"2026-06-21", pri:"medium",   st:"open",       kpi:"Inventory Turnover",created:"1d ago" },
];

// ── BENCHMARKS ────────────────────────────────────────────────────────────────
const BENCHMARKS = {
  meridian: [
    { kpi:"Gross Margin",     company:71, sectorMedian:72, topQuartile:80, bottomQuartile:60, unit:"%" },
    { kpi:"NRR",              company:94, sectorMedian:105,topQuartile:120,bottomQuartile:90, unit:"%" },
    { kpi:"CAC Payback",      company:18, sectorMedian:14, topQuartile:10, bottomQuartile:22, unit:"mo", lowerBetter:true },
    { kpi:"Rule of 40",       company:29, sectorMedian:35, topQuartile:50, bottomQuartile:20, unit:"" },
    { kpi:"Revenue per Emp",  company:107,sectorMedian:120,topQuartile:160,bottomQuartile:80, unit:"£k" },
    { kpi:"Attrition",        company:14, sectorMedian:12, topQuartile:8,  bottomQuartile:18, unit:"%", lowerBetter:true },
  ],
};

// ── MICRO COMPONENTS ──────────────────────────────────────────────────────────
function HealthRing({score,size=48}){
  const r=(size-10)/2,circ=2*Math.PI*r,pct=(score/100)*circ;
  const col=score>=75?T.green:score>=50?T.amber:T.red;
  return(<svg width={size} height={size} style={{flexShrink:0}}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.border} strokeWidth={5}/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={5} strokeDasharray={`${pct} ${circ}`} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}/><text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle" style={{fill:col,fontSize:size<44?10:12,fontWeight:700,fontFamily:"monospace"}}>{score}</text></svg>);
}
function Dot({status,size=8}){const c=ragCol(status);return <span style={{display:"inline-block",width:size,height:size,borderRadius:"50%",background:c,boxShadow:`0 0 5px ${c}`,flexShrink:0}}/>;}
function RagBadge({status}){const m={green:{c:T.green,bg:T.greenDim,l:"Green"},amber:{c:T.amber,bg:T.amberDim,l:"Amber"},red:{c:T.red,bg:T.redDim,l:"Red"}};const s=m[status]||m.amber;return <span style={{padding:"2px 8px",borderRadius:4,background:s.bg,color:s.c,fontSize:10,fontWeight:700,letterSpacing:"0.08em"}}>{s.l.toUpperCase()}</span>;}
const TT=({active,payload,label,src})=>{if(!active||!payload?.length)return null;return(<div style={{background:T.card,border:`1px solid ${T.borderLt}`,borderRadius:8,padding:"9px 12px",boxShadow:"0 8px 28px rgba(0,0,0,0.45)"}}><div style={{color:T.txt3,fontSize:9,marginBottom:6,letterSpacing:"0.04em"}}>{label}</div>{payload.map((p,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}><span style={{width:7,height:7,borderRadius:2,background:p.color||p.fill||T.blue,display:"inline-block"}}/><span style={{color:T.txt2,fontSize:11,flex:1}}>{p.name}</span><span style={{color:T.txt1,fontSize:11,fontWeight:700,fontFamily:"monospace"}}>{typeof p.value==="number"?p.value.toLocaleString():p.value}</span></div>)}<div style={{marginTop:6,paddingTop:6,borderTop:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:5}}><span style={{width:5,height:5,borderRadius:"50%",background:T.green,display:"inline-block"}}/><span style={{color:T.txt3,fontSize:8}}>{src||"Live data"}</span></div></div>);};

// ── SPARKLINE ───────────────────────────────────────────────────────────────
function Sparkline({data,color,w=58,h=22}){
  if(!data||data.length<2)return null;
  const min=Math.min(...data),max=Math.max(...data),range=max-min||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-min)/range)*(h-4)-2}`).join(" ");
  const last=data[data.length-1],first=data[0];
  const up=last>=first;
  const lc=color||(up?T.green:T.red);
  const lx=w,ly=h-((last-min)/range)*(h-4)-2;
  return(<svg width={w} height={h} style={{display:"block",overflow:"visible"}}><defs><linearGradient id={`sg${color}${data[0]}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={lc} stopOpacity="0.25"/><stop offset="100%" stopColor={lc} stopOpacity="0"/></linearGradient></defs><polyline points={`0,${h} ${pts} ${w},${h}`} fill={`url(#sg${color}${data[0]})`} stroke="none"/><polyline points={pts} fill="none" stroke={lc} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/><circle cx={lx} cy={ly} r="2" fill={lc}/></svg>);
}

function KpiCard({label,value,status,delta,src,threshold,confidence,bad}){
  const sc=ragCol(status);
  const [showDetail,setShowDetail]=useState(false);
  return(
    <div onClick={()=>setShowDetail(p=>!p)} style={{padding:"11px 13px",background:T.card,border:`1px solid ${showDetail?T.borderLt:T.border}`,borderLeft:`3px solid ${sc}`,borderRadius:8,cursor:"pointer",transition:"border-color 0.15s"}}>
      <div style={{color:T.txt3,fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>{label}</div>
      <div style={{color:T.txt1,fontSize:17,fontWeight:700,fontFamily:"monospace",marginBottom:3}}>{value}</div>
      {delta&&<div style={{color:bad!==false&&(delta.startsWith("+")||delta.includes("MoM")||delta.includes("days"))?T.red:T.green,fontSize:10,fontFamily:"monospace"}}>{delta}</div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
        <span style={{color:T.txt3,fontSize:8}}>{src}</span>
        <span style={{width:6,height:6,borderRadius:2,background:sc,display:"inline-block"}}/>
      </div>
      {showDetail&&(
        <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${T.border}`}}>
          <div style={{color:T.txt3,fontSize:9,marginBottom:2}}>Threshold: <span style={{color:T.txt2}}>{threshold}</span></div>
          <div style={{color:T.txt3,fontSize:9,marginBottom:4}}>Confidence: <span style={{color:confidence>90?T.green:confidence>75?T.amber:T.red,fontFamily:"monospace"}}>{confidence}%</span></div>
          <div style={{height:2,background:T.border,borderRadius:1}}><div style={{height:"100%",borderRadius:1,background:confidence>90?T.green:confidence>75?T.amber:T.red,width:`${confidence}%`}}/></div>
        </div>
      )}
    </div>
  );
}

function ChartBox({title,src,children}){return(<div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:14}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><div style={{color:T.txt3,fontSize:9,letterSpacing:"0.1em"}}>{title}</div>{src&&<span style={{color:T.txt3,fontSize:8,display:"flex",alignItems:"center",gap:4}}><span style={{width:5,height:5,borderRadius:"50%",background:T.green,display:"inline-block"}}/>  {src}</span>}</div>{children}</div>);}

// ── HEALTH SCORE BREAKDOWN ────────────────────────────────────────────────────
function HealthBreakdown({co}){
  const weights={finance:30,sales:20,hr:15,ops:15,procurement:5,technology:10,compliance:5};
  const entries=Object.entries(co.subScores);
  return(
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:16}}>
      <div style={{color:T.txt3,fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12}}>Health Score Breakdown — Weighted</div>
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {entries.map(([dim,score])=>{
          const w=weights[dim]||10;
          const col=score>=75?T.green:score>=50?T.amber:T.red;
          return(
            <div key={dim}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{color:T.txt2,fontSize:10,textTransform:"capitalize",width:90}}>{dim}</span>
                  <span style={{color:T.txt3,fontSize:9}}>{w}% weight</span>
                </div>
                <span style={{color:col,fontSize:12,fontWeight:700,fontFamily:"monospace"}}>{score}</span>
              </div>
              <div style={{height:5,background:T.border,borderRadius:3}}>
                <div style={{height:"100%",borderRadius:3,background:col,width:`${score}%`,transition:"width 0.6s"}}/>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{marginTop:12,paddingTop:10,borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between"}}>
        <span style={{color:T.txt3,fontSize:9}}>Overall (weighted)</span>
        <span style={{color:ragCol(co.status),fontSize:14,fontWeight:700,fontFamily:"monospace"}}>{co.score}/100</span>
      </div>
    </div>
  );
}

// ── MODULE RENDERERS ──────────────────────────────────────────────────────────
function GenericModule({d}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{color:T.txt3,fontSize:9,display:"flex",alignItems:"center",gap:6}}><span style={{width:6,height:6,borderRadius:"50%",background:T.green,display:"inline-block"}}/>{d.src} · Quality {d.qual}%</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9}}>{d.kpis.map((k,i)=><KpiCard key={i} {...k}/>)}</div>
      {d.chart&&<ChartBox title="TREND" src={d.src}><ResponsiveContainer width="100%" height={130}><AreaChart data={d.chart}><CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis dataKey="m" tick={{fill:T.txt3,fontSize:9}}/><YAxis tick={{fill:T.txt3,fontSize:9}} domain={["auto","auto"]}/><Tooltip content={<TT/>}/><Area dataKey="v" stroke={T.blue} fill={T.blueDim} strokeWidth={2}/></AreaChart></ResponsiveContainer></ChartBox>}
    </div>
  );
}

function FinanceModule({d,co,onDrill}){return(<div style={{display:"flex",flexDirection:"column",gap:14}}><div style={{color:T.txt3,fontSize:9,display:"flex",alignItems:"center",gap:6}}><span style={{width:6,height:6,borderRadius:"50%",background:T.green,display:"inline-block"}}/>{d.src}</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9}}>{[{m:"cash",l:"Cash Runway",v:`${co.runway} mo`,s:co.runway<6?"red":co.runway<9?"amber":"green"},{m:"revenue",l:"Revenue vs Budget",v:`${co.rvb}%`,s:co.rvb<85?"red":co.rvb<95?"amber":"green"},{m:"ebitda",l:"EBITDA Margin",v:`${co.ebitda}%`,s:co.ebitda<0?"red":co.ebitda<5?"amber":"green"}].map(card=><div key={card.m} onClick={()=>onDrill&&onDrill(card.m)} style={{background:T.card,border:`1px solid ${ragCol(card.s)}40`,borderLeft:`3px solid ${ragCol(card.s)}`,borderRadius:9,padding:"13px 15px",cursor:"pointer",transition:"background 0.15s",position:"relative"}} onMouseEnter={e=>e.currentTarget.style.background=T.cardHov} onMouseLeave={e=>e.currentTarget.style.background=T.card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{color:T.txt3,fontSize:10,letterSpacing:"0.04em",textTransform:"uppercase"}}>{card.l}</div><span style={{color:T.txt3,fontSize:9,display:"flex",alignItems:"center",gap:3}}>drill <span style={{fontSize:12}}>›</span></span></div><div style={{color:ragCol(card.s),fontSize:22,fontWeight:800,fontFamily:"monospace",marginTop:6}}>{card.v}</div></div>)}</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9}}>{d.kpis.map((k,i)=><KpiCard key={i} {...k}/>)}</div><div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}><ChartBox title="REVENUE — ACTUAL VS BUDGET (£k)" src="Xero · 4h ago"><ResponsiveContainer width="100%" height={155}><ComposedChart data={d.rev}><CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis dataKey="m" tick={{fill:T.txt3,fontSize:9}}/><YAxis tick={{fill:T.txt3,fontSize:9}}/><Tooltip content={<TT/>}/><Bar dataKey="budget" name="Budget" fill={T.borderLt} radius={[2,2,0,0]}/><Line dataKey="actual" name="Actual" stroke={T.amber} strokeWidth={2} dot={false}/></ComposedChart></ResponsiveContainer></ChartBox><ChartBox title="CASH PROJECTION (£k)" src="TrueLayer · 12m"><ResponsiveContainer width="100%" height={155}><AreaChart data={d.cash}><CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis dataKey="m" tick={{fill:T.txt3,fontSize:9}}/><YAxis tick={{fill:T.txt3,fontSize:9}}/><Tooltip content={<TT/>}/><ReferenceLine y={200} stroke={T.red} strokeDasharray="4 4"/><Area dataKey="v" name="Cash £k" stroke={T.red} fill={T.redDim} strokeWidth={2}/></AreaChart></ResponsiveContainer></ChartBox></div><ChartBox title="AR AGING WATERFALL (£k)" src="Xero · 4h ago"><ResponsiveContainer width="100%" height={130}><BarChart data={d.arAging}><CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis dataKey="bucket" tick={{fill:T.txt3,fontSize:9}}/><YAxis tick={{fill:T.txt3,fontSize:9}}/><Tooltip content={<TT/>}/><Bar dataKey="val" name="AR £k" radius={[3,3,0,0]}>{d.arAging.map((e,i)=><Cell key={i} fill={i===0?T.green:i===1?T.amber:T.red}/>)}</Bar></BarChart></ResponsiveContainer></ChartBox></div>);}

function SalesModule({d}){return(<div style={{display:"flex",flexDirection:"column",gap:14}}><div style={{color:T.txt3,fontSize:9,display:"flex",alignItems:"center",gap:6}}><span style={{width:6,height:6,borderRadius:"50%",background:T.green,display:"inline-block"}}/>{d.src}</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9}}>{d.kpis.map((k,i)=><KpiCard key={i} {...k}/>)}</div><div style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:12}}><ChartBox title="PIPELINE VS TARGET (£k)" src={d.src}><ResponsiveContainer width="100%" height={155}><ComposedChart data={d.pipe}><CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis dataKey="m" tick={{fill:T.txt3,fontSize:9}}/><YAxis tick={{fill:T.txt3,fontSize:9}}/><Tooltip content={<TT/>}/><Bar dataKey="pipe" name="Pipeline" fill={T.blue} radius={[2,2,0,0]} opacity={0.85}/><Line dataKey="target" name="Target" stroke={T.green} strokeWidth={2} dot={false} strokeDasharray="5 5"/></ComposedChart></ResponsiveContainer></ChartBox><ChartBox title="SALES FUNNEL" src="Salesforce"><ResponsiveContainer width="100%" height={155}><BarChart data={d.funnel} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis type="number" tick={{fill:T.txt3,fontSize:9}}/><YAxis dataKey="stage" type="category" tick={{fill:T.txt3,fontSize:8}} width={70}/><Tooltip content={<TT/>}/><Bar dataKey="v" name="Count" fill={T.blue} radius={[0,3,3,0]} opacity={0.85}/></BarChart></ResponsiveContainer></ChartBox></div></div>);}

function HRModule({d}){return(<div style={{display:"flex",flexDirection:"column",gap:14}}><div style={{color:T.txt3,fontSize:9,display:"flex",alignItems:"center",gap:6}}><span style={{width:6,height:6,borderRadius:"50%",background:T.green,display:"inline-block"}}/>{d.src}</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9}}>{d.kpis.map((k,i)=><KpiCard key={i} {...k}/>)}</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><ChartBox title="ATTRITION VS BENCHMARK (%)" src={d.src}><ResponsiveContainer width="100%" height={150}><ComposedChart data={d.att}><CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis dataKey="m" tick={{fill:T.txt3,fontSize:9}}/><YAxis tick={{fill:T.txt3,fontSize:9}} domain={[0,28]}/><Tooltip content={<TT/>}/><Area dataKey="att" name="Attrition %" stroke={T.amber} fill={T.amberDim} strokeWidth={2}/><Line dataKey="bench" name="Benchmark" stroke={T.green} strokeWidth={1.5} dot={false} strokeDasharray="5 5"/></ComposedChart></ResponsiveContainer></ChartBox><ChartBox title="HEADCOUNT MOVEMENT" src="BambooHR · 12h ago"><ResponsiveContainer width="100%" height={150}><BarChart data={d.hcWaterfall}><CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis dataKey="m" tick={{fill:T.txt3,fontSize:9}}/><YAxis tick={{fill:T.txt3,fontSize:9}}/><Tooltip content={<TT/>}/><Bar dataKey="hires" name="Hires" fill={T.green} radius={[2,2,0,0]}/><Bar dataKey="leavers" name="Leavers" fill={T.red} radius={[2,2,0,0]}/></BarChart></ResponsiveContainer></ChartBox></div></div>);}

function CrossFunctionalModule({d}){return(<div style={{display:"flex",flexDirection:"column",gap:14}}><div style={{background:T.amberDim,border:`1px solid ${T.amber}22`,borderRadius:6,padding:"8px 12px",color:T.amber,fontSize:10}}>⚡ Cross-functional KPIs — the metrics PE/VC actually use for valuation and intervention decisions. Derived from Finance + Sales + HR data. Click any tile to see calculation method and confidence.</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9}}>{d.kpis.map((k,i)=><KpiCard key={i} {...k}/>)}</div></div>);}

function BenchmarkModule({co}){
  const bm=BENCHMARKS[co.id]||BENCHMARKS.meridian;
  return(<div style={{display:"flex",flexDirection:"column",gap:14}}><div style={{color:T.txt3,fontSize:10,marginBottom:4}}>Benchmarked against {co.sector} companies at {co.stage} stage. Source: Alpha Vantage · Yahoo Finance · Internal portfolio data.</div>{bm.map((b,i)=>{const isLower=b.lowerBetter;const pos=isLower?(b.company<=b.topQuartile?"green":b.company<=b.sectorMedian?"amber":"red"):(b.company>=b.topQuartile?"green":b.company>=b.sectorMedian?"amber":"red");const range=b.topQuartile-b.bottomQuartile||1;const pct=Math.min(100,Math.max(0,((b.company-b.bottomQuartile)/range)*100));return(<div key={i} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"12px 14px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><span style={{color:T.txt1,fontSize:12,fontWeight:600}}>{b.kpi}</span><div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{color:ragCol(pos),fontSize:13,fontWeight:700,fontFamily:"monospace"}}>{b.company}{b.unit}</span><RagBadge status={pos}/></div></div><div style={{position:"relative",height:8,background:T.border,borderRadius:4,marginBottom:6}}><div style={{position:"absolute",left:`${Math.min(100,Math.max(0,((b.bottomQuartile+(range*0.25)-b.bottomQuartile)/range)*100))}%`,right:`${100-Math.min(100,Math.max(0,((b.topQuartile-b.bottomQuartile*0.25)/range)*100))}%`,top:0,bottom:0,background:`${T.green}22`,borderRadius:4}}/><div style={{position:"absolute",left:`${pct}%`,top:-2,width:12,height:12,borderRadius:"50%",background:ragCol(pos),transform:"translateX(-50%)",border:`2px solid ${T.bg}`}}/></div><div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:T.txt3,fontSize:8}}>Bottom Q4: {b.bottomQuartile}{b.unit}</span><span style={{color:T.txt3,fontSize:8}}>Median: {b.sectorMedian}{b.unit}</span><span style={{color:T.green,fontSize:8}}>Top Q1: {b.topQuartile}{b.unit}</span></div></div>);})}</div>);
}

// ── CEO / GP COCKPIT ──────────────────────────────────────────────────────────
function CockpitView({co}){
  const d=MODULES[co.id];
  const [mode,setMode]=useState("ceo");
  const ceoPoints=[
    {q:"Current condition?", a:`Health score ${co.score}/100. ${co.status==="red"?"Critical intervention required.":co.status==="amber"?"Monitoring required — two active concerns.":"Tracking well."} Cash runway ${co.runway} months.`},
    {q:"What changed since last month?", a:`Burn increased £12k MoM. DSO widened 15 days. Pipeline coverage dropped from 2.5× to 2.1×.`},
    {q:"What is projected if trends continue?", a:`At current burn trajectory, cash depletes in ${co.runway} months. Revenue gap vs budget may widen to 18% by Q3 without pipeline recovery.`},
    {q:"What actions are open?", a:`${ACTIONS_DATA.filter(a=>a.co===co.name).length} active actions. ${ACTIONS_DATA.filter(a=>a.co===co.name&&a.pri==="critical").length} critical, ${ACTIONS_DATA.filter(a=>a.co===co.name&&a.pri==="high").length} high priority.`},
    {q:"What needs board/investor attention?", a:`Cash runway requires board resolution. Bring bridge financing options and debtor recovery plan to next board meeting.`},
  ];
  const gpPoints=[
    {q:"On or off thesis?", a:`${co.score>=70?"Broadly on thesis — core metrics tracking.":"Off thesis in finance and commercial dimensions. Intervention warranted."} Ownership ${co.own}%.`},
    {q:"Is management in control?", a:`${co.score>=70?"Management demonstrating adequate operational control.":"Execution risk elevated. Operating partner involvement recommended."}`},
    {q:"What is the downside risk?", a:`Cash depletion risk at ${co.runway} months. Valuation impairment risk if revenue trajectory not recovered within 2 quarters.`},
    {q:"What support is required?", a:`Operating partner review recommended. CFO support on debtor management and cash forecasting.`},
    {q:"Is further capital at risk?", a:`${co.runway<6?"Yes — current trajectory puts existing invested capital at risk without bridge or cost reduction.":"Not immediately — but continued underperformance may affect follow-on terms."}`},
  ];
  const pts=mode==="ceo"?ceoPoints:gpPoints;
  return(<div style={{display:"flex",flexDirection:"column",gap:14}}><div style={{display:"flex",gap:6,marginBottom:4}}>{["ceo","gp"].map(m=><button key={m} onClick={()=>setMode(m)} style={{padding:"7px 16px",background:mode===m?T.blue:"transparent",border:`1px solid ${mode===m?T.blue:T.border}`,borderRadius:6,color:mode===m?"#fff":T.txt3,cursor:"pointer",fontSize:11,fontWeight:mode===m?600:400}}>{m==="ceo"?"CEO Cockpit":"GP Cockpit"}</button>)}</div>{pts.map((p,i)=><div key={i} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"12px 14px"}}><div style={{color:T.txt3,fontSize:10,marginBottom:5}}>Q: {p.q}</div><div style={{color:T.txt1,fontSize:12,lineHeight:1.5}}>{p.a}</div></div>)}<HealthBreakdown co={co}/></div>);
}

// ── AI PANEL ──────────────────────────────────────────────────────────────────
function AIPanel({co}){
  const [loading,setLoading]=useState(false);const [narrative,setNarrative]=useState(null);
  const [q,setQ]=useState("");const [answer,setAnswer]=useState(null);const [qLoad,setQLoad]=useState(false);
  const ctx=`Company: ${co.name} (${co.sector}, ${co.stage})\nScore: ${co.score}/100 (${co.status})\nCash Runway: ${co.runway}mo · Revenue vs Budget: ${co.rvb}% · Attrition: ${co.att}%\nEBITDA Margin: ${co.ebitda}% · Sub-scores: ${JSON.stringify(co.subScores)}`;
  async function gen(){setLoading(true);setNarrative(null);try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:600,system:"PE/VC analyst. Direct. Cite numbers. No hedging.\nFormat:\n**Overall Assessment** (2 sentences)\n\n**Top 3 Risks**\n• risk + metric\n• risk + metric\n• risk + metric\n\n**Recommended GP Actions**\n• action + time-bound\n• action + time-bound\n• action + time-bound\n\nUnder 280 words.",messages:[{role:"user",content:`Analyse:\n${ctx}`}]})});const d=await r.json();setNarrative(d.content?.[0]?.text||"Error.");}catch(e){setNarrative(`**Overall Assessment**\n${co.name} scores ${co.score}/100 with cash runway at ${co.runway} months as the critical constraint. Revenue at ${co.rvb}% of budget with ${co.att}% attrition indicates compound execution risk.\n\n**Top 3 Risks**\n• Cash depletion: ${co.runway} months runway — 30-day intervention window\n• Revenue shortfall: ${co.rvb}% of budget, gap widening MoM\n• Team instability: ${co.att}% attrition impairing delivery capacity\n\n**Recommended GP Actions**\n• Emergency operating review with CEO + CFO this week — cash plan required\n• Activate hiring freeze immediately on all non-critical roles\n• Escalate top-5 debtor accounts — recover AR within 30 days`);}setLoading(false);}
  async function ask(){if(!q.trim())return;setQLoad(true);setAnswer(null);try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:300,system:"PE/VC analyst. 2–3 sentences. Cite numbers. No hedging.",messages:[{role:"user",content:`Context:\n${ctx}\n\nQuestion: ${q}`}]})});const d=await r.json();setAnswer(d.content?.[0]?.text||"Error.");}catch(e){setAnswer(`${co.name} has ${co.runway} months of cash runway at current burn rate of £138k/month. Revenue is at ${co.rvb}% of budget with pipeline coverage insufficient to recover the shortfall this quarter.`);}setQLoad(false);}
  return(<div style={{display:"flex",flexDirection:"column",gap:14}}><div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:18}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div><div style={{color:T.txt1,fontSize:13,fontWeight:600}}>Board-Ready Executive Summary</div><div style={{color:T.txt3,fontSize:10,marginTop:2}}>All KPIs · All data sources · Source-cited · GP action recommendations</div></div><button onClick={gen} disabled={loading} style={{padding:"8px 16px",background:loading?T.borderLt:T.blue,color:loading?T.txt3:"#fff",border:"none",borderRadius:6,cursor:loading?"wait":"pointer",fontSize:11,fontWeight:600}}>{loading?"Analysing…":"Generate Analysis"}</button></div>{narrative&&<div style={{background:T.surface,border:`1px solid ${T.borderLt}`,borderRadius:6,padding:14,color:T.txt2,fontSize:12,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{narrative}</div>}</div><div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:18}}><div style={{color:T.txt1,fontSize:13,fontWeight:600,marginBottom:10}}>Ask a Question</div><div style={{display:"flex",gap:8,marginBottom:8}}><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&ask()} placeholder='e.g. "How many months before a cash injection is needed?"' style={{flex:1,padding:"8px 11px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,color:T.txt1,fontSize:11,fontFamily:"inherit",outline:"none"}}/><button onClick={ask} disabled={qLoad} style={{padding:"8px 16px",background:T.purple,color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:600}}>{qLoad?"…":"Ask"}</button></div><div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>{["How urgent is the cash situation?","What's driving the revenue miss?","Which risks need GP attention this week?","What does Rule of 40 tell us?"].map(qq=><button key={qq} onClick={()=>setQ(qq)} style={{padding:"3px 9px",background:"transparent",border:`1px solid ${T.border}`,borderRadius:4,color:T.txt3,fontSize:9,cursor:"pointer"}}>{qq}</button>)}</div>{answer&&<div style={{background:T.surface,border:`1px solid ${T.borderLt}`,borderRadius:6,padding:12,color:T.txt2,fontSize:12,lineHeight:1.7}}>{answer}</div>}</div></div>);
}

// ── COMPANY VIEW ──────────────────────────────────────────────────────────────
function CompanyView({co,onBack}){
  const [tab,setTab]=useState("overview");
  const [drill,setDrill]=useState(null);
  const d=MODULES[co.id];
  const ic=co.status==="red"?T.red:T.amber;
  const TABS=[{id:"overview",l:"Overview"},{id:"finance",l:"Finance"},{id:"sales",l:"Sales"},{id:"hr",l:"People"},{id:"ops",l:"Operations"},{id:"procurement",l:"Procurement"},{id:"technology",l:"Technology"},{id:"compliance",l:"Compliance"},{id:"crossfunctional",l:"Cross-Functional"},{id:"benchmarks",l:"Benchmarks"},{id:"ai",l:"🤖 AI"}];
  return(<div style={{height:"100%",overflowY:"auto",padding:"20px 24px"}}><button onClick={onBack} style={{background:"transparent",border:"none",color:T.txt3,cursor:"pointer",fontSize:11,marginBottom:12,padding:0}}>← Portfolio Overview</button><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18,paddingBottom:16,borderBottom:`1px solid ${T.border}`}}><div style={{display:"flex",alignItems:"center",gap:14}}><HealthRing score={co.score} size={62}/><div><h1 style={{color:T.txt1,fontSize:19,fontWeight:700,margin:0}}>{co.name}</h1><div style={{color:T.txt3,fontSize:11,marginTop:3}}>{co.sector} · {co.stage} · {co.own}% ownership · {co.geo}</div><div style={{display:"flex",gap:7,alignItems:"center",marginTop:7,flexWrap:"wrap"}}><RagBadge status={co.status}/><span style={{color:T.txt3,fontSize:9}}>Updated {co.upd}</span><span style={{color:T.txt3,fontSize:9}}>·</span><span style={{color:co.freshness>90?T.green:co.freshness>70?T.amber:T.red,fontSize:9,fontFamily:"monospace"}}>Data {co.freshness}% fresh</span><span style={{color:T.txt3,fontSize:9}}>·</span><span style={{color:co.actions>0?T.amber:T.green,fontSize:9}}>{co.actions} actions</span><span style={{color:T.txt3,fontSize:9}}>·</span><span style={{color:co.alerts>0?T.red:T.green,fontSize:9}}>{co.alerts} alerts</span></div></div></div><div style={{background:`${ic}10`,border:`1px solid ${ic}25`,borderRadius:8,padding:"10px 14px",maxWidth:280}}><div style={{color:T.txt3,fontSize:9,letterSpacing:"0.1em",marginBottom:4}}>PRIMARY ISSUE</div><div style={{color:ic,fontSize:11,lineHeight:1.5}}>{co.issue}</div></div></div><div style={{display:"flex",gap:3,marginBottom:14,flexWrap:"wrap"}}>{TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"6px 12px",background:tab===t.id?T.blue:"transparent",border:`1px solid ${tab===t.id?T.blue:T.border}`,borderRadius:5,color:tab===t.id?"#fff":T.txt3,cursor:"pointer",fontSize:10,fontWeight:tab===t.id?600:400}}>{t.l}</button>)}</div>{tab==="overview"&&<CockpitView co={co}/>}{tab==="finance"&&d&&<FinanceModule d={d.finance} co={co} onDrill={setDrill}/>}{tab==="sales"&&d&&<SalesModule d={d.sales}/>}{tab==="hr"&&d&&<HRModule d={d.hr}/>}{tab==="ops"&&d&&<GenericModule d={d.ops}/>}{tab==="procurement"&&d&&<GenericModule d={d.procurement}/>}{tab==="technology"&&d&&<GenericModule d={d.technology}/>}{tab==="compliance"&&d&&<GenericModule d={d.compliance}/>}{tab==="crossfunctional"&&d&&<CrossFunctionalModule d={d.crossFunctional}/>}{tab==="benchmarks"&&<BenchmarkModule co={co}/>}{tab==="ai"&&<AIPanel co={co}/>}{drill&&<FinanceDrilldown company={co} metric={drill} onClose={()=>setDrill(null)}/>}</div>);
}

// ── PORTFOLIO VIEW ────────────────────────────────────────────────────────────
function PortfolioView({onSelect}){
  const [sort,setSort]=useState("score");
  const [asc,setAsc]=useState(true);
  const sortFns={score:(a,b)=>a.score-b.score,runway:(a,b)=>a.runway-b.runway,rvb:(a,b)=>a.rvb-b.rvb,att:(a,b)=>a.att-b.att,freshness:(a,b)=>a.freshness-b.freshness,alerts:(a,b)=>a.alerts-b.alerts};
  const sorted=[...COMPANIES].sort((a,b)=>(sortFns[sort]?.(a,b)||0)*(asc?1:-1));
  const toggleSort=k=>{if(sort===k)setAsc(p=>!p);else{setSort(k);setAsc(true);}};
  const avg=Math.round(COMPANIES.reduce((s,c)=>s+c.score,0)/COMPANIES.length);
  const reds=COMPANIES.filter(c=>c.status==="red").length;
  const openActions=ACTIONS_DATA.filter(a=>a.st!=="done").length;
  const SortBtn=({k,l})=><button onClick={()=>toggleSort(k)} style={{color:sort===k?T.blue:T.txt3,background:"transparent",border:"none",cursor:"pointer",fontSize:9,padding:0,letterSpacing:"0.1em",textTransform:"uppercase",display:"flex",alignItems:"center",gap:2}}>{l}{sort===k&&<span style={{fontSize:8}}>{asc?"↑":"↓"}</span>}</button>;
  return(<div style={{height:"100%",overflowY:"auto",padding:"20px 24px"}}><div style={{marginBottom:18}}><div style={{color:T.txt3,fontSize:9,letterSpacing:"0.2em",textTransform:"uppercase"}}>Caledonia Alba · Portfolio Intelligence Platform</div><h1 style={{color:T.txt1,fontSize:20,fontWeight:700,margin:"3px 0 0"}}>Portfolio Overview</h1></div><div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:9,marginBottom:18}}>{[{l:"Companies",v:COMPANIES.length,c:T.txt1},{l:"Avg Health",v:`${avg}/100`,c:avg>=75?T.green:avg>=50?T.amber:T.red},{l:"Red Alerts",v:reds,c:reds>0?T.red:T.green},{l:"Open Actions",v:openActions,c:openActions>0?T.amber:T.green},{l:"Runway <6mo",v:COMPANIES.filter(c=>c.runway<6).length,c:T.red},{l:"Data Freshness",v:`${Math.round(COMPANIES.reduce((s,c)=>s+c.freshness,0)/COMPANIES.length)}%`,c:T.green}].map(s=><div key={s.l} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:7,padding:"10px 12px"}}><div style={{color:T.txt3,fontSize:8,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>{s.l}</div><div style={{color:s.c,fontSize:19,fontWeight:700,fontFamily:"monospace"}}>{s.v}</div></div>)}</div><div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"6px 0",marginBottom:6}}><div style={{display:"grid",gridTemplateColumns:"2.4fr 64px 1fr 1fr 1fr 1fr 70px 72px 1.4fr 64px",padding:"5px 14px",gap:4}}><div style={{color:T.txt3,fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase"}}>Company</div><SortBtn k="score" l="Score"/><SortBtn k="runway" l="Runway"/><SortBtn k="rvb" l="Rev vs Bdgt"/><SortBtn k="att" l="Attrition"/><div style={{color:T.txt3,fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase"}}>EBITDA</div><div style={{color:T.txt3,fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase"}}>Trend</div><SortBtn k="alerts" l="Alerts"/><SortBtn k="freshness" l="Data Fresh"/><div/></div></div><div style={{display:"flex",flexDirection:"column",gap:5}}>{sorted.map(c=>{const lc=ragCol(c.status);return(<div key={c.id} onClick={()=>onSelect(c)} style={{display:"grid",gridTemplateColumns:"2.4fr 64px 1fr 1fr 1fr 1fr 70px 72px 1.4fr 64px",alignItems:"center",padding:"12px 14px",background:T.card,border:`1px solid ${T.border}`,borderLeft:`3px solid ${lc}`,borderRadius:8,cursor:"pointer",gap:4}} onMouseEnter={e=>e.currentTarget.style.background=T.cardHov} onMouseLeave={e=>e.currentTarget.style.background=T.card}><div style={{display:"flex",alignItems:"center",gap:9}}><Dot status={c.status}/><div><div style={{color:T.txt1,fontSize:12,fontWeight:600}}>{c.name}</div><div style={{color:T.txt3,fontSize:9}}>{c.sector} · {c.stage}</div></div></div><HealthRing score={c.score} size={35}/><div style={{color:c.runway<6?T.red:c.runway<9?T.amber:T.green,fontSize:12,fontWeight:700,fontFamily:"monospace"}}>{c.runway}mo</div><div style={{color:c.rvb<85?T.red:c.rvb<95?T.amber:T.green,fontSize:12,fontWeight:700,fontFamily:"monospace"}}>{c.rvb}%</div><div style={{color:c.att>20?T.red:c.att>12?T.amber:T.green,fontSize:12,fontWeight:700,fontFamily:"monospace"}}>{c.att}%</div><div style={{color:c.ebitda<0?T.red:c.ebitda<5?T.amber:T.green,fontSize:12,fontWeight:700,fontFamily:"monospace"}}>{c.ebitda}%</div><div title="12-month health score trend"><Sparkline data={c.spark} color={c.trend==="up"?T.green:c.trend==="down"?T.red:T.amber}/></div><div style={{display:"flex",gap:5}}>{c.alerts>0&&<span style={{background:T.redDim,color:T.red,fontSize:9,padding:"2px 6px",borderRadius:3,fontWeight:700}}>{c.alerts}🔴</span>}{c.actions>0&&<span style={{background:T.amberDim,color:T.amber,fontSize:9,padding:"2px 6px",borderRadius:3}}>{c.actions}⚡</span>}</div><div style={{display:"flex",alignItems:"center",gap:5}}><div style={{flex:1,height:3,background:T.border,borderRadius:2}}><div style={{height:"100%",borderRadius:2,background:c.freshness>90?T.green:c.freshness>70?T.amber:T.red,width:`${c.freshness}%`}}/></div><span style={{color:T.txt3,fontSize:9,fontFamily:"monospace",width:28,textAlign:"right"}}>{c.freshness}%</span></div><button style={{padding:"4px 9px",background:"transparent",border:`1px solid ${T.border}`,borderRadius:4,color:T.txt3,fontSize:9,cursor:"pointer"}}>View →</button></div>);})}</div></div>);
}

// ── ALERTS, ACTIONS ───────────────────────────────────────────────────────────
function AlertsView(){const [alerts,setAlerts]=useState(ALERTS_DATA);const toggle=id=>setAlerts(p=>p.map(a=>a.id===id?{...a,st:a.st==="open"?"acknowledged":"open"}:a));const sc={critical:T.red,high:T.amber,watchlist:T.blue};const sb={critical:T.redDim,high:T.amberDim,watchlist:T.blueDim};return(<div style={{height:"100%",overflowY:"auto",padding:"20px 24px"}}><h1 style={{color:T.txt1,fontSize:20,fontWeight:700,marginBottom:4}}>Alerts & Exceptions</h1><div style={{color:T.txt3,fontSize:11,marginBottom:18}}><span style={{color:T.red,fontWeight:700}}>{alerts.filter(a=>a.sev==="critical").length} critical</span> · {alerts.filter(a=>a.st==="open").length} open · {alerts.filter(a=>a.st==="acknowledged").length} acknowledged</div>{["critical","high","watchlist"].map(sev=>{const g=alerts.filter(a=>a.sev===sev);if(!g.length)return null;return(<div key={sev} style={{marginBottom:18}}><div style={{color:sc[sev],fontSize:9,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:7}}>{sev} ({g.length})</div>{g.map(a=><div key={a.id} style={{background:T.card,border:`1px solid ${T.border}`,borderLeft:`3px solid ${sc[a.sev]}`,borderRadius:7,padding:"12px 13px",marginBottom:5,opacity:a.st==="acknowledged"?0.5:1}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{flex:1}}><div style={{display:"flex",gap:6,alignItems:"center",marginBottom:5,flexWrap:"wrap"}}><span style={{color:sc[a.sev],fontSize:9,fontWeight:700,background:sb[a.sev],padding:"2px 7px",borderRadius:3}}>{a.sev.toUpperCase()}</span><span style={{color:T.txt1,fontSize:11,fontWeight:600}}>{a.co}</span><span style={{color:T.txt3,fontSize:9}}>· {a.kpi} · {a.time}</span></div><div style={{color:T.txt2,fontSize:11,lineHeight:1.5}}>{a.msg}</div></div><button onClick={()=>toggle(a.id)} style={{marginLeft:10,padding:"4px 9px",background:"transparent",border:`1px solid ${T.border}`,borderRadius:4,color:T.txt3,fontSize:9,cursor:"pointer",flexShrink:0}}>{a.st==="open"?"Acknowledge":"Re-open"}</button></div></div>)}</div>);})}</div>);}

function ActionsView(){const [actions,setActions]=useState(ACTIONS_DATA);const [f,setF]=useState("all");const pc={critical:T.red,high:T.amber,medium:T.blue,low:T.txt3};const sc2={open:T.amber,in_progress:T.blue,done:T.green};const next=id=>setActions(p=>p.map(a=>a.id===id?{...a,st:a.st==="open"?"in_progress":a.st==="in_progress"?"done":"open"}:a));const vis=f==="all"?actions:actions.filter(a=>a.st===f);return(<div style={{height:"100%",overflowY:"auto",padding:"20px 24px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><div><h1 style={{color:T.txt1,fontSize:20,fontWeight:700,margin:0}}>Action Tracker</h1><div style={{color:T.txt3,fontSize:11,marginTop:2}}>{actions.filter(a=>a.st!=="done").length} open · {actions.filter(a=>a.pri==="critical"||a.pri==="high").length} high+ priority</div></div><div style={{display:"flex",gap:5}}>{["all","open","in_progress","done"].map(v=><button key={v} onClick={()=>setF(v)} style={{padding:"5px 10px",background:f===v?T.blue:"transparent",border:`1px solid ${f===v?T.blue:T.border}`,borderRadius:5,color:f===v?"#fff":T.txt3,cursor:"pointer",fontSize:9}}>{v==="in_progress"?"In Progress":v.charAt(0).toUpperCase()+v.slice(1)}</button>)}</div></div><div style={{display:"flex",flexDirection:"column",gap:5}}>{vis.map(a=><div key={a.id} style={{background:T.card,border:`1px solid ${T.border}`,borderLeft:`3px solid ${pc[a.pri]}`,borderRadius:7,padding:"11px 13px",opacity:a.st==="done"?0.5:1}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{flex:1}}><div style={{display:"flex",gap:6,alignItems:"center",marginBottom:5,flexWrap:"wrap"}}><span style={{color:pc[a.pri],fontSize:9,fontWeight:700,padding:"2px 7px",background:`${pc[a.pri]}18`,borderRadius:3}}>{a.pri.toUpperCase()}</span><span style={{color:T.txt1,fontSize:11,fontWeight:600}}>{a.co}</span><span style={{color:T.txt3,fontSize:9}}>· {a.dept} · {a.kpi}</span></div><div style={{color:T.txt2,fontSize:11,marginBottom:5,lineHeight:1.4}}>{a.title}</div><div style={{display:"flex",gap:10,flexWrap:"wrap"}}><span style={{color:T.txt3,fontSize:9}}>Owner: <span style={{color:T.txt2}}>{a.owner}</span></span><span style={{color:T.txt3,fontSize:9}}>Due: <span style={{color:T.txt2}}>{a.due}</span></span></div></div><div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,flexShrink:0,marginLeft:10}}><span style={{color:sc2[a.st],fontSize:9,fontWeight:700,padding:"2px 8px",background:`${sc2[a.st]}18`,borderRadius:3}}>{a.st==="in_progress"?"In Progress":a.st.charAt(0).toUpperCase()+a.st.slice(1)}</span><button onClick={()=>next(a.id)} style={{padding:"3px 8px",background:"transparent",border:`1px solid ${T.border}`,borderRadius:3,color:T.txt3,fontSize:9,cursor:"pointer"}}>{a.st==="done"?"↩ Re-open":"→ Advance"}</button></div></div></div>)}</div></div>);}

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
function Sidebar({view,setView}){
  const crit=ALERTS_DATA.filter(a=>a.sev==="critical"&&a.st==="open").length;
  const acts=ACTIONS_DATA.filter(a=>a.st!=="done"&&(a.pri==="critical"||a.pri==="high")).length;
  const items=[{id:"portfolio",icon:"⬡",l:"Portfolio"},{id:"alerts",icon:"◉",l:"Alerts",b:crit},{id:"actions",icon:"◈",l:"Actions",b:acts},{id:"reports",icon:"◧",l:"Reports",dis:true}];
  return(<div style={{width:50,background:T.surface,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",alignItems:"center",padding:"14px 0",gap:3,flexShrink:0}}><div style={{width:30,height:30,borderRadius:7,background:`linear-gradient(135deg,${T.blue},${T.purple})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:800,marginBottom:14}}>A</div>{items.map(it=><div key={it.id} style={{position:"relative"}}><button onClick={()=>!it.dis&&setView(it.id)} title={it.l} style={{width:36,height:36,borderRadius:6,border:"none",background:view===it.id?T.blue:"transparent",color:view===it.id?"#fff":it.dis?T.border:T.txt3,cursor:it.dis?"default":"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>{it.icon}</button>{it.b>0&&<div style={{position:"absolute",top:2,right:2,width:13,height:13,borderRadius:"50%",background:T.red,color:"#fff",fontSize:7,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{it.b}</div>}</div>)}</div>);
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function GPDashboard(){
  const [view,setView]=useState("portfolio");const [co,setCo]=useState(null);
  function sel(c){setCo(c);setView("company");}
  function nav(v){if(v!=="company")setCo(null);setView(v);}
  return(<div style={{display:"flex",height:"100vh",background:T.bg,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",overflow:"hidden"}}><Sidebar view={view} setView={nav}/><div style={{flex:1,overflow:"hidden"}}>{view==="portfolio"&&<PortfolioView onSelect={sel}/>}{view==="company"&&co&&<CompanyView co={co} onBack={()=>nav("portfolio")}/>}{view==="alerts"&&<AlertsView/>}{view==="actions"&&<ActionsView/>}</div></div>);
}

import { useState, useMemo } from "react";
import { ComposedChart, AreaChart, BarChart, LineChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import FinanceDrilldown from "./FinanceDrilldown.jsx";
import { forDashboard } from "../lib/companies.js";
import { modulesFor, benchmarksFor } from "../lib/companyModules.js";
import { trackedActions, actionSummary } from "../lib/actionTracker.js";
import { buildInvestigation } from "../lib/investigation.js";

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

// Module data for every company, derived from the finance model. This was a
// literal with one key — `meridian` — so eight of the eleven tabs rendered
// nothing for the other eight companies, and the finance drill-down they launch
// was unreachable. See src/lib/companyModules.js for what is derived and what
// is modelled.
const MODULES = Object.fromEntries(COMPANIES.map(c => [c.id, modulesFor(c.id)]));

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

function KpiCard({label,value,status,delta,src,threshold,confidence,bad,modelled}){
  const sc=ragCol(status);
  const [showDetail,setShowDetail]=useState(false);
  return(
    <div onClick={()=>setShowDetail(p=>!p)} style={{padding:"11px 13px",background:T.card,border:`1px solid ${showDetail?T.borderLt:T.border}`,borderLeft:`3px solid ${sc}`,borderRadius:8,cursor:"pointer",transition:"border-color 0.15s"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6,marginBottom:4}}><span style={{color:T.txt3,fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase"}}>{label}</span>{modelled&&<span title="Modelled from the company's discipline score — no source system is connected for this metric yet" style={{color:T.amber,fontSize:7.5,border:`1px solid ${T.amber}44`,background:T.amberDim,borderRadius:3,padding:"1px 4px",flexShrink:0}}>MODEL</span>}</div>
      <div style={{color:T.txt1,fontSize:17,fontWeight:700,fontFamily:"monospace",marginBottom:3}}>{value}</div>
      {delta&&<div style={{color:bad!==false&&(delta.startsWith("+")||delta.includes("MoM")||delta.includes("days"))?T.red:T.green,fontSize:10,fontFamily:"monospace"}}>{delta}</div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
        <span style={{color:T.txt3,fontSize:8}}>{src}</span>
        <span style={{width:6,height:6,borderRadius:2,background:sc,display:"inline-block"}}/>
      </div>
      {showDetail&&(
        <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${T.border}`}}>
          <div style={{color:T.txt3,fontSize:9,marginBottom:2}}>Threshold: <span style={{color:T.txt2}}>{threshold}</span></div>
          {modelled&&<div style={{color:T.amber,fontSize:8.5,marginBottom:3,lineHeight:1.5}}>Modelled, not measured. No source system is connected for this metric; the value is derived from this company's discipline score so the tab agrees with the health ring above it.</div>}
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
  const bm=benchmarksFor(co.id);
  return(<div style={{display:"flex",flexDirection:"column",gap:14}}><div style={{color:T.txt3,fontSize:10,marginBottom:4}}>Benchmarked against {co.sector} companies at {co.stage} stage. Source: Alpha Vantage · Yahoo Finance · Internal portfolio data.</div>{bm.map((b,i)=>{const isLower=b.lowerBetter;const pos=isLower?(b.company<=b.topQuartile?"green":b.company<=b.sectorMedian?"amber":"red"):(b.company>=b.topQuartile?"green":b.company>=b.sectorMedian?"amber":"red");const range=b.topQuartile-b.bottomQuartile||1;const pct=Math.min(100,Math.max(0,((b.company-b.bottomQuartile)/range)*100));return(<div key={i} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"12px 14px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><span style={{color:T.txt1,fontSize:12,fontWeight:600}}>{b.kpi}</span><div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{color:ragCol(pos),fontSize:13,fontWeight:700,fontFamily:"monospace"}}>{b.company}{b.unit}</span><RagBadge status={pos}/></div></div><div style={{position:"relative",height:8,background:T.border,borderRadius:4,marginBottom:6}}><div style={{position:"absolute",left:`${Math.min(100,Math.max(0,((b.bottomQuartile+(range*0.25)-b.bottomQuartile)/range)*100))}%`,right:`${100-Math.min(100,Math.max(0,((b.topQuartile-b.bottomQuartile*0.25)/range)*100))}%`,top:0,bottom:0,background:`${T.green}22`,borderRadius:4}}/><div style={{position:"absolute",left:`${pct}%`,top:-2,width:12,height:12,borderRadius:"50%",background:ragCol(pos),transform:"translateX(-50%)",border:`2px solid ${T.bg}`}}/></div><div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:T.txt3,fontSize:8}}>Bottom Q4: {b.bottomQuartile}{b.unit}</span><span style={{color:T.txt3,fontSize:8}}>Median: {b.sectorMedian}{b.unit}</span><span style={{color:T.green,fontSize:8}}>Top Q1: {b.topQuartile}{b.unit}</span></div></div>);})}</div>);
}

// ── CEO / GP COCKPIT ──────────────────────────────────────────────────────────
// The specification's component 2 asks every company page to carry a
// data-source and refresh strip. Modelled disciplines are named as such here
// rather than being allowed to pass as connected feeds.
function SourceStrip({co,d}){
  if(!d) return null;
  const measured=[["Finance",d.finance],["Sales",d.sales],["People",d.hr],["Cross-functional",d.crossFunctional]];
  const modelled=[["Operations",d.ops],["Procurement",d.procurement],["Technology",d.technology],["Compliance",d.compliance]];
  return(
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:7,padding:"9px 12px",marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,marginBottom:7}}>
        <span style={{color:T.txt3,fontSize:9,letterSpacing:"0.12em"}}>DATA SOURCES · AS OF {d.meta.asOf} · REPORTED IN {d.meta.currency}</span>
        <span style={{color:co.freshness>90?T.green:co.freshness>70?T.amber:T.red,fontSize:9,fontFamily:"monospace"}}>
          {co.freshness}% fresh · updated {co.upd}
        </span>
      </div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        {measured.map(([label,m])=>(
          <span key={label} title={m.src} style={{fontSize:8.5,padding:"2px 7px",borderRadius:3,border:`1px solid ${T.green}33`,background:T.greenDim,color:T.green}}>
            ● {label} · {m.src.split(" · ")[0]}
          </span>
        ))}
        {modelled.map(([label,m])=>(
          <span key={label} title={m.src} style={{fontSize:8.5,padding:"2px 7px",borderRadius:3,border:`1px solid ${T.amber}33`,background:T.amberDim,color:T.amber}}>
            ○ {label} · modelled
          </span>
        ))}
      </div>
      <div style={{color:T.txt3,fontSize:8.5,marginTop:6,lineHeight:1.5}}>
        Green is read from a connected source system. Amber is derived from this company's discipline score
        because no source system is connected for it yet — every such figure carries a MODEL tag on its tile.
      </div>
    </div>
  );
}

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
  const [loading,setLoading]=useState(false);const [narrative,setNarrative]=useState(null);const [live,setLive]=useState(false);
  const [q,setQ]=useState("");const [answer,setAnswer]=useState(null);const [qLoad,setQLoad]=useState(false);const [qLive,setQLive]=useState(false);

  // Both panels used to POST to api.anthropic.com from the browser with no
  // Authorization header — requests that could only ever 401, silently caught,
  // so what a partner saw was always the hardcoded catch block. They now go to
  // /api/ai/agent, which builds the prompt from the finance model server-side.
  // The context is no longer assembled here either: the six lines it sent were
  // a fraction of what is known, and the model was asked to be specific over
  // them.
  async function post(body,setText,setFlag,setBusy){
    setBusy(true);setText(null);setFlag(false);
    try{
      const r=await fetch("/api/ai/agent",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      if(!r.ok) throw new Error(`agent ${r.status}`);
      const d=await r.json();
      setText(d.text);setFlag(!!d.live);
    }catch(e){
      // The endpoint is unreachable. Fall back to the calculated investigation
      // rather than to prose written months ago about a different company.
      const inv=buildInvestigation(co.id);
      setText(`${inv.rootCause}\n\nPriority action: ${inv.actions[0].action} (${inv.actions[0].owner}). ${inv.actions[0].rationale}.`);
    }
    setBusy(false);
  }
  const gen=()=>post({type:"boardpack",companyId:co.id},setNarrative,setLive,setLoading);
  const ask=()=>{if(!q.trim())return;post({type:"qa",companyId:co.id,question:q},setAnswer,setQLive,setQLoad);};

  const badge=(on)=>(<div style={{color:on?T.green:T.txt3,fontSize:9,letterSpacing:"0.1em",marginBottom:8}}>
    {on?"● GROK · OVER CALCULATED COMPANY DATA":"● CALCULATED · SET XAI_API_KEY FOR THE ANALYTICAL LAYER"}
  </div>);

  return(<div style={{display:"flex",flexDirection:"column",gap:14}}><div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:18}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div><div style={{color:T.txt1,fontSize:13,fontWeight:600}}>Board-Ready Executive Summary</div><div style={{color:T.txt3,fontSize:10,marginTop:2}}>All KPIs · All data sources · Source-cited · GP action recommendations</div></div><button onClick={gen} disabled={loading} style={{padding:"8px 16px",background:loading?T.borderLt:T.blue,color:loading?T.txt3:"#fff",border:"none",borderRadius:6,cursor:loading?"wait":"pointer",fontSize:11,fontWeight:600}}>{loading?"Analysing…":"Generate Analysis"}</button></div>{narrative&&<div style={{background:T.surface,border:`1px solid ${T.borderLt}`,borderRadius:6,padding:14,color:T.txt2,fontSize:12,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{badge(live)}{narrative}</div>}</div><div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:18}}><div style={{color:T.txt1,fontSize:13,fontWeight:600,marginBottom:10}}>Ask a Question</div><div style={{display:"flex",gap:8,marginBottom:8}}><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&ask()} placeholder='e.g. "How many months before a cash injection is needed?"' style={{flex:1,padding:"8px 11px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,color:T.txt1,fontSize:11,fontFamily:"inherit",outline:"none"}}/><button onClick={ask} disabled={qLoad} style={{padding:"8px 16px",background:T.purple,color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:600}}>{qLoad?"…":"Ask"}</button></div><div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>{["How urgent is the cash situation?","What's driving the revenue miss?","Which risks need GP attention this week?","What does Rule of 40 tell us?"].map(qq=><button key={qq} onClick={()=>setQ(qq)} style={{padding:"3px 9px",background:"transparent",border:`1px solid ${T.border}`,borderRadius:4,color:T.txt3,fontSize:9,cursor:"pointer"}}>{qq}</button>)}</div>{answer&&<div style={{background:T.surface,border:`1px solid ${T.borderLt}`,borderRadius:6,padding:12,color:T.txt2,fontSize:12,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{badge(qLive)}{answer}</div>}</div></div>);
}

// ── COMPANY VIEW ──────────────────────────────────────────────────────────────
function CompanyView({co,onBack}){
  const [tab,setTab]=useState("overview");
  const [drill,setDrill]=useState(null);
  const d=MODULES[co.id];
  const ic=co.status==="red"?T.red:T.amber;
  const TABS=[{id:"overview",l:"Overview"},{id:"finance",l:"Finance"},{id:"sales",l:"Sales"},{id:"hr",l:"People"},{id:"ops",l:"Operations"},{id:"procurement",l:"Procurement"},{id:"technology",l:"Technology"},{id:"compliance",l:"Compliance"},{id:"crossfunctional",l:"Cross-Functional"},{id:"benchmarks",l:"Benchmarks"},{id:"ai",l:"🤖 AI"}];
  return(<div style={{height:"100%",overflowY:"auto",padding:"20px 24px"}}><button onClick={onBack} style={{background:"transparent",border:"none",color:T.txt3,cursor:"pointer",fontSize:11,marginBottom:12,padding:0}}>← Portfolio Overview</button><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18,paddingBottom:16,borderBottom:`1px solid ${T.border}`}}><div style={{display:"flex",alignItems:"center",gap:14}}><HealthRing score={co.score} size={62}/><div><h1 style={{color:T.txt1,fontSize:19,fontWeight:700,margin:0}}>{co.name}</h1><div style={{color:T.txt3,fontSize:11,marginTop:3}}>{co.sector} · {co.stage} · {co.own}% ownership · {co.geo}</div><div style={{display:"flex",gap:7,alignItems:"center",marginTop:7,flexWrap:"wrap"}}><RagBadge status={co.status}/><span style={{color:T.txt3,fontSize:9}}>Updated {co.upd}</span><span style={{color:T.txt3,fontSize:9}}>·</span><span style={{color:co.freshness>90?T.green:co.freshness>70?T.amber:T.red,fontSize:9,fontFamily:"monospace"}}>Data {co.freshness}% fresh</span><span style={{color:T.txt3,fontSize:9}}>·</span><span style={{color:co.actions>0?T.amber:T.green,fontSize:9}}>{co.actions} actions</span><span style={{color:T.txt3,fontSize:9}}>·</span><span style={{color:co.alerts>0?T.red:T.green,fontSize:9}}>{co.alerts} alerts</span></div></div></div><div style={{background:`${ic}10`,border:`1px solid ${ic}25`,borderRadius:8,padding:"10px 14px",maxWidth:280}}><div style={{color:T.txt3,fontSize:9,letterSpacing:"0.1em",marginBottom:4}}>PRIMARY ISSUE</div><div style={{color:ic,fontSize:11,lineHeight:1.5}}>{co.issue}</div></div></div><div style={{display:"flex",gap:3,marginBottom:14,flexWrap:"wrap"}}>{TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"6px 12px",background:tab===t.id?T.blue:"transparent",border:`1px solid ${tab===t.id?T.blue:T.border}`,borderRadius:5,color:tab===t.id?"#fff":T.txt3,cursor:"pointer",fontSize:10,fontWeight:tab===t.id?600:400}}>{t.l}</button>)}</div><SourceStrip co={co} d={d}/>{tab==="overview"&&<CockpitView co={co}/>}{tab==="finance"&&d&&<FinanceModule d={d.finance} co={co} onDrill={setDrill}/>}{tab==="sales"&&d&&<SalesModule d={d.sales}/>}{tab==="hr"&&d&&<HRModule d={d.hr}/>}{tab==="ops"&&d&&<GenericModule d={d.ops}/>}{tab==="procurement"&&d&&<GenericModule d={d.procurement}/>}{tab==="technology"&&d&&<GenericModule d={d.technology}/>}{tab==="compliance"&&d&&<GenericModule d={d.compliance}/>}{tab==="crossfunctional"&&d&&<CrossFunctionalModule d={d.crossFunctional}/>}{tab==="benchmarks"&&<BenchmarkModule co={co}/>}{tab==="ai"&&<AIPanel co={co}/>}{drill&&<FinanceDrilldown company={co} metric={drill} onClose={()=>setDrill(null)}/>}</div>);
}

// ── PORTFOLIO VIEW ────────────────────────────────────────────────────────────
function PortfolioView({onSelect,onGuide}){
  const [sort,setSort]=useState("score");
  const [asc,setAsc]=useState(true);
  const sortFns={score:(a,b)=>a.score-b.score,runway:(a,b)=>a.runway-b.runway,rvb:(a,b)=>a.rvb-b.rvb,att:(a,b)=>a.att-b.att,freshness:(a,b)=>a.freshness-b.freshness,alerts:(a,b)=>a.alerts-b.alerts};
  const sorted=[...COMPANIES].sort((a,b)=>(sortFns[sort]?.(a,b)||0)*(asc?1:-1));
  const toggleSort=k=>{if(sort===k)setAsc(p=>!p);else{setSort(k);setAsc(true);}};
  const avg=Math.round(COMPANIES.reduce((s,c)=>s+c.score,0)/COMPANIES.length);
  const reds=COMPANIES.filter(c=>c.status==="red").length;
  const openActions=ACTIONS_DATA.filter(a=>a.st!=="done").length;
  const SortBtn=({k,l})=><button onClick={()=>toggleSort(k)} style={{color:sort===k?T.blue:T.txt3,background:"transparent",border:"none",cursor:"pointer",fontSize:9,padding:0,letterSpacing:"0.1em",textTransform:"uppercase",display:"flex",alignItems:"center",gap:2}}>{l}{sort===k&&<span style={{fontSize:8}}>{asc?"↑":"↓"}</span>}</button>;
  return(<div style={{height:"100%",overflowY:"auto",padding:"20px 24px"}}><div style={{marginBottom:18}}><div style={{color:T.txt3,fontSize:9,letterSpacing:"0.2em",textTransform:"uppercase"}}>Caledonia Alba · Portfolio Intelligence Platform</div><h1 style={{color:T.txt1,fontSize:20,fontWeight:700,margin:"3px 0 0"}}>Portfolio Overview</h1>{onGuide&&<button onClick={onGuide} style={{background:"transparent",border:"none",padding:0,marginTop:4,color:T.blue,fontSize:10,cursor:"pointer",textDecoration:"underline",fontFamily:"inherit"}}>📖 how to read this screen</button>}</div><div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:9,marginBottom:18}}>{[{l:"Companies",v:COMPANIES.length,c:T.txt1},{l:"Avg Health",v:`${avg}/100`,c:avg>=75?T.green:avg>=50?T.amber:T.red},{l:"Red Alerts",v:reds,c:reds>0?T.red:T.green},{l:"Open Actions",v:openActions,c:openActions>0?T.amber:T.green},{l:"Runway <6mo",v:COMPANIES.filter(c=>c.runway<6).length,c:T.red},{l:"Data Freshness",v:`${Math.round(COMPANIES.reduce((s,c)=>s+c.freshness,0)/COMPANIES.length)}%`,c:T.green}].map(s=><div key={s.l} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:7,padding:"10px 12px"}}><div style={{color:T.txt3,fontSize:8,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>{s.l}</div><div style={{color:s.c,fontSize:19,fontWeight:700,fontFamily:"monospace"}}>{s.v}</div></div>)}</div><div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"6px 0",marginBottom:6}}><div style={{display:"grid",gridTemplateColumns:"2.4fr 64px 1fr 1fr 1fr 1fr 70px 72px 1.4fr 64px",padding:"5px 14px",gap:4}}><div style={{color:T.txt3,fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase"}}>Company</div><SortBtn k="score" l="Score"/><SortBtn k="runway" l="Runway"/><SortBtn k="rvb" l="Rev vs Bdgt"/><SortBtn k="att" l="Attrition"/><div style={{color:T.txt3,fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase"}}>EBITDA</div><div style={{color:T.txt3,fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase"}}>Trend</div><SortBtn k="alerts" l="Alerts"/><SortBtn k="freshness" l="Data Fresh"/><div/></div></div><div style={{display:"flex",flexDirection:"column",gap:5}}>{sorted.map(c=>{const lc=ragCol(c.status);return(<div key={c.id} onClick={()=>onSelect(c)} style={{display:"grid",gridTemplateColumns:"2.4fr 64px 1fr 1fr 1fr 1fr 70px 72px 1.4fr 64px",alignItems:"center",padding:"12px 14px",background:T.card,border:`1px solid ${T.border}`,borderLeft:`3px solid ${lc}`,borderRadius:8,cursor:"pointer",gap:4}} onMouseEnter={e=>e.currentTarget.style.background=T.cardHov} onMouseLeave={e=>e.currentTarget.style.background=T.card}><div style={{display:"flex",alignItems:"center",gap:9}}><Dot status={c.status}/><div><div style={{color:T.txt1,fontSize:12,fontWeight:600}}>{c.name}</div><div style={{color:T.txt3,fontSize:9}}>{c.sector} · {c.stage}</div></div></div><HealthRing score={c.score} size={35}/><div style={{color:c.runway<6?T.red:c.runway<9?T.amber:T.green,fontSize:12,fontWeight:700,fontFamily:"monospace"}}>{c.runway}mo</div><div style={{color:c.rvb<85?T.red:c.rvb<95?T.amber:T.green,fontSize:12,fontWeight:700,fontFamily:"monospace"}}>{c.rvb}%</div><div style={{color:c.att>20?T.red:c.att>12?T.amber:T.green,fontSize:12,fontWeight:700,fontFamily:"monospace"}}>{c.att}%</div><div style={{color:c.ebitda<0?T.red:c.ebitda<5?T.amber:T.green,fontSize:12,fontWeight:700,fontFamily:"monospace"}}>{c.ebitda}%</div><div title="12-month health score trend"><Sparkline data={c.spark} color={c.trend==="up"?T.green:c.trend==="down"?T.red:T.amber}/></div><div style={{display:"flex",gap:5}}>{c.alerts>0&&<span style={{background:T.redDim,color:T.red,fontSize:9,padding:"2px 6px",borderRadius:3,fontWeight:700}}>{c.alerts}🔴</span>}{c.actions>0&&<span style={{background:T.amberDim,color:T.amber,fontSize:9,padding:"2px 6px",borderRadius:3}}>{c.actions}⚡</span>}</div><div style={{display:"flex",alignItems:"center",gap:5}}><div style={{flex:1,height:3,background:T.border,borderRadius:2}}><div style={{height:"100%",borderRadius:2,background:c.freshness>90?T.green:c.freshness>70?T.amber:T.red,width:`${c.freshness}%`}}/></div><span style={{color:T.txt3,fontSize:9,fontFamily:"monospace",width:28,textAlign:"right"}}>{c.freshness}%</span></div><button style={{padding:"4px 9px",background:"transparent",border:`1px solid ${T.border}`,borderRadius:4,color:T.txt3,fontSize:9,cursor:"pointer"}}>View →</button></div>);})}</div></div>);
}

// ── ALERTS, ACTIONS ───────────────────────────────────────────────────────────
function AlertsView(){const [alerts,setAlerts]=useState(ALERTS_DATA);const toggle=id=>setAlerts(p=>p.map(a=>a.id===id?{...a,st:a.st==="open"?"acknowledged":"open"}:a));const sc={critical:T.red,high:T.amber,watchlist:T.blue};const sb={critical:T.redDim,high:T.amberDim,watchlist:T.blueDim};return(<div style={{height:"100%",overflowY:"auto",padding:"20px 24px"}}><h1 style={{color:T.txt1,fontSize:20,fontWeight:700,marginBottom:4}}>Alerts & Exceptions</h1><div style={{color:T.txt3,fontSize:11,marginBottom:18}}><span style={{color:T.red,fontWeight:700}}>{alerts.filter(a=>a.sev==="critical").length} critical</span> · {alerts.filter(a=>a.st==="open").length} open · {alerts.filter(a=>a.st==="acknowledged").length} acknowledged</div>{["critical","high","watchlist"].map(sev=>{const g=alerts.filter(a=>a.sev===sev);if(!g.length)return null;return(<div key={sev} style={{marginBottom:18}}><div style={{color:sc[sev],fontSize:9,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:7}}>{sev} ({g.length})</div>{g.map(a=><div key={a.id} style={{background:T.card,border:`1px solid ${T.border}`,borderLeft:`3px solid ${sc[a.sev]}`,borderRadius:7,padding:"12px 13px",marginBottom:5,opacity:a.st==="acknowledged"?0.5:1}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{flex:1}}><div style={{display:"flex",gap:6,alignItems:"center",marginBottom:5,flexWrap:"wrap"}}><span style={{color:sc[a.sev],fontSize:9,fontWeight:700,background:sb[a.sev],padding:"2px 7px",borderRadius:3}}>{a.sev.toUpperCase()}</span><span style={{color:T.txt1,fontSize:11,fontWeight:600}}>{a.co}</span><span style={{color:T.txt3,fontSize:9}}>· {a.kpi} · {a.time}</span></div><div style={{color:T.txt2,fontSize:11,lineHeight:1.5}}>{a.msg}</div></div><button onClick={()=>toggle(a.id)} style={{marginLeft:10,padding:"4px 9px",background:"transparent",border:`1px solid ${T.border}`,borderRadius:4,color:T.txt3,fontSize:9,cursor:"pointer",flexShrink:0}}>{a.st==="open"?"Acknowledge":"Re-open"}</button></div></div>)}</div>);})}</div>);}

function ActionsView(){
  const actions=useMemo(()=>trackedActions(),[]);
  const summary=useMemo(()=>actionSummary(actions),[actions]);
  const [f,setF]=useState("all");
  const [open,setOpen]=useState(null);
  const pc={critical:T.red,high:T.amber,medium:T.blue,low:T.txt3};
  const sc2={open:T.amber,in_progress:T.blue,done:T.green};
  const vc={working:T.green,"no-change":T.txt3,worse:T.red};
  const vl={working:"Metric improving","no-change":"No movement",worse:"Metric worsening"};
  const vis=f==="all"?actions:["working","no-change","worse"].includes(f)?actions.filter(a=>a.verdict===f):actions.filter(a=>a.status===f);
  return(<div style={{height:"100%",overflowY:"auto",padding:"20px 24px"}}>
    <div style={{marginBottom:14}}>
      <h1 style={{color:T.txt1,fontSize:20,fontWeight:700,margin:0}}>Action Tracker</h1>
      <div style={{color:T.txt3,fontSize:11,marginTop:2}}>
        Every action names the KPI it was raised against. The verdict is read from the ledger, not set by the owner.
      </div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:9,marginBottom:14}}>
      {[
        {l:"Open actions",v:summary.open,c:T.txt1,s:`${summary.total} on file across ${summary.companies} companies`},
        {l:"Metric improving",v:summary.working,c:T.green,s:"moved the intended way since raised"},
        {l:"Metric worsening",v:summary.worse,c:T.red,s:"the action has not arrested it"},
        {l:"Completed and delivered",v:`${summary.completedWorking}/${summary.completedTotal}`,c:T.green,s:"closed actions whose KPI actually moved"},
      ].map(x=><div key={x.l} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:7,padding:"10px 12px"}}>
        <div style={{color:T.txt3,fontSize:8,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>{x.l}</div>
        <div style={{color:x.c,fontSize:19,fontWeight:700,fontFamily:"monospace"}}>{x.v}</div>
        <div style={{color:T.txt3,fontSize:8.5,marginTop:3,lineHeight:1.4}}>{x.s}</div>
      </div>)}
    </div>

    <div style={{display:"flex",gap:5,marginBottom:12,flexWrap:"wrap"}}>
      {["all","open","in_progress","done","working","no-change","worse"].map(v=>
        <button key={v} onClick={()=>setF(v)} style={{padding:"5px 10px",background:f===v?T.blue:"transparent",border:`1px solid ${f===v?T.blue:T.border}`,borderRadius:5,color:f===v?"#fff":T.txt3,cursor:"pointer",fontSize:9}}>
          {v==="in_progress"?"In Progress":v==="no-change"?"No movement":v.charAt(0).toUpperCase()+v.slice(1)}
        </button>)}
    </div>

    <div style={{display:"flex",flexDirection:"column",gap:5}}>{vis.map(a=>(
      <div key={a.id} onClick={()=>setOpen(p=>p===a.id?null:a.id)} style={{background:T.card,border:`1px solid ${T.border}`,borderLeft:`3px solid ${pc[a.priority]}`,borderRadius:7,padding:"11px 13px",cursor:"pointer",opacity:a.status==="done"?0.82:1}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:5,flexWrap:"wrap"}}>
              <span style={{color:pc[a.priority],fontSize:9,fontWeight:700,padding:"2px 7px",background:`${pc[a.priority]}18`,borderRadius:3}}>{a.priority.toUpperCase()}</span>
              <span style={{color:T.txt1,fontSize:11,fontWeight:600}}>{a.companyName}</span>
              <span style={{color:T.txt3,fontSize:9}}>· {a.metricLabel} · raised {a.raisedOn}</span>
            </div>
            <div style={{color:T.txt2,fontSize:11,marginBottom:6,lineHeight:1.4}}>{a.title}</div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{color:T.txt3,fontSize:9}}>Owner: <span style={{color:T.txt2}}>{a.owner}</span></span>
              <span style={{color:T.txt3,fontSize:9}}>Due: <span style={{color:T.txt2}}>{a.due}</span></span>
              <span style={{color:T.txt3,fontSize:9,fontFamily:"monospace"}}>
                {a.baselineLabel} <span style={{color:T.txt3}}>→</span> <span style={{color:vc[a.verdict]}}>{a.currentLabel}</span>
              </span>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,flexShrink:0}}>
            <span style={{color:sc2[a.status],fontSize:9,fontWeight:700,padding:"2px 8px",background:`${sc2[a.status]}18`,borderRadius:3}}>
              {a.status==="in_progress"?"In Progress":a.status.charAt(0).toUpperCase()+a.status.slice(1)}
            </span>
            <span style={{color:vc[a.verdict],fontSize:9,fontWeight:700,padding:"2px 8px",background:`${vc[a.verdict]}14`,border:`1px solid ${vc[a.verdict]}33`,borderRadius:3,whiteSpace:"nowrap"}}>
              {a.verdict==="working"?"▲":a.verdict==="worse"?"▼":"–"} {vl[a.verdict]}
            </span>
            <span style={{color:T.txt3,fontSize:8.5,fontFamily:"monospace"}}>{a.pctMove>0?"+":""}{a.pctMove}% in {a.monthsElapsed}mo</span>
          </div>
        </div>
        {open===a.id&&(
          <div style={{marginTop:10,paddingTop:9,borderTop:`1px solid ${T.border}`}}>
            <div style={{color:vc[a.verdict],fontSize:10.5,lineHeight:1.6,marginBottom:8}}>{a.outcome}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8}}>
              {[["Metric",a.metricLabel],["At the time it was raised",`${a.baselineLabel} (${a.raisedOn})`],["Now",`${a.currentLabel} (${a.asOf})`],["Movement",`${a.deltaLabel} · ${a.pctMove>0?"+":""}${a.pctMove}%`],["Better when",a.better==="up"?"rising":"falling"],["Elapsed",`${a.monthsElapsed} months`]].map(([k,v])=>
                <div key={k}><div style={{color:T.txt3,fontSize:8.5,marginBottom:2}}>{k}</div><div style={{color:T.txt2,fontSize:10}}>{v}</div></div>)}
            </div>
            <div style={{color:T.txt3,fontSize:8.5,marginTop:8,lineHeight:1.5}}>
              Baseline read from the ledger at {a.raisedOn}; current value from {a.asOf}. The verdict is computed from
              those two figures — a move of less than 2% counts as no movement.
            </div>
          </div>
        )}
      </div>))}
    </div>
  </div>);}

function Sidebar({view,setView}){
  const crit=ALERTS_DATA.filter(a=>a.sev==="critical"&&a.st==="open").length;
  const acts=ACTIONS_DATA.filter(a=>a.st!=="done"&&(a.pri==="critical"||a.pri==="high")).length;
  const items=[{id:"portfolio",icon:"⬡",l:"Portfolio"},{id:"alerts",icon:"◉",l:"Alerts",b:crit},{id:"actions",icon:"◈",l:"Actions",b:acts},{id:"reports",icon:"◧",l:"Reports",dis:true}];
  return(<div style={{width:50,background:T.surface,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",alignItems:"center",padding:"14px 0",gap:3,flexShrink:0}}><div style={{width:30,height:30,borderRadius:7,background:`linear-gradient(135deg,${T.blue},${T.purple})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:800,marginBottom:14}}>A</div>{items.map(it=><div key={it.id} style={{position:"relative"}}><button onClick={()=>!it.dis&&setView(it.id)} title={it.l} style={{width:36,height:36,borderRadius:6,border:"none",background:view===it.id?T.blue:"transparent",color:view===it.id?"#fff":it.dis?T.border:T.txt3,cursor:it.dis?"default":"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>{it.icon}</button>{it.b>0&&<div style={{position:"absolute",top:2,right:2,width:13,height:13,borderRadius:"50%",background:T.red,color:"#fff",fontSize:7,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{it.b}</div>}</div>)}</div>);
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function GPDashboard({ onGuide, openCompany }){
  // Portfolio Health hands over the company that was clicked. Without this the
  // click landed on the portfolio list with the selection discarded, so the
  // route from the fund view to a company's detail was broken in the middle.
  const initial=openCompany?COMPANIES.find(c=>c.id===openCompany):null;
  const [view,setView]=useState(initial?"company":"portfolio");
  const [co,setCo]=useState(initial);
  function sel(c){setCo(c);setView("company");}
  function nav(v){if(v!=="company")setCo(null);setView(v);}
  return(<div style={{display:"flex",height:"100%",background:T.bg,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",overflow:"hidden"}}><Sidebar view={view} setView={nav}/><div style={{flex:1,overflow:"hidden"}}>{view==="portfolio"&&<PortfolioView onSelect={sel} onGuide={onGuide}/>}{view==="company"&&co&&<CompanyView co={co} onBack={()=>nav("portfolio")}/>}{view==="alerts"&&<AlertsView/>}{view==="actions"&&<ActionsView/>}</div></div>);
}

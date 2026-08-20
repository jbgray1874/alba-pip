import { useState, useMemo } from "react";
import { C, F, S, label as labelStyle, metric as metricStyle } from "../lib/theme.js";
import { Page, PageHeader, Chip, Button, Metric, MetricRow, Panel, TwoColumn, ProvenanceBar } from "../components/Shell.jsx";
import { buildRevenueMiss } from "../lib/scenarioRevenueMiss.js";
import { integrationHealth } from "../lib/liveFeed.js";
import { ComposedChart, AreaChart, BarChart, LineChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import FinanceDrilldown from "./FinanceDrilldown.jsx";
import { forDashboard } from "../lib/companies.js";
import { modulesFor, benchmarksFor, salesQualityFor } from "../lib/companyModules.js";
import { trackedActions, actionSummary } from "../lib/actionTracker.js";
import { portfolioAlerts, portfolioActions, alertSummary } from "../lib/alertsFeed.js";
import LiveStrip from "../components/LiveStrip.jsx";
import { fmtMoney } from "../lib/fx.js";
import { buildFinance } from "../lib/financeData.js";
import { buildInvestigation } from "../lib/investigation.js";

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
  txt1: C.txt1,
  txt2: C.txt2,
  txt3: C.txt3
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

// ── ALERTS AND ACTIONS ────────────────────────────────────────────────────────
// Both lists used to be typed literals here — eight alerts and eight actions
// naming CareOS, Meridian SaaS, SwiftLogix and ForgeTech, none of which are in
// the registry any more, and quoting a 2.3-month runway and a 36% revenue miss
// that appear nowhere in the ledger. They are now derived: an alert exists
// because a reading crossed a named threshold, and the action list is the
// tracker's own, so the dashboard and the Action Tracker cannot disagree about
// what is open. See src/lib/alertsFeed.js.
const ALERTS_DATA = portfolioAlerts().map((a) => ({
  id: a.id, co: a.company, companyId: a.companyId, sev: a.severity, kpi: a.kpi,
  msg: a.message, reading: a.reading, threshold: a.threshold, source: a.source,
  thresholdNote: a.thresholdNote, asOf: a.asOf, st: "open",
}));

const ACTIONS_DATA = portfolioActions();

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

function FinanceModule({d,co,onDrill}){return(<div style={{display:"flex",flexDirection:"column",gap:14}}><div style={{color:T.txt3,fontSize:9,display:"flex",alignItems:"center",gap:6}}><span style={{width:6,height:6,borderRadius:"50%",background:T.green,display:"inline-block"}}/>{d.src}</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9}}>{[{m:"cash",l:"Cash Runway",v:`${co.runway} mo`,s:co.runway<6?"red":co.runway<9?"amber":"green"},{m:"revenue",l:"Revenue vs Budget",v:`${co.rvb}%`,s:co.rvb<85?"red":co.rvb<95?"amber":"green"},{m:"ebitda",l:"EBITDA Margin",v:`${co.ebitda}%`,s:co.ebitda<0?"red":co.ebitda<5?"amber":"green"}].map(card=><div key={card.m} onClick={()=>onDrill&&onDrill(card.m)} style={{background:T.card,border:`1px solid ${ragCol(card.s)}40`,borderLeft:`3px solid ${ragCol(card.s)}`,borderRadius:9,padding:"13px 15px",cursor:"pointer",transition:"background 0.15s",position:"relative"}} onMouseEnter={e=>e.currentTarget.style.background=T.cardHov} onMouseLeave={e=>e.currentTarget.style.background=T.card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{color:T.txt3,fontSize:10,letterSpacing:"0.04em",textTransform:"uppercase"}}>{card.l}</div><span style={{color:T.txt3,fontSize:9,display:"flex",alignItems:"center",gap:3}}>drill <span style={{fontSize:12}}>›</span></span></div><div style={{color:ragCol(card.s),fontSize:22,fontWeight:800,fontFamily:"monospace",marginTop:6}}>{card.v}</div></div>)}</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9}}>{d.kpis.map((k,i)=><KpiCard key={i} {...k}/>)}</div><div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}><ChartBox title="REVENUE — ACTUAL VS BUDGET (£k)" src="Xero · 4h ago"><ResponsiveContainer width="100%" height={155}><ComposedChart data={d.rev}><CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis dataKey="m" tick={{fill:T.txt3,fontSize:9}}/><YAxis tick={{fill:T.txt3,fontSize:9}}/><Tooltip content={<TT/>}/><Bar dataKey="budget" name="Budget" fill={T.borderLt} radius={[2,2,0,0]}/><Line dataKey="actual" name="Actual" stroke={T.amber} strokeWidth={2} dot={false}/></ComposedChart></ResponsiveContainer></ChartBox><ChartBox title="CASH PROJECTION (£k)" src="Xero bank feed · 12m"><ResponsiveContainer width="100%" height={155}><AreaChart data={d.cash}><CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis dataKey="m" tick={{fill:T.txt3,fontSize:9}}/><YAxis tick={{fill:T.txt3,fontSize:9}}/><Tooltip content={<TT/>}/><ReferenceLine y={200} stroke={T.red} strokeDasharray="4 4"/><Area dataKey="v" name="Cash £k" stroke={T.red} fill={T.redDim} strokeWidth={2}/></AreaChart></ResponsiveContainer></ChartBox></div><ChartBox title="AR AGING WATERFALL (£k)" src="Xero · 4h ago"><ResponsiveContainer width="100%" height={130}><BarChart data={d.arAging}><CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis dataKey="bucket" tick={{fill:T.txt3,fontSize:9}}/><YAxis tick={{fill:T.txt3,fontSize:9}}/><Tooltip content={<TT/>}/><Bar dataKey="val" name="AR £k" radius={[3,3,0,0]}>{d.arAging.map((e,i)=><Cell key={i} fill={i===0?T.green:i===1?T.amber:T.red}/>)}</Bar></BarChart></ResponsiveContainer></ChartBox></div>);}

function SalesModule({d}){return(<div style={{display:"flex",flexDirection:"column",gap:14}}><div style={{color:T.txt3,fontSize:9,display:"flex",alignItems:"center",gap:6}}><span style={{width:6,height:6,borderRadius:"50%",background:T.green,display:"inline-block"}}/>{d.src}</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9}}>{d.kpis.map((k,i)=><KpiCard key={i} {...k}/>)}</div><div style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:12}}><ChartBox title="PIPELINE VS TARGET (£k)" src={d.src}><ResponsiveContainer width="100%" height={155}><ComposedChart data={d.pipe}><CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis dataKey="m" tick={{fill:T.txt3,fontSize:9}}/><YAxis tick={{fill:T.txt3,fontSize:9}}/><Tooltip content={<TT/>}/><Bar dataKey="pipe" name="Pipeline" fill={T.blue} radius={[2,2,0,0]} opacity={0.85}/><Line dataKey="target" name="Target" stroke={T.green} strokeWidth={2} dot={false} strokeDasharray="5 5"/></ComposedChart></ResponsiveContainer></ChartBox><ChartBox title="SALES FUNNEL" src="HubSpot"><ResponsiveContainer width="100%" height={155}><BarChart data={d.funnel} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis type="number" tick={{fill:T.txt3,fontSize:9}}/><YAxis dataKey="stage" type="category" tick={{fill:T.txt3,fontSize:8}} width={70}/><Tooltip content={<TT/>}/><Bar dataKey="v" name="Count" fill={T.blue} radius={[0,3,3,0]} opacity={0.85}/></BarChart></ResponsiveContainer></ChartBox></div></div>);}

function HRModule({d}){return(<div style={{display:"flex",flexDirection:"column",gap:14}}><div style={{color:T.txt3,fontSize:9,display:"flex",alignItems:"center",gap:6}}><span style={{width:6,height:6,borderRadius:"50%",background:T.green,display:"inline-block"}}/>{d.src}</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9}}>{d.kpis.map((k,i)=><KpiCard key={i} {...k}/>)}</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><ChartBox title="ATTRITION VS BENCHMARK (%)" src={d.src}><ResponsiveContainer width="100%" height={150}><ComposedChart data={d.att}><CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis dataKey="m" tick={{fill:T.txt3,fontSize:9}}/><YAxis tick={{fill:T.txt3,fontSize:9}} domain={[0,28]}/><Tooltip content={<TT/>}/><Area dataKey="att" name="Attrition %" stroke={T.amber} fill={T.amberDim} strokeWidth={2}/><Line dataKey="bench" name="Benchmark" stroke={T.green} strokeWidth={1.5} dot={false} strokeDasharray="5 5"/></ComposedChart></ResponsiveContainer></ChartBox><ChartBox title="HEADCOUNT MOVEMENT" src="BambooHR · 12h ago"><ResponsiveContainer width="100%" height={150}><BarChart data={d.hcWaterfall}><CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis dataKey="m" tick={{fill:T.txt3,fontSize:9}}/><YAxis tick={{fill:T.txt3,fontSize:9}}/><Tooltip content={<TT/>}/><Bar dataKey="hires" name="Hires" fill={T.green} radius={[2,2,0,0]}/><Bar dataKey="leavers" name="Leavers" fill={T.red} radius={[2,2,0,0]}/></BarChart></ResponsiveContainer></ChartBox></div></div>);}

function CrossFunctionalModule({d}){return(<div style={{display:"flex",flexDirection:"column",gap:14}}><div style={{background:T.amberDim,border:`1px solid ${T.amber}22`,borderRadius:6,padding:"8px 12px",color:T.amber,fontSize:10}}>⚡ Cross-functional KPIs — the metrics PE/VC actually use for valuation and intervention decisions. Derived from Finance + Sales + HR data. Click any tile to see calculation method and confidence.</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9}}>{d.kpis.map((k,i)=><KpiCard key={i} {...k}/>)}</div></div>);}

function BenchmarkModule({co}){
  const bm=benchmarksFor(co.id);
  return(<div style={{display:"flex",flexDirection:"column",gap:14}}><div style={{color:T.txt3,fontSize:10,marginBottom:4}}>Benchmarked against {co.sector} companies at {co.stage} stage. Source: Alpha Vantage · Alpha Vantage · Internal portfolio data.</div>{bm.map((b,i)=>{const isLower=b.lowerBetter;const pos=isLower?(b.company<=b.topQuartile?"green":b.company<=b.sectorMedian?"amber":"red"):(b.company>=b.topQuartile?"green":b.company>=b.sectorMedian?"amber":"red");const range=b.topQuartile-b.bottomQuartile||1;const pct=Math.min(100,Math.max(0,((b.company-b.bottomQuartile)/range)*100));return(<div key={i} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"12px 14px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><span style={{color:T.txt1,fontSize:12,fontWeight:600}}>{b.kpi}</span><div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{color:ragCol(pos),fontSize:13,fontWeight:700,fontFamily:"monospace"}}>{b.company}{b.unit}</span><RagBadge status={pos}/></div></div><div style={{position:"relative",height:8,background:T.border,borderRadius:4,marginBottom:6}}><div style={{position:"absolute",left:`${Math.min(100,Math.max(0,((b.bottomQuartile+(range*0.25)-b.bottomQuartile)/range)*100))}%`,right:`${100-Math.min(100,Math.max(0,((b.topQuartile-b.bottomQuartile*0.25)/range)*100))}%`,top:0,bottom:0,background:`${T.green}22`,borderRadius:4}}/><div style={{position:"absolute",left:`${pct}%`,top:-2,width:12,height:12,borderRadius:"50%",background:ragCol(pos),transform:"translateX(-50%)",border:`2px solid ${T.bg}`}}/></div><div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:T.txt3,fontSize:8}}>Bottom Q4: {b.bottomQuartile}{b.unit}</span><span style={{color:T.txt3,fontSize:8}}>Median: {b.sectorMedian}{b.unit}</span><span style={{color:T.green,fontSize:8}}>Top Q1: {b.topQuartile}{b.unit}</span></div></div>);})}</div>);
}

// ── CEO / GP COCKPIT ──────────────────────────────────────────────────────────
// The specification's component 2 asks every company page to carry a
// data-source and refresh strip. Modelled disciplines are named as such here
// rather than being allowed to pass as connected feeds.
// Continuously moving readings for one company. Anchored to the same figures
// the tabs below report, so the tile and the drill-down never disagree.
function CompanyLiveStrip({co}){
  const fin=useMemo(()=>buildFinance({id:co.id,status:co.status}),[co.id,co.status]);
  const ccy=fin.native.currency;
  const money=(v)=>fmtMoney(v,ccy,{k:true});
  const n=fin.native;
  const specs=useMemo(()=>([
    { key:`${co.id}-cash`,  label:"Cash balance",     base:n.cash,    amplitude:0.0025, integration:"bankfeed", fmt:money },
    { key:`${co.id}-burn`,  label:"Net burn",         base:n.burn,    amplitude:0.005,  integration:"bankfeed", fmt:money },
    { key:`${co.id}-rev`,   label:"Monthly revenue",  base:n.revenue, amplitude:0.003,  integration:"xero",     fmt:money },
    { key:`${co.id}-pipe`,  label:"Open pipeline",    base:n.budget*3*fin.sales.pipelineCoverage, amplitude:0.006, integration:"hubspot", fmt:money },
    { key:`${co.id}-heads`, label:"Headcount",        base:fin.people.headcount, amplitude:0.001, integration:"bamboo", fmt:(v)=>Math.round(v).toLocaleString() },
    { key:`${co.id}-ar`,    label:"Overdue AR",       base:fin.cash.overdueTotal, amplitude:0.007, integration:"xero", fmt:money },
  ]),[co.id]);
  return <LiveStrip specs={specs} note={`Live readings for ${co.name}, moving around the reported figures in the tabs below.`}/>;
}

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

  // The month-on-month movements used to be typed — "burn increased £12k MoM,
  // DSO widened 15 days, coverage dropped from 2.5x to 2.1x" — on every company,
  // including the ones where burn had fallen. They are read from the ledger now.
  const fin=useMemo(()=>buildFinance({id:co.id,status:co.status}),[co.id,co.status]);
  const m=(v)=>fmtMoney(v,fin.currency,{k:true});
  const burnPrev=fin.history.cash[fin.history.cash.length-2]?.burn ?? fin.cash.burn;
  const burnMove=fin.cash.burn-burnPrev;
  const coverageMove=fin.sales.pipelineCoverage-fin.sales.coverageFrom;
  const varPct=(fin.revenue.total/fin.revenue.budget-1)*100;
  const mine=ACTIONS_DATA.filter(a=>a.companyId===co.id);
  const open=mine.filter(a=>a.st!=="done");
  const alerts=ALERTS_DATA.filter(a=>a.companyId===co.id);
  const worstAlert=alerts[0];

  const ceoPoints=[
    {q:"Current condition?", a:`Health score ${co.score}/100. ${co.status==="red"?"Critical intervention required.":co.status==="amber"?"Monitoring required.":"Tracking well."} Cash runway ${co.runway} months on ${m(fin.cash.balance)} of cash.`},
    {q:"What changed since last month?", a:`Net burn ${burnMove>=0?"up":"down"} ${m(Math.abs(burnMove))} to ${m(fin.cash.burn)}. Pipeline coverage ${fin.sales.pipelineCoverage}× against ${fin.sales.coverageFrom}× at the start of the period (${coverageMove>=0?"+":""}${coverageMove.toFixed(1)}). Win rate ${fin.sales.winRatePct}%, from ${fin.sales.winRateFrom}%.`},
    {q:"What is projected if trends continue?", a:`At ${m(fin.cash.burn)} a month, cash depletes in ${co.runway} months. Revenue is ${varPct.toFixed(1)}% against plan — a shortfall of ${m(fin.revenue.budget-fin.revenue.total)} a month at the current run rate.`},
    {q:"What actions are open?", a:`${open.length} of ${mine.length} actions still open. ${open.filter(a=>a.pri==="critical").length} critical, ${open.filter(a=>a.pri==="high").length} high priority.`},
    {q:"What needs board/investor attention?", a: worstAlert ? `${worstAlert.kpi} — ${worstAlert.msg} Read from ${worstAlert.source}.` : `No threshold is breached from the connected data. Keep the company on the standard monthly cycle.`},
  ];
  const gpPoints=[
    {q:"On or off thesis?", a:`${co.score>=70?"Broadly on thesis — core metrics tracking.":"Off thesis in finance and commercial dimensions. Intervention warranted."} Ownership ${co.own}%.`},
    {q:"Is management in control?", a:`${co.score>=70?"Management demonstrating adequate operational control.":"Execution risk elevated. Operating partner involvement recommended."}`},
    {q:"What is the downside risk?", a:`Cash depletion risk at ${co.runway} months. Valuation impairment risk if revenue trajectory not recovered within 2 quarters.`},
    {q:"What support is required?", a:`Operating partner review recommended. CFO support on debtor management and cash forecasting.`},
    {q:"Is further capital at risk?", a:`${co.runway<6?"Yes — current trajectory puts existing invested capital at risk without bridge or cost reduction.":"Not immediately — but continued underperformance may affect follow-on terms."}`},
  ];
  const pts=mode==="ceo"?ceoPoints:gpPoints;
  return(<div style={{display:"flex",flexDirection:"column",gap:14}}><div style={{display:"flex",gap:6,marginBottom:4}}>{["ceo","gp"].map(m=><button key={m} onClick={()=>setMode(m)} style={{padding:"6px 14px",borderRadius:4,cursor:"pointer",fontFamily:F.sans,fontSize:S.label,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",background:mode===m?C.gold:"transparent",border:`1px solid ${mode===m?C.gold:C.borderLt}`,color:mode===m?C.goldOn:C.txt2}}>{m==="ceo"?"CEO Cockpit":"GP Cockpit"}</button>)}</div>{pts.map((p,i)=><div key={i} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"12px 14px"}}><div style={{color:T.txt3,fontSize:10,marginBottom:5}}>Q: {p.q}</div><div style={{color:T.txt1,fontSize:12,lineHeight:1.5}}>{p.a}</div></div>)}<HealthBreakdown co={co}/></div>);
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

  return(<div style={{display:"flex",flexDirection:"column",gap:14}}><div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:18}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div><div style={{color:T.txt1,fontSize:13,fontWeight:600}}>Board-Ready Executive Summary</div><div style={{color:T.txt3,fontSize:10,marginTop:2}}>All KPIs · All data sources · Source-cited · GP action recommendations</div></div><button onClick={gen} disabled={loading} style={{padding:"6px 13px",borderRadius:4,cursor:loading?"wait":"pointer",fontFamily:F.sans,fontSize:S.label,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",background:loading?C.borderLt:C.gold,color:loading?C.txt3:C.goldOn,border:`1px solid ${loading?C.borderLt:C.gold}`}}>{loading?"Analysing…":"Generate Analysis"}</button></div>{narrative&&<div style={{background:T.surface,border:`1px solid ${T.borderLt}`,borderRadius:6,padding:14,color:T.txt2,fontSize:12,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{badge(live)}{narrative}</div>}</div><div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:18}}><div style={{color:T.txt1,fontSize:13,fontWeight:600,marginBottom:10}}>Ask a Question</div><div style={{display:"flex",gap:8,marginBottom:8}}><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&ask()} placeholder='e.g. "How many months before a cash injection is needed?"' style={{flex:1,padding:"8px 11px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,color:T.txt1,fontSize:11,fontFamily:"inherit",outline:"none"}}/><button onClick={ask} disabled={qLoad} style={{padding:"6px 13px",borderRadius:4,cursor:"pointer",fontFamily:F.sans,fontSize:S.label,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",background:"transparent",border:`1px solid ${C.borderLt}`,color:C.txt2}}>{qLoad?"…":"Ask"}</button></div><div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>{["How urgent is the cash situation?","What's driving the revenue miss?","Which risks need GP attention this week?","What does Rule of 40 tell us?"].map(qq=><button key={qq} onClick={()=>setQ(qq)} style={{padding:"3px 9px",background:"transparent",border:`1px solid ${T.border}`,borderRadius:4,color:T.txt3,fontSize:9,cursor:"pointer"}}>{qq}</button>)}</div>{answer&&<div style={{background:T.surface,border:`1px solid ${T.borderLt}`,borderRadius:6,padding:12,color:T.txt2,fontSize:12,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{badge(qLive)}{answer}</div>}</div></div>);
}

// ── COMPANY VIEW ──────────────────────────────────────────────────────────────
/**
 * The company page — the reference's screen 7.
 *
 * Actual against plan on the left with a forward projection, the early warning
 * on the right with the indicators that raised it, and sales quality along the
 * foot. Everything is per company: the panel that used to name one company's
 * figures under nine different headings is gone.
 */
function CompanyOverview({co,onInvestigate}){
  const fin=useMemo(()=>buildFinance({id:co.id,status:co.status}),[co.id,co.status]);
  const inv=useMemo(()=>buildInvestigation(co.id),[co.id]);
  const quality=useMemo(()=>salesQualityFor(co.id),[co.id]);
  const alerts=ALERTS_DATA.filter(a=>a.companyId===co.id);
  const m=(v)=>fmtMoney(v,fin.currency,{k:true});

  const rev=fin.history.revenue;
  const months=fin.history.months;
  const q=(f)=>rev.slice(-3).reduce((s,x)=>s+x[f],0);
  const qActual=q("actual"), qPlan=q("budget");
  const qVar=((qActual-qPlan)/qPlan)*100;

  // A forward projection, not a second forecast model: the last three months'
  // run rate carried forward, stated as such in the legend.
  const runRate=qActual/3;
  const trend=(rev.at(-1).actual-rev.at(-4).actual)/3;
  const series=[
    ...rev.map((x,k)=>({m:months[k].slice(2),actual:Math.round(x.actual),plan:Math.round(x.budget)})),
    ...[1,2,3].map((k)=>({m:`+${k}`,plan:Math.round(rev.at(-1).budget),forecast:Math.round(runRate+trend*k)})),
  ];
  // Join the forecast line to the last actual so it does not float.
  series[rev.length-1].forecast=Math.round(rev.at(-1).actual);

  const indicators=[
    {l:"Pipeline coverage",from:`${fin.sales.coverageFrom}×`,to:`${fin.sales.pipelineCoverage}×`,worse:fin.sales.pipelineCoverage<fin.sales.coverageFrom},
    {l:"Win rate",from:`${fin.sales.winRateFrom}%`,to:`${fin.sales.winRatePct}%`,worse:fin.sales.winRatePct<fin.sales.winRateFrom},
    {l:"Gross margin",from:`${fin.history.ebitda[0].grossMarginPct}%`,to:`${fin.ebitda.grossMargin}%`,worse:fin.ebitda.grossMargin<fin.history.ebitda[0].grossMarginPct},
    {l:"Net burn",from:m(fin.history.cash[0].burn),to:m(fin.cash.burn),worse:fin.cash.burn>fin.history.cash[0].burn},
  ];

  const quarterGap=Math.max(0,qPlan-qActual);
  const warning=inv.underStress
    ?{label:`Likely next-quarter miss`,amount:m(quarterGap),tone:C.red}
    :{label:"No threshold breached",amount:`${fin.runway} months`,tone:C.green};

  return(
    <>
      <MetricRow items={[
        {label:"Quarter revenue",value:m(qActual),tone:C.txt1,
         sub:`Three months to ${fin.asOf}`},
        {label:"Quarter plan",value:m(qPlan),tone:qVar<0?C.red:C.green,
         sub:`${qVar>=0?"+":""}${qVar.toFixed(1)}% against plan`},
        {label:"Pipeline coverage",value:`${fin.sales.pipelineCoverage}×`,
         tone:fin.sales.pipelineCoverage<2.5?C.red:fin.sales.pipelineCoverage<3?C.gold:C.green,
         sub:`from ${fin.sales.coverageFrom}× at the start of the period`},
        {label:"Win rate",value:`${fin.sales.winRatePct}%`,
         tone:fin.sales.winRatePct<fin.sales.winRateFrom?C.red:C.green,
         sub:`from ${fin.sales.winRateFrom}%`},
      ]}/>

      <TwoColumn
        left={
          <Panel title="Actual and forecast against plan"
                 sub={`${months.length} months of ledger, plus three months carried forward at the current run rate`}
                 right={
                   <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                     {[["Actual",C.txt1,"solid"],["Forecast",C.gold,"solid"],["Plan",C.txt3,"dotted"]].map(([l,cc,st])=>(
                       <span key={l} style={{display:"flex",alignItems:"center",gap:5,color:C.txt3,fontSize:S.micro}}>
                         <span style={{width:12,height:0,borderTop:`2px ${st} ${cc}`,display:"inline-block"}}/>{l}
                       </span>))}
                   </div>
                 }>
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={series} margin={{top:6,right:8,left:-16,bottom:0}}>
                <CartesianGrid stroke={C.border} strokeDasharray="2 4" vertical={false}/>
                <XAxis dataKey="m" stroke={C.txt3} tick={{fontSize:9,fill:C.txt3}}/>
                <YAxis stroke={C.txt3} tick={{fontSize:9,fill:C.txt3}}/>
                <Tooltip content={<TT src={fin.revenue.source?.label||"Xero"}/>}/>
                <Line type="monotone" dataKey="plan" name="Plan" stroke={C.txt3} strokeWidth={1.4} strokeDasharray="3 3" dot={false}/>
                <Line type="monotone" dataKey="actual" name="Actual" stroke={C.txt1} strokeWidth={2} dot={false}/>
                <Line type="monotone" dataKey="forecast" name="Forecast" stroke={C.gold} strokeWidth={2} dot={false}/>
              </LineChart>
            </ResponsiveContainer>
          </Panel>
        }
        right={
          <Panel title="Alba early warning">
            <div style={{...labelStyle(warning.tone),marginBottom:6}}>{warning.label}</div>
            <div style={{display:"flex",alignItems:"baseline",gap:10,flexWrap:"wrap",marginBottom:10}}>
              <span style={metricStyle(warning.tone,34)}>{warning.amount}</span>
              <Chip tone={inv.underStress?"red":"green"}>
                {inv.contributions.length} {inv.contributions.length===1?"driver":"drivers"} quantified
              </Chip>
            </div>
            <div style={{color:C.txt2,fontSize:S.small,lineHeight:1.65,marginBottom:12}}>{inv.rootCause}</div>

            {indicators.map((x)=>(
              <div key={x.l} style={{display:"flex",alignItems:"center",gap:9,padding:"6px 0",
                                     borderBottom:`1px solid ${C.border}`}}>
                <span style={{width:6,height:6,borderRadius:"50%",flexShrink:0,
                              background:x.worse?C.red:C.green}}/>
                <span style={{color:C.txt2,fontSize:S.small,flex:1}}>{x.l}</span>
                <span style={{color:C.txt3,fontSize:S.small,fontVariantNumeric:"tabular-nums",whiteSpace:"nowrap"}}>
                  {x.from} <span style={{color:C.txt3}}>→</span>{" "}
                  <span style={{color:x.worse?C.red:C.green}}>{x.to}</span>
                </span>
              </div>
            ))}

            <div style={{display:"flex",gap:7,marginTop:13,flexWrap:"wrap"}}>
              <Button variant="primary" onClick={onInvestigate}>Investigate signal</Button>
              <Button variant="ghost">View source data</Button>
            </div>
            <div style={{color:C.txt3,fontSize:S.micro,marginTop:9,lineHeight:1.55}}>
              {inv.steps.filter((s)=>s.kind==="finding").length} findings across{" "}
              {alerts.length} open {alerts.length===1?"alert":"alerts"} · as of {fin.asOf}
            </div>
          </Panel>
        }
      />

      <div style={{display:"flex",gap:9,flexWrap:"wrap",marginBottom:12}}>
        {quality.map((x)=>(
          <div key={x.label} title={x.basis}
               style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,
                       padding:"13px 15px",flex:1,minWidth:180}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8,marginBottom:8}}>
              <span style={labelStyle()}>{x.label}</span>
              {x.modelled&&<span style={{...labelStyle(C.blue),fontSize:S.micro}}>Model</span>}
            </div>
            <div style={metricStyle(x.worse?C.red:C.txt1,S.metricSm)}>{x.value}</div>
            <div style={{color:C.txt3,fontSize:S.micro,marginTop:6,lineHeight:1.5}}>
              from {x.from} · {x.source}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function CompanyView({co,onBack}){
  const [tab,setTab]=useState("overview");
  const [drill,setDrill]=useState(null);
  const d=MODULES[co.id];
  const TABS=[{id:"overview",l:"Overview"},{id:"finance",l:"Finance"},{id:"sales",l:"Sales"},{id:"hr",l:"People"},{id:"ops",l:"Operations"},{id:"procurement",l:"Procurement"},{id:"technology",l:"Technology"},{id:"compliance",l:"Compliance"},{id:"crossfunctional",l:"Cross-functional"},{id:"benchmarks",l:"Benchmarks"},{id:"ai",l:"AI"}];
  const chipTone=co.status==="red"?"red":co.status==="amber"?"gold":"green";
  const chipWord=co.status==="red"?"Critical":co.status==="amber"?"Attention":"Healthy";

  return(
    <Page>
      <PageHeader
        crumbs={["Portfolio","Company Detail",co.name]}
        title={co.name}
        chips={<>
          <Chip tone={chipTone}>{chipWord}</Chip>
          <Chip tone="muted">{co.score} / 100</Chip>
        </>}
        purpose={`${co.sector} · ${co.stage} · ${co.own}% ownership · ${co.geo}`}
        meta={`Updated ${co.upd} · data ${co.freshness}% fresh · ${co.actions} open ${co.actions===1?"action":"actions"} · ${co.alerts} ${co.alerts===1?"alert":"alerts"} · primary issue: ${co.issue}`}
        actions={<Button variant="outline" onClick={onBack}>Back to portfolio</Button>}
      />

      <div style={{display:"flex",gap:3,marginBottom:14,flexWrap:"wrap"}}>
        {TABS.map(x=>(
          <button key={x.id} onClick={()=>setTab(x.id)}
                  style={{padding:"6px 12px",borderRadius:4,cursor:"pointer",fontFamily:F.sans,
                          fontSize:S.label,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",
                          background:tab===x.id?C.gold:"transparent",
                          border:`1px solid ${tab===x.id?C.gold:C.borderLt}`,
                          color:tab===x.id?C.goldOn:C.txt2}}>{x.l}</button>))}
      </div>

      <SourceStrip co={co} d={d}/>
      {d&&<CompanyLiveStrip co={co}/>}

      {tab==="overview"&&<><CompanyOverview co={co} onInvestigate={()=>setTab("finance")}/><CockpitView co={co}/></>}
      {tab==="finance"&&d&&<FinanceModule d={d.finance} co={co} onDrill={setDrill}/>}
      {tab==="sales"&&d&&<SalesModule d={d.sales}/>}
      {tab==="hr"&&d&&<HRModule d={d.hr}/>}
      {tab==="ops"&&d&&<GenericModule d={d.ops}/>}
      {tab==="procurement"&&d&&<GenericModule d={d.procurement}/>}
      {tab==="technology"&&d&&<GenericModule d={d.technology}/>}
      {tab==="compliance"&&d&&<GenericModule d={d.compliance}/>}
      {tab==="crossfunctional"&&d&&<CrossFunctionalModule d={d.crossFunctional}/>}
      {tab==="benchmarks"&&<BenchmarkModule co={co}/>}
      {tab==="ai"&&<AIPanel co={co}/>}

      {drill&&<FinanceDrilldown company={co} metric={drill} onClose={()=>setDrill(null)}/>}
    </Page>
  );
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
  const health=integrationHealth();
  const freshness=Math.round(COMPANIES.reduce((s,c)=>s+c.freshness,0)/COMPANIES.length);

  const SortBtn=({k,l})=>(
    <button onClick={()=>toggleSort(k)}
            style={{...labelStyle(sort===k?C.gold:C.txt3),background:"transparent",border:"none",
                    cursor:"pointer",padding:0,display:"flex",alignItems:"center",gap:3,fontFamily:F.sans}}>
      {l}{sort===k&&<span style={{fontSize:8}}>{asc?"↑":"↓"}</span>}
    </button>
  );

  const GRID="2.4fr 60px 74px 82px 76px 76px 66px 78px 1.2fr 62px";

  return(
    <Page>
      <PageHeader
        crumbs={["Portfolio","Company Detail"]}
        title="Portfolio Overview"
        chips={reds>0?<Chip tone="red">{reds} critical</Chip>:<Chip tone="green">No company in red</Chip>}
        purpose={`${COMPANIES.length} companies, ranked on health — open one for its eleven modules and the finance drill-down`}
        meta={`${health.summary.text} · data ${freshness}% fresh across the portfolio`}
        actions={onGuide?<Button variant="ghost" onClick={onGuide}>How to read this</Button>:null}
      />

      <MetricRow items={[
        {label:"Companies",value:COMPANIES.length,sub:`Average health ${avg}/100`},
        {label:"In red",value:reds,tone:reds>0?C.red:C.green,sub:"Intervention required"},
        {label:"Open actions",value:openActions,tone:openActions>0?C.gold:C.green,sub:`of ${ACTIONS_DATA.length} raised`},
        {label:"Runway under 6mo",value:COMPANIES.filter(c=>c.runway<6).length,tone:C.red,sub:`${COMPANIES.filter(c=>c.runway<9).length} inside nine months`},
      ]}/>

      <Panel title="Portfolio" sub="Click a row for the company detail" pad={0}>
        <div style={{overflowX:"auto"}}>
          <div style={{minWidth:900}}>
            <div style={{display:"grid",gridTemplateColumns:GRID,padding:"9px 14px",gap:6,
                         borderBottom:`1px solid ${C.border}`}}>
              <div style={labelStyle()}>Company</div>
              <SortBtn k="score" l="Score"/>
              <SortBtn k="runway" l="Runway"/>
              <SortBtn k="rvb" l="Rev vs plan"/>
              <SortBtn k="att" l="Attrition"/>
              <div style={labelStyle()}>EBITDA</div>
              <div style={labelStyle()}>Trend</div>
              <SortBtn k="alerts" l="Alerts"/>
              <SortBtn k="freshness" l="Data fresh"/>
              <div/>
            </div>
            {sorted.map(c=>{
              const lc=ragCol(c.status);
              return(
                <div key={c.id} onClick={()=>onSelect(c)}
                     style={{display:"grid",gridTemplateColumns:GRID,alignItems:"center",gap:6,
                             padding:"11px 14px",borderBottom:`1px solid ${C.border}`,
                             borderLeft:`2px solid ${lc}`,cursor:"pointer",fontSize:S.small}}
                     onMouseEnter={e=>e.currentTarget.style.background=C.surfaceUp}
                     onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{display:"flex",alignItems:"center",gap:9,minWidth:0}}>
                    <Dot status={c.status}/>
                    <div style={{minWidth:0}}>
                      <div style={{color:C.txt1}}>{c.name}</div>
                      <div style={{color:C.txt3,fontSize:S.micro}}>{c.sector} · {c.stage}</div>
                    </div>
                  </div>
                  <HealthRing score={c.score} size={34}/>
                  <div style={{color:c.runway<6?C.red:c.runway<9?C.gold:C.green,fontVariantNumeric:"tabular-nums"}}>{c.runway}mo</div>
                  <div style={{color:c.rvb<85?C.red:c.rvb<95?C.gold:C.green,fontVariantNumeric:"tabular-nums"}}>{c.rvb}%</div>
                  <div style={{color:c.att>20?C.red:c.att>12?C.gold:C.green,fontVariantNumeric:"tabular-nums"}}>{c.att}%</div>
                  <div style={{color:c.ebitda<0?C.red:c.ebitda<5?C.gold:C.green,fontVariantNumeric:"tabular-nums"}}>{c.ebitda}%</div>
                  <div title="12-month health score trend">
                    <Sparkline data={c.spark} color={c.trend==="up"?C.green:c.trend==="down"?C.red:C.gold}/>
                  </div>
                  <div style={{display:"flex",gap:4}}>
                    {c.alerts>0&&<span style={{background:C.redSoft,color:C.red,fontSize:S.micro,padding:"2px 6px",borderRadius:3,fontWeight:700}}>{c.alerts}</span>}
                    {c.actions>0&&<span style={{background:C.goldSoft,color:C.gold,fontSize:S.micro,padding:"2px 6px",borderRadius:3,fontWeight:700}}>{c.actions}</span>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{flex:1,height:3,background:C.border,borderRadius:2}}>
                      <div style={{height:"100%",borderRadius:2,width:`${c.freshness}%`,
                                   background:c.freshness>90?C.green:c.freshness>70?C.gold:C.red}}/>
                    </div>
                    <span style={{color:C.txt3,fontSize:S.micro,width:26,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{c.freshness}%</span>
                  </div>
                  <div style={{textAlign:"right",color:C.txt3,fontSize:S.micro}}>View ›</div>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      <ProvenanceBar items={[
        `${COMPANIES.length} companies from the registry`,
        `${health.rows.length} source systems`,
        `${ALERTS_DATA.length} threshold breaches open`,
        `Health scored on five dimensions`,
      ]}/>
    </Page>
  );
}

// ── ALERTS, ACTIONS ───────────────────────────────────────────────────────────
function AlertsView(){
  const [acknowledged,setAcknowledged]=useState(()=>new Set());
  const toggle=id=>setAcknowledged(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
  const summary=alertSummary(ALERTS_DATA);
  const tone={critical:C.red,high:C.gold,watchlist:C.blue};
  const chipTone={critical:"red",high:"gold",watchlist:"blue"};

  return(
    <Page>
      <PageHeader
        crumbs={["Portfolio","Alerts and Exceptions"]}
        title="Alerts and Exceptions"
        chips={summary.critical>0?<Chip tone="red">{summary.critical} critical</Chip>:<Chip tone="green">Nothing critical</Chip>}
        purpose="Every alert is a reading that crossed a named threshold — the reading, the threshold and the system it came from are on the row"
        meta={`${summary.total} open across ${summary.companies} companies · ${acknowledged.size} acknowledged`}
      />

      <MetricRow items={[
        {label:"Critical",value:summary.critical,tone:summary.critical?C.red:C.green,sub:"Act this cycle"},
        {label:"High",value:summary.high,tone:C.gold,sub:"Address before the next board"},
        {label:"Watchlist",value:summary.watchlist,tone:C.blue,sub:"Monitor"},
        {label:"Companies affected",value:summary.companies,tone:C.txt1,sub:`of ${COMPANIES.length} in the portfolio`},
      ]}/>

      {["critical","high","watchlist"].map(sev=>{
        const g=ALERTS_DATA.filter(a=>a.sev===sev);
        if(!g.length)return null;
        return(
          <Panel key={sev} title={`${sev} (${g.length})`} tone={`${tone[sev]}33`} pad={0}>
            {g.map(a=>{
              const ack=acknowledged.has(a.id);
              return(
                <div key={a.id} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,
                                        padding:"11px 14px",borderBottom:`1px solid ${C.border}`,opacity:ack?0.5:1}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:5,flexWrap:"wrap"}}>
                      <Chip tone={chipTone[a.sev]}>{a.sev}</Chip>
                      <span style={{color:C.txt1,fontSize:S.body,fontWeight:500}}>{a.co}</span>
                      <span style={{color:C.txt3,fontSize:S.micro}} title={a.thresholdNote||undefined}>
                        {a.kpi} · {a.reading} against a threshold of {a.threshold} · {a.source} · as of {a.asOf}
                      </span>
                    </div>
                    <div style={{color:C.txt2,fontSize:S.small,lineHeight:1.55}}>{a.msg}</div>
                  </div>
                  <Button variant="outline" onClick={()=>toggle(a.id)}>{ack?"Re-open":"Acknowledge"}</Button>
                </div>
              );
            })}
          </Panel>
        );
      })}

      <ProvenanceBar items={[
        "Every alert corresponds to a named threshold",
        `${new Set(ALERTS_DATA.map(a=>a.source)).size} source systems`,
        "An alert disappears when its reading recovers",
        "Thresholds are visible on the row, not held back",
      ]}/>
    </Page>
  );
}

function ActionsView(){
  const actions=useMemo(()=>trackedActions(),[]);
  const summary=useMemo(()=>actionSummary(actions),[actions]);
  const [f,setF]=useState("all");
  const [open,setOpen]=useState(null);
  const pc={critical:C.red,high:C.gold,medium:C.blue,low:C.txt3};
  const pchip={critical:"red",high:"gold",medium:"blue",low:"muted"};
  const sc2={open:C.gold,in_progress:C.blue,done:C.green};
  const vc={working:C.green,"no-change":C.txt3,worse:C.red};
  const vl={working:"Metric improving","no-change":"No movement",worse:"Metric worsening"};
  const vis=f==="all"?actions:["working","no-change","worse"].includes(f)?actions.filter(a=>a.verdict===f):actions.filter(a=>a.status===f);

  return(
    <Page>
      <PageHeader
        crumbs={["Portfolio","Action Tracker"]}
        title="Action Tracker"
        chips={summary.worse>0?<Chip tone="red">{summary.worse} not working</Chip>:<Chip tone="green">Nothing worsening</Chip>}
        purpose="Every action names the KPI it was raised against. The verdict is read from the ledger, not set by the owner."
        meta={`${summary.total} actions on file across ${summary.companies} companies`}
      />

      <MetricRow items={[
        {label:"Open actions",value:summary.open,tone:C.txt1,sub:`${summary.total} on file across ${summary.companies} companies`},
        {label:"Metric improving",value:summary.working,tone:C.green,sub:"Moved the intended way since raised"},
        {label:"Metric worsening",value:summary.worse,tone:C.red,sub:"The action has not arrested it"},
        {label:"Completed and delivered",value:`${summary.completedWorking}/${summary.completedTotal}`,tone:C.green,sub:"Closed actions whose KPI actually moved"},
      ]}/>

      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <span style={labelStyle()}>Filter</span>
        {["all","open","in_progress","done","working","no-change","worse"].map(v=>(
          <button key={v} onClick={()=>setF(v)}
                  style={{padding:"5px 11px",borderRadius:4,cursor:"pointer",fontFamily:F.sans,
                          fontSize:S.label,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",
                          background:f===v?C.gold:"transparent",
                          border:`1px solid ${f===v?C.gold:C.borderLt}`,
                          color:f===v?C.goldOn:C.txt2}}>
            {v==="in_progress"?"In progress":v==="no-change"?"No movement":v.charAt(0).toUpperCase()+v.slice(1)}
          </button>))}
      </div>

      <Panel title={`${vis.length} ${vis.length===1?"action":"actions"}`}
             sub="Click a row for the baseline, the current reading and how the verdict was computed" pad={0}>
        {vis.map(a=>(
          <div key={a.id} onClick={()=>setOpen(p=>p===a.id?null:a.id)}
               style={{padding:"11px 14px",borderBottom:`1px solid ${C.border}`,cursor:"pointer",
                       borderLeft:`2px solid ${pc[a.priority]}`,opacity:a.status==="done"?0.82:1}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:5,flexWrap:"wrap"}}>
                  <Chip tone={pchip[a.priority]}>{a.priority}</Chip>
                  <span style={{color:C.txt1,fontSize:S.body,fontWeight:500}}>{a.companyName}</span>
                  <span style={{color:C.txt3,fontSize:S.micro}}>{a.metricLabel} · raised {a.raisedOn}</span>
                </div>
                <div style={{color:C.txt2,fontSize:S.small,marginBottom:6,lineHeight:1.5}}>{a.title}</div>
                <div style={{display:"flex",gap:14,flexWrap:"wrap",alignItems:"center",color:C.txt3,fontSize:S.micro}}>
                  <span>Owner <span style={{color:C.txt2}}>{a.owner}</span></span>
                  <span>Due <span style={{color:C.txt2}}>{a.due}</span></span>
                  <span style={{fontFamily:F.mono,fontVariantNumeric:"tabular-nums"}}>
                    {a.baselineLabel} → <span style={{color:vc[a.verdict]}}>{a.currentLabel}</span>
                  </span>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,flexShrink:0}}>
                <span style={{color:sc2[a.status],fontSize:S.micro,fontWeight:700,padding:"2px 8px",
                              background:`${sc2[a.status]}18`,border:`1px solid ${sc2[a.status]}55`,borderRadius:3,
                              letterSpacing:"0.1em",textTransform:"uppercase",whiteSpace:"nowrap"}}>
                  {a.status==="in_progress"?"In progress":a.status}
                </span>
                <span style={{color:vc[a.verdict],fontSize:S.micro,fontWeight:700,padding:"2px 8px",
                              background:`${vc[a.verdict]}14`,border:`1px solid ${vc[a.verdict]}33`,borderRadius:3,
                              whiteSpace:"nowrap"}}>
                  {a.verdict==="working"?"▲":a.verdict==="worse"?"▼":"–"} {vl[a.verdict]}
                </span>
                <span style={{color:C.txt3,fontSize:S.micro,fontFamily:F.mono,fontVariantNumeric:"tabular-nums"}}>
                  {a.pctMove>0?"+":""}{a.pctMove}% in {a.monthsElapsed}mo
                </span>
              </div>
            </div>
            {open===a.id&&(
              <div style={{marginTop:11,paddingTop:10,borderTop:`1px solid ${C.border}`}}>
                <div style={{color:vc[a.verdict],fontSize:S.small,lineHeight:1.65,marginBottom:10}}>{a.outcome}</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10}}>
                  {[["Metric",a.metricLabel],
                    ["At the time it was raised",`${a.baselineLabel} (${a.raisedOn})`],
                    ["Now",`${a.currentLabel} (${a.asOf})`],
                    ["Movement",`${a.deltaLabel} · ${a.pctMove>0?"+":""}${a.pctMove}%`],
                    ["Better when",a.better==="up"?"rising":"falling"],
                    ["Elapsed",`${a.monthsElapsed} months`]].map(([k,v])=>(
                    <div key={k}>
                      <div style={{...labelStyle(),marginBottom:3}}>{k}</div>
                      <div style={{color:C.txt2,fontSize:S.small}}>{v}</div>
                    </div>))}
                </div>
                <div style={{color:C.txt3,fontSize:S.micro,marginTop:10,lineHeight:1.6}}>
                  Baseline read from the ledger at {a.raisedOn}; current value from {a.asOf}. The verdict is computed
                  from those two figures — a move of less than 2% counts as no movement.
                </div>
              </div>
            )}
          </div>))}
      </Panel>

      <ProvenanceBar items={[
        `${summary.total} actions tracked`,
        "Verdicts computed from the ledger, not reported",
        "A move under 2% counts as no movement",
        `${summary.completedWorking} of ${summary.completedTotal} completed actions delivered`,
      ]}/>
    </Page>
  );
}

/**
 * The section bar for this screen's four views.
 *
 * This used to be a 50px icon rail with a blue-to-purple gradient mark — a
 * second navigation column inside a screen that already sits inside the
 * application's own rail, in colours the brand does not use. It is now a row of
 * named buttons carrying the same underline the top bar uses, so a viewer moving
 * between the fund view and this one is looking at one navigation idea.
 */
function SectionBar({view,setView}){
  const crit=ALERTS_DATA.filter(a=>a.sev==="critical").length;
  const acts=ACTIONS_DATA.filter(a=>a.st!=="done"&&(a.pri==="critical"||a.pri==="high")).length;
  const items=[
    {id:"portfolio",l:"Portfolio"},
    {id:"alerts",l:"Alerts",b:crit,tone:C.red},
    {id:"actions",l:"Actions",b:acts,tone:C.gold},
  ];
  return(
    <div style={{display:"flex",gap:2,alignItems:"center",borderBottom:`1px solid ${C.border}`,
                 padding:"0 24px",flexShrink:0,background:C.bgDeep}}>
      {items.map(it=>{
        const on=view===it.id||(it.id==="portfolio"&&view==="company");
        return(
          <button key={it.id} onClick={()=>setView(it.id)}
                  style={{padding:"10px 14px",background:"transparent",border:"none",cursor:"pointer",
                          borderBottom:`2px solid ${on?C.gold:"transparent"}`,
                          color:on?C.txt1:C.txt3,fontFamily:F.sans,fontSize:S.label,fontWeight:600,
                          letterSpacing:"0.11em",textTransform:"uppercase",
                          display:"flex",alignItems:"center",gap:7}}>
            {it.l}
            {it.b>0&&(
              <span style={{padding:"1px 6px",borderRadius:8,background:`${it.tone}22`,color:it.tone,
                            fontSize:S.micro,fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{it.b}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function GPDashboard({ onGuide, openCompany, initialSection }){
  // Portfolio Health hands over the company that was clicked. Without this the
  // click landed on the portfolio list with the selection discarded, so the
  // route from the fund view to a company's detail was broken in the middle.
  const initial=openCompany?COMPANIES.find(c=>c.id===openCompany):null;
  // `initialSection` lets the alerts and action-tracker sections be opened
  // directly — by a link, and by the smoke test, which otherwise only ever
  // rendered the portfolio list and so exercised a quarter of this file.
  const [view,setView]=useState(initial?"company":(initialSection??"portfolio"));
  const [co,setCo]=useState(initial);
  function sel(c){setCo(c);setView("company");}
  function nav(v){if(v!=="company")setCo(null);setView(v);}
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg,overflow:"hidden"}}>
      <SectionBar view={view} setView={nav}/>
      <div style={{flex:1,overflow:"hidden",minHeight:0}}>
        {view==="portfolio"&&<PortfolioView onSelect={sel} onGuide={onGuide}/>}
        {view==="company"&&co&&<CompanyView co={co} onBack={()=>nav("portfolio")}/>}
        {view==="alerts"&&<AlertsView/>}
        {view==="actions"&&<ActionsView/>}
      </div>
    </div>
  );
}

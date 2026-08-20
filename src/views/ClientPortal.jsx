import { useState, useMemo, createContext, useContext } from "react";
import { COMPANIES, companyById } from "../lib/companies.js";
import { buildFinance } from "../lib/financeData.js";
import { modulesFor } from "../lib/companyModules.js";
import { AreaChart, Area, BarChart, Bar, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// ── TOKENS ────────────────────────────────────────────────────────────────────
const T = {
  bg:"#f8f9fc", surface:"#ffffff", card:"#ffffff",
  border:"#e2e8f0", borderDk:"#cbd5e1",
  txt1:"#0f172a", txt2:"#475569", txt3:"#94a3b8",
  green:"#059669", greenDim:"#d1fae5", greenBrd:"#6ee7b7",
  amber:"#d97706", amberDim:"#fef3c7", amberBrd:"#fcd34d",
  red:"#dc2626",   redDim:"#fee2e2",   redBrd:"#fca5a5",
  blue:"#2563eb",  blueDim:"#dbeafe",  blueBrd:"#93c5fd",
  purple:"#7c3aed",purpleDim:"#ede9fe",purpleBrd:"#c4b5fd",
  navy:"#0f172a",
};
const ragCol = s => ({green:T.green,amber:T.amber,red:T.red}[s]||T.txt3);
const ragBg  = s => ({green:T.greenDim,amber:T.amberDim,red:T.redDim}[s]||"transparent");
const ragBrd = s => ({green:T.greenBrd,amber:T.amberBrd,red:T.redBrd}[s]||T.border);
const MO = ["May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr"];
const mk = v => MO.map((m,i) => ({ m, v: v[i] }));

// ── ROLES ─────────────────────────────────────────────────────────────────────
const ROLES = [
  { id:"ceo",    label:"CEO",             icon:"👤", color:T.navy,   desc:"Company-wide health + board readiness" },
  { id:"cfo",    label:"CFO",             icon:"💰", color:T.blue,   desc:"Finance, cash, covenant, forecasting" },
  { id:"sales",  label:"Head of Sales",   icon:"📈", color:T.green,  desc:"Pipeline, revenue, team performance" },
  { id:"hr",     label:"HR Lead",         icon:"👥", color:T.purple, desc:"People, hiring, attrition, payroll" },
  { id:"coo",    label:"COO",             icon:"⚙️", color:T.amber,  desc:"Operations, SLA, procurement, delivery" },
  { id:"gp",     label:"GP View",         icon:"🏦", color:"#e11d48",desc:"What the fund sees about your company" },
];

// ── WIDGET REGISTRY ───────────────────────────────────────────────────────────
// Each widget has: id, label, roles it's relevant to, size (1=small, 2=medium, 3=large)
const WIDGET_REGISTRY = [
  { id:"health_score",   label:"Health Score",        roles:["ceo","gp"],            size:1 },
  { id:"cash_runway",    label:"Cash Runway",          roles:["ceo","cfo","gp"],       size:1 },
  { id:"revenue_budget", label:"Revenue vs Budget",    roles:["ceo","cfo","sales","gp"],size:1 },
  { id:"burn_rate",      label:"Monthly Burn",         roles:["ceo","cfo","gp"],       size:1 },
  { id:"ebitda",         label:"EBITDA Margin",        roles:["ceo","cfo","gp"],       size:1 },
  { id:"pipeline",       label:"Pipeline Coverage",    roles:["ceo","sales","gp"],     size:1 },
  { id:"win_rate",       label:"Win Rate",             roles:["sales"],               size:1 },
  { id:"quota",          label:"Quota Attainment",     roles:["sales"],               size:1 },
  { id:"headcount",      label:"Headcount vs Plan",    roles:["ceo","hr","gp"],        size:1 },
  { id:"attrition",      label:"Attrition Rate",       roles:["ceo","hr","gp"],        size:1 },
  { id:"open_roles",     label:"Open Roles",           roles:["hr"],                  size:1 },
  { id:"sla",            label:"SLA Adherence",        roles:["coo"],                 size:1 },
  { id:"backlog",        label:"Ops Backlog",          roles:["coo"],                 size:1 },
  { id:"nrr",            label:"NRR",                  roles:["ceo","sales"],         size:1 },
  { id:"dso",            label:"DSO",                  roles:["cfo"],                 size:1 },
  { id:"rule40",         label:"Rule of 40",           roles:["ceo","cfo","gp"],       size:1 },
  { id:"rev_chart",      label:"Revenue Trend Chart",  roles:["ceo","cfo","sales","gp"],size:2 },
  { id:"cash_chart",     label:"Cash Projection Chart",roles:["ceo","cfo","gp"],       size:2 },
  { id:"pipeline_chart", label:"Pipeline Chart",       roles:["sales"],               size:2 },
  { id:"att_chart",      label:"Attrition Trend Chart",roles:["hr","gp"],              size:2 },
  { id:"my_actions",     label:"My Actions",           roles:["ceo","cfo","sales","hr","coo"],size:2 },
  { id:"data_submit",    label:"Data Submission",      roles:["cfo","hr","coo"],       size:2 },
  { id:"gp_view_card",   label:"What the GP Sees",     roles:["ceo","gp"],             size:2 },
  { id:"commentary",     label:"Add Commentary",       roles:["ceo","cfo","sales","hr","coo"],size:2 },
  { id:"benchmarks",     label:"Benchmark Position",   roles:["ceo","cfo","sales","gp"],size:3 },
  { id:"alerts_panel",   label:"My Alerts",            roles:["ceo","cfo","sales","hr","coo","gp"],size:2 },
];

// ── MOCK DATA ─────────────────────────────────────────────────────────────────
// The portal was pinned to Meridian: one company, hardcoded, with a cash chart
// opening at 1100 and a runway of 4.8 typed in beside it. It now takes whichever
// company is selected and reads every figure from the same model as the rest of
// the platform.
const PortalCtx = createContext(null);
const useCompany = () => useContext(PortalCtx).company;
const useData = () => useContext(PortalCtx).data;

function portalDataFor(id) {
  const co = companyById(id);
  const fin = buildFinance({ id, status: co.rag.toLowerCase() });
  const mod = modulesFor(id);
  const arr = fin.revenue.total * 12;
  const growthPct = ((fin.revenue.total / fin.history.revenue[0].actual) ** (12 / (fin.history.months.length - 1)) - 1) * 100;
  return {
    company: {
      id, name: co.name, score: co.score, status: co.rag.toLowerCase(),
      runway: fin.runway,
      rvb: Math.round((fin.revenue.total / fin.revenue.budget) * 100),
      burn: Math.round(fin.cash.burn),
      ebitda: fin.ebitda.pct,
      pipeline: fin.sales.pipelineCoverage,
      winRate: fin.sales.winRatePct,
      quota: Math.round((fin.revenue.total / fin.revenue.budget) * 100),
      headcount: fin.people.headcount,
      headcountPlan: fin.people.planHeadcount,
      attrition: fin.people.attritionPct,
      openRoles: Math.max(0, fin.people.planHeadcount - fin.people.headcount),
      dso: parseInt(mod.finance.kpis.find((k) => k.label === "DSO").value, 10),
      rule40: Math.round(growthPct + fin.ebitda.pct),
      sla: parseInt(mod.ops.kpis.find((k) => k.label === "SLA Adherence").value, 10),
      backlog: parseInt(mod.ops.kpis.find((k) => k.label === "Ticket Backlog").value, 10),
      nrr: parseInt(mod.sales.kpis.find((k) => k.label === "Net Revenue Retention").value, 10),
      arr, currency: fin.native.currency, asOf: fin.asOf,
      cash: fin.native.cash * 1000, revenue: fin.native.revenue * 1000,
      sector: co.sector, stage: co.stage, fund: "Caledonia Alba",
    },
    data: { rev: mod.finance.rev, cash: mod.finance.cash, pipe: mod.sales.pipe, att: mod.hr.att },
  };
}

const MY_ACTIONS = [
  { id:1, title:"Escalate top-5 overdue debtors (£82k outstanding)",      due:"2026-06-02", pri:"critical", st:"open" },
  { id:2, title:"Prepare bridge financing options for next board meeting", due:"2026-06-05", pri:"high",     st:"open" },
  { id:3, title:"Hiring freeze memo — all non-critical roles",            due:"2026-06-01", pri:"high",     st:"in_progress" },
  { id:4, title:"Win/loss analysis — 3 consecutive months declining",     due:"2026-06-10", pri:"medium",   st:"open" },
];
function alertsFor(c) {
  const out = [];
  if (c.runway < 9) out.push({ id:1, sev: c.runway < 5 ? "high" : "watchlist",
    msg:`Cash runway at ${c.runway} months on burn of ${c.burn}k a month.`, time:"4h ago" });
  if (c.pipeline < 3) out.push({ id:2, sev: c.pipeline < 2 ? "high" : "watchlist",
    msg:`Pipeline coverage ${c.pipeline}× against a 3× target. Win rate ${c.winRate}%.`, time:"4h ago" });
  if (c.attrition > 12) out.push({ id:3, sev: c.attrition > 20 ? "high" : "watchlist",
    msg:`Attrition ${c.attrition}% with ${c.openRoles} roles unfilled against plan.`, time:"2d ago" });
  if (c.rvb < 95) out.push({ id:4, sev: c.rvb < 85 ? "high" : "watchlist",
    msg:`Revenue at ${c.rvb}% of plan.`, time:"4h ago" });
  return out.length ? out : [{ id:0, sev:"watchlist", msg:"No threshold breached this period.", time:"4h ago" }];
}

function dataFieldsFor(c) {
  const n = (v) => Math.round(v).toLocaleString();
  return [
    { label:`Cash Balance (${c.currency})`,     val:`${n(c.cash)}`,       src:"Xero bank feed", status:"green", lastSent:"4h ago" },
    { label:`Monthly Revenue (${c.currency})`,  val:`${n(c.revenue)}`,    src:"Xero",           status:"green", lastSent:"4h ago" },
    { label:`Monthly Burn (${c.currency})`,     val:`${n(c.burn * 1000)}`,src:"Xero",           status:"green", lastSent:"4h ago" },
    { label:"Headcount",                        val:`${c.headcount}`,     src:"BambooHR",       status:"green", lastSent:"12h ago" },
    { label:"Attrition (%)",                    val:`${c.attrition}`,     src:"BambooHR",       status:"green", lastSent:"12h ago" },
    { label:"Pipeline Coverage (×)",            val:`${c.pipeline}`,      src:"HubSpot",        status:"green", lastSent:"47m ago" },
  ];
}


// ── TOOLTIP ───────────────────────────────────────────────────────────────────
const TT = ({active,payload,label}) => {
  if (!active||!payload?.length) return null;
  return (
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,padding:"8px 12px",boxShadow:"0 4px 12px rgba(0,0,0,0.1)"}}>
      <div style={{color:T.txt3,fontSize:9,marginBottom:4}}>{label}</div>
      {payload.map((p,i)=><div key={i} style={{color:p.color||T.txt1,fontSize:11}}>{p.name}: {p.value}</div>)}
    </div>
  );
};

// ── WIDGET COMPONENTS ─────────────────────────────────────────────────────────
function KpiStat({label,value,delta,status,sub}) {
  const col = ragCol(status); const bg = ragBg(status); const brd = ragBrd(status);
  return (
    <div style={{background:T.surface,border:`1px solid ${brd}`,borderRadius:10,padding:"14px 16px",height:"100%",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
      <div style={{color:T.txt3,fontSize:10,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:6}}>{label}</div>
      <div style={{color:col,fontSize:24,fontWeight:800,fontFamily:"monospace",lineHeight:1}}>{value}</div>
      {delta&&<div style={{color:col,fontSize:11,marginTop:4,fontFamily:"monospace"}}>{delta}</div>}
      {sub&&<div style={{color:T.txt3,fontSize:10,marginTop:3}}>{sub}</div>}
    </div>
  );
}

function ActionsList({actions,setActions}) {
  const pc={critical:T.red,high:T.amber,medium:T.blue};
  const advance = id => setActions(p=>p.map(a=>a.id===id?{...a,st:a.st==="open"?"in_progress":a.st==="in_progress"?"done":"open"}:a));
  return (
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
      <div style={{color:T.txt1,fontSize:12,fontWeight:700,marginBottom:12}}>My Actions <span style={{color:T.txt3,fontWeight:400,fontSize:10}}>({actions.filter(a=>a.st!=="done").length} open)</span></div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {actions.map(a=>(
          <div key={a.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 11px",background:a.st==="done"?T.bg:T.surface,border:`1px solid ${a.st==="done"?T.border:ragBrd(a.pri==="critical"?"red":a.pri==="high"?"amber":"green")}`,borderRadius:7,opacity:a.st==="done"?0.5:1}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}>
                <span style={{width:8,height:8,borderRadius:2,background:pc[a.pri]||T.txt3,display:"inline-block",flexShrink:0}}/>
                <span style={{color:T.txt1,fontSize:11,lineHeight:1.3}}>{a.title}</span>
              </div>
              <div style={{color:T.txt3,fontSize:9,marginLeft:14}}>Due {a.due}</div>
            </div>
            <button onClick={()=>advance(a.id)} style={{marginLeft:10,padding:"3px 9px",background:a.st==="done"?T.surface:T.blueDim,border:`1px solid ${T.blueBrd}`,borderRadius:5,color:T.blue,cursor:"pointer",fontSize:9,fontWeight:600,flexShrink:0}}>
              {a.st==="open"?"Start →":a.st==="in_progress"?"Done ✓":"Re-open"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertsPanel({alerts}) {
  const sc={high:T.amber,watchlist:T.blue,critical:T.red};
  const sb={high:T.amberDim,watchlist:T.blueDim,critical:T.redDim};
  return (
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
      <div style={{color:T.txt1,fontSize:12,fontWeight:700,marginBottom:12}}>My Alerts</div>
      {alerts.map(a=>(
        <div key={a.id} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"9px 11px",background:sb[a.sev],border:`1px solid ${sc[a.sev]}44`,borderRadius:7,marginBottom:6}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:sc[a.sev],marginTop:3,flexShrink:0}}/>
          <div style={{flex:1}}>
            <div style={{color:T.txt1,fontSize:11,lineHeight:1.4}}>{a.msg}</div>
            <div style={{color:T.txt3,fontSize:9,marginTop:2}}>{a.time}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DataSubmission({fields}) {
  const [submitted,setSubmitted] = useState(false);
  return (
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{color:T.txt1,fontSize:12,fontWeight:700}}>Data Submission</div>
        <span style={{background:T.greenDim,color:T.green,fontSize:9,padding:"2px 8px",borderRadius:4,fontWeight:700}}>AUTO-SYNCED</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
        {fields.map((f,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:T.bg,borderRadius:6,border:`1px solid ${T.border}`}}>
            <div>
              <div style={{color:T.txt2,fontSize:10}}>{f.label}</div>
              <div style={{color:T.txt3,fontSize:9}}>via {f.src} · {f.lastSent}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{color:T.txt1,fontSize:12,fontWeight:700,fontFamily:"monospace"}}>{f.val}</span>
              <span style={{width:8,height:8,borderRadius:"50%",background:ragCol(f.status),display:"inline-block"}}/>
            </div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>setSubmitted(true)} style={{flex:1,padding:"8px",background:submitted?T.greenDim:T.blue,border:"none",borderRadius:7,color:submitted?T.green:"#fff",cursor:"pointer",fontSize:11,fontWeight:700}}>
          {submitted?"✓ Submitted to Fund":"Submit Monthly Pack to Fund"}
        </button>
        <button style={{padding:"8px 12px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:7,color:T.txt2,cursor:"pointer",fontSize:11}}>
          + Upload
        </button>
      </div>
    </div>
  );
}

function CommentaryBox() {
  const [text,setText] = useState("");
  const [saved,setSaved] = useState(false);
  const [saved_text,setSavedText] = useState("");
  const TEMPLATES = [
    "Revenue miss driven by 2 deals slipping to Q3 — pipeline recovery in progress.",
    "Cash runway pressure from slower AR collections. Debtor review initiated.",
    "Attrition above plan — Engineering team affected. Retention programme launched.",
  ];
  return (
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
      <div style={{color:T.txt1,fontSize:12,fontWeight:700,marginBottom:4}}>Add Commentary</div>
      <div style={{color:T.txt3,fontSize:10,marginBottom:10}}>Explain variances · Provide context · Visible to GP</div>
      <div style={{display:"flex",gap:5,marginBottom:8,flexWrap:"wrap"}}>
        {TEMPLATES.map((t,i)=>(
          <button key={i} onClick={()=>setText(t)} style={{padding:"4px 9px",background:T.blueDim,border:`1px solid ${T.blueBrd}`,borderRadius:5,color:T.blue,fontSize:9,cursor:"pointer"}}>
            Template {i+1}
          </button>
        ))}
      </div>
      <textarea value={text} onChange={e=>{setText(e.target.value);setSaved(false);}} placeholder="Add commentary for the GP team — explain any variances, provide context on KPI movements, or flag upcoming risks..." style={{width:"100%",minHeight:80,padding:"9px 11px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:7,color:T.txt1,fontSize:11,fontFamily:"inherit",resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
        <span style={{color:T.txt3,fontSize:9}}>{text.length} chars · Visible to GP team</span>
        <button onClick={()=>{setSaved(true);setSavedText(text);}} disabled={!text.trim()} style={{padding:"6px 14px",background:text.trim()?T.navy:"#f1f5f9",border:"none",borderRadius:6,color:text.trim()?"#fff":T.txt3,cursor:text.trim()?"pointer":"default",fontSize:10,fontWeight:600}}>
          {saved?"✓ Saved":"Save & Send"}
        </button>
      </div>
      {saved&&saved_text&&<div style={{marginTop:8,padding:"8px 11px",background:T.greenDim,border:`1px solid ${T.greenBrd}`,borderRadius:6,color:T.green,fontSize:10}}>✓ Commentary sent to GP team</div>}
    </div>
  );
}

function GPViewCard({company}) {
  return (
    <div style={{background:T.navy,border:`1px solid #1e293b`,borderRadius:10,padding:16,color:"#e8edf8",boxShadow:"0 1px 3px rgba(0,0,0,0.15)"}}>
      <div style={{fontSize:11,color:"#7a90b8",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span>WHAT THE GP SEES ABOUT YOU</span>
        <span style={{fontSize:9,background:"#1e293b",padding:"2px 8px",borderRadius:4}}>Live · Updated 4h ago</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {[
          {l:"Overall Health",v:`${company.score}/100`,s:company.status},
          {l:"GP Priority",v:"HIGH",s:"amber"},
          {l:"Cash Risk",v:"Critical",s:"red"},
          {l:"Revenue Risk",v:"Elevated",s:"amber"},
          {l:"People Risk",v:"Moderate",s:"amber"},
          {l:"Ops Risk",v:"Low",s:"green"},
        ].map(item=>(
          <div key={item.l} style={{background:"#0f172a",borderRadius:7,padding:"9px 11px"}}>
            <div style={{color:"#4a5a7a",fontSize:9,marginBottom:3}}>{item.l}</div>
            <div style={{color:{green:"#00c97a",amber:"#f5a524",red:"#ff3d5a"}[item.s]||"#e8edf8",fontSize:14,fontWeight:700}}>{item.v}</div>
          </div>
        ))}
      </div>
      <div style={{marginTop:12,padding:"9px 11px",background:"#1e293b",borderRadius:7,color:"#7a90b8",fontSize:10,lineHeight:1.5}}>
        📋 GP Note: "Cash runway requires board resolution. Operating partner review scheduled w/c 2 June. Debtor recovery plan needed before next IC update."
      </div>
    </div>
  );
}

function BenchmarkBar({label,company,median,top,unit,lowerBetter}) {
  const range = top-median+(median-Math.min(company,median))||1;
  const pos = lowerBetter
    ? (company<=median?80:company<=top*1.2?50:20)
    : (company>=top?90:company>=median?60:30);
  const col = pos>=75?T.green:pos>=50?T.amber:T.red;
  return (
    <div style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
        <span style={{color:T.txt2,fontSize:11}}>{label}</span>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{color:col,fontSize:12,fontWeight:700,fontFamily:"monospace"}}>{company}{unit}</span>
          <span style={{background:ragBg(pos>=75?"green":pos>=50?"amber":"red"),color:col,fontSize:9,padding:"1px 6px",borderRadius:3}}>
            {pos>=75?"Top Quartile":pos>=50?"Above Median":"Below Median"}
          </span>
        </div>
      </div>
      <div style={{position:"relative",height:6,background:T.border,borderRadius:3}}>
        <div style={{position:"absolute",left:"33%",right:"10%",top:0,bottom:0,background:T.greenDim,borderRadius:3}}/>
        <div style={{position:"absolute",left:"33%",width:1,top:-2,height:10,background:T.txt3}}/>
        <div style={{position:"absolute",left:`${pos}%`,top:-3,width:12,height:12,borderRadius:"50%",background:col,transform:"translateX(-50%)",border:"2px solid #fff",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
        <span style={{color:T.txt3,fontSize:8}}>Bottom quartile</span>
        <span style={{color:T.txt3,fontSize:8}}>Sector median: {median}{unit}</span>
        <span style={{color:T.green,fontSize:8}}>Top quartile: {top}{unit}</span>
      </div>
    </div>
  );
}

function BenchmarksWidget() {
  return (
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
      <div style={{color:T.txt1,fontSize:12,fontWeight:700,marginBottom:4}}>Benchmark Position</div>
      <div style={{color:T.txt3,fontSize:10,marginBottom:14}}>vs B2B SaaS Series A peers (anonymised) · Source: Alpha Vantage + Portfolio data</div>
      <BenchmarkBar label="Gross Margin"       company={71}  median={72} top={80} unit="%" />
      <BenchmarkBar label="NRR"                company={94}  median={105} top={120} unit="%" />
      <BenchmarkBar label="CAC Payback"        company={18}  median={14} top={10} unit=" mo" lowerBetter />
      <BenchmarkBar label="Rule of 40"         company={29}  median={35} top={50} unit="" />
      <BenchmarkBar label="Revenue per Employee" company={107} median={120} top={160} unit="£k" />
      <BenchmarkBar label="Attrition"          company={14}  median={12} top={8} unit="%" lowerBetter />
    </div>
  );
}

function RevenueChart() {
  const DATA = useData();
  return (
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
      <div style={{color:T.txt1,fontSize:12,fontWeight:700,marginBottom:10}}>Revenue — Actual vs Budget (£k)</div>
      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={DATA.rev}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
          <XAxis dataKey="m" tick={{fill:T.txt3,fontSize:9}}/>
          <YAxis tick={{fill:T.txt3,fontSize:9}}/>
          <Tooltip content={<TT/>}/>
          <Bar dataKey="budget" name="Budget" fill="#e2e8f0" radius={[2,2,0,0]}/>
          <Line dataKey="actual" name="Actual" stroke={T.amber} strokeWidth={2.5} dot={false}/>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function CashChart() {
  const DATA = useData();
  return (
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
      <div style={{color:T.txt1,fontSize:12,fontWeight:700,marginBottom:10}}>Cash Projection (£k)</div>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={DATA.cash}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
          <XAxis dataKey="m" tick={{fill:T.txt3,fontSize:9}}/>
          <YAxis tick={{fill:T.txt3,fontSize:9}}/>
          <Tooltip content={<TT/>}/>
          <ReferenceLine y={200} stroke={T.red} strokeDasharray="4 4" label={{value:"6mo warn",fill:T.red,fontSize:8}}/>
          <Area dataKey="v" name="Cash" stroke={T.red} fill="#fee2e2" strokeWidth={2}/>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function PipelineChart() {
  const DATA = useData();
  return (
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
      <div style={{color:T.txt1,fontSize:12,fontWeight:700,marginBottom:10}}>Pipeline vs Target (£k)</div>
      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={DATA.pipe}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
          <XAxis dataKey="m" tick={{fill:T.txt3,fontSize:9}}/>
          <YAxis tick={{fill:T.txt3,fontSize:9}}/>
          <Tooltip content={<TT/>}/>
          <Bar dataKey="pipe" name="Pipeline" fill={T.blueDim} stroke={T.blueBrd} radius={[2,2,0,0]}/>
          <Line dataKey="target" name="Target" stroke={T.green} strokeWidth={2} dot={false} strokeDasharray="5 5"/>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function AttritionChart() {
  const DATA = useData();
  return (
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
      <div style={{color:T.txt1,fontSize:12,fontWeight:700,marginBottom:10}}>Attrition vs Benchmark (%)</div>
      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={DATA.att}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
          <XAxis dataKey="m" tick={{fill:T.txt3,fontSize:9}}/>
          <YAxis tick={{fill:T.txt3,fontSize:9}} domain={[0,20]}/>
          <Tooltip content={<TT/>}/>
          <Area dataKey="att" name="Attrition %" stroke={T.amber} fill={T.amberDim} strokeWidth={2}/>
          <Line dataKey="bench" name="Benchmark" stroke={T.green} strokeWidth={1.5} dot={false} strokeDasharray="5 5"/>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── WIDGET RENDERER ───────────────────────────────────────────────────────────
function renderWidget(id, actions, setActions, COMPANY, DATA) {
  const co = COMPANY;
  const sc = v => v>=75?"green":v>=50?"amber":"red";
  const widgets = {
    health_score:   <KpiStat label="Health Score"        value={`${co.score}/100`} status={co.status}    delta={`${co.status.toUpperCase()} · Trend: ↓`}  sub="Weighted across all departments"/>,
    cash_runway:    <KpiStat label="Cash Runway"         value={`${co.runway} mo`} status="red"          delta="-1.2 mo vs last month"                     sub="Source: Xero + TrueLayer"/>,
    revenue_budget: <KpiStat label="Revenue vs Budget"   value={`${co.rvb}%`}      status="amber"        delta="-4% vs last month"                         sub="Source: Xero"/>,
    burn_rate:      <KpiStat label="Monthly Burn"        value={`£${co.burn}k`}     status="amber"        delta="+£12k MoM"                                  sub="Source: Xero"/>,
    ebitda:         <KpiStat label="EBITDA Margin"       value={`${co.ebitda}%`}    status="red"          delta="-2%"                                         sub="Source: Xero"/>,
    pipeline:       <KpiStat label="Pipeline Coverage"   value={`${co.pipeline}×`}  status="red"          delta="-0.4× MoM"                                  sub="Target: 3× · Source: Salesforce"/>,
    win_rate:       <KpiStat label="Win Rate"            value={`${co.winRate}%`}   status="amber"        delta="-4%"                                         sub="Source: Salesforce"/>,
    quota:          <KpiStat label="Quota Attainment"    value={`${co.quota}%`}     status="amber"        delta="-5%"                                         sub="Source: Salesforce"/>,
    headcount:      <KpiStat label="Headcount vs Plan"   value={`${co.headcount}`}  status="amber"        delta={`vs plan ${co.headcountPlan}`}              sub="Source: BambooHR"/>,
    attrition:      <KpiStat label="Attrition Rate"      value={`${co.attrition}%`} status="amber"        delta="+3% MoM"                                    sub="Source: BambooHR"/>,
    open_roles:     <KpiStat label="Open Roles"          value={`${co.openRoles}`}  status="red"          delta="3 critical"                                  sub="Source: Greenhouse"/>,
    sla:            <KpiStat label="SLA Adherence"       value={`${co.sla}%`}       status="amber"        delta="-3%"                                         sub="Source: Zendesk"/>,
    backlog:        <KpiStat label="Ops Backlog"         value={co.backlog}          status="amber"        delta="+22 MoM"                                    sub="Source: Jira"/>,
    nrr:            <KpiStat label="NRR"                 value={`${co.nrr}%`}       status="amber"        delta="-3%"                                         sub="Source: Stripe"/>,
    dso:            <KpiStat label="DSO"                 value={`${co.dso} days`}   status="red"          delta="+15 days"                                   sub="Source: Xero"/>,
    rule40:         <KpiStat label="Rule of 40"          value={co.rule40}           status="amber"        delta="-4"                                          sub="Rev growth + EBITDA margin"/>,
    rev_chart:      <RevenueChart/>,
    cash_chart:     <CashChart/>,
    pipeline_chart: <PipelineChart/>,
    att_chart:      <AttritionChart/>,
    my_actions:     <ActionsList actions={actions} setActions={setActions}/>,
    data_submit:    <DataSubmission fields={dataFieldsFor(COMPANY)}/>,
    gp_view_card:   <GPViewCard company={COMPANY}/>,
    commentary:     <CommentaryBox/>,
    benchmarks:     <BenchmarksWidget/>,
    alerts_panel:   <AlertsPanel alerts={alertsFor(COMPANY)}/>,
  };
  return widgets[id] || <div style={{padding:16,color:T.txt3,fontSize:11}}>Widget not found</div>;
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({role}) {
  const COMPANY = useCompany();
  const DATA = useData();
  const [editMode, setEditMode] = useState(false);
  const [actions, setActions] = useState(MY_ACTIONS);
  const defaultOn = WIDGET_REGISTRY.filter(w=>w.roles.includes(role)).map(w=>w.id);
  const [enabled, setEnabled] = useState(defaultOn);
  const toggle = id => setEnabled(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const visible = WIDGET_REGISTRY.filter(w=>enabled.includes(w.id)&&w.roles.includes(role));
  const small  = visible.filter(w=>w.size===1);
  const medium = visible.filter(w=>w.size===2);
  const large  = visible.filter(w=>w.size===3);
  const roleObj = ROLES.find(r=>r.id===role);

  return (
    <div style={{height:"100%",overflowY:"auto",padding:"20px 24px"}}>
      {/* Dashboard header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
        <div>
          <div style={{color:T.txt3,fontSize:10,marginBottom:2}}>{COMPANY.fund} · Portfolio Company Portal</div>
          <h1 style={{color:T.txt1,fontSize:20,fontWeight:800,margin:0}}>{COMPANY.name}</h1>
          <div style={{color:T.txt3,fontSize:11,marginTop:3}}>
            {roleObj?.icon} {roleObj?.label} View · {roleObj?.desc}
          </div>
        </div>
        <button onClick={()=>setEditMode(p=>!p)} style={{padding:"8px 16px",background:editMode?T.navy:T.surface,color:editMode?"#fff":T.txt2,border:`1px solid ${editMode?T.navy:T.border}`,borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:600}}>
          {editMode?"✓ Save Layout":"⊞ Customise Dashboard"}
        </button>
      </div>

      {/* Widget picker (edit mode) */}
      {editMode && (
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:16,marginBottom:20,boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>
          <div style={{color:T.txt1,fontSize:12,fontWeight:700,marginBottom:10}}>Choose your widgets</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
            {WIDGET_REGISTRY.map(w=>{
              const on = enabled.includes(w.id);
              const relevant = w.roles.includes(role);
              return(
                <button key={w.id} onClick={()=>toggle(w.id)} style={{padding:"5px 12px",background:on?T.navy:relevant?T.blueDim:T.surface,color:on?"#fff":relevant?T.blue:T.txt3,border:`1px solid ${on?T.navy:relevant?T.blueBrd:T.border}`,borderRadius:6,cursor:"pointer",fontSize:10,fontWeight:on?600:400,opacity:relevant?1:0.5}}>
                  {on?"✓ ":""}{w.label}
                </button>
              );
            })}
          </div>
          <div style={{color:T.txt3,fontSize:9,marginTop:8}}>Highlighted = recommended for your role · All widgets available to any role</div>
        </div>
      )}

      {/* KPI tiles row */}
      {small.length>0 && (
        <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(small.length,4)},1fr)`,gap:10,marginBottom:14}}>
          {small.map(w=>(
            <div key={w.id} style={{position:"relative"}}>
              {editMode&&<button onClick={()=>toggle(w.id)} style={{position:"absolute",top:-6,right:-6,width:18,height:18,borderRadius:"50%",background:T.red,color:"#fff",border:"none",cursor:"pointer",fontSize:10,zIndex:10,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>}
              {renderWidget(w.id, actions, setActions, COMPANY, DATA)}
            </div>
          ))}
        </div>
      )}

      {/* Medium widgets (2-col grid) */}
      {medium.length>0 && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
          {medium.map(w=>(
            <div key={w.id} style={{position:"relative"}}>
              {editMode&&<button onClick={()=>toggle(w.id)} style={{position:"absolute",top:-6,right:-6,width:18,height:18,borderRadius:"50%",background:T.red,color:"#fff",border:"none",cursor:"pointer",fontSize:10,zIndex:10,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>}
              {renderWidget(w.id, actions, setActions, COMPANY, DATA)}
            </div>
          ))}
        </div>
      )}

      {/* Large widgets (full width) */}
      {large.map(w=>(
        <div key={w.id} style={{position:"relative",marginBottom:14}}>
          {editMode&&<button onClick={()=>toggle(w.id)} style={{position:"absolute",top:-6,right:-6,width:18,height:18,borderRadius:"50%",background:T.red,color:"#fff",border:"none",cursor:"pointer",fontSize:10,zIndex:10,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>}
          {renderWidget(w.id, actions, setActions, COMPANY, DATA)}
        </div>
      ))}
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function ClientPortal() {
  const [role, setRole] = useState("ceo");
  const [companyId, setCompanyId] = useState(COMPANIES[0].id);
  const { company: COMPANY, data: DATA } = useMemo(() => portalDataFor(companyId), [companyId]);
  const active = ROLES.find(r=>r.id===role);
  const ctx = useMemo(() => ({ company: COMPANY, data: DATA }), [COMPANY, DATA]);

  return (
    <PortalCtx.Provider value={ctx}>
    <div style={{display:"flex",height:"100%",background:T.bg,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",overflow:"hidden"}}>
      {/* Role sidebar */}
      <div style={{width:180,background:"#fff",borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",padding:"16px 0",flexShrink:0,boxShadow:"1px 0 4px rgba(0,0,0,0.04)"}}>
        <div style={{padding:"0 14px 14px",borderBottom:`1px solid ${T.border}`,marginBottom:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:T.navy,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,fontWeight:800,marginBottom:8}}>A</div>
          <select value={companyId} onChange={(e)=>setCompanyId(e.target.value)}
                  style={{width:"100%",background:"#fff",color:T.txt1,border:`1px solid ${T.border}`,borderRadius:5,padding:"5px 6px",fontSize:11,fontWeight:700,fontFamily:"inherit",cursor:"pointer"}}>
            {COMPANIES.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div style={{color:T.txt3,fontSize:9,marginTop:4}}>{COMPANY.fund} · reports {COMPANY.currency} · as of {COMPANY.asOf}</div>
        </div>
        <div style={{padding:"0 8px"}}>
          <div style={{color:T.txt3,fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase",padding:"4px 6px",marginBottom:4}}>Log in as</div>
          {ROLES.map(r=>(
            <button key={r.id} onClick={()=>setRole(r.id)} style={{width:"100%",padding:"9px 10px",background:role===r.id?T.navy:"transparent",border:"none",borderRadius:7,cursor:"pointer",textAlign:"left",marginBottom:2,display:"flex",alignItems:"center",gap:8,transition:"background 0.15s"}}>
              <span style={{fontSize:13}}>{r.icon}</span>
              <div>
                <div style={{color:role===r.id?"#fff":T.txt1,fontSize:11,fontWeight:role===r.id?700:400}}>{r.label}</div>
              </div>
            </button>
          ))}
        </div>
        <div style={{marginTop:"auto",padding:"12px 14px",borderTop:`1px solid ${T.border}`}}>
          <div style={{color:T.txt3,fontSize:9,lineHeight:1.4}}>
            Switch roles to see each user's personalised view
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{flex:1,overflow:"hidden",background:T.bg}}>
        {/* Top bar */}
        <div style={{background:"#fff",borderBottom:`1px solid ${T.border}`,padding:"10px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:28,height:28,borderRadius:6,background:active?.color||T.navy,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#fff"}}>{active?.icon}</div>
            <div>
              <span style={{color:T.txt1,fontSize:13,fontWeight:700}}>{active?.label}</span>
              <span style={{color:T.txt3,fontSize:10,marginLeft:8}}>{active?.desc}</span>
            </div>
          </div>
          <div style={{display:"flex",gap:6}}>
            <div style={{padding:"4px 10px",background:T.greenDim,border:`1px solid ${T.greenBrd}`,borderRadius:6,color:T.green,fontSize:9,fontWeight:700}}>
              ● {COMPANY.fund} connected
            </div>
            <div style={{padding:"4px 10px",background:T.amberDim,border:`1px solid ${T.amberBrd}`,borderRadius:6,color:T.amber,fontSize:9,fontWeight:700}}>
              ⚠ {COMPANY.status.toUpperCase()}
            </div>
          </div>
        </div>
        <Dashboard key={role} role={role}/>
      </div>
    </div>
    </PortalCtx.Provider>
  );
}

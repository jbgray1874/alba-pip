import { useState, useEffect } from "react";
import { C } from "../lib/theme.js";
import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import { buildFinance, fmtGBP, MONTHS } from "../lib/financeData.js";

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
  txt1: C.txt1,
  txt2: C.txt2,
  txt3: C.txt3
};
const ragCol = (s) => ({ green:T.green, amber:T.amber, red:T.red, critical:T.red, overdue:T.amber, watch:T.blue }[s] || T.txt3);
const ragBg  = (s) => ({ green:T.greenDim, amber:T.amberDim, red:T.redDim, critical:T.redDim, overdue:T.amberDim, watch:T.blueDim }[s] || "transparent");

const TT = ({ active, payload, label, src }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:T.card, border:`1px solid ${T.borderLt}`, borderRadius:8, padding:"9px 12px", boxShadow:"0 8px 28px rgba(0,0,0,0.45)" }}>
      <div style={{ color:T.txt3, fontSize:9, marginBottom:6 }}>{label}</div>
      {payload.map((p,i)=>(
        <div key={i} style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3 }}>
          <span style={{ width:7, height:7, borderRadius:2, background:p.color||p.fill||T.blue }}/>
          <span style={{ color:T.txt2, fontSize:11, flex:1 }}>{p.name}</span>
          <span style={{ color:T.txt1, fontSize:11, fontWeight:700, fontFamily:"monospace" }}>£{(p.value/1000).toFixed(0)}k</span>
        </div>
      ))}
      <div style={{ marginTop:6, paddingTop:6, borderTop:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:5 }}>
        <span style={{ width:5, height:5, borderRadius:"50%", background:T.green }}/>
        <span style={{ color:T.txt3, fontSize:8 }}>{src || "Xero · synced 4h ago"}</span>
      </div>
    </div>
  );
};

// ── Reusable level chrome ──────────────────────────────────────────────────
const Card = ({ children, pad = 16, style }) => (
  <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:10, padding:pad, ...style }}>{children}</div>
);

const DrillRow = ({ label, value, sub, status, onClick, color }) => (
  <div onClick={onClick} style={{
    display:"flex", justifyContent:"space-between", alignItems:"center",
    padding:"13px 15px", background:T.surface, border:`1px solid ${T.border}`,
    borderLeft:`3px solid ${color || ragCol(status) || T.border}`, borderRadius:8,
    cursor:onClick?"pointer":"default", transition:"background 0.15s",
  }}
    onMouseEnter={(e)=>onClick&&(e.currentTarget.style.background=T.cardHov)}
    onMouseLeave={(e)=>onClick&&(e.currentTarget.style.background=T.surface)}>
    <div>
      <div style={{ color:T.txt1, fontSize:12.5, fontWeight:600 }}>{label}</div>
      {sub && <div style={{ color:T.txt3, fontSize:10, marginTop:2 }}>{sub}</div>}
    </div>
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <span style={{ color: color || ragCol(status) || T.txt1, fontSize:14, fontWeight:700, fontFamily:"monospace" }}>{value}</span>
      {onClick && <span style={{ color:T.txt3, fontSize:13 }}>›</span>}
    </div>
  </div>
);

export default function FinanceDrilldown({ company, metric, onClose }) {
  const fin = buildFinance(company);
  // path: array of { level, key, label } describing the drill location
  const [path, setPath] = useState([{ level: 0, label: metricLabel(metric) }]);
  const push = (step) => setPath((p) => [...p, step]);
  const goTo = (idx) => setPath((p) => p.slice(0, idx + 1));

  // ── Live Xero overlay (Meridian = the connected company) ──
  const [xero, setXero] = useState(null);
  useEffect(() => {
    if (company.id !== "meridian") return;
    fetch("/api/xero/data")
      .then((r) => r.json())
      .then((d) => { if (d && d.connected && !d.error) setXero(d); })
      .catch(() => {});
  }, [company.id]);

  // If Xero is live, overlay its real receivables onto the cash drill
  if (xero?.data?.overdueInvoices?.length) {
    fin.cash.debtors = xero.data.overdueInvoices.map((d) => ({
      ...d,
      invoice: d.invoice, party: d.party, amount: d.amount, daysOverdue: d.daysOverdue,
      status: d.daysOverdue > 45 ? "critical" : d.daysOverdue > 35 ? "overdue" : "watch",
    }));
    fin.cash.overdueTotal = Math.round(xero.data.overdueTotal / 1000);
  }
  const liveTag = xero?.source || "Xero · synced 4h ago";

  const depth = path.length - 1;

  function metricLabel(m) {
    return { cash:"Cash Runway", revenue:"Revenue vs Budget", ebitda:"EBITDA Margin" }[m] || m;
  }

  // ════════════════════ CASH DRILL ════════════════════
  const cashLevels = () => {
    if (depth === 0) {
      // L1 — components
      return (
        <>
          <SectionTitle>Runway components</SectionTitle>
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
            <DrillRow label="Opening Cash Balance" value={fmtGBP(fin.cash.balance*1000)} sub="Bank position · TrueLayer · 4h ago" color={T.green} />
            <DrillRow label="Monthly Burn" value={fmtGBP(fin.cash.burn*1000)} sub="+£12k MoM · click to break down" status="amber" onClick={()=>push({ level:1, key:"burn", label:"Burn breakdown" })} />
            <DrillRow label="Runway" value={`${fin.cash.runway} months`} sub={`${fmtGBP(fin.cash.balance*1000)} ÷ ${fmtGBP(fin.cash.burn*1000)}/mo`} status="red" />
          </div>
          <Card>
            <ChartHead title="CASH PROJECTION (£)" src="TrueLayer + Xero · 4h ago" />
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={fin.cash.cashProj}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                <XAxis dataKey="m" tick={{ fill:T.txt3, fontSize:9 }} />
                <YAxis tick={{ fill:T.txt3, fontSize:9 }} tickFormatter={(v)=>`£${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<TT src="Projection" />} />
                <ReferenceLine y={fin.cash.burn*1000*3} stroke={T.red} strokeDasharray="4 4" label={{ value:"3mo floor", fill:T.red, fontSize:8 }} />
                <Area dataKey="v" name="Cash" stroke={T.red} fill={T.redDim} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </>
      );
    }
    if (depth === 1) {
      // L2 — burn by category
      return (
        <>
          <SectionTitle>Monthly burn by category — {fmtGBP(fin.cash.burn*1000)}/mo</SectionTitle>
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
            {fin.cash.burnCats.map((c) => (
              <DrillRow key={c.key} label={c.label} value={fmtGBP(c.value*1000)} color={c.color}
                sub={`${Math.round(c.prop*100)}% of burn · click for transactions`}
                onClick={()=>push({ level:2, key:c.key, label:c.label })} />
            ))}
          </div>
          <Card>
            <ChartHead title="BURN BY CATEGORY OVER TIME (£k)" src="Xero · 4h ago" />
            <ResponsiveContainer width="100%" height={170}>
              <LineChart data={MONTHS.map((m,i)=>({ m, ...Object.fromEntries(fin.cash.burnCats.map(c=>[c.label,c.series[i]])) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                <XAxis dataKey="m" tick={{ fill:T.txt3, fontSize:9 }} />
                <YAxis tick={{ fill:T.txt3, fontSize:9 }} />
                <Tooltip content={<TT src="Xero · 4h ago" />} />
                {fin.cash.burnCats.map((c)=><Line key={c.key} dataKey={c.label} stroke={c.color} strokeWidth={2} dot={false} />)}
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </>
      );
    }
    // L3 — transactions (overdue debtors + AR aging)
    return (
      <>
        <SectionTitle>Outstanding receivables — {fmtGBP(fin.cash.overdueTotal*1000)} overdue</SectionTitle>
        <Card style={{ marginBottom:14 }} pad={14}>
          <ChartHead title="AR AGING (£)" src="Xero · 4h ago" />
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={fin.cash.arAging}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="bucket" tick={{ fill:T.txt3, fontSize:8 }} />
              <YAxis tick={{ fill:T.txt3, fontSize:9 }} tickFormatter={(v)=>`£${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<TT src="Xero · 4h ago" />} />
              <Bar dataKey="val" name="AR" radius={[3,3,0,0]}>
                {fin.cash.arAging.map((e,i)=><Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <div style={{ color:T.txt3, fontSize:10, marginBottom:8, letterSpacing:"0.05em" }}>OVERDUE INVOICES — these five are the cash bottleneck</div>
        <TxnTable rows={fin.cash.debtors.map((d)=>({
          cells:[d.invoice, d.party, `${d.daysOverdue}d overdue`, fmtGBP(d.amount)],
          status:d.status,
        }))} headers={["Invoice","Customer","Status","Amount"]} />
      </>
    );
  };

  // ════════════════════ REVENUE DRILL ════════════════════
  const revLevels = () => {
    if (depth === 0) {
      return (
        <>
          <SectionTitle>Revenue {fmtGBP(fin.revenue.total*1000)}/mo vs budget {fmtGBP(fin.revenue.budget*1000)} ({Math.round(fin.revenue.total/fin.revenue.budget*100)}%)</SectionTitle>
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
            {fin.revenue.byProduct.map((p)=>(
              <DrillRow key={p.key} label={p.label} value={fmtGBP(p.value*1000)}
                sub={`${Math.round(p.prop*100)}% of revenue · click to drill by region`} color={T.blue}
                onClick={()=>push({ level:1, key:p.key, label:p.label })} />
            ))}
          </div>
          <Card>
            <ChartHead title="REVENUE BY PRODUCT OVER TIME (£k)" src="Xero + Stripe · 4h ago" />
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={MONTHS.map((m,i)=>({ m, ...Object.fromEntries(fin.revenue.byProduct.map(p=>[p.label,p.series[i]])) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                <XAxis dataKey="m" tick={{ fill:T.txt3, fontSize:9 }} />
                <YAxis tick={{ fill:T.txt3, fontSize:9 }} />
                <Tooltip content={<TT src="Xero · 4h ago" />} />
                {fin.revenue.byProduct.map((p,i)=><Line key={p.key} dataKey={p.label} stroke={[T.blue,T.purple,T.green][i]} strokeWidth={2} dot={false} />)}
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </>
      );
    }
    if (depth === 1) {
      const prodLabel = path[depth].label;
      return (
        <>
          <SectionTitle>{prodLabel} — by region</SectionTitle>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {fin.revenue.byRegion.map((r)=>(
              <DrillRow key={r.key} label={r.label} value={fmtGBP(r.value*1000)}
                sub={`${Math.round(r.prop*100)}% · click for customer deals`} color={T.blue}
                onClick={()=>push({ level:2, key:r.key, label:r.label })} />
            ))}
          </div>
        </>
      );
    }
    return (
      <>
        <SectionTitle>{path[depth-1]?.label} · {path[depth]?.label} — customer deals</SectionTitle>
        <TxnTable rows={fin.revenue.deals.map((d)=>({
          cells:[d.invoice, d.party, d.date, fmtGBP(d.amount)],
          status:"green",
        }))} headers={["Invoice","Customer","Date","Amount"]} />
      </>
    );
  };

  // ════════════════════ EBITDA DRILL ════════════════════
  const ebitdaLevels = () => {
    if (depth === 0) {
      return (
        <>
          <SectionTitle>EBITDA margin {fin.ebitda.pct}% — bridge from revenue</SectionTitle>
          <Card style={{ marginBottom:14 }}>
            <ChartHead title="EBITDA BRIDGE (£k)" src="Xero · 4h ago" />
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={fin.ebitda.bridge.map(b=>({ label:b.label, value:Math.round(b.value), kind:b.kind }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                <XAxis dataKey="label" tick={{ fill:T.txt3, fontSize:8 }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fill:T.txt3, fontSize:9 }} />
                <Tooltip content={<TT src="Xero · 4h ago" />} />
                <Bar dataKey="value" radius={[3,3,0,0]}>
                  {fin.ebitda.bridge.map((b,i)=><Cell key={i} fill={b.kind==="neg"?T.red:b.kind==="end"?(fin.ebitda.pct<0?T.red:T.green):b.kind==="subtotal"?T.blue:T.green} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <SectionTitle>Operating cost lines</SectionTitle>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {fin.ebitda.opexLines.map((o,i)=>(
              <DrillRow key={i} label={o.label} value={fmtGBP(o.value*1000)} color={T.amber}
                sub="click to break down" onClick={()=>push({ level:1, key:o.label, label:o.label })} />
            ))}
          </div>
        </>
      );
    }
    if (depth === 1) {
      const line = fin.ebitda.opexLines.find(o=>o.label===path[depth].label) || fin.ebitda.opexLines[0];
      return (
        <>
          <SectionTitle>{line.label} — {fmtGBP(line.value*1000)}/mo trend</SectionTitle>
          <Card style={{ marginBottom:14 }}>
            <ChartHead title="COST TREND (£k)" src="Xero · 4h ago" />
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={MONTHS.map((m,i)=>({ m, v:line.series[i] }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                <XAxis dataKey="m" tick={{ fill:T.txt3, fontSize:9 }} />
                <YAxis tick={{ fill:T.txt3, fontSize:9 }} />
                <Tooltip content={<TT src="Xero · 4h ago" />} />
                <Area dataKey="v" name={line.label} stroke={T.amber} fill={T.amberDim} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          <DrillRow label="View cost transactions" value="›" onClick={()=>push({ level:2, key:"txn", label:"Transactions" })} />
        </>
      );
    }
    return (
      <>
        <SectionTitle>{path[depth-1]?.label} — cost transactions</SectionTitle>
        <TxnTable rows={[
          { cells:["BILL-3201","Salaries & PAYE","2 May 2026", fmtGBP(Math.round(fin.ebitda.opexLines[0].value*620))], status:"green" },
          { cells:["BILL-3208","Cloud infrastructure (AWS)","4 May 2026", fmtGBP(Math.round(fin.ebitda.opexLines[1].value*210))], status:"green" },
          { cells:["BILL-3215","Recruitment fees","8 May 2026", fmtGBP(Math.round(fin.ebitda.opexLines[0].value*180))], status:"watch" },
          { cells:["BILL-3221","Marketing agency retainer","11 May 2026", fmtGBP(Math.round(fin.ebitda.opexLines[0].value*140))], status:"green" },
        ]} headers={["Bill","Description","Date","Amount"]} />
      </>
    );
  };

  const body = metric === "cash" ? cashLevels() : metric === "revenue" ? revLevels() : ebitdaLevels();

  return (
    <div style={{ position:"fixed", inset:0, zIndex:5000, background:"rgba(2,8,23,0.78)", backdropFilter:"blur(6px)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}
      onClick={onClose}>
      <div onClick={(e)=>e.stopPropagation()} style={{
        width:"min(720px,100%)", maxHeight:"88vh", background:T.bg, border:`1px solid ${T.borderLt}`,
        borderRadius:16, overflow:"hidden", display:"flex", flexDirection:"column",
        boxShadow:"0 30px 80px rgba(0,0,0,0.6)", animation:"fadeSlideIn 0.3s ease" }}>

        {/* Header + breadcrumb */}
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ color:T.txt3, fontSize:9, letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:6 }}>
              {company.name} · Finance Drill-Down
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap" }}>
              {path.map((p,i)=>(
                <span key={i} style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <button onClick={()=>goTo(i)} style={{
                    background:"transparent", border:"none", cursor:"pointer", padding:0,
                    color: i===path.length-1 ? T.txt1 : T.blue,
                    fontSize:13, fontWeight: i===path.length-1 ? 700 : 500 }}>
                    {p.label}
                  </button>
                  {i < path.length-1 && <span style={{ color:T.txt3, fontSize:12 }}>›</span>}
                </span>
              ))}
            </div>
          </div>
          <button onClick={onClose} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:7,
            color:T.txt2, cursor:"pointer", width:30, height:30, fontSize:15, flexShrink:0 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding:"18px 20px", overflowY:"auto" }}>
          {body}
        </div>

        {/* Footer */}
        <div style={{ padding:"10px 20px", borderTop:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ display:"flex", alignItems:"center", gap:6, color:T.txt3, fontSize:9 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:T.green, boxShadow:`0 0 6px ${T.green}` }}/>
            {xero?.connected ? `Live · Xero (${xero.tenantName || "connected"}) · synced just now` : "Live · Xero + TrueLayer · last synced 4h ago"}
          </span>
          {depth > 0 && <button onClick={()=>goTo(depth-1)} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:6, color:T.txt2, cursor:"pointer", fontSize:10, padding:"5px 12px" }}>← Back</button>}
        </div>
      </div>
    </div>
  );
}

const SectionTitle = ({ children }) => (
  <div style={{ color:T.txt2, fontSize:12, fontWeight:600, marginBottom:12 }}>{children}</div>
);
const ChartHead = ({ title, src }) => (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
    <span style={{ color:T.txt3, fontSize:9, letterSpacing:"0.08em" }}>{title}</span>
    <span style={{ display:"flex", alignItems:"center", gap:5 }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background:T.green }}/>
      <span style={{ color:T.txt3, fontSize:8 }}>{src}</span>
    </span>
  </div>
);
function TxnTable({ headers, rows }) {
  return (
    <div style={{ border:`1px solid ${T.border}`, borderRadius:8, overflow:"hidden" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr 1.3fr 1fr", background:T.surface, padding:"8px 14px", gap:8, borderBottom:`1px solid ${T.border}` }}>
        {headers.map((h,i)=><div key={i} style={{ color:T.txt3, fontSize:9, letterSpacing:"0.06em", textTransform:"uppercase", textAlign:i===headers.length-1?"right":"left" }}>{h}</div>)}
      </div>
      {rows.map((r,i)=>(
        <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 2fr 1.3fr 1fr", padding:"11px 14px", gap:8,
          background: i%2 ? T.surface : T.card, alignItems:"center" }}>
          {r.cells.map((c,j)=>(
            <div key={j} style={{
              fontSize:11, textAlign: j===r.cells.length-1?"right":"left",
              fontFamily: (j===0||j===r.cells.length-1)?"monospace":"inherit",
              color: j===r.cells.length-1 ? T.txt1 : j===2 ? ragCol(r.status) : T.txt2,
              fontWeight: j===r.cells.length-1 ? 700 : 400 }}>
              {j===2 && r.status ? <span style={{ background:ragBg(r.status), color:ragCol(r.status), padding:"2px 8px", borderRadius:4, fontSize:9, fontWeight:600 }}>{c}</span> : c}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

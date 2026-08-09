import { useState, useEffect } from "react";
import { fetchCompanyNews, FEED_STATUS } from "../lib/dataFeeds.js";

const T = {
  bg:"#020817", surface:"#070d1a", card:"#0b1120",
  border:"#172035", borderLt:"#1e2d4a",
  txt1:"#e8edf8", txt2:"#7a90b8", txt3:"#3d5070",
  green:"#00c97a", greenDim:"#00c97a14",
  amber:"#f5a524", amberDim:"#f5a52414",
  red:"#ff3d5a",   redDim:"#ff3d5a14",
  blue:"#3d8bff",  blueDim:"#3d8bff14",
};

const COMPANIES = [
  { id:"meridian",  name:"Meridian SaaS",  sector:"B2B SaaS",       color:T.amber },
  { id:"payflo",    name:"PayFlo",          sector:"Fintech",        color:T.green },
  { id:"swiftlogix",name:"SwiftLogix",      sector:"Logistics",      color:T.amber },
  { id:"careos",    name:"CareOS",          sector:"HealthTech",     color:T.red },
  { id:"forgetech", name:"ForgeTech",       sector:"Manufacturing",  color:T.green },
];

const sentColor = (s) => ({ positive:T.green, neutral:T.blue, negative:T.red }[s] || T.txt3);
const sentBg    = (s) => ({ positive:T.greenDim, neutral:T.blueDim, negative:T.redDim }[s] || "transparent");
const sentLabel = (s) => ({ positive:"POSITIVE", neutral:"NEUTRAL", negative:"WATCH" }[s] || "—");
const timeAgo = (d) => {
  const h = Math.floor((Date.now() - new Date(d)) / 3600000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export default function NewsFeed() {
  const [selected, setSelected] = useState(COMPANIES.map((c) => c.id)); // all on
  const [newsByCo, setNewsByCo] = useState({});
  const [loading, setLoading] = useState(true);
  const isLive = FEED_STATUS.newsApi === "live";

  const loadNews = async () => {
    setLoading(true);
    const results = {};
    await Promise.all(
      COMPANIES.map(async (c) => {
        const res = await fetchCompanyNews(c.name, 4);
        results[c.id] = res;
      })
    );
    setNewsByCo(results);
    setLoading(false);
  };

  useEffect(() => { loadNews(); }, []);

  const toggle = (id) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  // Aggregate sentiment summary
  const allItems = Object.values(newsByCo).flatMap((r) => r?.items || []);
  const counts = {
    positive: allItems.filter((i) => i.sentiment === "positive").length,
    neutral:  allItems.filter((i) => i.sentiment === "neutral").length,
    negative: allItems.filter((i) => i.sentiment === "negative").length,
  };

  return (
    <div style={{ height:"100%", overflowY:"auto", background:T.bg, padding:"20px 24px",
                  fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18, flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ color:T.txt3, fontSize:9, letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:4 }}>
            News Intelligence Agent
          </div>
          <h1 style={{ color:T.txt1, fontSize:20, fontWeight:800, margin:0 }}>Portfolio News & Sentiment</h1>
          <div style={{ color:T.txt3, fontSize:11, marginTop:3 }}>
            External signal monitoring across all portfolio companies · Sentiment-scored
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <span style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px",
            background: isLive ? T.greenDim : T.amberDim,
            border:`1px solid ${isLive ? T.green : T.amber}40`, borderRadius:6 }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background: isLive ? T.green : T.amber,
              boxShadow: isLive ? `0 0 8px ${T.green}` : "none" }}/>
            <span style={{ color: isLive ? T.green : T.amber, fontSize:9, fontWeight:700 }}>
              {isLive ? "LIVE · NewsAPI" : "SIMULATED · add NewsAPI key to go live"}
            </span>
          </span>
          <button onClick={loadNews} style={{ padding:"5px 12px", background:T.surface,
            border:`1px solid ${T.border}`, borderRadius:6, color:T.txt2, cursor:"pointer", fontSize:10 }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Sentiment summary */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:18 }}>
        {[
          { l:"Positive coverage", v:counts.positive, c:T.green },
          { l:"Neutral coverage",  v:counts.neutral,  c:T.blue },
          { l:"Watch / negative",  v:counts.negative, c:T.red },
        ].map((s) => (
          <div key={s.l} style={{ background:T.card, border:`1px solid ${T.border}`, borderLeft:`3px solid ${s.c}`,
            borderRadius:8, padding:"12px 16px" }}>
            <div style={{ color:T.txt3, fontSize:10, marginBottom:4 }}>{s.l}</div>
            <div style={{ color:s.c, fontSize:24, fontWeight:800, fontFamily:"monospace" }}>{loading ? "—" : s.v}</div>
          </div>
        ))}
      </div>

      {/* Company filter chips */}
      <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
        {COMPANIES.map((c) => {
          const on = selected.includes(c.id);
          return (
            <button key={c.id} onClick={() => toggle(c.id)} style={{ padding:"5px 12px",
              background: on ? c.color + "22" : "transparent",
              border:`1px solid ${on ? c.color : T.border}`, borderRadius:20,
              color: on ? c.color : T.txt3, cursor:"pointer", fontSize:10, fontWeight: on ? 600 : 400 }}>
              {c.name}
            </button>
          );
        })}
      </div>

      {/* News by company */}
      {loading ? (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:14 }}>
          {[1,2,3,4].map((i) => (
            <div key={i} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:10, padding:16, height:200 }}>
              <div style={{ height:14, width:"40%", background:T.border, borderRadius:4, marginBottom:14, opacity:0.5 }}/>
              {[1,2,3].map((j) => (
                <div key={j} style={{ height:10, width:`${70 + Math.random()*25}%`, background:T.border,
                  borderRadius:4, marginBottom:10, opacity:0.3 }}/>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:14 }}>
          {COMPANIES.filter((c) => selected.includes(c.id)).map((c) => {
            const res = newsByCo[c.id];
            const items = res?.items || [];
            return (
              <div key={c.id} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden" }}>
                <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}`,
                  display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ width:8, height:8, borderRadius:2, background:c.color }}/>
                    <span style={{ color:T.txt1, fontSize:13, fontWeight:700 }}>{c.name}</span>
                    <span style={{ color:T.txt3, fontSize:9 }}>{c.sector}</span>
                  </div>
                  <span style={{ color:T.txt3, fontSize:8, fontFamily:"monospace" }}>
                    {res?.source === "live" ? "LIVE" : "SIM"}
                  </span>
                </div>
                <div style={{ padding:"6px 0" }}>
                  {items.map((item, i) => (
                    <a key={i} href={item.url} target="_blank" rel="noreferrer"
                      style={{ display:"block", padding:"10px 16px", borderBottom: i < items.length-1 ? `1px solid ${T.border}` : "none",
                        textDecoration:"none", transition:"background 0.15s" }}
                      onMouseEnter={(e)=>e.currentTarget.style.background=T.surface}
                      onMouseLeave={(e)=>e.currentTarget.style.background="transparent"}>
                      <div style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:4 }}>
                        <span style={{ padding:"1px 6px", borderRadius:3, fontSize:7.5, fontWeight:700, flexShrink:0, marginTop:2,
                          background:sentBg(item.sentiment), color:sentColor(item.sentiment) }}>
                          {sentLabel(item.sentiment)}
                        </span>
                        <span style={{ color:T.txt1, fontSize:11.5, lineHeight:1.4 }}>{item.title}</span>
                      </div>
                      <div style={{ color:T.txt3, fontSize:9, marginLeft:0 }}>
                        {item.source} · {timeAgo(item.publishedAt)}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer note */}
      <div style={{ marginTop:18, padding:"12px 16px", background:T.card, border:`1px solid ${T.border}`,
        borderRadius:8, color:T.txt3, fontSize:10, lineHeight:1.6 }}>
        {isLive
          ? "Live headlines from NewsAPI, sentiment-scored by keyword analysis (AI sentiment scoring in production). Material developments flag automatically to the relevant GP."
          : "Showing realistic simulated headlines. Add a free NewsAPI key (newsapi.org) to Vercel as VITE_NEWSAPI_KEY to go live. Note: NewsAPI's free tier serves live results on localhost; the public site uses the serverless news proxy (built Thursday) or a paid NewsAPI plan."}
      </div>
    </div>
  );
}

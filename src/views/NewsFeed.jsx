import { useState, useEffect } from "react";
import { C, F, S, label as labelStyle } from "../lib/theme.js";
import { Page, PageHeader, Chip, Button, Metric, Panel, ProvenanceBar } from "../components/Shell.jsx";
import { fetchCompanyNews, FEED_STATUS } from "../lib/dataFeeds.js";
import { forNews } from "../lib/companies.js";

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
  txt1: C.txt1,
  txt2: C.txt2,
  txt3: C.txt3
};

const COMPANIES = forNews(T);

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
    <Page>
      <PageHeader
        crumbs={["Intelligence", "News and Sentiment"]}
        title="Portfolio News and Sentiment"
        chips={<Chip tone={isLive ? "green" : "gold"}>{isLive ? "Live · NewsAPI" : "Simulated"}</Chip>}
        purpose="External signal monitoring across every portfolio company, scored for sentiment and materiality"
        meta={isLive ? "Live from NewsAPI" : "Simulated feed — add a NewsAPI key to go live"}
        actions={<Button variant="outline" onClick={loadNews}>Refresh</Button>}
      />

      <div style={{ display:"flex", gap:9, flexWrap:"wrap", marginBottom:14 }}>
        <Metric label="Positive coverage" value={loading ? "—" : counts.positive} tone={C.green} sub="Constructive external signal" />
        <Metric label="Neutral coverage"  value={loading ? "—" : counts.neutral}  tone={C.blue}  sub="Reported, no directional read" />
        <Metric label="Watch / negative"  value={loading ? "—" : counts.negative} tone={C.red}   sub="Worth a look before the next board" />
      </div>

      {/* Company filter chips */}
      <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
        {COMPANIES.map((c) => {
          const on = selected.includes(c.id);
          return (
            <button key={c.id} onClick={() => toggle(c.id)} style={{ padding:"5px 12px",
              background: on ? C.goldSoft : "transparent",
              border:`1px solid ${on ? C.goldLine : C.borderLt}`, borderRadius:4,
              color: on ? C.gold : C.txt2, cursor:"pointer", fontFamily:F.sans, fontSize:S.label,
              fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase" }}>
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

      <ProvenanceBar items={[
        isLive ? "Live headlines from NewsAPI" : "Simulated headlines — the shape and cadence of a live feed",
        "Sentiment scored by keyword analysis",
        "Material developments flag to the relevant partner",
        `${COMPANIES.length} companies monitored`,
      ]} />
    </Page>
  );
}

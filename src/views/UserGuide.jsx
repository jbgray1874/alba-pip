// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — User guide
//  ----------------------------------------------------------------------------
//  Linked from both landing pages. Written against the live registry rather
//  than typed out, so the company list, the fund names and the figures quoted
//  in the walkthrough cannot drift from the screens they describe — which is
//  the failure mode every other written-once artefact in this project has hit.
//
//  It covers three things a new viewer needs: what each screen is for, the
//  route to every drill-down, and where the numbers come from.
// ════════════════════════════════════════════════════════════════════════════

import { useMemo } from "react";
import { COMPANIES, FUNDS, financeOf } from "../lib/companies.js";
import { attentionActions } from "../lib/investigation.js";
import { SOURCES } from "../lib/kpiDefinitions.js";

const T = {
  bg: "#020817", card: "#0f1525", border: "#1e2740", accent: "#172035",
  txt1: "#e8edf8", txt2: "#7a90b8", txt3: "#3d5070",
  blue: "#3d8bff", green: "#00c97a", amber: "#f5a524", red: "#ff3d5a", purple: "#9b6dff",
};

function Section({ n, title, sub, children }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
        <span style={{ color: T.blue, fontSize: 11, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{n}</span>
        <h2 style={{ color: T.txt1, fontSize: 15, fontWeight: 700, margin: 0 }}>{title}</h2>
      </div>
      {sub && <div style={{ color: T.txt3, fontSize: 11, marginBottom: 12, marginLeft: 24 }}>{sub}</div>}
      <div style={{ marginLeft: 24 }}>{children}</div>
    </div>
  );
}

function Card({ children, tone = T.border }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${tone}`, borderRadius: 8, padding: "13px 15px", marginBottom: 9 }}>
      {children}
    </div>
  );
}

/** A numbered click path — the thing you follow to reach a screen. */
function Route({ steps, note }) {
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
        {steps.map((s, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ background: T.accent, border: `1px solid ${T.border}`, borderRadius: 4,
                           padding: "3px 8px", color: T.txt2, fontSize: 10.5 }}>{s}</span>
            {i < steps.length - 1 && <span style={{ color: T.txt3, fontSize: 11 }}>›</span>}
          </span>
        ))}
      </div>
      {note && <div style={{ color: T.txt3, fontSize: 10, marginTop: 6, lineHeight: 1.5 }}>{note}</div>}
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "5px 0", borderBottom: `1px solid ${T.accent}` }}>
      <div style={{ width: 200, flexShrink: 0, color: T.txt2, fontSize: 11 }}>{k}</div>
      <div style={{ color: T.txt3, fontSize: 11, lineHeight: 1.55 }}>{v}</div>
    </div>
  );
}

export default function UserGuide({ onNavigate }) {
  const portfolio = useMemo(() => COMPANIES.map((c) => ({ c, f: financeOf(c.id) })), []);
  const worst = useMemo(() => attentionActions(3), []);
  const red = portfolio.filter((x) => x.c.rag === "RED").length;
  const amber = portfolio.filter((x) => x.c.rag === "AMBER").length;
  const green = portfolio.filter((x) => x.c.rag === "GREEN").length;

  const go = (id) => (onNavigate ? () => onNavigate(id) : undefined);
  const Link = ({ to, children }) => (
    <button onClick={go(to)} style={{ background: "transparent", border: "none", padding: 0,
      color: T.blue, fontSize: "inherit", cursor: onNavigate ? "pointer" : "default",
      textDecoration: onNavigate ? "underline" : "none", fontFamily: "inherit" }}>{children}</button>
  );

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "22px 26px", background: T.bg, maxWidth: 980 }}>

      <div style={{ marginBottom: 22, paddingBottom: 16, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ color: T.blue, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 6 }}>
          Alba · Portfolio Intelligence
        </div>
        <h1 style={{ color: T.txt1, fontSize: 22, fontWeight: 700, margin: 0, fontFamily: "Georgia,serif" }}>User guide</h1>
        <div style={{ color: T.txt2, fontSize: 12, marginTop: 8, lineHeight: 1.6, maxWidth: 700 }}>
          {COMPANIES.length} companies across {FUNDS.length} funds — {red} red, {amber} amber, {green} green.
          Every figure on every screen is calculated from one finance model, so a number
          shown in two places is the same number. Nothing here is typed in by hand.
        </div>
      </div>

      {/* ── 1 · The two landing pages ───────────────────────────────────── */}
      <Section n="1" title="The two landing pages"
               sub="Either can be the page the app opens on — pick one in the top bar. The other stays a click away.">
        <Card tone={`${T.blue}44`}>
          <div style={{ color: T.txt1, fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>
            ◎ <Link to="command">Portfolio Health</Link> — the fund view
          </div>
          <div style={{ color: T.txt2, fontSize: 11, lineHeight: 1.6 }}>
            Everything aggregated to fund level: one row per company, five status pips each
            (revenue, EBITDA, cash, people, sales), month-on-month movement, and risks split
            from opportunities. Filter by fund, geography, sector and status. This is where a
            partner starts, and the answer to <em>“what needs me today?”</em> is on it without
            scrolling.
          </div>
        </Card>
        <Card tone={`${T.purple}44`}>
          <div style={{ color: T.txt1, fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>
            ⬡ <Link to="gp">GP Dashboard</Link> — the company view
          </div>
          <div style={{ color: T.txt2, fontSize: 11, lineHeight: 1.6 }}>
            One company at a time, across nine modules — finance, sales, people, operations,
            procurement, technology, compliance, cross-functional, benchmarks — plus the AI
            panel. Every finance drill-down starts here.
          </div>
        </Card>
      </Section>

      {/* ── 2 · Where the aggregations are ──────────────────────────────── */}
      <Section n="2" title="Where the aggregations are"
               sub="Four screens roll data up rather than showing one company. These are the ones worth photographing.">
        <Card>
          <div style={{ color: T.green, fontSize: 11.5, fontWeight: 700, marginBottom: 5 }}>
            Best single screenshot — <Link to="command">Portfolio Health</Link>
          </div>
          <div style={{ color: T.txt2, fontSize: 11, lineHeight: 1.6 }}>
            Fund KPI banner across the top, then all {COMPANIES.length} companies as one table with
            five status pips apiece. Multi-currency is visible here: {COMPANIES.filter((c) => c.currency !== "GBP").length} of
            the {COMPANIES.length} report in something other than sterling and are restated into GBP
            at pinned rates.
          </div>
          <Route steps={["Portfolio Health"]} note="Widen the window before capturing — the table is the point." />
        </Card>

        <Card>
          <div style={{ color: T.green, fontSize: 11.5, fontWeight: 700, marginBottom: 5 }}>
            Densest aggregation — <Link to="analytics">Portfolio Analytics</Link>
          </div>
          <div style={{ color: T.txt2, fontSize: 11, lineHeight: 1.6 }}>
            Five aggregations on one page: the RAG heatmap (every company against every
            department), the scenario planner, the IRR and returns table, the attention panel,
            and the board pack generator. The heatmap is the one that reads best at a glance.
          </div>
          <Route steps={["Portfolio Analytics"]} />
        </Card>

        <Card>
          <div style={{ color: T.green, fontSize: 11.5, fontWeight: 700, marginBottom: 5 }}>
            Aggregation with a conclusion — <Link to="revenuemiss">Revenue Risk</Link> and <Link to="expansion">Growth Opportunity</Link>
          </div>
          <div style={{ color: T.txt2, fontSize: 11, lineHeight: 1.6 }}>
            Not roll-ups of the portfolio but roll-ups of a problem. Revenue Risk decomposes a
            forecast gap into named drivers that sum exactly to it. Growth Opportunity scores
            every customer account against six weighted factors and shows the points each one
            contributed. Both end in a downloadable report.
          </div>
          <Route steps={["Revenue Risk", "any driver row"]} note="The bridge is an identity — the drivers cannot fail to add up to the gap." />
        </Card>
      </Section>

      {/* ── 3 · Drill-downs, and how to reach them ──────────────────────── */}
      <Section n="3" title="Drill-downs — the exact click path"
               sub="Three levels deep, from a headline number to individual transactions.">
        <Card tone={`${T.amber}44`}>
          <div style={{ color: T.amber, fontSize: 11.5, fontWeight: 700, marginBottom: 6 }}>The finance drill-down</div>
          <Route
            steps={["GP Dashboard", "click a company", "Finance tab", "click Cash Runway", "Monthly Burn", "a category", "Transactions"]}
            note="Three metric cards open the drill-down — Cash Runway, Revenue vs Budget and EBITDA Margin. Each opens a different tree: cash goes to burn categories then transactions, revenue to products then regions, EBITDA to the bridge then cost lines."
          />
          <div style={{ color: T.txt2, fontSize: 11, lineHeight: 1.6, marginTop: 10 }}>
            Every chart inside is drawn from an eighteen-month ledger in which gross profit is
            revenue less cost of sales in every month, EBITDA is gross profit less operating
            cost in every month, and cash is the running consequence of burn. So a figure can
            be asked <em>“compared with when?”</em> and it has an answer.
          </div>
        </Card>

        <Card tone={`${T.purple}44`}>
          <div style={{ color: T.purple, fontSize: 11.5, fontWeight: 700, marginBottom: 6 }}>The investigation drill-down</div>
          <Route
            steps={["AI Agents", "Investigation Agent", "pick a company", "Run Investigation"]}
            note="The reasoning chain is computed, not scripted. It ends with the ranking that produced the conclusion — each candidate cause with its monthly cash impact, its share, and the arithmetic behind it."
          />
        </Card>

        <Card tone={`${T.blue}44`}>
          <div style={{ color: T.blue, fontSize: 11.5, fontWeight: 700, marginBottom: 6 }}>The account drill-down</div>
          <Route
            steps={["Growth Opportunity", "click any account in the radar"]}
            note="Opens the six scoring factors, the points each contributed out of its maximum, and the basis it scored on — so the score is never a bare number."
          />
        </Card>
      </Section>

      {/* ── 4 · A walkthrough that uses live figures ────────────────────── */}
      <Section n="4" title="An eight-minute walkthrough"
               sub="The order the screens were built to be shown in. The figures below are read from the model as you load this page.">
        <Card>
          {[
            ["1 min", <>Open <Link to="command">Portfolio Health</Link>. {red} red, {amber} amber, {green} green across {FUNDS.length} funds. Filter to one fund, then clear it.</>],
            ["2 min", <>{worst[0]?.company} is worst on runway and plan. Read its row, then open it in <Link to="gp">GP Dashboard</Link>.</>],
            ["2 min", <>Finance tab → click <strong>Cash Runway</strong> → burn categories → transactions. Three levels, sourced at each.</>],
            ["1 min", <>The <Link to="agents">AI Agents</Link> screen: run the investigation on {worst[0]?.company}. Show the ranking, not just the conclusion.</>],
            ["1 min", <><Link to="revenuemiss">Revenue Risk</Link> — reported revenue looks close to plan; the forecast gap is not. Generate the exception report.</>],
            ["1 min", <><Link to="expansion">Growth Opportunity</Link> — open one account and show why it scored. Generate the growth brief.</>],
          ].map(([t, body], i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "7px 0", borderBottom: i < 5 ? `1px solid ${T.accent}` : "none" }}>
              <div style={{ width: 46, flexShrink: 0, color: T.blue, fontSize: 10, fontWeight: 700, paddingTop: 1 }}>{t}</div>
              <div style={{ color: T.txt2, fontSize: 11, lineHeight: 1.6 }}>{body}</div>
            </div>
          ))}
        </Card>
      </Section>

      {/* ── 5 · Where the numbers come from ─────────────────────────────── */}
      <Section n="5" title="Where the numbers come from"
               sub="Each metric carries its source system and the date it was last refreshed.">
        <Card>
          {Object.values(SOURCES).map((s) => (
            <Row key={s.id}
                 k={<>
                   <span style={{ color: s.live ? T.green : T.amber, marginRight: 6 }}>{s.live ? "●" : "○"}</span>
                   {s.label} <span style={{ color: T.txt3 }}>· {s.kind}</span>
                 </>}
                 v={s.note} />
          ))}
        </Card>
        <div style={{ color: T.txt3, fontSize: 10.5, lineHeight: 1.6, marginTop: 8 }}>
          Figures in the demo are synthetic but deterministic — generated from a fixed seed with
          no clock and no randomness — so a rehearsal and the meeting that follows it show
          identical numbers. Foreign-currency companies are restated at pinned rates rather than
          live ones, for the same reason.
        </div>
      </Section>

      {/* ── 6 · Reading the screen ──────────────────────────────────────── */}
      <Section n="6" title="Reading the screen">
        <Card>
          <Row k="Text too small?" v="Use the size control in the top bar — 100% to 150%. It scales the whole interface together, so no column, chart or table row is dropped at any setting. The choice is remembered." />
          <Row k="Which page opens first?" v="Set it with the home switch in the top bar. Portfolio Health or GP Dashboard; the other stays one click away in the sidebar." />
          <Row k="Status pips" v="Five per company on Portfolio Health — revenue, EBITDA, cash, people, sales. Hover any pip for the figure behind it." />
          <Row k="Currency" v={`Companies hold their own currency (${[...new Set(COMPANIES.map((c) => c.currency))].join(", ")}). Fund-level figures are restated into ${FUNDS[0].reportingCurrency}.`} />
          <Row k="“● CALCULATED” badges" v="On the AI panels: green means a language model wrote the prose over calculated figures; grey means no API key is set and you are seeing the calculation alone. Neither invents a number." />
        </Card>
      </Section>

      <div style={{ color: T.txt3, fontSize: 10, marginTop: 24, paddingTop: 14, borderTop: `1px solid ${T.border}`, lineHeight: 1.6 }}>
        This guide reads the live portfolio registry — the company list, fund names, status counts and
        walkthrough figures above update when the data does.
      </div>
    </div>
  );
}

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

import { C, F } from "../lib/theme.js";
import { Page, PageHeader, Chip, ProvenanceBar } from "../components/Shell.jsx";
import { useMemo } from "react";
import { COMPANIES, FUNDS, financeOf } from "../lib/companies.js";
import { attentionActions } from "../lib/investigation.js";
import { SOURCES } from "../lib/kpiDefinitions.js";
import { modulesFor, MODELLED_DISCIPLINES } from "../lib/companyModules.js";
import { actionSummary } from "../lib/actionTracker.js";
import { buildProcurement } from "../lib/scenarioProcurement.js";
import { TIERS } from "../lib/liveData.js";
import { integrationHealth } from "../lib/liveFeed.js";

// Palette from the shared design tokens. Every view used to carry its own
// copy of this object, seventeen of them, each a shade adrift of the next.
const T = {
  bg: C.bg,
  card: C.surface,
  border: C.border,
  accent: C.surfaceUp,
  blue: C.blue,
  green: C.green,
  amber: C.amber,
  gold: C.gold,
  red: C.red,
  purple: C.purple,
  txt1: C.txt1,
  txt2: C.txt2,
  txt3: C.txt3
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
  const actions = useMemo(() => actionSummary(), []);
  const procurement = useMemo(() => buildProcurement().totals, []);
  const sampleModules = useMemo(() => modulesFor(COMPANIES[0].id), []);
  const measuredCount = Object.keys(sampleModules).filter((k) => k !== "meta").length - MODELLED_DISCIPLINES.length;
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
    <Page maxWidth={1000}>
      <PageHeader
        crumbs={["Reports", "User Guide"]}
        title="User Guide"
        chips={<Chip tone="gold">{COMPANIES.length} companies · {FUNDS.length} funds</Chip>}
        purpose="Every figure on every screen is calculated from one finance model, so a number shown in two places is the same number. Nothing here is typed in by hand."
        meta={`${red} red · ${amber} amber · ${green} green — read from the registry, not written down`}
      />

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
            Cross-portfolio, and only possible with a platform — <Link to="procurement">Procurement</Link>
          </div>
          <div style={{ color: T.txt2, fontSize: 11, lineHeight: 1.6 }}>
            Supplier spend aggregated across all {COMPANIES.length} companies, after normalising the
            ledger names that differ company to company — {procurement.suppliers} shared suppliers,
            {" "}{Math.round(procurement.totalSpend / 1000 * 10) / 10}m of annual spend, and a saving
            of {Math.round(procurement.saving)}k a year on the confirmed portion. The same supplier
            appears under as many as five trading names, which is why no single company has ever seen
            the total. Spend whose identity is only a candidate match is held out of the headline and
            shown separately.
          </div>
          <Route steps={["Procurement", "any supplier", "the ledger names it matched"]} />
        </Card>

        <Card>
          <div style={{ color: T.green, fontSize: 11.5, fontWeight: 700, marginBottom: 5 }}>
            Aggregations of a problem — the five scenario screens
          </div>
          <div style={{ color: T.txt2, fontSize: 11, lineHeight: 1.6 }}>
            Not roll-ups of the portfolio but roll-ups of a question.
            {" "}<Link to="revenuemiss">Revenue Risk</Link> decomposes a forecast gap into named drivers
            that sum exactly to it. <Link to="cash">Cash &amp; Runway</Link> shows the same company on
            three runway bases and lets you move the levers.
            {" "}<Link to="margin">Margin Erosion</Link> takes eight points of gross margin apart on a
            company that reads green on every headline. <Link to="expansion">Growth Opportunity</Link>
            {" "}scores every customer account against six weighted factors.
          </div>
          <Route steps={["Revenue Risk", "any driver row"]} note="Each bridge is an identity — the drivers cannot fail to add up to the total." />
        </Card>

        <Card>
          <div style={{ color: T.gold, fontSize: 11.5, fontWeight: 700, marginBottom: 5 }}>
            Where the next pound of value is — the Opportunity Radar
          </div>
          <div style={{ color: T.txt2, fontSize: 11, lineHeight: 1.6 }}>
            <Link to="radar">Opportunity Radar</Link> is the upside counterpart to the Command
            Centre: one opportunity per company, ranked across the whole fund on a
            confidence-weighted value, plotted so the size of the bubble carries the money and the
            position on the axis carries how much the evidence supports it. Nothing on it is typed,
            including the confidence percentages — those are counted from how many independent
            indicators agree, and the indicator list sits beside the headline so a sceptic can
            check the count. From a bubble you drill into
            {" "}<Link to="expansion">Customer Expansion</Link>, which scores that company's
            individual accounts against six weighted factors.
          </div>
          <Route steps={["Opportunity Radar", "a company bubble", "Customer Expansion", "an account", "why it scored"]} />
        </Card>

        <Card>
          <div style={{ color: T.gold, fontSize: 11.5, fontWeight: 700, marginBottom: 5 }}>
            From a finding to somebody's diary — the two plans
          </div>
          <div style={{ color: T.txt2, fontSize: 11, lineHeight: 1.6 }}>
            A finding nobody owns is a slide. Two screens close that gap.
            {" "}<Link to="protection">Protection Plan</Link> converts the forecast risk on Revenue
            Risk into interventions with an owner, a date and an expected impact, and states the
            arithmetic on the page: forecast risk less targeted recovery is the residual gap, an
            identity rather than three separate figures. Its recovery total is the sum of the
            impacts in the table above it, so a CFO can take it apart in ten seconds.
            {" "}<Link to="actionplan">Commercial Plan</Link> does the same for the upside — a
            prioritised campaign with owners, action dates, a playbook and a milestone timeline.
          </div>
          <Route steps={["Revenue Risk", "Create action plan", "Protection Plan", "any action row"]}
                 note="Recovery target and residual gap are derived from the action table, not entered — change an impact and both move." />
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
            ["+2 min", <>If there is time: <Link to="margin">Margin Erosion</Link> for the company that reads green everywhere, and <Link to="procurement">Procurement</Link> for the number no single company can see.</>],
          ].map(([t, body], i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "7px 0", borderBottom: i < 6 ? `1px solid ${T.accent}` : "none" }}>
              <div style={{ width: 46, flexShrink: 0, color: T.blue, fontSize: 10, fontWeight: 700, paddingTop: 1 }}>{t}</div>
              <div style={{ color: T.txt2, fontSize: 11, lineHeight: 1.6 }}>{body}</div>
            </div>
          ))}
        </Card>
      </Section>

      {/* ── 4b · The company page ───────────────────────────────────────── */}
      <Section n="5" title="The company page"
               sub={`Eleven tabs per company, for every one of the ${COMPANIES.length} — not just the one with a live Xero connection.`}>
        <Card>
          <div style={{ color: T.txt2, fontSize: 11, lineHeight: 1.6, marginBottom: 8 }}>
            Finance, Sales, People and Cross-functional are <strong>read from the finance model</strong>, so they
            cannot disagree with the portfolio table, the scenarios or the drill-downs. Operations, Procurement,
            Technology and Compliance have no source system connected yet — those are derived from each company's
            own discipline score, which is what drives the health ring at the top of the page. A company scoring
            low on operations shows worse operational KPIs than one scoring high, so the tab and the ring agree.
          </div>
          <Card tone={`${T.amber}44`}>
            <div style={{ color: T.amber, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Read the MODEL tag</div>
            <div style={{ color: T.txt2, fontSize: 10.5, lineHeight: 1.6 }}>
              Every modelled figure carries an amber <strong>MODEL</strong> tag on its tile and names “Alba model”
              as its source rather than a system it has never touched. The source strip under the company header
              splits the {measuredCount} measured disciplines from the {MODELLED_DISCIPLINES.length} modelled ones.
              Click any tile to see its threshold, its confidence and — where it is modelled — a plain statement
              that it is.
            </div>
          </Card>
          <Route steps={["Portfolio Health", "click a company", "any of the eleven tabs"]}
                 note="Clicking a company in Portfolio Health opens that company directly. Opening the GP Dashboard from the sidebar starts on the portfolio list instead." />
        </Card>
      </Section>

      {/* ── 5 · Where the numbers come from ─────────────────────────────── */}
      <Section n="6" title="Where the numbers come from"
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

      {/* ── 7 · The action tracker ──────────────────────────────────────── */}
      <Section n="7" title="The action tracker, closed"
               sub="An action tracker that never checks whether the metric moved is a to-do list.">
        <Card>
          <div style={{ color: T.txt2, fontSize: 11, lineHeight: 1.6, marginBottom: 10 }}>
            Every action names the KPI it was raised against. Its baseline is read from the ledger at the month it
            was raised, the current value comes from today's, and the verdict — improving, no movement, worsening —
            is computed from those two figures rather than set by whoever owns the action. A move of less than 2%
            counts as no movement.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {[
              { l: "Open", v: actions.open, c: T.txt1 },
              { l: "Metric improving", v: actions.working, c: T.green },
              { l: "No movement", v: actions.noChange, c: T.txt3 },
              { l: "Metric worsening", v: actions.worse, c: T.red },
              { l: "Completed and delivered", v: `${actions.completedWorking}/${actions.completedTotal}`, c: T.green },
            ].map((x) => (
              <div key={x.l} style={{ background: T.bg, border: `1px solid ${T.accent}`, borderRadius: 6, padding: "8px 11px", flex: 1, minWidth: 110 }}>
                <div style={{ color: T.txt3, fontSize: 8.5, marginBottom: 3 }}>{x.l}</div>
                <div style={{ color: x.c, fontSize: 17, fontWeight: 700, fontFamily: F.serif }}>{x.v}</div>
              </div>
            ))}
          </div>
          <Route steps={["GP Dashboard", "Actions", "any action"]}
                 note="Opening an action shows the metric, its value when raised, its value now, and the elapsed months." />
        </Card>
      </Section>

      {/* ── 8 · Reports ─────────────────────────────────────────────────── */}
      <Section n="8" title="Reports"
               sub="One per scenario. Each is built from the calculation, so it is correct with the AI layer switched off.">
        <Card>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 460 }}>
              <thead><tr style={{ color: T.txt3, fontSize: 9, textAlign: "left" }}>
                {["Report", "Screen", "What it carries"].map((h) => (
                  <th key={h} style={{ padding: "6px 9px", fontWeight: 400, borderBottom: `1px solid ${T.border}` }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{[
                ["Portfolio Performance Exception Report", "revenuemiss", "Revenue Risk", "Driver bridge with a share-of-gap column that sums to 100"],
                ["Growth Opportunity Brief", "expansion", "Growth Opportunity", "Prioritised accounts and the factors each scored on"],
                ["Cash Position Review", "cash", "Cash & Runway", "Three runway bases, outflow composition, thirteen weeks"],
                ["Margin Deterioration Review", "margin", "Margin Erosion", "The margin bridge and the product mix behind it"],
                ["Portfolio Procurement Opportunity", "procurement", "Procurement", "Saving by category, and what is held pending confirmation"],
              ].map(([name, to, screen, carries]) => (
                <tr key={name} style={{ borderBottom: `1px solid ${T.accent}` }}>
                  <td style={{ padding: "7px 9px", color: T.txt1 }}>{name}</td>
                  <td style={{ padding: "7px 9px" }}><Link to={to}>{screen}</Link></td>
                  <td style={{ padding: "7px 9px", color: T.txt3, fontSize: 10 }}>{carries}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div style={{ color: T.txt3, fontSize: 10, marginTop: 9, lineHeight: 1.6 }}>
            Every report carries a methodology paragraph and an evidence table with the source and refresh date for
            each figure quoted above it. Generate one from the green button at the top right of its screen — it
            downloads as a self-contained HTML file that opens and prints cleanly.
          </div>
        </Card>
      </Section>

      {/* ── 8b · What is live ───────────────────────────────────────────── */}
      <Section n="9" title="What is live, and what is not"
               sub="One vocabulary for provenance, used on every screen. The badge takes its state from the fetch, so it can be wrong.">
        <Card>
          {Object.values(TIERS).map((t) => (
            <div key={t.id} style={{ display: "flex", gap: 12, padding: "7px 0", borderBottom: `1px solid ${T.accent}` }}>
              <span style={{ flexShrink: 0, width: 92, display: "inline-flex", alignItems: "flex-start" }}>
                <span style={{ padding: "1px 6px", borderRadius: 3, border: `1px solid ${t.colour}44`,
                               background: `${t.colour}14`, color: t.colour, fontSize: 8.5, fontWeight: 700,
                               letterSpacing: "0.06em" }}>{t.label}</span>
              </span>
              <span style={{ color: T.txt3, fontSize: 10.5, lineHeight: 1.55 }}>{t.definition}</span>
            </div>
          ))}
          <div style={{ color: T.txt2, fontSize: 10.5, lineHeight: 1.6, marginTop: 10 }}>
            <strong>Nothing is ever empty and nothing ever stops.</strong> Every screen a partner works on carries a
            strip of continuously moving readings. Each moves around the figure reported below it, so the tile and
            the drill-down are the same number with a live reading around it. When a credential lapses the reading
            carries on from the last good value and the badge drops from LIVE to SIMULATED with the reason on hover —
            it never blanks, never freezes, and never keeps claiming to be live.
          </div>
          
          <div style={{ color: T.txt2, fontSize: 10.5, lineHeight: 1.6, marginTop: 10 }}>
            <strong>Foreign exchange is the one genuinely live source.</strong> Four of the {COMPANIES.length} companies
            report in USD, SGD or AED, so the rate is not a footnote — it sets what they are worth in the fund's
            reporting currency. Pinned is the default, because a demo that silently revalues itself between the
            rehearsal and the meeting is worse than one that is a fortnight stale.
          </div>
          <Route steps={["Portfolio Health", "Use live FX"]}
                 note="Fetches today's rates and revalues the four foreign-currency companies. The badge shows the provider and a last-updated that ticks; if the provider cannot be reached it flips to OFFLINE and says the pinned rates are being shown instead. Some embedded viewers block outbound requests, so a shared link will usually show OFFLINE — which is the labelling working, not failing." />
        </Card>
      </Section>

      {/* ── 10 · Reading the screen ─────────────────────────────────────── */}
      <Section n="10" title="Reading the screen">
        <Card>
          <Row k="Every screen, every company" v={`Client Portal and Live Data each carry a company selector, and the GP Dashboard's eleven tabs and benchmarks are populated for all ${COMPANIES.length}. Nothing is pinned to one company any more.`} />
          <Row k="Generating a report" v="Opens it on screen first, with Print and Download inside the panel. A download is silently blocked in some embedded viewers, so the report is shown rather than only offered as a file." />
          <Row k="Text too small?" v="Ctrl and + or − (Cmd on a Mac), or the SIZE control in the top bar — 100% to 150%, Ctrl+0 to reset. It scales the whole interface together, so no column, chart or table row is dropped at any setting. The browser's own zoom still works and stacks on top. The choice is remembered." />
          <Row k="Which page opens first?" v="Set it with the home switch in the top bar. Portfolio Health or GP Dashboard; the other stays one click away in the sidebar." />
          <Row k="Status pips" v="Five per company on Portfolio Health — revenue, EBITDA, cash, people, sales. Hover any pip for the figure behind it." />
          <Row k="Currency" v={`Companies hold their own currency (${[...new Set(COMPANIES.map((c) => c.currency))].join(", ")}). Fund-level figures are restated into ${FUNDS[0].reportingCurrency}.`} />
          <Row k="“● CALCULATED” badges" v="On the AI panels: green means a language model wrote the prose over calculated figures; grey means no API key is set and you are seeing the calculation alone. Neither invents a number." />
        </Card>
      </Section>

      <ProvenanceBar items={[
        "This guide reads the live portfolio registry",
        "Company names, fund names and status counts update with the data",
        "Walkthrough figures are computed, not transcribed",
        "Every link opens the screen it describes",
      ]} />
    </Page>
  );
}

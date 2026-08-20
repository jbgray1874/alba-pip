import { useState } from "react";
import { C, F, S, label as labelStyle } from "../lib/theme.js";
import { Page, PageHeader, Chip, ProvenanceBar } from "../components/Shell.jsx";

// ─── DATA ──────────────────────────────────────────────────────────────────

const PROTOTYPE_TASKS = [
  {
    id: 1, day: 1, duration: 1, phase: "Setup",
    task: "Project scaffold", detail: "npx create-next-app, install Prisma, shadcn/ui, Recharts, NextAuth",
    type: "infra",
  },
  {
    id: 2, day: 1, duration: 1, phase: "Setup",
    task: "SQLite schema + seed script", detail: "Prisma schema: Company, KpiValue, Alert, Action. 5 companies × 12 months KPI history.",
    type: "data",
  },
  {
    id: 3, day: 2, duration: 1, phase: "Backend",
    task: "Health scoring engine", detail: "Weighted score: Finance 30%, Sales 20%, HR 15%, Ops 15%, Compliance 10%, Tech 5%, Procurement 5%",
    type: "logic",
  },
  {
    id: 4, day: 2, duration: 1, phase: "Backend",
    task: "API routes (portfolio + company)", detail: "/api/portfolio — all companies with scores. /api/company/[id] — KPI values by category.",
    type: "logic",
  },
  {
    id: 5, day: 3, duration: 1, phase: "Frontend",
    task: "Portfolio overview page", detail: "5 company cards, RAG health score, cash runway tile, revenue vs budget, trend arrows, alert badges.",
    type: "ui",
  },
  {
    id: 6, day: 3, duration: 1, phase: "Frontend",
    task: "RAG badge + KPI tile components", detail: "Reusable RagBadge (green/amber/red), KpiTile (value, delta, sparkline), HealthScore ring.",
    type: "ui",
  },
  {
    id: 7, day: 4, duration: 1, phase: "Frontend",
    task: "Company drill-down — Finance tab", detail: "P&L trend line chart, budget vs actual bar chart, cash runway curve. Recharts.",
    type: "ui",
  },
  {
    id: 8, day: 4, duration: 1, phase: "Frontend",
    task: "Company drill-down — Sales + HR tabs", detail: "Sales: pipeline coverage, win rate, quota attainment. HR: attrition trend, headcount vs plan.",
    type: "ui",
  },
  {
    id: 9, day: 5, duration: 1, phase: "AI",
    task: "Mock AI narrative panel", detail: "AI_MODE=mock returns pre-written narratives per KPI. 'Explain' button on any red metric.",
    type: "ai",
  },
  {
    id: 10, day: 5, duration: 1, phase: "AI",
    task: "Live Claude API wiring", detail: "AI_MODE=live calls claude-sonnet-4 with KPI context. Same UI — one env var switch.",
    type: "ai",
  },
  {
    id: 11, day: 6, duration: 1, phase: "Frontend",
    task: "Alerts panel page", detail: "Severity-sorted list (critical → informational). Acknowledge button. Linked to company + KPI.",
    type: "ui",
  },
  {
    id: 12, day: 6, duration: 1, phase: "Polish",
    task: "Navigation + layout shell", detail: "Sidebar nav: Portfolio / Alerts / Actions. Header with fund name. Dark/light theme.",
    type: "ui",
  },
  {
    id: 13, day: 7, duration: 1, phase: "Polish",
    task: "Demo run-through + bug fixes", detail: "End-to-end test all 5 company stories. Fix layout issues. Prepare stakeholder script.",
    type: "qa",
  },
  {
    id: 14, day: 7, duration: 1, phase: "Polish",
    task: "README + VS Code launch config", detail: "One-command setup for any reviewer. .vscode/launch.json for debug mode.",
    type: "qa",
  },
];

const PRODUCTION_PHASES = [
  {
    phase: "Phase 1 — Foundation", color: C.blue, months: [1, 2], tasks: [
      { task: "Migrate SQLite → AWS RDS PostgreSQL", month: 1, duration: 0.5 },
      { task: "AWS ECS Fargate infrastructure (Terraform)", month: 1, duration: 1.5 },
      { task: "Auth0 SSO + MFA + RBAC/ABAC", month: 1.5, duration: 1 },
      { task: "Multi-tenant isolation (PostgreSQL RLS)", month: 2, duration: 0.75 },
      { task: "Snowflake analytics warehouse setup", month: 1.5, duration: 1 },
      { task: "GitHub Actions CI/CD pipeline", month: 1, duration: 0.5 },
      { task: "Staging + production environments", month: 2, duration: 0.5 },
    ],
  },
  {
    phase: "Phase 2 — Real Integrations", color: C.purple, months: [3, 4], tasks: [
      { task: "Merge.dev HRIS connector (BambooHR, HiBob, Workday)", month: 3, duration: 1 },
      { task: "Fivetran CRM connector", month: 3, duration: 0.75 },
      { task: "Fivetran ERP connector (Xero, NetSuite)", month: 3.5, duration: 1 },
      { task: "dbt transformation pipeline (canonical KPI models)", month: 3, duration: 2 },
      { task: "Great Expectations data validation", month: 4, duration: 0.5 },
      { task: "CSV / Excel file upload service (S3 + Lambda)", month: 3.5, duration: 0.75 },
      { task: "Airflow orchestration (MWAA)", month: 4, duration: 0.75 },
    ],
  },
  {
    phase: "Phase 3 — Full Module Coverage", color: C.green, months: [5, 6], tasks: [
      { task: "Operations module (throughput, SLA, backlog)", month: 5, duration: 1 },
      { task: "Procurement module (spend, supplier concentration)", month: 5, duration: 0.75 },
      { task: "Technology module (uptime, incidents, cloud cost)", month: 5.5, duration: 0.75 },
      { task: "Alert routing + escalation chains", month: 5, duration: 0.75 },
      { task: "Action management + workflow", month: 5.5, duration: 1 },
      { task: "Configurable health score weights (per fund)", month: 6, duration: 0.75 },
      { task: "Redis caching layer (ElastiCache)", month: 6, duration: 0.5 },
    ],
  },
  {
    phase: "Phase 4 — Intelligence Layer", color: C.gold, months: [7, 8], tasks: [
      { task: "LangChain RAG query interface (pgvector)", month: 7, duration: 1.5 },
      { task: "Claude API narrative engine (full implementation)", month: 7, duration: 1 },
      { task: "Prophet forecasting (cash runway, revenue, attrition)", month: 7.5, duration: 1 },
      { task: "Anomaly detection (Isolation Forest / SageMaker)", month: 8, duration: 1 },
      { task: "Board pack generation (PDF export)", month: 8, duration: 1 },
      { task: "Ably WebSocket real-time alerts", month: 8, duration: 0.5 },
    ],
  },
  {
    phase: "Phase 5 — Compliance + Risk Modules", color: C.red, months: [9, 10], tasks: [
      { task: "Compliance / KYC module", month: 9, duration: 1 },
      { task: "Audit module (issue tracker, aging)", month: 9, duration: 0.75 },
      { task: "Risk module (register, heatmap)", month: 9.5, duration: 0.75 },
      { task: "Benchmarking engine (sector / stage)", month: 10, duration: 1 },
      { task: "Security hardening + pen test", month: 10, duration: 1 },
    ],
  },
  {
    phase: "Phase 6 — Scale + Polish", color: C.txt3, months: [11, 12], tasks: [
      { task: "Predictive risk scoring (cash injection probability)", month: 11, duration: 1 },
      { task: "Scenario planning module", month: 11, duration: 0.75 },
      { task: "Mobile responsive polish", month: 11.5, duration: 0.5 },
      { task: "SOC 2 Type II preparation", month: 11, duration: 2 },
      { task: "Multi-fund onboarding (2nd fund)", month: 12, duration: 1 },
      { task: "Performance optimisation + load testing", month: 12, duration: 0.75 },
    ],
  },
];

const TYPE_COLORS = {
  infra: { bg: C.blueSoft, bar: C.blue, label: "Infrastructure" },
  data:  { bg: C.greenSoft, bar: C.green, label: "Data" },
  logic: { bg: C.purpleSoft, bar: C.purple, label: "Logic" },
  ui:    { bg: C.goldOn, bar: C.gold, label: "Frontend" },
  ai:    { bg: C.purpleSoft, bar: C.purple, label: "AI" },
  qa:    { bg: C.border, bar: C.txt3, label: "QA / Polish" },
};

// ─── PROTOTYPE GANTT ───────────────────────────────────────────────────────

function PrototypeGantt() {
  const [hovered, setHovered] = useState(null);
  const days = [1, 2, 3, 4, 5, 6, 7];
  const dayLabels = ["Mon\nDay 1", "Tue\nDay 2", "Wed\nDay 3", "Thu\nDay 4", "Fri\nDay 5", "Sat\nDay 6", "Sun\nDay 7"];

  // group by day for row layout
  const rows = PROTOTYPE_TASKS;

  return (
    <div style={{ fontFamily: F.mono, fontSize: 13 }}>
      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        {Object.entries(TYPE_COLORS).map(([k, v]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: v.bar }} />
            <span style={{ color: C.txt2, fontSize: 11 }}>{v.label}</span>
          </div>
        ))}
      </div>

      {/* Header row */}
      <div style={{ display: "grid", gridTemplateColumns: "200px repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        <div style={{ color: C.txt3, fontSize: 11, padding: "4px 8px" }}>TASK</div>
        {dayLabels.map((d, i) => (
          <div key={i} style={{
            textAlign: "center", color: i === 6 ? C.gold : C.txt2,
            fontSize: 10, padding: "4px 2px", lineHeight: 1.4,
            whiteSpace: "pre-line",
            borderBottom: `2px solid ${i === 6 ? C.goldLine : C.surfaceUp}`
          }}>{d}</div>
        ))}
      </div>

      {/* Task rows */}
      {rows.map((t) => {
        const tc = TYPE_COLORS[t.type];
        const isHov = hovered === t.id;
        return (
          <div
            key={t.id}
            onMouseEnter={() => setHovered(t.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              display: "grid",
              gridTemplateColumns: "200px repeat(7, 1fr)",
              gap: 2, marginBottom: 3,
              borderRadius: 4,
              background: isHov ? C.surfaceUp : "transparent",
              transition: "background 0.15s",
              cursor: "default",
            }}
          >
            <div style={{
              color: C.txt2, fontSize: 11, padding: "6px 8px",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <div style={{ width: 3, height: 20, borderRadius: 2, background: tc.bar, flexShrink: 0 }} />
              <span style={{ lineHeight: 1.3 }}>{t.task}</span>
            </div>
            {days.map((d) => {
              const filled = d >= t.day && d < t.day + t.duration;
              return (
                <div key={d} style={{
                  height: 32, borderRadius: 4,
                  background: filled ? tc.bar : C.surface,
                  border: `1px solid ${filled ? tc.bar : C.surfaceUp}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: filled ? 1 : 0.3,
                  transition: "all 0.15s",
                  transform: isHov && filled ? "scaleY(1.08)" : "scaleY(1)",
                }} />
              );
            })}
          </div>
        );
      })}

      {/* Tooltip */}
      {hovered && (() => {
        const t = rows.find(r => r.id === hovered);
        return (
          <div style={{
            marginTop: 16, padding: "12px 16px",
            background: C.surfaceUp, borderRadius: 8,
            border: `1px solid ${TYPE_COLORS[t.type].bar}44`,
            color: C.txt2, fontSize: 12, lineHeight: 1.6,
          }}>
            <div style={{ color: TYPE_COLORS[t.type].bar, fontWeight: "bold", marginBottom: 4 }}>
              Day {t.day} · {t.task}
            </div>
            <div style={{ color: C.txt2 }}>{t.detail}</div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── PRODUCTION GANTT ──────────────────────────────────────────────────────

function ProductionGantt() {
  const [hovered, setHovered] = useState(null);
  const totalMonths = 12;
  const monthLabels = ["M1\nJun", "M2\nJul", "M3\nAug", "M4\nSep", "M5\nOct", "M6\nNov", "M7\nDec", "M8\nJan", "M9\nFeb", "M10\nMar", "M11\nApr", "M12\nMay"];

  return (
    <div style={{ fontFamily: F.mono, fontSize: 12 }}>
      {PRODUCTION_PHASES.map((ph) => (
        <div key={ph.phase} style={{ marginBottom: 24 }}>
          {/* Phase header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10, marginBottom: 8,
          }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: ph.color }} />
            <span style={{ color: ph.color, fontWeight: "bold", fontSize: 12, letterSpacing: "0.05em" }}>
              {ph.phase.toUpperCase()}
            </span>
            <div style={{ flex: 1, height: 1, background: `${ph.color}33` }} />
            <span style={{ color: C.txt3, fontSize: 10 }}>
              Month {ph.months[0]}–{ph.months[1]}
            </span>
          </div>

          {/* Month header (first phase only) */}
          {ph.phase === PRODUCTION_PHASES[0].phase && (
            <div style={{ display: "grid", gridTemplateColumns: "220px repeat(12, 1fr)", gap: 2, marginBottom: 4 }}>
              <div style={{ color: C.txt3, fontSize: 10, padding: "2px 8px" }}>TASK</div>
              {monthLabels.map((m, i) => (
                <div key={i} style={{
                  textAlign: "center", color: C.txt3, fontSize: 9,
                  padding: "2px 1px", lineHeight: 1.3, whiteSpace: "pre-line",
                  borderBottom: `1px solid ${C.border}`
                }}>{m}</div>
              ))}
            </div>
          )}

          {/* Task rows */}
          {ph.tasks.map((t, ti) => {
            const hovId = `${ph.phase}-${ti}`;
            const isHov = hovered === hovId;
            const startCol = Math.round((t.month - 1) * 4); // 0-indexed quarters
            const endCol = Math.round((t.month - 1 + t.duration) * 4);

            return (
              <div
                key={ti}
                onMouseEnter={() => setHovered(hovId)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "220px repeat(12, 1fr)",
                  gap: 2, marginBottom: 3,
                  background: isHov ? C.surfaceUp : "transparent",
                  borderRadius: 4, transition: "background 0.15s",
                }}
              >
                <div style={{
                  color: C.txt2, fontSize: 10, padding: "5px 8px",
                  display: "flex", alignItems: "center", gap: 6, lineHeight: 1.3,
                }}>
                  <div style={{ width: 2, height: 16, borderRadius: 1, background: ph.color, flexShrink: 0 }} />
                  {t.task}
                </div>
                {Array.from({ length: 12 }, (_, mi) => {
                  const mStart = mi;
                  const mEnd = mi + 1;
                  const taskStart = t.month - 1;
                  const taskEnd = t.month - 1 + t.duration;
                  const overlap = taskStart < mEnd && taskEnd > mStart;
                  const partial = overlap && (taskStart > mStart || taskEnd < mEnd);
                  return (
                    <div key={mi} style={{
                      height: 24, borderRadius: 3,
                      background: overlap ? ph.color : C.surface,
                      border: `1px solid ${overlap ? ph.color : C.surfaceUp}`,
                      opacity: overlap ? (partial ? 0.55 : 1) : 0.2,
                      transition: "all 0.15s",
                    }} />
                  );
                })}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── MILESTONES ────────────────────────────────────────────────────────────

const MILESTONES = [
  { when: "Day 7", label: "Prototype demo-ready", color: C.gold, icon: "🎯" },
  { when: "Month 1", label: "Cloud infrastructure live", color: C.blue, icon: "☁️" },
  { when: "Month 2", label: "Auth + multi-tenancy production", color: C.blue, icon: "🔐" },
  { when: "Month 3", label: "First real integrations (Xero + HubSpot)", color: C.purple, icon: "🔌" },
  { when: "Month 4", label: "dbt KPI pipeline live", color: C.purple, icon: "⚙️" },
  { when: "Month 6", label: "MVP — first paying fund onboarded", color: C.green, icon: "🚀" },
  { when: "Month 8", label: "AI layer + board pack generation", color: C.gold, icon: "🤖" },
  { when: "Month 10", label: "Compliance + Risk modules + pen test", color: C.red, icon: "🛡️" },
  { when: "Month 12", label: "Production-grade — SOC 2 prep complete", color: C.txt3, icon: "✅" },
];

// ─── APP ───────────────────────────────────────────────────────────────────

export default function Gantt() {
  const [tab, setTab] = useState("prototype");

  return (
    <Page>
      <PageHeader
        crumbs={["Actions", "Delivery Plan"]}
        title="Delivery Plan"
        chips={<Chip tone="gold">One developer</Chip>}
        purpose="Laptop-first prototype through to full production, phase by phase"
        meta="Each phase must be complete and stable before the next begins · May 2026"
      />

      {/* Milestones strip */}
      <div style={{
        display: "flex", gap: 0, overflowX: "auto",
        marginBottom: 32, paddingBottom: 4,
      }}>
        {MILESTONES.map((m, i) => (
          <div key={i} style={{ display: "flex", alignItems: "stretch", flexShrink: 0 }}>
            <div style={{
              padding: "10px 14px",
              background: C.surface,
              border: `1px solid ${m.color}33`,
              borderLeft: i === 0 ? `1px solid ${m.color}33` : "none",
              borderRadius: i === 0 ? "8px 0 0 8px" : i === MILESTONES.length - 1 ? "0 8px 8px 0" : 0,
              display: "flex", flexDirection: "column", gap: 3, minWidth: 130,
            }}>
              <div style={{ fontSize: 9, color: m.color, letterSpacing: "0.1em" }}>{m.when}</div>
              <div style={{ fontSize: 10, color: C.txt2, lineHeight: 1.3 }}>
                <span style={{ marginRight: 5 }}>{m.icon}</span>{m.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
        {[
          { id: "prototype", label: "📅 Week 1 Prototype", sub: "7 days" },
          { id: "production", label: "🗓 Production Roadmap", sub: "12 months" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "10px 20px",
              background: tab === t.id ? C.surfaceUp : "transparent",
              border: `1px solid ${tab === t.id ? C.borderLt : C.surfaceUp}`,
              borderRadius: 6, color: tab === t.id ? C.txt1 : C.txt3,
              cursor: "pointer", fontSize: 12, fontFamily: "inherit",
              transition: "all 0.15s",
            }}
          >
            {t.label}
            <span style={{
              marginLeft: 8, fontSize: 10, color: tab === t.id ? C.txt3 : C.borderLt
            }}>
              {t.sub}
            </span>
          </button>
        ))}
      </div>

      {/* Chart area */}
      <div style={{
        background: C.bgDeep,
        border: `1px solid ${C.border}`,
        borderRadius: 12, padding: 24,
        overflowX: "auto",
      }}>
        {tab === "prototype" ? (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: C.txt1, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                Week 1 Prototype — Day by Day
              </div>
              <div style={{ color: C.txt3, fontSize: 11 }}>
                1 developer · VS Code · SQLite · localhost:3000 · £0 cost · Hover a task for detail
              </div>
            </div>
            <PrototypeGantt />
            {/* Week summary */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
              gap: 8, marginTop: 24,
            }}>
              {[
                { day: "Day 1", theme: "Setup", tasks: "Scaffold + DB schema + seed data", color: C.blue },
                { day: "Day 2", theme: "Backend", tasks: "Scoring engine + API routes", color: C.purple },
                { day: "Day 3", theme: "UI Core", tasks: "Portfolio overview page + components", color: C.gold },
                { day: "Day 4", theme: "Drill-down", tasks: "Company Finance + Sales + HR tabs", color: C.gold },
                { day: "Day 5", theme: "AI", tasks: "Mock narratives + live Claude wiring", color: C.purple },
                { day: "Day 6", theme: "Alerts", tasks: "Alerts page + nav shell", color: C.gold },
                { day: "Day 7", theme: "🎯 Demo", tasks: "End-to-end test + stakeholder prep", color: C.green },
              ].map((d) => (
                <div key={d.day} style={{
                  padding: "10px 12px",
                  background: C.surface,
                  border: `1px solid ${d.color}44`,
                  borderTop: `3px solid ${d.color}`,
                  borderRadius: 6,
                }}>
                  <div style={{ color: d.color, fontSize: 10, fontWeight: 700, marginBottom: 4 }}>{d.day}</div>
                  <div style={{ color: C.txt1, fontSize: 10, fontWeight: 600, marginBottom: 3 }}>{d.theme}</div>
                  <div style={{ color: C.txt3, fontSize: 9, lineHeight: 1.4 }}>{d.tasks}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: C.txt1, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                Production Roadmap — 12 Months
              </div>
              <div style={{ color: C.txt3, fontSize: 11 }}>
                1 developer · AWS infrastructure · Real integrations · AI intelligence layer · Security hardening
              </div>
            </div>
            <ProductionGantt />

            {/* Phase summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 24 }}>
              {[
                { label: "Phase 1–2", months: "Months 1–4", desc: "Cloud infra, auth, multi-tenancy, Snowflake, first real integrations (Merge.dev + Fivetran), dbt pipeline", color: C.blue },
                { label: "Phase 3–4", months: "Months 5–8", desc: "All 9 modules live, configurable scoring, LangChain RAG, Claude narratives, Prophet forecasting, anomaly detection, board packs", color: C.green },
                { label: "Phase 5–6", months: "Months 9–12", desc: "Compliance + Risk modules, benchmarking, pen test, SOC 2 prep, predictive scoring, scenario planning, 2nd fund onboarding", color: C.txt3 },
              ].map((p) => (
                <div key={p.label} style={{
                  padding: "14px 16px",
                  background: C.surface,
                  border: `1px solid ${p.color}33`,
                  borderLeft: `3px solid ${p.color}`,
                  borderRadius: 6,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: p.color, fontWeight: 700, fontSize: 11 }}>{p.label}</span>
                    <span style={{ color: C.txt3, fontSize: 10 }}>{p.months}</span>
                  </div>
                  <div style={{ color: C.txt2, fontSize: 10, lineHeight: 1.5 }}>{p.desc}</div>
                </div>
              ))}
            </div>

            {/* Cost trajectory */}
            <div style={{ marginTop: 24 }}>
              <div style={{ color: C.txt3, fontSize: 10, marginBottom: 10, letterSpacing: "0.1em" }}>
                MONTHLY COST TRAJECTORY (1 DEVELOPER)
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 60 }}>
                {[
                  { label: "Wk 1", val: 0, note: "£0" },
                  { label: "M1", val: 8, note: "~£200" },
                  { label: "M2", val: 12, note: "~£400" },
                  { label: "M3", val: 15, note: "~£500" },
                  { label: "M4", val: 20, note: "~£700" },
                  { label: "M5", val: 25, note: "~£900" },
                  { label: "M6", val: 30, note: "~£1k" },
                  { label: "M7", val: 35, note: "~£1.2k" },
                  { label: "M8", val: 42, note: "~£1.5k" },
                  { label: "M9", val: 48, note: "~£1.7k" },
                  { label: "M10", val: 52, note: "~£1.9k" },
                  { label: "M11", val: 55, note: "~£2k" },
                  { label: "M12", val: 60, note: "~£2.2k" },
                ].map((b, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <div style={{ fontSize: 8, color: C.txt3 }}>{b.note}</div>
                    <div style={{
                      width: "100%", height: `${b.val}px`,
                      background: i === 0 ? C.green : `hsl(${220 - i * 8}, 60%, ${35 + i * 1.5}%)`,
                      borderRadius: "3px 3px 0 0", minHeight: 2,
                      transition: "all 0.3s",
                    }} />
                    <div style={{ fontSize: 8, color: C.txt3 }}>{b.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer note */}
      <div style={{
        marginTop: 20, padding: "12px 16px",
        background: C.surface, borderRadius: 8,
        border: `1px solid ${C.border}`,
        color: C.txt3, fontSize: 10, lineHeight: 1.6,
      }}>
        Single-developer constraint: each phase must be complete and stable before the next begins, and a week of
        buffer per phase should be assumed for production work. Merge.dev and Fivetran are load-bearing — building
        individual integrations by hand is not a viable path. The Claude API is the only non-free dependency in the
        prototype, and mock mode covers everything the demo needs without it.
      </div>

      <ProvenanceBar items={[
        "One developer, phased",
        "A week of buffer assumed per production phase",
        "Integrations via Merge.dev and Fivetran, not hand-built",
        "Mock mode covers the demo with no paid dependency",
      ]} />
    </Page>
  );
}

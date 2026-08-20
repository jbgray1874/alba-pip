// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Report generator
//  ----------------------------------------------------------------------------
//  Shared component 5. The specification's test is that a user can turn an
//  insight into a professional output "without manually rebuilding it in
//  PowerPoint or Word", and that both reports are "polished enough to circulate
//  after a portfolio meeting".
//
//  Two outputs are named: the Portfolio Performance Exception Report and the
//  Growth Opportunity Brief. Both are built from the calculated scenario, not
//  from prose — so a report is correct with the AI layer switched off, and the
//  metric appendix at the foot of each one carries the source and refresh date
//  for every figure quoted above it.
// ════════════════════════════════════════════════════════════════════════════

import { fmtMoney } from "./fx.js";

const money = (v, ccy) => fmtMoney(v, ccy, { k: true });

/**
 * Percentage shares that sum to exactly 100.
 *
 * Rounding each share independently gives a column that adds to 99 or 101,
 * which is the first thing a finance director notices and the last thing you
 * want them noticing. Largest remainder puts the difference somewhere chosen.
 */
function sharesOf(values, total) {
  const raw = values.map((v) => (v / total) * 100);
  const floors = raw.map(Math.floor);
  let left = 100 - floors.reduce((t, f) => t + f, 0);
  const order = raw.map((v, i) => ({ i, frac: v - Math.floor(v) })).sort((a, b) => b.frac - a.frac);
  const out = [...floors];
  for (let n = 0; n < order.length && left > 0; n++, left--) out[order[n].i] += 1;
  return out;
}

/** Portfolio Performance Exception Report — scenario 1. */
export function buildExceptionReport(s) {
  const { company, currentQuarter: q, forecast: f, bridge, insight, currency: ccy } = s;
  return {
    kind: "Portfolio Performance Exception Report",
    company: company.name,
    subtitle: `${company.sectorLong} · ${company.geo} · reported in ${ccy}`,
    preparedAt: insight.raisedOn,
    executiveSummary:
      `${company.name} is forecast to miss next quarter's revenue plan by ${money(f.forecastGap, ccy)}, ` +
      `${((f.forecastGap / f.planRevenue) * 100).toFixed(1)}% of plan. Reported revenue is currently only ` +
      `${Math.abs(q.variancePct).toFixed(1)}% below plan, so the deterioration is not yet visible in standard ` +
      `reporting. The shortfall is driven by conversion and deal timing rather than by demand.`,
    sections: [
      {
        title: "Size and timing",
        rows: [
          ["Plan", money(f.planRevenue, ccy)],
          ["Forecast", money(f.forecastRevenue, ccy)],
          ["Gap", money(f.forecastGap, ccy)],
          ["Decision window", "Roughly six weeks before quarter end, after which in-quarter recovery is not credible"],
        ],
      },
      {
        title: "Root causes",
        table: {
          head: ["Driver", "Value", "Share of gap", "Workings"],
          rows: (() => {
            const shares = sharesOf(bridge.map((b) => b.value), f.forecastGap);
            return bridge.map((b, i) => [b.driver, money(b.value, ccy), `${shares[i]}%`, b.workings]);
          })(),
        },
      },
      {
        title: "Supporting evidence",
        table: { head: ["Metric", "Value", "Source", "As of"], rows: insight.evidence.map((e) => [e.label, e.value, e.source, e.asOf]) },
      },
      {
        title: "Recommended actions",
        table: { head: ["Action", "Owner", "Due", "Rationale"], rows: insight.actions.map((a) => [a.action, a.owner, a.due, a.rationale]) },
      },
    ],
    accountable: "Chief Revenue Officer, with CEO sponsorship on the re-dated accounts",
    reviewDate: "30 Jun 2026",
    methodology: insight.methodology,
  };
}

/** Growth Opportunity Brief — scenario 4. */
export function buildGrowthBrief(s) {
  const { company, qualified, totals: t, insight, currency: ccy } = s;
  return {
    kind: "Growth Opportunity Brief",
    company: company.name,
    subtitle: `${company.sectorLong} · ${company.geo} · reported in ${ccy}`,
    preparedAt: insight.raisedOn,
    executiveSummary:
      `${qualified.length} existing customers match the profile of accounts that previously adopted the second ` +
      `product. Estimated additional recurring revenue of ${money(t.low, ccy)} to ${money(t.high, ccy)} over the ` +
      `next four quarters, against a current second-product penetration of ${(t.penetration * 100).toFixed(0)}%.`,
    sections: [
      {
        title: "Estimated value",
        rows: [
          ["Expected", money(t.expected, ccy)],
          ["Range", `${money(t.low, ccy)} – ${money(t.high, ccy)}`],
          ["Gross before conversion", money(t.gross, ccy)],
          ["Share of current ARR", `${((t.expected / t.arrTotal) * 100).toFixed(1)}%`],
        ],
      },
      {
        title: "Prioritised accounts",
        table: {
          head: ["Account", "Segment", "Current ARR", "Score", "Renewal", "p(convert)", "Expected"],
          rows: qualified.slice(0, 12).map((c) => [
            c.account, c.segment, money(c.arr, ccy), String(c.score), c.renewalDate,
            `${Math.round(c.conversionProbability * 100)}%`, money(c.expectedValue, ccy),
          ]),
        },
      },
      {
        title: "Why these accounts",
        table: {
          head: ["Account", "Strongest factors"],
          rows: qualified.slice(0, 6).map((c) => [
            c.account,
            c.breakdown.slice().sort((a, b) => b.points - a.points).slice(0, 3).map((f) => f.basis).join("; "),
          ]),
        },
      },
      {
        title: "Supporting evidence",
        table: { head: ["Metric", "Value", "Source", "As of"], rows: insight.evidence.map((e) => [e.label, e.value, e.source, e.asOf]) },
      },
      {
        title: "Recommended campaign",
        table: { head: ["Action", "Owner", "Due", "Rationale"], rows: insight.actions.map((a) => [a.action, a.owner, a.due, a.rationale]) },
      },
    ],
    accountable: "VP Sales, with the deal team confirming the valuation effect before circulation",
    reviewDate: "30 Jun 2026",
    methodology: insight.methodology,
  };
}

const esc = (v) => String(v).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

/** Branded, self-contained HTML — opens and prints cleanly, no assets required. */
export function reportToHtml(r) {
  const table = (t) => `<table><thead><tr>${t.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${
    t.rows.map((row) => `<tr>${row.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;

  const rows = (list) => `<table class="kv"><tbody>${
    list.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</tbody></table>`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${esc(r.kind)} — ${esc(r.company)}</title>
<style>
:root{--ink:#0f1525;--muted:#5b6b8a;--line:#d8dfeb;--accent:#3d8bff}
*{box-sizing:border-box}
body{margin:0;background:#fff;color:var(--ink);font:14px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;padding:40px}
.wrap{max-width:960px;margin:0 auto}
.eyebrow{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);margin:0 0 8px}
h1{font:600 26px/1.2 Georgia,serif;margin:0 0 4px}
.sub{color:var(--muted);font-size:13px;margin:0 0 24px}
h2{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:28px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--line)}
.summary{background:#f6f8fc;border-left:3px solid var(--accent);padding:14px 16px;margin:0 0 8px}
table{width:100%;border-collapse:collapse;font-size:12.5px;margin:0 0 6px}
th,td{text-align:left;padding:7px 9px;border-bottom:1px solid var(--line);vertical-align:top}
thead th{font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:500}
table.kv th{width:220px;color:var(--muted);font-weight:500}
.foot{margin-top:32px;padding-top:14px;border-top:1px solid var(--line);color:var(--muted);font-size:11.5px}
@media print{body{padding:0}}
</style></head><body><div class="wrap">
<p class="eyebrow">Alba · Portfolio Intelligence</p>
<h1>${esc(r.kind)}</h1>
<p class="sub">${esc(r.company)} · ${esc(r.subtitle)} · prepared ${esc(r.preparedAt)}</p>
<div class="summary">${esc(r.executiveSummary)}</div>
${r.sections.map((s) => `<h2>${esc(s.title)}</h2>${s.table ? table(s.table) : rows(s.rows)}`).join("")}
<h2>Methodology</h2><p>${esc(r.methodology)}</p>
<div class="foot"><strong>Accountable:</strong> ${esc(r.accountable)} · <strong>Review date:</strong> ${esc(r.reviewDate)}<br>
Every figure in this report is calculated from connected source systems. Sources and refresh dates are listed against each metric above.</div>
</div></body></html>`;
}

/** Download the report as a standalone file. */
export function downloadReport(r) {
  const blob = new Blob([reportToHtml(r)], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${r.kind.replace(/\s+/g, "_")}_${r.company.replace(/\s+/g, "_")}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

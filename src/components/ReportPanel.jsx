// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Screens 6 and 9: Report Preview  (REPORTS)
//  ----------------------------------------------------------------------------
//  Generating a report used to go straight to a file download. That works on a
//  laptop and does nothing at all in a sandboxed viewer — a shared link, an
//  embedded preview, a locked-down browser — where the button appears to work
//  and silently produces nothing. A control that says "Generate" has to show
//  something.
//
//  So the report opens here first, rendered from the same object the file is
//  built from, with printing and downloading offered from inside it.
//
//  It is set on cream stock in the serif, against the dark interface, because
//  the thing being previewed is a document that leaves the building. Three
//  columns, as the reference draws them: what is in it, the paper itself, and
//  what it was set to.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo } from "react";
import { C, F, S, label as labelStyle } from "../lib/theme.js";
import { Chip, Button } from "./Shell.jsx";
import { reportToHtml, downloadReport } from "../lib/reports.js";

/** Roughly how many characters of this report fit on a printed page. */
const CHARS_PER_PAGE = 2600;

// ── Paper parts ─────────────────────────────────────────────────────────────

function Rule({ heavy = false }) {
  return <div style={{ height: heavy ? 2 : 1, background: heavy ? C.ink1 : C.inkRule, margin: "14px 0" }} />;
}

function SheetLabel({ children }) {
  return (
    <div style={{ color: C.ink3, fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase",
                  fontFamily: F.sans, fontWeight: 600, marginBottom: 7 }}>
      {children}
    </div>
  );
}

function PaperTable({ head, rows }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 400 }}>
        <thead><tr>{head.map((h) => (
          <th key={h} style={{ textAlign: "left", padding: "5px 8px", fontWeight: 600, fontSize: 8.5,
                               letterSpacing: "0.1em", textTransform: "uppercase", color: C.ink3,
                               fontFamily: F.sans, borderBottom: `1px solid ${C.ink1}` }}>{h}</th>
        ))}</tr></thead>
        <tbody>{rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: `1px solid ${C.inkRule}` }}>
            {row.map((cell, j) => (
              <td key={j} style={{ padding: "6px 8px", color: j === 0 ? C.ink1 : C.ink2,
                                   verticalAlign: "top", lineHeight: 1.55,
                                   fontVariantNumeric: "tabular-nums" }}>{cell}</td>
            ))}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function PaperRows({ list }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
      <tbody>{list.map(([k, v]) => (
        <tr key={k} style={{ borderBottom: `1px solid ${C.inkRule}` }}>
          <th style={{ textAlign: "left", width: "38%", padding: "6px 8px", fontWeight: 400,
                       color: C.ink3, verticalAlign: "top" }}>{k}</th>
          <td style={{ padding: "6px 8px", color: C.ink2, lineHeight: 1.55,
                       fontVariantNumeric: "tabular-nums" }}>{v}</td>
        </tr>
      ))}</tbody>
    </table>
  );
}

/**
 * The band of headline figures under the summary.
 *
 * Declared by each report builder. It used to be scraped out of the first
 * key/value section, which meant the two reports that open on a table — cash
 * and procurement — rendered the band empty while the other three filled it.
 * The fallback is kept for a report that has not declared one yet, so a new
 * report type degrades to something rather than to nothing.
 */
function figureBand(report) {
  if (Array.isArray(report.figures) && report.figures.length) return report.figures;
  const first = report.sections?.find((s) => Array.isArray(s.rows));
  if (!first) return [];
  return first.rows
    .filter(([, v]) => typeof v === "string" && v.length <= 22)
    .slice(0, 4)
    .map(([k, v]) => ({ label: k, value: v }));
}

/** Ink for a figure — red for a shortfall, green for an upside, otherwise plain. */
const figureInk = (tone) => (tone === "red" ? C.inkRed : tone === "green" ? C.inkGreen : C.ink1);

// ── The panel ───────────────────────────────────────────────────────────────

/**
 * @param {object}   report  a report object from src/lib/reports.js
 * @param {Function} onClose
 */
export default function ReportPanel({ report, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const meta = useMemo(() => {
    if (!report) return null;
    const html = reportToHtml(report);
    const figures = figureBand(report);
    const metrics = report.sections.reduce((t, s) =>
      t + (s.table ? s.table.rows.length : s.rows?.length ?? 0), 0);
    const sources = new Set();
    for (const s of report.sections) {
      if (!s.table) continue;
      const at = s.table.head.findIndex((h) => /source/i.test(h));
      if (at >= 0) for (const r of s.table.rows) if (r[at]) sources.add(String(r[at]));
    }
    return {
      figures, metrics, html,
      sources: [...sources],
      pages: Math.max(1, Math.ceil(html.replace(/<[^>]+>/g, "").length / CHARS_PER_PAGE)),
      contents: [
        "Executive summary",
        ...report.sections.map((s) => s.title),
        "Methodology",
        "Accountability and sources",
      ],
    };
  }, [report]);

  if (!report || !meta) return null;

  // Printing goes through a new window carrying the standalone HTML, so the
  // printed page is the report rather than the application around it.
  const print = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(meta.html);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div onClick={onClose}
         style={{ position: "fixed", inset: 0, background: "rgba(7,7,8,0.82)", zIndex: 9998,
                  display: "flex", alignItems: "flex-start", justifyContent: "center",
                  padding: "24px 18px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()}
           style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
                    width: "min(1180px, 100%)", boxShadow: "0 28px 80px rgba(0,0,0,0.6)" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14,
                      padding: "14px 18px", borderBottom: `1px solid ${C.border}`, position: "sticky",
                      top: 0, background: C.bg, borderRadius: "8px 8px 0 0", zIndex: 2, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: C.txt3, fontSize: S.small, marginBottom: 5 }}>
              Reports<span style={{ margin: "0 6px", color: C.border }}>/</span>{report.company}
              <span style={{ margin: "0 6px", color: C.border }}>/</span>Report Preview
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ color: C.txt1, fontSize: S.h1, fontWeight: 400, margin: 0, letterSpacing: "-0.02em" }}>
                Report Preview
              </h1>
              <Chip tone="green">Ready to circulate</Chip>
            </div>
            <div style={{ color: C.txt3, fontSize: S.small, marginTop: 5 }}>
              {report.kind} · {meta.metrics} metrics · {meta.pages} {meta.pages === 1 ? "page" : "pages"} · prepared {report.preparedAt}
            </div>
          </div>
          <div style={{ display: "flex", gap: 7, flexShrink: 0, alignItems: "center", flexWrap: "wrap" }}>
            <Button variant="primary" onClick={() => downloadReport(report)}>Download</Button>
            <Button variant="outline" onClick={print}>Print</Button>
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </div>
        </div>

        {/* ── Three columns ── */}
        <div style={{ display: "grid", gridTemplateColumns: "168px minmax(0,1fr) 190px", gap: 16,
                      padding: "18px", alignItems: "start" }}
             className="alba-report-cols">

          {/* Report content */}
          <div>
            <div style={{ ...labelStyle(C.txt2), marginBottom: 10 }}>Report content</div>
            {meta.contents.map((item) => (
              <div key={item} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 9 }}>
                <span style={{
                  width: 15, height: 15, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                  border: `1px solid ${C.green}66`, background: C.greenSoft, color: C.green,
                  display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 8.5, fontWeight: 700,
                }}>✓</span>
                <span style={{ color: C.txt2, fontSize: S.small, lineHeight: 1.4 }}>{item}</span>
              </div>
            ))}
          </div>

          {/* The paper */}
          <div style={{ position: "relative" }}>
            {/* the second page, peeking behind */}
            <div aria-hidden="true"
                 style={{ position: "absolute", inset: 0, top: 7, left: 7, background: C.paperEdge,
                          borderRadius: 3, boxShadow: `0 10px 30px ${C.paperShadow}` }} />
            <div style={{ position: "relative", background: C.paper, borderRadius: 3,
                          padding: "30px 34px 26px", fontFamily: F.serif, color: C.ink1,
                          boxShadow: `0 14px 44px ${C.paperShadow}` }}>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
                            color: C.ink3, fontFamily: F.sans, fontSize: 8.5, letterSpacing: "0.2em",
                            textTransform: "uppercase", fontWeight: 600 }}>
                <span>Alba PIP · Portfolio Intelligence</span>
                <span>{report.preparedAt}</span>
              </div>
              <Rule heavy />

              <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 6px", lineHeight: 1.25,
                           letterSpacing: "-0.01em", color: C.ink1 }}>
                {report.kind}
              </h1>
              <div style={{ color: C.ink2, fontSize: 11.5, fontFamily: F.sans }}>
                {report.company} <span style={{ color: C.inkRule }}>|</span> {report.subtitle}
              </div>
              <div style={{ color: C.gold, fontSize: 10, fontFamily: F.sans, fontWeight: 700,
                            letterSpacing: "0.11em", textTransform: "uppercase", marginTop: 7 }}>
                Prepared for circulation · review {report.reviewDate}
              </div>

              <Rule />

              <SheetLabel>Executive summary</SheetLabel>
              <p style={{ fontSize: 12.5, lineHeight: 1.75, color: C.ink1, margin: 0 }}>
                {report.executiveSummary}
              </p>

              {meta.figures.length > 0 && (
                <div style={{ display: "flex", marginTop: 18, borderTop: `1px solid ${C.ink1}`,
                              borderBottom: `1px solid ${C.ink1}`, padding: "12px 0" }}>
                  {meta.figures.map((f, i) => (
                    <div key={f.label} style={{ flex: 1, minWidth: 0, padding: "0 12px",
                                                borderLeft: i > 0 ? `1px solid ${C.inkRule}` : "none" }}>
                      <div style={{ color: C.ink3, fontSize: 8.5, letterSpacing: "0.12em",
                                    textTransform: "uppercase", fontFamily: F.sans, fontWeight: 600 }}>
                        {f.label}
                      </div>
                      <div style={{ color: figureInk(f.tone), fontSize: 17, marginTop: 5,
                                    fontVariantNumeric: "tabular-nums" }}>{f.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {report.sections.map((s) => (
                <div key={s.title} style={{ marginTop: 20 }}>
                  <SheetLabel>{s.title}</SheetLabel>
                  {s.table ? <PaperTable head={s.table.head} rows={s.table.rows} /> : <PaperRows list={s.rows} />}
                </div>
              ))}

              <div style={{ marginTop: 20 }}>
                <SheetLabel>Methodology</SheetLabel>
                <p style={{ fontSize: 11.5, lineHeight: 1.7, color: C.ink2, margin: 0 }}>{report.methodology}</p>
              </div>

              <Rule />
              <div style={{ color: C.ink3, fontSize: 10.5, lineHeight: 1.7, fontStyle: "italic" }}>
                Accountable: {report.accountable}. Review date {report.reviewDate}. Every figure is calculated
                from connected source systems{meta.sources.length ? ` — ${meta.sources.join(", ")}` : ""}; sources
                and refresh dates are listed against each metric above.
              </div>

              <div style={{ textAlign: "center", color: C.ink3, fontSize: 9.5, fontFamily: F.sans, marginTop: 20 }}>
                1 / {meta.pages}
              </div>
            </div>
          </div>

          {/* Report settings */}
          <div>
            <div style={{ ...labelStyle(C.txt2), marginBottom: 10 }}>Report settings</div>
            {[
              { glyph: "◉", k: "Audience", v: "Investment committee" },
              { glyph: "◷", k: "Period", v: `To ${report.preparedAt}` },
              { glyph: "◧", k: "Format", v: "Self-contained HTML" },
              { glyph: "▤", k: "Detail", v: `Full · ${report.sections.length} sections` },
              { glyph: "▦", k: "Pages", v: `${meta.pages} at A4` },
            ].map((row) => (
              <div key={row.k} style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 11 }}>
                <span style={{ color: C.gold, fontSize: 11, width: 13, flexShrink: 0, marginTop: 1 }}>{row.glyph}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={labelStyle()}>{row.k}</div>
                  <div style={{ color: C.txt2, fontSize: S.small, marginTop: 2, lineHeight: 1.4 }}>{row.v}</div>
                </div>
              </div>
            ))}
            <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 14, paddingTop: 11,
                          color: C.txt3, fontSize: S.micro, lineHeight: 1.6 }}>
              Assembled from {meta.metrics} calculated metrics
              {meta.sources.length ? ` across ${meta.sources.length} source systems` : ""}. Download saves a
              self-contained file; some embedded viewers block saving, in which case use Print.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

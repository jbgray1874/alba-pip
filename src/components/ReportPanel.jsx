// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Report panel
//  ----------------------------------------------------------------------------
//  Generating a report used to go straight to a file download. That works on a
//  laptop and does nothing at all in a sandboxed viewer — a shared link, an
//  embedded preview, a locked-down browser — where the button appears to work
//  and silently produces nothing. A control that says "Generate" has to show
//  something.
//
//  So the report opens here first, rendered from the same object the file is
//  built from, with printing and downloading offered from inside it. Reading the
//  report no longer depends on the environment permitting a save.
// ════════════════════════════════════════════════════════════════════════════

import { C } from "../lib/theme.js";
import { useEffect } from "react";
import { reportToHtml, downloadReport } from "../lib/reports.js";

// Palette from the shared design tokens. Every view used to carry its own
// copy of this object, seventeen of them, each a shade adrift of the next.
const T = {
  scrim: "rgba(10,10,11,0.78)",
  page: C.surface,
  border: C.border,
  accent: C.surfaceUp,
  blue: C.blue,
  green: C.green,
  txt1: C.txt1,
  txt2: C.txt2,
  txt3: C.txt3
};

function Table({ head, rows }) {
  return (
    <div style={{ overflowX: "auto", marginBottom: 4 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, minWidth: 460 }}>
        <thead><tr>{head.map((h) => (
          <th key={h} style={{ textAlign: "left", padding: "6px 9px", fontWeight: 500, fontSize: 9.5,
                               letterSpacing: "0.06em", textTransform: "uppercase", color: T.txt3,
                               borderBottom: `1px solid ${T.border}` }}>{h}</th>
        ))}</tr></thead>
        <tbody>{rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: `1px solid ${T.accent}` }}>
            {row.map((cell, j) => (
              <td key={j} style={{ padding: "7px 9px", color: j === 0 ? T.txt1 : T.txt2,
                                   verticalAlign: "top", fontVariantNumeric: "tabular-nums" }}>{cell}</td>
            ))}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function Rows({ list }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, marginBottom: 4 }}>
      <tbody>{list.map(([k, v]) => (
        <tr key={k} style={{ borderBottom: `1px solid ${T.accent}` }}>
          <th style={{ textAlign: "left", width: 220, padding: "7px 9px", fontWeight: 500, color: T.txt3 }}>{k}</th>
          <td style={{ padding: "7px 9px", color: T.txt2, fontVariantNumeric: "tabular-nums" }}>{v}</td>
        </tr>
      ))}</tbody>
    </table>
  );
}

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

  if (!report) return null;

  // Printing goes through a new window carrying the standalone HTML, so the
  // printed page is the report rather than the application around it.
  const print = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(reportToHtml(report));
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div onClick={onClose}
         style={{ position: "fixed", inset: 0, background: T.scrim, zIndex: 9998,
                  display: "flex", alignItems: "flex-start", justifyContent: "center",
                  padding: "28px 20px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()}
           style={{ background: T.page, border: `1px solid ${T.border}`, borderRadius: 10,
                    width: "min(900px, 100%)", boxShadow: "0 24px 70px rgba(0,0,0,0.5)" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12,
                      padding: "14px 18px", borderBottom: `1px solid ${T.border}`, position: "sticky",
                      top: 0, background: T.page, borderRadius: "10px 10px 0 0" }}>
          <div>
            <div style={{ color: T.blue, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 4 }}>
              Alba · Portfolio Intelligence
            </div>
            <div style={{ color: T.txt1, fontSize: 15, fontWeight: 700, fontFamily: "Georgia,serif" }}>{report.kind}</div>
            <div style={{ color: T.txt3, fontSize: 10, marginTop: 3 }}>
              {report.company} · {report.subtitle} · prepared {report.preparedAt}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button onClick={print}
                    style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${T.border}`,
                             borderRadius: 5, color: T.txt2, fontSize: 10.5, cursor: "pointer", fontFamily: "inherit" }}>
              Print
            </button>
            <button onClick={() => downloadReport(report)}
                    style={{ padding: "6px 12px", background: T.green, border: "none", borderRadius: 5,
                             color: "#04140d", fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Download
            </button>
            <button onClick={onClose}
                    style={{ padding: "6px 10px", background: "transparent", border: `1px solid ${T.border}`,
                             borderRadius: 5, color: T.txt3, fontSize: 12, cursor: "pointer", lineHeight: 1 }}>
              ×
            </button>
          </div>
        </div>

        <div style={{ padding: "16px 18px 20px" }}>
          <div style={{ background: "#0b1120", borderLeft: `3px solid ${T.blue}`, padding: "12px 14px",
                        color: T.txt2, fontSize: 12, lineHeight: 1.7, marginBottom: 18 }}>
            {report.executiveSummary}
          </div>

          {report.sections.map((s) => (
            <div key={s.title} style={{ marginBottom: 18 }}>
              <h2 style={{ color: T.txt3, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
                           margin: "0 0 8px", paddingBottom: 5, borderBottom: `1px solid ${T.border}`, fontWeight: 500 }}>
                {s.title}
              </h2>
              {s.table ? <Table head={s.table.head} rows={s.table.rows} /> : <Rows list={s.rows} />}
            </div>
          ))}

          <h2 style={{ color: T.txt3, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
                       margin: "0 0 8px", paddingBottom: 5, borderBottom: `1px solid ${T.border}`, fontWeight: 500 }}>
            Methodology
          </h2>
          <p style={{ color: T.txt2, fontSize: 11.5, lineHeight: 1.7, margin: "0 0 16px" }}>{report.methodology}</p>

          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12, color: T.txt3, fontSize: 10, lineHeight: 1.7 }}>
            <strong style={{ color: T.txt2 }}>Accountable:</strong> {report.accountable} ·{" "}
            <strong style={{ color: T.txt2 }}>Review date:</strong> {report.reviewDate}
            <br />
            Every figure in this report is calculated from connected source systems. Sources and refresh dates are
            listed against each metric above. <strong style={{ color: T.txt2 }}>Download</strong> saves it as a
            self-contained HTML file; some embedded viewers block saving, in which case use Print.
          </div>
        </div>
      </div>
    </div>
  );
}

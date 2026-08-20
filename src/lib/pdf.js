// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Report as PDF
//  ----------------------------------------------------------------------------
//  Every report in the application could already be previewed, printed and
//  saved as HTML. None of that is what somebody means when they ask for the
//  report: they mean a file they can attach to an email, drop in a board pack
//  and open on a phone. That is a PDF.
//
//  Two ways to make one, and only one of them is worth having:
//
//    · Screenshot the preview to a canvas and paste the bitmap onto a page.
//      Fast to write. The result cannot be searched, cannot be copied out of,
//      goes soft when printed, and weighs a megabyte a page.
//    · Set the report as type. Slower to write — this file is that cost — and
//      the output is a real document: selectable text, live page numbers,
//      tables that break across pages at a row boundary, 60KB.
//
//  This is the second. Nothing here re-derives a figure; it takes the same
//  report object the preview and the HTML export are built from, so the three
//  outputs cannot disagree.
//
//  jsPDF and its table plugin are loaded on demand. Together they are the
//  largest dependency in the project by a wide margin, and a user who never
//  asks for a PDF should never pay for them — so the import sits inside the
//  function rather than at the top of the file, and the first click on a cold
//  cache is a beat slower than the second.
// ════════════════════════════════════════════════════════════════════════════

import { C } from "./theme.js";

// ── Page geometry, in millimetres ───────────────────────────────────────────
//  A4, because the report is circulated in the UK and the UAE. The margins are
//  wide for a reason: this is a document a partner reads and writes on, and a
//  measure of about 90 characters is where that stops being comfortable.

const PAGE = { w: 210, h: 297 };
const M = { l: 18, r: 18 };
const CW = PAGE.w - M.l - M.r;      // 174mm of measure
const TOP = 32;                     // first baseline, under the masthead
const BOTTOM = 276;                 // last baseline, above the footer rule
const PT = 0.352778;                // one point, in millimetres

/** Hex to the [r,g,b] triple jsPDF wants. Shorthand hexes are not used here. */
function rgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// The report sheet's ink scale, shared with the on-screen preview so the file
// and the thing it was previewed as are the same document.
const INK = {
  head:  rgb(C.ink1),
  body:  rgb(C.ink2),
  quiet: rgb(C.ink3),
  rule:  rgb(C.inkRule),
  gold:  rgb(C.gold),
  red:   rgb(C.inkRed),
  green: rgb(C.inkGreen),
};

const toneInk = (tone) => (tone === "red" ? INK.red : tone === "green" ? INK.green : INK.head);

// ── The marque ──────────────────────────────────────────────────────────────

/**
 * The supplied logo, turned into something that can sit on a white page.
 *
 * The artwork is light-on-transparent — right for the dark interface, invisible
 * on paper. The preview handles this with `filter: invert(1)`; there is no CSS
 * inside a PDF, so the same inversion is done to the pixels here.
 *
 * The result is flattened onto white rather than left with an alpha channel.
 * Transparency in a PDF works, but it works through a soft mask that not every
 * viewer composites the same way, and a logo that renders as a black box in one
 * reader is worse than no logo at all. Flattening removes the question.
 *
 * @returns {Promise<{data: string, ratio: number}|null>} null if it cannot be
 *          loaded, which is not an error — the wordmark alone is a valid lockup
 *          and the report is not worth failing over a missing image.
 */
async function inkMark() {
  if (typeof document === "undefined" || typeof Image === "undefined") return null;
  const base = (typeof import.meta !== "undefined" && import.meta.env?.BASE_URL) || "/";

  for (const file of ["logo.png", "logo.jpg"]) {
    try {
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = `${base}${file}`;
      });
      if (!img.naturalWidth) continue;

      // The mark prints at 6mm. At 300dpi that is 71 pixels, so 320 is already
      // four times more than the page can resolve — and the supplied file is
      // 729 wide, which put 63KB of invisible detail in every report. Scaled
      // down here rather than left to the PDF reader.
      const scale = Math.min(1, 320 / Math.max(img.naturalWidth, img.naturalHeight));
      const cv = document.createElement("canvas");
      cv.width = Math.round(img.naturalWidth * scale);
      cv.height = Math.round(img.naturalHeight * scale);
      const cx = cv.getContext("2d");
      cx.drawImage(img, 0, 0, cv.width, cv.height);

      const px = cx.getImageData(0, 0, cv.width, cv.height);
      const d = px.data;
      for (let i = 0; i < d.length; i += 4) {
        const a = d[i + 3] / 255;
        // Invert, then composite over white by hand so the file carries no alpha.
        d[i]     = (255 - d[i])     * a + 255 * (1 - a);
        d[i + 1] = (255 - d[i + 1]) * a + 255 * (1 - a);
        d[i + 2] = (255 - d[i + 2]) * a + 255 * (1 - a);
        d[i + 3] = 255;
      }
      cx.putImageData(px, 0, 0);

      return { data: cv.toDataURL("image/png"), ratio: cv.width / cv.height };
    } catch {
      // try the next candidate
    }
  }
  return null;
}

// ── Type helpers ────────────────────────────────────────────────────────────

/**
 * The fourteen fonts every PDF reader already has need no embedding, which is
 * why this file is 9KB rather than 400KB. The cost is their encoding: WinAnsi,
 * which is Latin-1 plus the CP1252 typographic slots. It has the em dash, the
 * curly quotes, the ellipsis, the bullet, the multiplication sign and sterling.
 * It does not have the arrow.
 *
 * An unmappable character does not fail loudly. jsPDF drops the run into a
 * different encoding path and the line comes out as mojibake with the tracking
 * pulled apart — which is exactly how `£86k → £138k` printed before this
 * existed. So the substitutions are made deliberately, in words, and anything
 * left unmapped is removed rather than allowed through to garble its line.
 *
 * The arrow is the one that matters: across the reports it always means "moved
 * to", and that is what it becomes.
 */
const SUBSTITUTE = {
  "→": "to", "⟶": "to", "➜": "to", "⇒": "to", "▸": "to", "▶": "to",
  "←": "from", "↑": "up", "↓": "down",
  "−": "-", "–": "–", "≈": "~", "≤": "<=", "≥": ">=", "≠": "not ",
  "✓": "Y", "✗": "N", "✔": "Y", "✘": "N",
  "™": "™", "℮": "", "°": "°",
};

// CP1252 fills 0x80–0x9F with the typographic characters Latin-1 leaves out.
const CP1252_HIGH = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";

/**
 * The characters in `value` that would be dropped rather than substituted.
 *
 * Dropping is the right behaviour at the point of setting — a garbled line is
 * worse than a missing glyph — but it is the wrong thing to discover on paper.
 * The verification suite walks every report through this, so a report that
 * starts quoting a character the substitution table has not been told about
 * fails a check instead of quietly losing it.
 */
export function unmappable(value) {
  const out = new Set();
  for (const ch of String(value ?? "")) {
    if (ch in SUBSTITUTE) continue;
    const code = ch.codePointAt(0);
    if (code > 0xff && !CP1252_HIGH.includes(ch)) out.add(ch);
  }
  return [...out];
}

/** Everything a standard font can set, with the rest turned into words or dropped. */
export function pdfSafe(value) {
  let out = "";
  for (const ch of String(value ?? "")) {
    if (ch in SUBSTITUTE) { out += SUBSTITUTE[ch]; continue; }
    const code = ch.codePointAt(0);
    out += (code <= 0xff || CP1252_HIGH.includes(ch)) ? ch : "";
  }
  // Dropping a character can leave a doubled space or a space before a comma.
  return out.replace(/[ \t]{2,}/g, " ").replace(/\s+([,.;:])/g, "$1").trim();
}

/**
 * jsPDF measures a string without knowing what tracking is about to be applied
 * to it, so anything right-aligned and tracked lands short by the accumulated
 * letter-spacing. Adding it back is the whole fix.
 */
const trackedWidth = (doc, s, charSpace) => doc.getTextWidth(s) + charSpace * Math.max(0, s.length - 1);

/**
 * A writer that keeps a cursor and breaks pages, so the calling code below can
 * read as a sequence of blocks rather than as arithmetic about where the last
 * one ended.
 */
function sheet(doc) {
  let y = TOP;

  const api = {
    get y() { return y; },
    set y(v) { y = v; },

    /** Start a page if `h` millimetres will not fit on this one. */
    room(h) {
      if (y + h > BOTTOM) { doc.addPage(); y = TOP; }
      return api;
    },

    gap(h) { y += h; return api; },

    /** A tracked uppercase caption — the label style, on paper. */
    label(text, { colour = INK.quiet, size = 6.8, space = 3 } = {}) {
      api.room(size * PT + space);
      doc.setFont("helvetica", "bold").setFontSize(size).setTextColor(...colour);
      doc.text(pdfSafe(text).toUpperCase(), M.l, y, { charSpace: 0.35 });
      y += size * PT + space;
      return api;
    },

    /** Running text, wrapped to the measure and broken across pages by line. */
    para(text, { font = "times", style = "normal", size = 10, colour = INK.body,
                 lead = 1.5, width = CW, space = 0 } = {}) {
      doc.setFont(font, style).setFontSize(size).setTextColor(...colour);
      const step = size * PT * lead;
      for (const line of doc.splitTextToSize(pdfSafe(text), width)) {
        api.room(step);
        y += step;
        doc.text(line, M.l, y - step * 0.25);
      }
      y += space;
      return api;
    },

    rule({ heavy = false, space = 4, colour } = {}) {
      api.room(space * 2);
      y += space;
      doc.setDrawColor(...(colour ?? (heavy ? INK.head : INK.rule)));
      doc.setLineWidth(heavy ? 0.5 : 0.15);
      doc.line(M.l, y, M.l + CW, y);
      y += space;
      return api;
    },
  };
  return api;
}

// ── The document ────────────────────────────────────────────────────────────

/**
 * The band of headline figures, ruled above and below with a hairline between
 * each — the same band the preview draws under the executive summary. It is the
 * one place in the document where a number is allowed to be large.
 */
function figureBand(doc, s, figures) {
  if (!figures?.length) return;
  const H = 15;
  s.room(H + 6).gap(3);

  const top = s.y;
  doc.setDrawColor(...INK.head).setLineWidth(0.3);
  doc.line(M.l, top, M.l + CW, top);
  doc.line(M.l, top + H, M.l + CW, top + H);

  const col = CW / figures.length;
  figures.forEach((f, i) => {
    const x = M.l + col * i;
    if (i > 0) {
      doc.setDrawColor(...INK.rule).setLineWidth(0.15);
      doc.line(x, top + 2, x, top + H - 2);
    }
    doc.setFont("helvetica", "bold").setFontSize(6.2).setTextColor(...INK.quiet);
    doc.text(pdfSafe(f.label).toUpperCase(), x + 3, top + 5.5, { charSpace: 0.3, maxWidth: col - 6 });

    // A headline figure is one line by definition. The band is a fixed height,
    // so a long value — "$1,416k – $1,916k" is the one that found this — must
    // be set smaller rather than wrapped into the section below it.
    const value = pdfSafe(f.value);
    doc.setFont("times", "normal").setTextColor(...toneInk(f.tone));
    let size = 13;
    doc.setFontSize(size);
    while (size > 7 && doc.getTextWidth(value) > col - 6) doc.setFontSize((size -= 0.5));
    doc.text(value, x + 3, top + 11.8);
  });

  s.y = top + H + 6;
}

/**
 * One section — either a table with a head, or the key/value pairs the position
 * sections use. Both go through the table plugin so that a section which runs
 * past the foot of the page breaks between rows rather than through one.
 */
function section(doc, s, autoTable, sec) {
  // A section head with no room for its first rows under it is a widow; 24mm
  // is about three rows, which is enough for the break to look intended.
  s.room(24);
  s.label(sec.title, { colour: INK.head });

  // A prose section — the drafted narrative on a board pack. Set in the serif
  // like the summary, with its attribution under it in italic so the written
  // sentences are never mistaken for the calculated ones.
  if (sec.text) {
    s.para(sec.text, { size: 9.5, colour: INK.head, lead: 1.55 });
    if (sec.attribution) {
      s.gap(1.5);
      s.para(sec.attribution, { style: "italic", size: 8.5, colour: INK.quiet, lead: 1.45 });
    }
    s.gap(5);
    return;
  }

  const common = {
    startY: s.y,
    margin: { left: M.l, right: M.r, top: TOP - 6, bottom: PAGE.h - BOTTOM },
    theme: "plain",
    // Let a table break between rows but never through one. Left to itself the
    // plugin will split a wrapped cell across the page break, which put the
    // words "attrition is running at" at the foot of one page and "14%" at the
    // top of the next.
    rowPageBreak: "avoid",
    styles: {
      font: "helvetica", fontSize: 8, textColor: INK.body, overflow: "linebreak",
      valign: "top", cellPadding: { top: 1.7, right: 3, bottom: 1.7, left: 0 },
      lineColor: INK.rule, lineWidth: 0,
    },
    didDrawCell: (data) => {
      // The plugin's own borders draw a full box; the sheet wants a single
      // hairline under each row and a heavier one under the head, so they are
      // drawn here instead of configured there.
      const head = data.row.section === "head";
      doc.setDrawColor(...(head ? INK.head : INK.rule));
      doc.setLineWidth(head ? 0.3 : 0.1);
      const yy = data.cell.y + data.cell.height;
      doc.line(data.cell.x, yy, data.cell.x + data.cell.width, yy);
    },
  };

  if (sec.table) {
    autoTable(doc, {
      ...common,
      head: [sec.table.head.map((h) => pdfSafe(h).toUpperCase())],
      body: sec.table.rows.map((r) => r.map(pdfSafe)),
      headStyles: {
        fontStyle: "bold", fontSize: 6.4, textColor: INK.quiet,
        cellPadding: { top: 0, right: 3, bottom: 2, left: 0 },
      },
      columnStyles: { 0: { textColor: INK.head, cellWidth: "auto" } },
    });
  } else {
    autoTable(doc, {
      ...common,
      body: sec.rows.map(([k, v]) => [pdfSafe(k), pdfSafe(v)]),
      columnStyles: {
        0: { cellWidth: CW * 0.34, textColor: INK.quiet },
        1: { textColor: INK.body },
      },
    });
  }

  s.y = doc.lastAutoTable.finalY + 7;
}

/** Masthead and footer, drawn over every page once the page count is known. */
function furniture(doc, report, mark) {
  const pages = doc.getNumberOfPages();
  const wordmark = "ALBA PIP · PORTFOLIO INTELLIGENCE";

  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);

    let x = M.l;
    if (mark) {
      const h = 6;
      doc.addImage(mark.data, "PNG", x, 15.5, h * mark.ratio, h);
      x += h * mark.ratio + 3;
    }
    doc.setFont("helvetica", "bold").setFontSize(7).setTextColor(...INK.quiet);
    doc.text(wordmark, x, 20, { charSpace: 0.4 });

    const right = pdfSafe(p === 1 ? report.preparedAt : `${report.kind} · continued`);
    doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(...INK.quiet);
    doc.text(right, M.l + CW - trackedWidth(doc, right, 0.2), 20, { charSpace: 0.2 });

    doc.setDrawColor(...INK.head).setLineWidth(0.5);
    doc.line(M.l, 23, M.l + CW, 23);

    doc.setDrawColor(...INK.rule).setLineWidth(0.15);
    doc.line(M.l, 281, M.l + CW, 281);
    doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(...INK.quiet);
    doc.text(pdfSafe(`${report.company} · ${report.kind}`), M.l, 285.5);
    const n = `${p} / ${pages}`;
    doc.text(n, M.l + CW - doc.getTextWidth(n), 285.5);
  }
}

/**
 * Build the report as a PDF document.
 *
 * Separated from saving it so the same document can be handed to a download, a
 * new tab or a test without three copies of the layout.
 *
 * @param   {object}  report          a report object from src/lib/reports.js
 * @param   {boolean} [opt.compress]  off for the verification suite, which reads
 *                                    the text back out of the page streams to
 *                                    check the file quotes the same figures the
 *                                    preview does
 * @returns {Promise<object>} the jsPDF document
 */
export async function reportToPdf(report, { compress = true } = {}) {
  const [{ jsPDF }, { autoTable }, mark] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    inkMark(),
  ]);

  const doc = new jsPDF({ unit: "mm", format: "a4", compress });
  doc.setProperties({
    title: pdfSafe(`${report.kind} — ${report.company}`),
    subject: pdfSafe(report.subtitle),
    author: "Alba PIP · Portfolio Intelligence",
    creator: "Alba PIP",
  });

  const s = sheet(doc);

  doc.setFont("times", "bold").setFontSize(19).setTextColor(...INK.head);
  for (const line of doc.splitTextToSize(pdfSafe(report.kind), CW)) {
    s.room(9);
    s.y += 8;
    doc.text(line, M.l, s.y);
  }
  s.gap(2);
  s.para(`${report.company}  |  ${report.subtitle}`, { font: "helvetica", size: 9, colour: INK.body, space: 2 });

  doc.setFont("helvetica", "bold").setFontSize(6.8).setTextColor(...INK.gold);
  doc.text(pdfSafe(`PREPARED FOR CIRCULATION · REVIEW ${report.reviewDate}`).toUpperCase(), M.l, s.y + 2,
           { charSpace: 0.35 });
  s.gap(3);

  s.rule({ space: 4 });

  s.label("Executive summary");
  s.para(report.executiveSummary, { size: 10.5, colour: INK.head, lead: 1.55 });

  figureBand(doc, s, report.figures);

  for (const sec of report.sections) section(doc, s, autoTable, sec);

  s.room(20);
  s.label("Methodology");
  s.para(report.methodology, { size: 9, colour: INK.body, lead: 1.55 });

  s.rule({ space: 4 });
  s.para(
    `Accountable: ${report.accountable}. Review date ${report.reviewDate}. Every figure in this report is ` +
    `calculated from connected source systems; sources and refresh dates are listed against each metric above.`,
    { font: "times", style: "italic", size: 8.5, colour: INK.quiet, lead: 1.5 });

  furniture(doc, report, mark);
  return doc;
}

/** `Company_Investigation_Report_Orbit_Commerce.pdf` — safe on every filesystem. */
export function pdfFilename(report) {
  const clean = (s) => String(s).replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_");
  return `${clean(report.kind)}_${clean(report.company)}.pdf`;
}

/**
 * Build the report and hand it to the browser as a download.
 *
 * `save()` is a click on a generated anchor, and a sandboxed frame — a shared
 * link, an embedded preview — blocks that silently. The fallback opens the file
 * in a tab instead, where the reader can save it themselves. A button that says
 * it produces a PDF has to produce one or say why it could not.
 *
 * @returns {Promise<{ok: boolean, reason?: string}>}
 */
export async function downloadPdf(report) {
  try {
    const doc = await reportToPdf(report);
    const name = pdfFilename(report);
    try {
      doc.save(name);
      return { ok: true };
    } catch {
      const url = doc.output("bloburl");
      const w = window.open(url, "_blank");
      return w ? { ok: true } : { ok: false, reason: "The browser blocked both the download and a new tab." };
    }
  } catch (e) {
    return { ok: false, reason: e?.message ?? "The document could not be built." };
  }
}

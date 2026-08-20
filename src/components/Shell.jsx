// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Shell and page primitives
//  ----------------------------------------------------------------------------
//  The chrome and the repeating structures from the nine reference screens, so
//  every view is assembled from the same parts rather than re-inventing a
//  header each time. Nine screens share one skeleton:
//
//      breadcrumb → title with a status chip → one line of purpose
//      → a meta line naming the sources and the refresh
//      → a row of four metric cards
//      → two columns, evidence left and intelligence right
//      → a footer strip stating how the figure was arrived at
//
//  That skeleton is the product's argument in layout form — every screen says
//  what it found, what it is reading from, and how it got there — so it is
//  worth having as components rather than as a convention people remember.
// ════════════════════════════════════════════════════════════════════════════

import { C, F, S, label as labelStyle, metric as metricStyle, ragColour } from "../lib/theme.js";

// ── Marque ──────────────────────────────────────────────────────────────────

export function Wordmark({ compact = false }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, flexShrink: 0 }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="22" height="22" rx="6" stroke={C.gold} strokeWidth="1.4" />
        <path d="M7 16.5 11.4 7.5l2.1 4.6" stroke={C.gold} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12.6 16.5h3.1a2.4 2.4 0 0 0 0-4.8h-1.8" stroke={C.gold} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {!compact && (
        <span style={{ color: C.txt1, fontSize: 11.5, fontWeight: 600, letterSpacing: "0.16em" }}>ALBA PIP</span>
      )}
    </div>
  );
}

// ── Controls ────────────────────────────────────────────────────────────────

export function Button({ variant = "primary", children, onClick, title, disabled }) {
  const base = {
    padding: "6px 13px", borderRadius: 4, cursor: disabled ? "default" : "pointer",
    fontFamily: F.sans, fontSize: S.label, fontWeight: 600, letterSpacing: "0.1em",
    textTransform: "uppercase", whiteSpace: "nowrap", opacity: disabled ? 0.5 : 1,
  };
  const skin = variant === "primary"
    ? { background: C.gold, border: `1px solid ${C.gold}`, color: C.goldOn }
    : variant === "ghost"
      ? { background: "transparent", border: "1px solid transparent", color: C.txt2 }
      : { background: "transparent", border: `1px solid ${C.borderLt}`, color: C.txt2 };
  return <button onClick={onClick} title={title} disabled={disabled} style={{ ...base, ...skin }}>{children}</button>;
}

/** Small uppercase state marker — ATTENTION, HIGH PRIORITY, READY TO CIRCULATE. */
export function Chip({ children, tone = "gold", solid = false }) {
  const colour = { gold: C.gold, green: C.green, red: C.red, amber: C.amber, blue: C.blue, muted: C.txt3 }[tone] ?? C.gold;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0,
      padding: "2px 8px", borderRadius: 3,
      border: `1px solid ${colour}${solid ? "" : "55"}`,
      background: solid ? colour : `${colour}18`,
      color: solid ? C.goldOn : colour,
      fontSize: S.micro, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
    }}>{children}</span>
  );
}

/** A coloured dot, as used against every status word on the reference. */
export function Dot({ status, size = 6 }) {
  return <span style={{ width: size, height: size, borderRadius: "50%", background: ragColour(status),
                        display: "inline-block", flexShrink: 0 }} />;
}

// ── Page structure ──────────────────────────────────────────────────────────

/**
 * Breadcrumb, title, status, purpose and provenance — the top of all nine
 * reference screens.
 */
export function PageHeader({ crumbs = [], title, chips = [], purpose, meta, actions }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                  gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
      <div style={{ minWidth: 0 }}>
        {crumbs.length > 0 && (
          <div style={{ color: C.txt3, fontSize: S.small, marginBottom: 5 }}>
            {crumbs.map((c, i) => (
              <span key={i}>{i > 0 && <span style={{ margin: "0 6px", color: C.border }}>/</span>}{c}</span>
            ))}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h1 style={{ color: C.txt1, fontSize: S.h1, fontWeight: 400, margin: 0,
                       letterSpacing: "-0.02em", textWrap: "balance" }}>{title}</h1>
          {chips}
        </div>
        {purpose && <div style={{ color: C.txt2, fontSize: S.body, marginTop: 5, maxWidth: 720, lineHeight: 1.5 }}>{purpose}</div>}
        {meta && <div style={{ color: C.txt3, fontSize: S.small, marginTop: 5 }}>{meta}</div>}
      </div>
      {actions && <div style={{ display: "flex", gap: 7, flexShrink: 0, flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );
}

/** One metric card. */
export function Metric({ label, value, sub, tone, size = S.metric }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6,
                  padding: "13px 15px", flex: 1, minWidth: 150 }}>
      <div style={{ ...labelStyle(), marginBottom: 8 }}>{label}</div>
      <div style={metricStyle(tone ?? C.txt1, size)}>{value}</div>
      {sub && <div style={{ color: C.txt3, fontSize: S.small, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

/** The row of four that sits under every reference header. */
export function MetricRow({ items }) {
  return (
    <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginBottom: 14 }}>
      {items.map((m) => <Metric key={m.label} {...m} />)}
    </div>
  );
}

/** A bordered panel with an uppercase caption. */
export function Panel({ title, sub, right, children, tone, pad = 14, style }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${tone ?? C.border}`, borderRadius: 6,
                  marginBottom: 12, minWidth: 0, ...style }}>
      {(title || right) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
                      padding: "10px 14px", borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            {title && <div style={labelStyle(C.txt2)}>{title}</div>}
            {sub && <div style={{ color: C.txt3, fontSize: S.micro, marginTop: 3 }}>{sub}</div>}
          </div>
          {right}
        </div>
      )}
      <div style={{ padding: pad }}>{children}</div>
    </div>
  );
}

/** Evidence left, intelligence right — the reference's body layout. */
export function TwoColumn({ left, right, ratio = "1.35fr 1fr" }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: ratio, gap: 12, alignItems: "start" }}
         className="alba-two-col">
      <div style={{ minWidth: 0 }}>{left}</div>
      <div style={{ minWidth: 0 }}>{right}</div>
    </div>
  );
}

/**
 * The strip at the foot of every reference screen, stating how the figure above
 * was arrived at. It is the quietest element on the page and the one that makes
 * the rest of it credible.
 */
export function ProvenanceBar({ items }) {
  return (
    <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center",
                  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6,
                  padding: "9px 14px", marginTop: 4 }}>
      {items.map((t, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 7, color: C.txt3, fontSize: S.small }}>
          {i > 0 && <span style={{ color: C.gold, marginRight: 11 }}>·</span>}
          {t}
        </span>
      ))}
    </div>
  );
}

/** The page wrapper — consistent padding and scroll behaviour. */
export function Page({ children, maxWidth }) {
  return (
    <div style={{ height: "100%", overflowY: "auto", background: C.bg, padding: "20px 24px 28px" }}>
      <div style={{ maxWidth, margin: maxWidth ? "0 auto" : undefined }}>{children}</div>
    </div>
  );
}

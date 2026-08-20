// ════════════════════════════════════════════════════════════════════════════
//  Alba PIP — Design tokens
//  ----------------------------------------------------------------------------
//  Taken from the nine reference screens. Until now every view carried its own
//  copy of a `T` object, seventeen of them, each drifting a shade from the next
//  — and all of them inherited from the original prototype rather than from the
//  Alba PIP design.
//
//  The two systems differ in almost every particular. The prototype is a blue
//  black (#020817) with a blue accent, Georgia numerals and a left nav list.
//  Alba PIP is a neutral black with a gold accent, light sans numerals, a top
//  navigation and a narrow icon rail. Sitting them side by side, nobody would
//  say they were the same product.
//
//  One file, imported everywhere, so the next change is one edit rather than
//  seventeen.
// ════════════════════════════════════════════════════════════════════════════

/** Ground, surfaces and lines. Neutral black — not the prototype's blue black. */
export const C = {
  bg:        "#0A0A0B",   // page
  bgDeep:    "#070708",   // rail and inset wells
  surface:   "#131315",   // cards and panels
  surfaceUp: "#1A1A1D",   // hover, selected rows
  border:    "#242428",   // hairlines
  borderLt:  "#33333A",   // emphasised edges

  txt1:      "#F2F2F0",   // primary
  txt2:      "#9A9AA0",   // secondary
  txt3:      "#5E5E66",   // labels and meta

  // The signature. Gold carries navigation, primary actions and the marks the
  // eye is meant to land on. Nothing else competes with it.
  gold:      "#E5A83C",
  goldSoft:  "#E5A83C1F",
  goldLine:  "#E5A83C55",

  // Semantic, and separate from the accent so a healthy figure never reads as
  // a call to action.
  green:     "#3FCF6E",
  greenSoft: "#3FCF6E1A",
  amber:     "#E5A83C",
  amberSoft: "#E5A83C1A",
  red:       "#F4525F",
  redSoft:   "#F4525F1A",
  blue:      "#5B8DEF",
  blueSoft:  "#5B8DEF1A",
  purple:    "#9B7BEF",
  purpleSoft:"#9B7BEF1A",
  teal:      "#3FC7C7",
  tealSoft:  "#3FC7C71A",
  pink:      "#EF5DA8",
  pinkSoft:  "#EF5DA81A",
  goldOn:    "#141005",   // text on a gold fill
};

/**
 * Type.
 *
 * The application is set in a neo-grotesque throughout — headings, body and
 * the large metric numerals alike, the numerals at a lighter weight and a
 * larger size. The serif appears in exactly one place: the printed report on
 * cream stock, where it belongs and where it reads as a document rather than a
 * screen.
 */
export const F = {
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  serif: "'Source Serif 4', Georgia, 'Times New Roman', serif",
  mono: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
};

/** The scale on the reference screens, in pixels. */
export const S = {
  metric: 30,   // the big number on a KPI card
  metricSm: 22,
  h1: 25,
  h2: 14,
  body: 12.5,
  small: 11,
  label: 9.5,   // uppercase, letterspaced
  micro: 8.5,
};

/** Uppercase label, as used above every metric and section on the reference. */
export const label = (colour = C.txt3) => ({
  color: colour,
  fontSize: S.label,
  letterSpacing: "0.11em",
  textTransform: "uppercase",
  fontWeight: 500,
});

/** A metric numeral — light weight, large, tabular. */
export const metric = (colour = C.txt1, size = S.metric) => ({
  color: colour,
  fontSize: size,
  fontWeight: 300,
  fontFamily: F.sans,
  letterSpacing: "-0.02em",
  fontVariantNumeric: "tabular-nums",
  lineHeight: 1.05,
});

export const panel = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 6,
};

/** Semantic colour from a RAG word, in either case. */
export function ragColour(status) {
  const s = String(status ?? "").toLowerCase();
  if (s === "red" || s === "critical") return C.red;
  if (s === "amber" || s === "attention" || s === "warning") return C.amber;
  if (s === "green" || s === "healthy" || s === "ok") return C.green;
  return C.txt3;
}

/**
 * The one place a font is loaded.
 *
 * Google Fonts is the only external host the deployment allows, and each face
 * declares a real fallback so a blocked request degrades to a system stack
 * rather than to a default the design never anticipated.
 */
export const FONT_LINK =
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap";

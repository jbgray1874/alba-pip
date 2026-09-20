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

/**
 * Two palettes, one name for every colour.
 *
 * Every screen reads `C.bg`, `C.txt1`, `C.gold` and so on, and a good number of
 * those do arithmetic on the string: `${C.gold}44` for a translucent border,
 * chart props that go straight into an SVG attribute, and src/lib/pdf.js, which
 * parses the hex to place ink on a page. So the tokens stay hex. What changes
 * is which hex.
 *
 * That is why this is a runtime swap rather than CSS custom properties: a
 * variable reads beautifully in a stylesheet and cannot be sliced, appended to
 * or parsed, and those three things are exactly what the call sites do.
 */

/** Ground, surfaces and lines. Neutral black — not the prototype's blue black. */
const DARK = {
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

  // What a panel floating over the interface casts. On a dark ground a shadow
  // is a deeper black; on a light one it is the ink at low opacity, because
  // black at this size reads as dirt rather than depth.
  shadow:    "rgba(0,0,0,0.40)",
  // Behind a modal. It dims the screen under the dialogue without hiding it.
  scrim:     "rgba(7,7,8,0.82)",
};

/**
 * Light is not the dark palette inverted.
 *
 * Two things have to move rather than flip. The accent: #E5A83C is a gold that
 * glows on near-black and washes out to beige on white, so it darkens to a
 * bronze that holds its contrast — the same hue, carrying the same meaning, at
 * a weight the ground can take. And the semantic set: a #3FCF6E green readable
 * against black is barely legible against white, and "barely legible" on the
 * colour that means "this company is fine" is worse than no colour at all.
 *
 * The ground is a warm off-white rather than #FFF. Pure white under a dense
 * table glares, and the warmth ties the interface to the cream the reports
 * print on — two surfaces of one product rather than two products.
 */
const LIGHT = {
  bg:        "#F7F6F2",
  bgDeep:    "#EFEDE6",
  surface:   "#FFFFFF",
  surfaceUp: "#F4F2EC",
  border:    "#E2DFD6",
  borderLt:  "#C8C4B8",

  txt1:      "#1A1814",
  txt2:      "#57534A",
  txt3:      "#8A857A",

  gold:      "#9A6B12",
  goldSoft:  "#9A6B121F",
  goldLine:  "#9A6B1255",

  green:     "#1B7A47",
  greenSoft: "#1B7A471A",
  amber:     "#9A6B12",
  amberSoft: "#9A6B121A",
  red:       "#B02A21",
  redSoft:   "#B02A211A",
  blue:      "#2B55C4",
  blueSoft:  "#2B55C41A",
  purple:    "#6544C4",
  purpleSoft:"#6544C41A",
  teal:      "#0E7070",
  tealSoft:  "#0E70701A",
  pink:      "#A82A73",
  pinkSoft:  "#A82A731A",
  goldOn:    "#FFFFFF",   // text on a gold fill

  shadow:    "rgba(26,24,20,0.14)",
  scrim:     "rgba(26,24,20,0.55)",
};

export const THEMES = { dark: DARK, light: LIGHT };

/**
 * The report sheet, identical in both palettes.
 *
 * Screens 6 and 9 print onto paper, not onto the interface, so the ink has its
 * own scale — a report a partner circulates is read on a screen and then on a
 * printer, and #F2F2F0 on #131315 does not survive the second one. The sheet
 * stays cream whichever way the interface is set: the document does not change
 * because the reader prefers a light screen.
 */
const SHEET = {
  paper:       "#F5F2EA",
  paperEdge:   "#E4DFD2",
  paperShadow: "rgba(0,0,0,0.45)",
  ink1:        "#1A1814",
  ink2:        "#4A453C",
  ink3:        "#8A8477",
  inkRule:     "#D6D0C2",
  inkRed:      "#9B2C2C",   // a shortfall, printed
  inkGreen:    "#1F6B45",   // an upside, printed
  inkGold:     "#E5A83C",   // the masthead, on cream
};

let _active = "dark";

/** Which palette the interface is drawn in. */
export function themeName() { return _active; }

/**
 * Swap the palette. The caller re-renders; nothing here notifies anybody.
 * Returns the name actually set, so a bad value is visible rather than silent.
 */
export function setTheme(name) {
  _active = THEMES[name] ? name : "dark";
  return _active;
}

/**
 * The colours, as the application reads them.
 *
 * A getter per token rather than a plain object, so `C.bg` is whatever the
 * active palette says at the moment it is read. Every screen keeps using it
 * exactly as before. The sheet tokens are plain values — they do not move.
 */
export const C = Object.freeze([
  ...Object.keys(DARK).map((k) => [k, { get: () => THEMES[_active][k], enumerable: true }]),
  ...Object.keys(SHEET).map((k) => [k, { value: SHEET[k], enumerable: true }]),
].reduce((o, [k, d]) => (Object.defineProperty(o, k, d), o), {}));

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

/**
 * A card.
 *
 * Getters rather than values: this object is built once when the module loads,
 * and the screens spread it into a style at every paint. Read plainly it would
 * freeze whichever palette happened to be active at import and the cards would
 * keep their old ground after the interface switched.
 */
export const panel = {
  get background() { return C.surface },
  get border() { return `1px solid ${C.border}` },
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
